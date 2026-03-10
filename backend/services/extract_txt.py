from pathlib import Path

def extract_txt_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except:
        # fallback for weird encodings
        return path.read_text(errors="ignore")
