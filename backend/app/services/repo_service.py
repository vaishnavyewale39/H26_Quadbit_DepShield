import os
import re
import json
import uuid
import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Any
import toml

from app.core.config import settings
from app.schemas.models import DependencyItem, SourceUsage

class RepoService:
    def __init__(self):
        self.temp_base = settings.WORKSPACE_TEMP_DIR

    def _get_local_workspace_repo(self) -> Tuple[Optional[Path], Optional[str]]:
        """
        Detects if current workspace is a git repository and returns (path, repo_slug e.g. 'vaishnavyewale39/H26_Quadbit_DepShield').
        """
        try:
            workspace_root = Path(__file__).resolve().parent.parent.parent.parent
            res = subprocess.run(
                ["git", "remote", "get-url", "origin"],
                cwd=str(workspace_root),
                capture_output=True,
                text=True
            )
            if res.returncode == 0:
                url = res.stdout.strip()
                m = re.search(r"github\.com[/:]([a-zA-Z0-9_\-\.]+)/([a-zA-Z0-9_\-\.]+?)(?:\.git|/)?$", url)
                if m:
                    return workspace_root, f"{m.group(1)}/{m.group(2)}"
            return workspace_root, "vaishnavyewale39/H26_Quadbit_DepShield"
        except Exception:
            return None, None

    def validate_url(self, repo_url: str) -> str:
        url = repo_url.strip()
        if not url:
            raise ValueError("Repository URL cannot be empty.")

        # Handle local workspace shortcuts
        if url.lower() in [".", "local", "current", "workspace", "self"]:
            ws_path, ws_repo = self._get_local_workspace_repo()
            if ws_repo:
                return f"https://github.com/{ws_repo}"
            return "https://github.com/local/workspace"

        # Clean accidental wrapping quotes or markdown characters
        url = url.strip("\"'<>[]()")

        # Normalize protocols
        url = re.sub(r"^git\+https?:\/\/", "https://", url)
        url = re.sub(r"^git:\/\/", "https://", url)

        # Support shorthand 'owner/repo'
        if re.match(r"^[a-zA-Z0-9_\-\.]+\/[a-zA-Z0-9_\-\.]+$", url):
            url = f"https://github.com/{url}"

        # If user pasted without protocol e.g. 'github.com/owner/repo'
        if url.startswith("github.com/"):
            url = f"https://{url}"

        # Strip tree/branch or commit subpaths
        url = re.sub(r"/(?:tree|blob|commits)/.*$", "", url)
        url = url.rstrip("/")
        if url.endswith(".git"):
            url = url[:-4]

        # Extract owner and repo
        pattern = r"^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_\-\.]+)\/([a-zA-Z0-9_\-\.]+)$"
        match = re.match(pattern, url)
        if not match:
            raise ValueError(f"Invalid GitHub repository URL: '{repo_url}'. Please provide a valid format like 'https://github.com/owner/repo' or 'owner/repo'.")

        owner = match.group(1)
        repo = match.group(2)
        return f"https://github.com/{owner}/{repo}"

    def extract_repo_name(self, repo_url: str) -> str:
        parts = repo_url.strip("/").split("/")
        if len(parts) >= 2:
            return f"{parts[-2]}/{parts[-1]}"
        return repo_url

    def clone_repository(self, clean_url: str) -> Tuple[Path, str, str]:
        unique_id = str(uuid.uuid4())[:8]
        repo_name = clean_url.split("/")[-1].replace(".git", "")
        target_dir = self.temp_base / f"{repo_name}_{unique_id}"

        ws_path, ws_repo = self._get_local_workspace_repo()
        is_current_workspace = False
        if ws_path and (
            clean_url == "https://github.com/local/workspace"
            or (ws_repo and clean_url.endswith(f"/{ws_repo}"))
        ):
            is_current_workspace = True

        clone_succeeded = False
        clone_err = ""

        # If the target is the local project workspace, copy locally for instant offline analysis
        if is_current_workspace and ws_path and ws_path.exists():
            try:
                def _ignore(src, names):
                    ignored = set()
                    for n in names:
                        if n in ["node_modules", ".venv", "venv", "__pycache__", "temp_repos", "generated_reports", ".git"]:
                            ignored.add(n)
                    return ignored
                shutil.copytree(ws_path, target_dir, ignore=_ignore)
                clone_succeeded = True
            except Exception as ex:
                clone_err = f"Failed to acquire local workspace: {str(ex)}"

        if not clone_succeeded:
            git_env = os.environ.copy()
            git_env["GIT_TERMINAL_PROMPT"] = "0"
            git_env["GIT_ASKPASS"] = ""

            github_token = os.getenv("GITHUB_TOKEN", "").strip() or (settings.GITHUB_TOKEN if hasattr(settings, "GITHUB_TOKEN") else "")
            clone_url = clean_url
            if github_token and "github.com" in clean_url:
                parts = clean_url.replace("https://", "").replace("http://", "")
                clone_url = f"https://x-access-token:{github_token}@{parts}.git"

            cmd = [
                "git",
                "-c", "credential.helper=",
                "-c", "core.askPass=",
                "clone",
                "--depth", "1",
                clone_url,
                str(target_dir)
            ]

            try:
                subprocess.run(cmd, env=git_env, capture_output=True, text=True, timeout=120, check=True)
                clone_succeeded = True
            except subprocess.TimeoutExpired:
                clone_err = "Repository clone timed out after 120 seconds. Check your network connection."
            except subprocess.CalledProcessError as e:
                clone_err = e.stderr.strip() or e.stdout.strip() or str(e)

        if not clone_succeeded:
            if target_dir.exists():
                shutil.rmtree(target_dir, ignore_errors=True)
            if "Authentication failed" in clone_err or "could not read Username" in clone_err or "Repository not found" in clone_err:
                raise RuntimeError(
                    f"Unable to access '{clean_url}'. The repository may be private, require authentication, or not exist. "
                    "For private repositories, add your GITHUB_TOKEN to backend/.env, or test with public repositories."
                )
            raise RuntimeError(f"Git clone failed: {clone_err}")

        # Get commit hash and branch
        try:
            commit_res = subprocess.run(["git", "rev-parse", "HEAD"], cwd=str(target_dir), capture_output=True, text=True, check=True)
            commit_hash = commit_res.stdout.strip()
        except Exception:
            commit_hash = "local_head"

        try:
            branch_res = subprocess.run(["git", "branch", "--show-current"], cwd=str(target_dir), capture_output=True, text=True, check=True)
            branch = branch_res.stdout.strip() or "main"
        except Exception:
            branch = "main"

        return target_dir, commit_hash, branch

    def discover_manifests(self, repo_path: Path) -> List[str]:
        target_filenames = [
            "pyproject.toml",
            "requirements.txt",
            "requirements-dev.txt",
            "Pipfile",
            "poetry.lock",
            "uv.lock",
            "package.json",
            "package-lock.json",
            "pnpm-lock.yaml",
            "yarn.lock",
            "Cargo.toml",
            "Cargo.lock",
            "go.mod",
            "go.sum"
        ]
        found = []
        for root, dirs, files in os.walk(repo_path):
            # Skip hidden dirs or build caches
            dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ["node_modules", "venv", ".venv", "dist", "build", "target"]]
            for f in files:
                if f in target_filenames:
                    rel = os.path.relpath(os.path.join(root, f), repo_path).replace("\\", "/")
                    found.append(rel)
        return sorted(found)

    def detect_primary_ecosystem(self, discovered_manifests: List[str]) -> str:
        for m in discovered_manifests:
            if any(p in m for p in ["pyproject.toml", "requirements.txt", "Pipfile", "poetry.lock"]):
                return "python"
            if any(p in m for p in ["package.json", "package-lock.json", "yarn.lock"]):
                return "javascript"
            if any(p in m for p in ["Cargo.toml", "Cargo.lock"]):
                return "rust"
            if any(p in m for p in ["go.mod", "go.sum"]):
                return "go"
        return "generic"

    def parse_manifests(self, repo_path: Path, manifests: List[str]) -> Tuple[List[Dict[str, Any]], List[str], List[str]]:
        parsed_files = []
        parsing_errors = []
        all_deps: Dict[str, Dict[str, Any]] = {}

        for rel_path in manifests:
            full_path = repo_path / rel_path
            filename = os.path.basename(rel_path)
            try:
                if filename in ["requirements.txt", "requirements-dev.txt"]:
                    parsed = self._parse_requirements_txt(full_path, rel_path)
                    for d in parsed:
                        key = f"{d['ecosystem']}:{d['name'].lower()}"
                        if key not in all_deps or not all_deps[key].get("declared_version"):
                            all_deps[key] = d
                    parsed_files.append(rel_path)

                elif filename == "pyproject.toml":
                    parsed = self._parse_pyproject_toml(full_path, rel_path)
                    for d in parsed:
                        key = f"{d['ecosystem']}:{d['name'].lower()}"
                        all_deps[key] = d
                    parsed_files.append(rel_path)

                elif filename == "Pipfile":
                    parsed = self._parse_pipfile(full_path, rel_path)
                    for d in parsed:
                        key = f"{d['ecosystem']}:{d['name'].lower()}"
                        all_deps[key] = d
                    parsed_files.append(rel_path)

                elif filename == "package.json":
                    parsed = self._parse_package_json(full_path, rel_path)
                    for d in parsed:
                        key = f"{d['ecosystem']}:{d['name'].lower()}"
                        all_deps[key] = d
                    parsed_files.append(rel_path)

                elif filename == "package-lock.json":
                    self._augment_package_lock(full_path, all_deps)
                    parsed_files.append(rel_path)

                elif filename == "Cargo.toml":
                    parsed = self._parse_cargo_toml(full_path, rel_path)
                    for d in parsed:
                        key = f"{d['ecosystem']}:{d['name'].lower()}"
                        all_deps[key] = d
                    parsed_files.append(rel_path)

                elif filename == "go.mod":
                    parsed = self._parse_go_mod(full_path, rel_path)
                    for d in parsed:
                        key = f"{d['ecosystem']}:{d['name'].lower()}"
                        all_deps[key] = d
                    parsed_files.append(rel_path)

            except Exception as e:
                parsing_errors.append(f"Failed to parse {rel_path}: {str(e)}")

        return list(all_deps.values()), parsed_files, parsing_errors

    def _parse_requirements_txt(self, path: Path, rel_path: str) -> List[Dict[str, Any]]:
        deps = []
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or line.startswith("-") or line.startswith("git+"):
                    continue
                # Split at comment
                line = line.split("#")[0].strip()
                # Split version specifiers: ==, >=, <=, ~=, !=, >, <
                match = re.split(r"(==|>=|<=|~=|!=|>|<)", line, maxsplit=1)
                if match:
                    name = match[0].strip()
                    ver = ("".join(match[1:])).strip() if len(match) > 1 else "*"
                    # clean environment markers like ; python_version > '3.8'
                    if ";" in ver:
                        ver = ver.split(";")[0].strip()
                    deps.append({
                        "name": name,
                        "ecosystem": "python",
                        "declared_version": ver or "*",
                        "resolved_version": ver.replace("==", "") if "==" in ver else None,
                        "manifest_path": rel_path,
                        "dependency_type": "dev" if "dev" in rel_path.lower() else "runtime"
                    })
        return deps

    def _parse_pyproject_toml(self, path: Path, rel_path: str) -> List[Dict[str, Any]]:
        deps = []
        data = toml.load(str(path))
        # Standard PEP 621 dependencies
        project_deps = data.get("project", {}).get("dependencies", [])
        for item in project_deps:
            match = re.split(r"(==|>=|<=|~=|!=|>|<)", item, maxsplit=1)
            if match:
                name = match[0].strip()
                ver = ("".join(match[1:])).strip() if len(match) > 1 else "*"
                deps.append({
                    "name": name,
                    "ecosystem": "python",
                    "declared_version": ver,
                    "resolved_version": ver.replace("==", "") if "==" in ver else None,
                    "manifest_path": rel_path,
                    "dependency_type": "runtime"
                })

        # Poetry dependencies
        poetry_deps = data.get("tool", {}).get("poetry", {}).get("dependencies", {})
        for name, spec in poetry_deps.items():
            if name.lower() == "python":
                continue
            ver = spec if isinstance(spec, str) else str(spec.get("version", "*"))
            deps.append({
                "name": name,
                "ecosystem": "python",
                "declared_version": ver,
                "resolved_version": None,
                "manifest_path": rel_path,
                "dependency_type": "runtime"
            })
        return deps

    def _parse_pipfile(self, path: Path, rel_path: str) -> List[Dict[str, Any]]:
        deps = []
        data = toml.load(str(path))
        for name, spec in data.get("packages", {}).items():
            ver = spec if isinstance(spec, str) else str(spec.get("version", "*"))
            deps.append({
                "name": name,
                "ecosystem": "python",
                "declared_version": ver,
                "resolved_version": None,
                "manifest_path": rel_path,
                "dependency_type": "runtime"
            })
        for name, spec in data.get("dev-packages", {}).items():
            ver = spec if isinstance(spec, str) else str(spec.get("version", "*"))
            deps.append({
                "name": name,
                "ecosystem": "python",
                "declared_version": ver,
                "resolved_version": None,
                "manifest_path": rel_path,
                "dependency_type": "dev"
            })
        return deps

    def _parse_package_json(self, path: Path, rel_path: str) -> List[Dict[str, Any]]:
        deps = []
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            data = json.load(f)

        for name, ver in data.get("dependencies", {}).items():
            deps.append({
                "name": name,
                "ecosystem": "javascript",
                "declared_version": str(ver),
                "resolved_version": None,
                "manifest_path": rel_path,
                "dependency_type": "runtime"
            })
        for name, ver in data.get("devDependencies", {}).items():
            deps.append({
                "name": name,
                "ecosystem": "javascript",
                "declared_version": str(ver),
                "resolved_version": None,
                "manifest_path": rel_path,
                "dependency_type": "dev"
            })
        return deps

    def _augment_package_lock(self, path: Path, all_deps: Dict[str, Dict[str, Any]]):
        try:
            with open(path, "r", encoding="utf-8", errors="ignore") as f:
                data = json.load(f)
            packages = data.get("packages", {}) or data.get("dependencies", {})
            for key, val in packages.items():
                pkg_name = key.replace("node_modules/", "") if key.startswith("node_modules/") else key
                full_key = f"javascript:{pkg_name.lower()}"
                if full_key in all_deps:
                    resolved = val.get("version")
                    if resolved:
                        all_deps[full_key]["resolved_version"] = resolved
        except Exception:
            pass

    def _parse_cargo_toml(self, path: Path, rel_path: str) -> List[Dict[str, Any]]:
        deps = []
        data = toml.load(str(path))
        for name, spec in data.get("dependencies", {}).items():
            ver = spec if isinstance(spec, str) else str(spec.get("version", "*"))
            deps.append({
                "name": name,
                "ecosystem": "rust",
                "declared_version": ver,
                "resolved_version": None,
                "manifest_path": rel_path,
                "dependency_type": "runtime"
            })
        return deps

    def _parse_go_mod(self, path: Path, rel_path: str) -> List[Dict[str, Any]]:
        deps = []
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            in_require = False
            for line in f:
                line = line.strip()
                if line.startswith("require ("):
                    in_require = True
                    continue
                if in_require and line == ")":
                    in_require = False
                    continue
                if in_require or line.startswith("require "):
                    tokens = line.replace("require ", "").strip().split()
                    if len(tokens) >= 2:
                        deps.append({
                            "name": tokens[0],
                            "ecosystem": "go",
                            "declared_version": tokens[1],
                            "resolved_version": tokens[1],
                            "manifest_path": rel_path,
                            "dependency_type": "runtime"
                        })
        return deps

    def scan_source_code_usages(self, repo_path: Path, dependencies: List[Dict[str, Any]]) -> Dict[str, List[SourceUsage]]:
        """
        Scans source files across the repo for actual import and require usages of dependencies.
        """
        code_extensions = {".py", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".rs", ".go", ".html", ".sh"}
        usages: Dict[str, List[SourceUsage]] = {d["name"]: [] for d in dependencies}

        # Build regex patterns for dependencies
        dep_patterns = {}
        for d in dependencies:
            name = d["name"]
            # python normalization (e.g., beautifulsoup4 -> bs4, pyyaml -> yaml, scikit-learn -> sklearn)
            aliases = [name, name.replace("-", "_")]
            if name.lower() == "beautifulsoup4":
                aliases.extend(["bs4", "BeautifulSoup"])
            elif name.lower() == "scikit-learn":
                aliases.append("sklearn")
            elif name.lower() == "pyyaml":
                aliases.append("yaml")
            elif name.lower() == "pillow":
                aliases.append("PIL")
            elif name.lower() == "opencv-python":
                aliases.append("cv2")

            escaped = [re.escape(a) for a in aliases]
            # Match python: import X, from X import, or JS: import ... from 'X', require('X')
            p = re.compile(r"(?:import\s+(?:.*,\s*)?(?:" + "|".join(escaped) + r")(?:\s+as\s+\w+)?|"
                           r"from\s+(?:" + "|".join(escaped) + r")(?:\.[\w\.]+)?\s+import|"
                           r"require\s*\(\s*['\"](?:" + "|".join(escaped) + r")(?:\/.*)?['\"]\)|"
                           r"import\s+.*['\"](?:" + "|".join(escaped) + r")(?:\/.*)?['\"])", re.IGNORECASE)
            dep_patterns[name] = p

        for root, dirs, files in os.walk(repo_path):
            dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ["node_modules", "venv", ".venv", "dist", "build", "target", "__pycache__"]]
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext not in code_extensions:
                    continue
                file_full = Path(root) / file
                rel_path = os.path.relpath(file_full, repo_path).replace("\\", "/")

                try:
                    with open(file_full, "r", encoding="utf-8", errors="ignore") as f:
                        lines = f.readlines()
                    for idx, line in enumerate(lines, 1):
                        stripped = line.strip()
                        if not stripped or stripped.startswith(("#", "//", "/*", "*")):
                            continue
                        for dep_name, pat in dep_patterns.items():
                            if pat.search(stripped):
                                usages[dep_name].append(SourceUsage(
                                    file_path=rel_path,
                                    line_number=idx,
                                    code_snippet=stripped[:180],
                                    usage_type="import"
                                ))
                except Exception:
                    continue

        return usages

    def read_readme(self, repo_path: Path) -> Tuple[Optional[str], Optional[str]]:
        candidates = ["README.md", "readme.md", "README.rst", "README.txt", "README", "readme.markdown"]
        for c in candidates:
            p = repo_path / c
            if p.exists() and p.is_file():
                try:
                    with open(p, "r", encoding="utf-8", errors="ignore") as f:
                        return c, f.read()
                except Exception:
                    pass
        return None, None

repo_service = RepoService()
