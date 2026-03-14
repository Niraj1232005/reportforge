from flask import Flask, request, jsonify, send_file,send_from_directory
import uuid
from pathlib import Path
import os
from html import escape
import re

from services.extract_pdf import extract_pdf_text
from services.extract_docx import extract_docx_text
from services.extract_image import extract_image_text
from services.extract_txt import extract_txt_text
from services.text_cleaner import clean_text
from services.report_builder import build_structured_report
from formatting.formatter import create_professional_docx, create_editor_docx, tiptap_document_to_blocks
from flask_cors import CORS
from docx import Document as DocxDocument
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph


app = Flask(__name__, static_folder="../frontend")
CORS(
    app,
    origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)

BASE_DIR = Path(__file__).resolve().parent

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "jpg", "jpeg", "png"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


def _iter_docx_blocks(document: DocxDocument):
    for child in document.element.body.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, document)
        elif isinstance(child, CT_Tbl):
            yield Table(child, document)


def _docx_to_editor_blocks(path: Path):
    document = DocxDocument(path)
    blocks = []
    detected_title = None

    for item in _iter_docx_blocks(document):
        if isinstance(item, Paragraph):
            text = (item.text or "").strip()
            if not text:
                continue

            style_name = (item.style.name or "").strip().lower() if item.style else ""
            block_id = str(uuid.uuid4())

            if style_name.startswith("heading 1"):
                blocks.append({"id": block_id, "type": "heading1", "html": escape(text)})
                if detected_title is None:
                    detected_title = text
                continue
            if style_name.startswith("heading 2"):
                blocks.append({"id": block_id, "type": "heading2", "html": escape(text)})
                continue
            if style_name.startswith("heading 3"):
                blocks.append({"id": block_id, "type": "heading3", "html": escape(text)})
                continue
            if "list bullet" in style_name:
                blocks.append({"id": block_id, "type": "bullet_list", "html": f"<ul><li>{escape(text)}</li></ul>"})
                continue
            if "list number" in style_name:
                blocks.append({"id": block_id, "type": "numbered_list", "html": f"<ol><li>{escape(text)}</li></ol>"})
                continue

            blocks.append({"id": block_id, "type": "paragraph", "html": escape(text)})
            if detected_title is None:
                detected_title = text
            continue

        if isinstance(item, Table):
            rows = []
            for row in item.rows:
                rows.append([(cell.text or "").strip() for cell in row.cells])

            if rows:
                blocks.append({"id": str(uuid.uuid4()), "type": "table", "rows": rows})

    if not blocks:
        blocks = [{"id": str(uuid.uuid4()), "type": "paragraph", "html": ""}]

    return blocks, detected_title


