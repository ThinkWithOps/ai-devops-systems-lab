"""
Shared helpers used across all tool modules.
"""

import os


def mock_mode() -> bool:
    """Return True if the server should use mock data instead of real infra."""
    return os.getenv("KUBE_MOCK_MODE", "").lower() in ("true", "1", "yes")


def truncate(text: str, max_len: int) -> str:
    """Truncate *text* to *max_len* characters, appending '…' if cut."""
    if not text:
        return ""
    text = str(text)
    if len(text) <= max_len:
        return text
    return text[: max_len - 1] + "…"


def format_table(headers: list[str], rows: list[list[str]]) -> str:
    """
    Render a plain-text table with aligned columns.

    Example output:
        NAME               STATUS    RESTARTS
        ─────────────────  ────────  ────────
        nginx-abc          Running   0
        worker-xyz         Failed    3
    """
    if not rows:
        return "(no data)"

    # compute column widths
    col_widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            if i < len(col_widths):
                col_widths[i] = max(col_widths[i], len(str(cell)))

    def _fmt_row(cells: list[str]) -> str:
        parts = []
        for i, cell in enumerate(cells):
            w = col_widths[i] if i < len(col_widths) else len(str(cell))
            parts.append(str(cell).ljust(w))
        return "  ".join(parts)

    separator = "  ".join("─" * w for w in col_widths)
    lines = [_fmt_row(headers), separator]
    for row in rows:
        lines.append(_fmt_row(row))
    return "\n".join(lines)
