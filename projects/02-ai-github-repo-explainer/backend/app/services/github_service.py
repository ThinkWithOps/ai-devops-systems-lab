import base64
import logging
import re
import time
from typing import Optional

import requests

from app.config import get_settings

logger = logging.getLogger(__name__)

# Files to always prioritize fetching first
PRIORITY_FILES = {
    "README.md", "readme.md", "README.rst",
    "package.json", "requirements.txt", "setup.py", "setup.cfg",
    "pyproject.toml", "Cargo.toml", "go.mod", "pom.xml", "build.gradle",
    "docker-compose.yml", "docker-compose.yaml", "Dockerfile",
    "main.py", "app.py", "index.js", "index.ts", "main.js", "main.ts",
    "server.py", "server.js", "server.ts", "wsgi.py", "asgi.py",
    ".env.example", "Makefile",
}

# Extensions to exclude (binary, media, lock files)
EXCLUDED_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".bmp",
    ".pdf", ".zip", ".tar", ".gz", ".rar", ".7z",
    ".woff", ".woff2", ".ttf", ".eot",
    ".lock", ".sum",
    ".min.js", ".min.css",
    ".map",
    ".pyc", ".pyo", ".pyd",
    ".so", ".dll", ".dylib", ".exe",
    ".bin", ".dat",
}

# Directories to exclude entirely
EXCLUDED_DIRS = {
    "node_modules", ".git", "dist", "build", ".next", "__pycache__",
    ".pytest_cache", "vendor", "venv", ".venv", "env", ".env",
    "coverage", ".coverage", "htmlcov", "site-packages",
    "target", "out", ".nuxt", ".cache", "tmp", ".tmp",
}

MAX_FILE_SIZE_BYTES = 50 * 1024  # 50KB
MAX_FILES_TO_FETCH = 50


