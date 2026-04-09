"""
rag_pipeline.py — Main entry point. Orchestrates retrieve → generate loop.

Usage:
    python src/rag_pipeline.py
    python src/rag_pipeline.py "What should I do when a pod is in CrashLoopBackOff?"
"""

import sys
from rich.console import Console
from rich.prompt import Prompt

from utils import load_config, print_banner, print_sources
from retriever import retrieve
from generator import generate

console = Console()


def run_pipeline(question: str, config_path: str = "config.yaml") -> str:
    """Run the full RAG pipeline for a single question.

    Args:
        question: user question
        config_path: path to config.yaml

    Returns:
        generated answer string
    """
    console.print(f"\n[bold yellow]Question:[/bold yellow] {question}\n")

    # Step 1: Retrieve relevant chunks
    sources = retrieve(question, config_path=config_path, show_sources=True)

    if not sources:
        console.print("[yellow]No relevant context found. Try ingesting documents first.[/yellow]")
        return ""

    # Step 2: Generate answer
    answer = generate(question, sources, config_path=config_path)

    # Step 3: Print source citations
    if answer:
        console.print("\n[bold]Source documents used:[/bold]")
        for i, (_, source_file, score) in enumerate(sources, 1):
            console.print(f"  [cyan]{i}.[/cyan] {source_file} [dim](score: {score:.3f})[/dim]")

    return answer


def main():
    print_banner()

    config_path = "config.yaml"

    # If question passed as CLI argument, answer it and exit
    if len(sys.argv) > 1:
        question = " ".join(sys.argv[1:])
        run_pipeline(question, config_path=config_path)
        return

    # Interactive loop
    console.print("\n[dim]Type your question and press Enter. Type [bold]exit[/bold] to quit.[/dim]\n")

    while True:
        try:
            question = Prompt.ask("[bold cyan]Ask a question[/bold cyan]")
        except (KeyboardInterrupt, EOFError):
            console.print("\n[dim]Exiting.[/dim]")
            break

        question = question.strip()

        if not question:
            continue

        if question.lower() in ("exit", "quit", "q"):
            console.print("[dim]Goodbye.[/dim]")
            break

        run_pipeline(question, config_path=config_path)
        console.print("\n" + "─" * 60 + "\n")


if __name__ == "__main__":
    main()
