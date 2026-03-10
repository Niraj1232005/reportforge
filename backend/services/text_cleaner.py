import re

def clean_text(text: str) -> str:
    if not text:
        return ""

    # Normalize line endings
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Remove 'Page X' or 'Page X of Y'
    text = re.sub(r"Page\s+\d+(\s+of\s+\d+)?", "", text, flags=re.IGNORECASE)

    # Remove multiple spaces
    text = re.sub(r"[ \t]+", " ", text)

    # Remove trailing spaces on each line
    text = "\n".join(line.strip() for line in text.split("\n"))

    # Collapse excessive blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()
