from PIL import Image
import pytesseract
from pathlib import Path

pytesseract.pytesseract.tesseract_cmd = r"C:\Users\ratho\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"

def extract_image_text(path: Path) -> str:
    img = Image.open(path)
    text = pytesseract.image_to_string(img)
    return text