class GitHubService:
    def __init__(self):
        self.settings = get_settings()
        self.base_url = "https://api.github.com"
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "AI-GitHub-Repo-Explainer/1.0",
        }
        if self.settings.github_token:
            self.headers["Authorization"] = f"token {self.settings.github_token}"

    def parse_repo_url(self, url: str) -> tuple[str, str]:
        """Parse a GitHub URL into (owner, repo). Raises ValueError on invalid URLs."""
        url = url.rstrip("/")
        # Handle https://github.com/owner/repo and https://github.com/owner/repo.git
        match = re.match(r"https://github\.com/([^/]+)/([^/]+?)(?:\.git)?$", url)
        if not match:
            raise ValueError(f"Cannot parse GitHub URL: {url!r}. Expected format: https://github.com/owner/repo")
        return match.group(1), match.group(2)

    def _get(self, path: str) -> dict | list:
        """Make a GitHub API GET request with rate-limit handling."""
        url = f"{self.base_url}{path}"
        resp = requests.get(url, headers=self.headers, timeout=15)

        if resp.status_code == 403:
            reset_ts = int(resp.headers.get("X-RateLimit-Reset", 0))
            wait = max(0, reset_ts - int(time.time()))
            raise RuntimeError(
                f"GitHub API rate limit exceeded. Resets in {wait}s. "
                "Set GITHUB_TOKEN in .env for 5000 req/hr."
            )
        if resp.status_code == 404:
            raise ValueError(f"GitHub resource not found: {path}")
        resp.raise_for_status()
        return resp.json()

    def fetch_repo_metadata(self, owner: str, repo: str) -> dict:
        """Fetch repo metadata: stars, forks, language, description, topics, last commit."""
        try:
            data = self._get(f"/repos/{owner}/{repo}")
            # Fetch topics separately (requires Accept header tweak)
            topics_resp = requests.get(
                f"{self.base_url}/repos/{owner}/{repo}/topics",
                headers={**self.headers, "Accept": "application/vnd.github.mercy-preview+json"},
                timeout=10,
            )
            topics = topics_resp.json().get("names", []) if topics_resp.ok else []

            return {
                "owner": owner,
                "repo": repo,
                "full_name": data.get("full_name", f"{owner}/{repo}"),
                "description": data.get("description") or "",
                "stars": data.get("stargazers_count", 0),
                "forks": data.get("forks_count", 0),
                "watchers": data.get("watchers_count", 0),
                "language": data.get("language") or "Unknown",
                "topics": topics,
                "license": data.get("license", {}).get("name") if data.get("license") else None,
                "default_branch": data.get("default_branch", "main"),
                "created_at": data.get("created_at"),
                "updated_at": data.get("updated_at"),
                "open_issues": data.get("open_issues_count", 0),
                "html_url": data.get("html_url", f"https://github.com/{owner}/{repo}"),
            }
        except Exception as e:
            logger.error(f"Failed to fetch metadata for {owner}/{repo}: {e}")
            raise

    async def fetch_repo_tree(self, owner: str, repo: str) -> list[dict]:
        """Fetch the full recursive file tree for a repo, filtered to text files only."""
        try:
            # Get default branch first
            repo_data = self._get(f"/repos/{owner}/{repo}")
            default_branch = repo_data.get("default_branch", "main")

            # Fetch full tree recursively
            tree_data = self._get(
                f"/repos/{owner}/{repo}/git/trees/{default_branch}?recursive=1"
            )
            items = tree_data.get("tree", [])

            filtered = []
            for item in items:
                path = item.get("path", "")
                item_type = item.get("type", "")  # "blob" or "tree"

                # Skip directories
                if item_type == "tree":
                    continue

                # Skip excluded directories
                parts = path.split("/")
                if any(part in EXCLUDED_DIRS for part in parts):
                    continue

                # Skip excluded extensions
                lower_path = path.lower()
                if any(lower_path.endswith(ext) for ext in EXCLUDED_EXTENSIONS):
                    continue

                filtered.append({
                    "path": path,
                    "type": item_type,
                    "size": item.get("size", 0),
                })

            return filtered
        except Exception as e:
            logger.error(f"Failed to fetch tree for {owner}/{repo}: {e}")
            raise

    def fetch_file_content(self, owner: str, repo: str, path: str) -> Optional[str]:
        """Fetch a single file's content, base64-decoded. Returns None if too large or binary."""
        try:
            data = self._get(f"/repos/{owner}/{repo}/contents/{path}")

            if isinstance(data, list):
                # Directory listing — skip
                return None

            size = data.get("size", 0)
            if size > MAX_FILE_SIZE_BYTES:
                logger.debug(f"Skipping {path}: too large ({size} bytes > {MAX_FILE_SIZE_BYTES})")
                return None

            encoding = data.get("encoding")
            content = data.get("content", "")

            if encoding == "base64":
                try:
                    decoded = base64.b64decode(content).decode("utf-8", errors="replace")
                    return decoded
                except Exception:
                    return None
            elif encoding == "none":
                # Large file with no content inline — skip
                return None
            else:
                return content
        except ValueError:
            return None
        except Exception as e:
            logger.debug(f"Failed to fetch {path}: {e}")
            return None

    def select_files_to_fetch(self, tree_items: list[dict]) -> list[dict]:
        """
        Intelligently select up to MAX_FILES_TO_FETCH files.
        Priority files come first, then remaining sorted by importance heuristic.
        """
        priority = []
        rest = []

        for item in tree_items:
            filename = item["path"].split("/")[-1]
            if filename in PRIORITY_FILES:
                priority.append(item)
            else:
                rest.append(item)

        # Sort rest by: shorter paths first (root files > nested), then by file extension preference
        def score(item: dict) -> tuple:
            path = item["path"]
            depth = path.count("/")
            name = path.split("/")[-1].lower()
            # Prefer source code files
            preferred_exts = {".py", ".js", ".ts", ".go", ".rs", ".java", ".rb", ".php", ".cs", ".cpp", ".c"}
            ext = "." + name.split(".")[-1] if "." in name else ""
            ext_score = 0 if ext in preferred_exts else 1
            return (depth, ext_score, path)

        rest_sorted = sorted(rest, key=score)

        selected = priority + rest_sorted
        return selected[:MAX_FILES_TO_FETCH]