def _strip_html_text(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", str(value or ""))
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _blocks_to_tiptap_doc(blocks):
    content = []

    for block in blocks:
        if not isinstance(block, dict):
            continue

        block_type = str(block.get("type") or "").strip().lower()

        if block_type in {"heading1", "heading2", "heading3"}:
            level = 1 if block_type == "heading1" else 2 if block_type == "heading2" else 3
            heading_text = _strip_html_text(block.get("html") or block.get("content") or "")
            content.append(
                {
                    "type": "heading",
                    "attrs": {"level": level},
                    "content": [{"type": "text", "text": heading_text}] if heading_text else [],
                }
            )
            continue

        if block_type == "paragraph":
            paragraph_text = _strip_html_text(block.get("html") or block.get("content") or "")
            content.append(
                {
                    "type": "paragraph",
                    "content": [{"type": "text", "text": paragraph_text}] if paragraph_text else [],
                }
            )
            continue

        if block_type in {"bullet_list", "numbered_list"}:
            item_text = _strip_html_text(block.get("html") or block.get("content") or "") or "List item"
            list_type = "bulletList" if block_type == "bullet_list" else "orderedList"
            content.append(
                {
                    "type": list_type,
                    "content": [
                        {
                            "type": "listItem",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [{"type": "text", "text": item_text}],
                                }
                            ],
                        }
                    ],
                }
            )
            continue

        if block_type == "quote":
            quote_text = _strip_html_text(block.get("html") or block.get("content") or "")
            content.append(
                {
                    "type": "blockquote",
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [{"type": "text", "text": quote_text}] if quote_text else [],
                        }
                    ],
                }
            )
            continue

        if block_type == "code":
            code_text = str(block.get("code") or "")
            content.append(
                {
                    "type": "codeBlock",
                    "content": [{"type": "text", "text": code_text}] if code_text else [],
                }
            )
            continue

        if block_type == "table":
            rows = block.get("rows")
            if not isinstance(rows, list) or not rows:
                continue
            table_rows = []
            for row in rows:
                if not isinstance(row, list):
                    continue
                table_cells = []
                for cell in row:
                    cell_text = str(cell or "")
                    table_cells.append(
                        {
                            "type": "tableCell",
                            "content": [
                                {
                                    "type": "paragraph",
                                    "content": [{"type": "text", "text": cell_text}] if cell_text else [],
                                }
                            ],
                        }
                    )
                if table_cells:
                    table_rows.append({"type": "tableRow", "content": table_cells})
            if table_rows:
                content.append({"type": "table", "content": table_rows})
            continue

        if block_type == "image":
            source = str(block.get("source") or "").strip()
            if not source:
                continue
            caption = str(block.get("caption") or "Figure").strip() or "Figure"
            width = block.get("width")
            width_percent = f"{int(width)}%" if isinstance(width, (int, float)) else "75%"
            content.append(
                {
                    "type": "image",
                    "attrs": {
                        "src": source,
                        "alt": caption,
                        "title": caption,
                        "width": width_percent,
                    },
                }
            )
            continue

        if block_type == "page_break":
            content.append({"type": "pageBreak"})
            continue

    if not content:
        content = [{"type": "paragraph"}]

    return {"type": "doc", "content": content}


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
    data = request.get_json(silent=True) or {}
    blocks = data.get("blocks")
    sections = data.get("sections")
    document = data.get("document")
    images = data.get("images")
    comments = data.get("comments")
    title_page = data.get("titlePage")

    valid_blocks = [block for block in blocks if isinstance(block, dict)] if isinstance(blocks, list) else []
    if not valid_blocks and isinstance(document, dict):
        valid_blocks = tiptap_document_to_blocks(document)
    valid_sections = [section for section in sections if isinstance(section, dict)] if isinstance(sections, list) else []
    image_lookup = images if isinstance(images, dict) else {}
    valid_comments = [comment for comment in comments if isinstance(comment, dict)] if isinstance(comments, list) else []
    valid_title_page = title_page if isinstance(title_page, dict) else {}

    if not valid_blocks and not valid_sections:
        return jsonify({"error": "Provide a non-empty list of blocks or sections."}), 400

    file_id = str(uuid.uuid4())
    path = OUTPUT_DIR / f"{file_id}_report.docx"

    create_editor_docx(
        sections=valid_sections if valid_sections else None,
        blocks=valid_blocks if valid_blocks else None,
        output_path=path,
        document_title=data.get("title", "REPORT"),
        image_lookup=image_lookup,
        comments=valid_comments if valid_comments else None,
        title_page=valid_title_page if valid_title_page else None,
    )

    return send_file(
        path,
        as_attachment=True,
        download_name="report.docx"
    )


@app.route("/upload-docx", methods=["POST"])
def upload_docx():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if "." not in file.filename or file.filename.rsplit(".", 1)[1].lower() != "docx":
        return jsonify({"error": "Only DOCX files are supported for this endpoint."}), 400

    upload_id = str(uuid.uuid4())
    save_path = UPLOAD_DIR / f"{upload_id}.docx"
    file.save(save_path)

    try:
        blocks, title = _docx_to_editor_blocks(save_path)
    except Exception as error:
        return jsonify({"error": f"Unable to parse DOCX: {error}"}), 400

    return jsonify({
        "title": title or Path(file.filename).stem.replace("_", " "),
        "blocks": blocks,
        "document": _blocks_to_tiptap_doc(blocks),
        "titlePage": {
            "collegeName": "College Name",
            "studentName": "Student Name",
            "courseName": "",
            "logoImageId": "",
            "logoWidth": 40,
        },
    })

if __name__ == "__main__":
    app.run(debug=True, port=5000)
