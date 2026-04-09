"""
generator.py — Send question + context chunks to Groq and stream the response.

Uses raw HTTP requests to Groq's OpenAI-compatible API.
"""

import json
import os
import requests
from rich.console import Console
from rich.live import Live
from rich.text import Text
from rich.panel import Panel

from utils import load_config

console = Console()

SYSTEM_PROMPT = """You are a senior DevOps engineer assistant. You answer questions based strictly on the provided context from DevOps runbooks and documentation.

Rules:
- Answer only from the provided context. Do not make up information.
- Be concise and actionable. Use numbered steps where relevant.
- If the context does not contain enough information to answer, say so clearly.
- Always mention which runbook or document the answer comes from."""


def build_prompt(question: str, context_chunks: list[tuple[str, str, float]]) -> str:
    context_parts = []
    for i, (chunk_text, source_file, score) in enumerate(context_chunks, 1):
        context_parts.append(f"[Source {i}: {source_file}]\n{chunk_text}")

    context = "\n\n---\n\n".join(context_parts)

    return f"""Use the following context from DevOps runbooks to answer the question.

CONTEXT:
{context}

QUESTION: {question}

ANSWER:"""


def generate(
    question: str,
    context_chunks: list[tuple[str, str, float]],
    config_path: str = "config.yaml",
) -> str:
    """Send question + context to Groq and stream the response.

    Args:
        question: user question
        context_chunks: list of (chunk_text, source_file, similarity_score)
        config_path: path to config.yaml

    Returns:
        full response string
    """
    config = load_config(config_path)
    model = config["groq"]["model"]
    base_url = config["groq"]["base_url"]

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        console.print("[red]GROQ_API_KEY not set. Add it to your .env file.[/red]")
        return ""

    prompt = build_prompt(question, context_chunks)

    console.print(f"\n[bold]Generating answer using [cyan]{model}[/cyan] via Groq...[/bold]\n")

    url = f"{base_url}/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        "stream": True,
        "temperature": 0.2,
    }

    full_response = ""
    accumulated_text = Text()

    try:
        with requests.post(url, headers=headers, json=payload, stream=True, timeout=60) as response:
            response.raise_for_status()

            with Live(
                Panel(accumulated_text, title="[bold cyan]Answer[/bold cyan]", border_style="cyan"),
                console=console,
                refresh_per_second=15,
            ) as live:
                for line in response.iter_lines():
                    if not line:
                        continue
                    line = line.decode("utf-8") if isinstance(line, bytes) else line
                    if line.startswith("data: "):
                        line = line[6:]
                    if line == "[DONE]":
                        break
                    try:
                        data = json.loads(line)
                        token = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                        if token:
                            full_response += token
                            accumulated_text.append(token)
                            live.update(
                                Panel(
                                    accumulated_text,
                                    title="[bold cyan]Answer[/bold cyan]",
                                    border_style="cyan",
                                )
                            )
                    except json.JSONDecodeError:
                        continue

    except requests.exceptions.ConnectionError:
        console.print("[red]Cannot connect to Groq API. Check your internet connection.[/red]")
        return ""
    except requests.exceptions.HTTPError as e:
        if "401" in str(e):
            console.print("[red]Invalid GROQ_API_KEY. Check your .env file.[/red]")
        elif "429" in str(e):
            console.print("[yellow]Groq rate limit hit. Wait a moment and try again.[/yellow]")
        else:
            console.print(f"[red]Groq API error: {e}[/red]")
        return ""

    return full_response
