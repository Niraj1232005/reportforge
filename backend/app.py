from flask import Flask, request, jsonify, send_file,send_from_directory
import uuid
from pathlib import Path
import os
from docx import Document

from services.extract_pdf import extract_pdf_text
from services.extract_docx import extract_docx_text
from services.extract_image import extract_image_text
from services.extract_txt import extract_txt_text
from services.text_cleaner import clean_text
from services.report_builder import build_structured_report
from formatting.formatter import create_professional_docx
from flask_cors import CORS


app = Flask(__name__, static_folder="../frontend")
CORS(app, origins=["http://localhost:3000"])

BASE_DIR = Path(__file__).resolve().parent

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "jpg", "jpeg", "png"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


@app.route("/")
def home():
    return send_from_directory("../frontend", "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory("../frontend", filename)


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


# -----------------------------
# UPLOAD & PREVIEW
# -----------------------------
@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed"}), 400

    # Size check
    file.seek(0, os.SEEK_END)
    size = file.tell()
    file.seek(0)

    if size > MAX_FILE_SIZE:
        return jsonify({"error": "File too large"}), 413

    ext = file.filename.rsplit(".", 1)[1].lower()
    upload_id = str(uuid.uuid4())
    save_path = UPLOAD_DIR / f"{upload_id}.{ext}"
    file.save(save_path)

    # Extract text
    if ext == "pdf":
        raw_text = extract_pdf_text(save_path)
    elif ext == "docx":
        raw_text = extract_docx_text(save_path)
    elif ext in {"jpg", "jpeg", "png"}:
        raw_text = extract_image_text(save_path)
    elif ext == "txt":
        raw_text = extract_txt_text(save_path)
    else:
        return jsonify({"error": "Unsupported file type"}), 400

    cleaned_text = clean_text(raw_text)

    return jsonify({"text": cleaned_text})


# -----------------------------
# DOWNLOAD STRUCTURED REPORT
# -----------------------------
@app.route("/download", methods=["POST"])
def download():
    data = request.json
    raw_text = data.get("text")

    if not raw_text:
        return jsonify({"error": "No text provided"}), 400

    structured = build_structured_report(raw_text)

    file_id = str(uuid.uuid4())
    output_file = OUTPUT_DIR / f"{file_id}.docx"

    create_professional_docx(structured, output_file)

    return send_file(
        output_file,
        as_attachment=True,
        download_name="structured_lab_report.docx"
    )


@app.route("/generate-doc", methods=["POST"])
def generate_doc():

    data = request.json
    sections = data.get("sections")

    doc = Document()

    for i, section in enumerate(sections):

        doc.add_heading(f"{i+1}. {section['title']}", level=1)

        doc.add_paragraph(section["content"])

    path = OUTPUT_DIR / "report.docx"

    doc.save(path)

    return send_file(
        path,
        as_attachment=True,
        download_name="report.docx"
    )

if __name__ == "__main__":
    app.run(debug=True, port=5000)