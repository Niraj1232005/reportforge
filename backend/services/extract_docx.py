from docx import Document
from pathlib import Path

def extract_docx_text(path: Path) -> str:
    doc = Document(path)
    paragraphs = [p.text for p in doc.paragraphs]
    return "\n".join(paragraphs)
