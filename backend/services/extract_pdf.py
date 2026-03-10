import pdfplumber
from pathlib import Path
import pytesseract
from PIL import Image

def extract_pdf_text(path: Path) -> str:
    extracted_text = []

    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()

            # Case 1: Normal text-based PDF
            if page_text and page_text.strip():
                extracted_text.append(page_text)
            else:
                # Case 2: Scanned PDF → OCR fallback
                page_image = page.to_image(resolution=300).original
                ocr_text = pytesseract.image_to_string(page_image)
                if ocr_text.strip():
                    extracted_text.append(ocr_text)

    return "\n".join(extracted_text).strip()
