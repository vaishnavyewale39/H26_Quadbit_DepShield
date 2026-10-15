import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Load .env if present in backend or root
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

class Settings(BaseModel):
    PROJECT_NAME: str = "DepShield"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    GEMMA_API_KEY: str = os.getenv("GEMMA_API_KEY", "")
    GEMMA_MODEL: str = os.getenv("GEMMA_MODEL", "gemini-2.0-flash")
    GEMMA_API_BASE: str = os.getenv("GEMMA_API_BASE", "https://generativelanguage.googleapis.com/v1beta")
    GITHUB_TOKEN: str = os.getenv("GITHUB_TOKEN", "")
    WORKSPACE_TEMP_DIR: Path = Path(__file__).resolve().parent.parent.parent / "temp_repos"
    REPORT_DIR: Path = Path(__file__).resolve().parent.parent.parent / "generated_reports"

settings = Settings()
settings.WORKSPACE_TEMP_DIR.mkdir(parents=True, exist_ok=True)
settings.REPORT_DIR.mkdir(parents=True, exist_ok=True)
