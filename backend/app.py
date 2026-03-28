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
try:
    from dotenv import load_dotenv
except ImportError:
    def load_dotenv(*_args, **_kwargs):
        return False

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / "ReportForge" / ".env.local", override=False)


def _split_origins(value: str):
    return [origin.strip() for origin in value.split(",") if origin.strip()]


frontend_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
frontend_origins.extend(
    _split_origins(
        os.getenv("FRONTEND_ORIGINS")
        or os.getenv("NEXT_PUBLIC_SITE_URL")
        or ""
    )
)

app = Flask(__name__, static_folder="frontend")
CORS(
    app,
    origins=frontend_origins,
    methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024 * 1024

UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

OUTPUT_DIR = BASE_DIR / "output"
OUTPUT_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "jpg", "jpeg", "png"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_JSON_PAYLOAD_SIZE = 6 * 1024 * 1024


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


def _sanitize_plain_text(value, fallback: str = "", max_length: int = 200) -> str:
    text = re.sub(r"[\x00-\x1f\x7f]+", " ", str(value or ""))
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return fallback
    return text[:max_length]


def _sanitize_html_fragment(value, max_length: int = 50000) -> str:
    html_value = str(value or "")[:max_length]
    html_value = re.sub(
        r"<\s*(script|style|iframe|object|embed|meta|link)[^>]*>[\s\S]*?<\s*/\s*\1\s*>",
        "",
        html_value,
        flags=re.IGNORECASE,
    )
    html_value = re.sub(r"\son[a-z]+\s*=\s*(['\"]).*?\1", "", html_value, flags=re.IGNORECASE)
    html_value = re.sub(r"\son[a-z]+\s*=\s*[^\s>]+", "", html_value, flags=re.IGNORECASE)
    html_value = re.sub(r"javascript:", "", html_value, flags=re.IGNORECASE)
    return html_value.strip()


def _sanitize_table_rows(rows):
    if not isinstance(rows, list):
        return []

    sanitized_rows = []
    for row in rows[:50]:
        if not isinstance(row, list):
            continue
        sanitized_rows.append([
            _sanitize_plain_text(cell, "", 500) for cell in row[:20]
        ])

    return sanitized_rows


def _sanitize_blocks(blocks):
    if not isinstance(blocks, list):
        return []

    sanitized_blocks = []
    allowed_types = {
        "paragraph",
        "heading1",
        "heading2",
        "heading3",
        "header",
        "footer",
        "bullet_list",
        "numbered_list",
        "quote",
        "code",
        "table",
        "image",
        "page_break",
        "equation",
        "reference",
        "footnote",
    }

    for raw_block in blocks[:1000]:
        if not isinstance(raw_block, dict):
            continue

        block_type = str(raw_block.get("type") or "").strip().lower()
        if block_type not in allowed_types:
            continue

        sanitized_block = {
            "id": _sanitize_plain_text(raw_block.get("id"), "", 80),
            "type": block_type,
        }

        if block_type in {"paragraph", "heading1", "heading2", "heading3", "header", "footer", "bullet_list", "numbered_list", "quote"}:
            sanitized_block["html"] = _sanitize_html_fragment(raw_block.get("html"))
        elif block_type == "code":
            sanitized_block["code"] = str(raw_block.get("code") or "")[:20000]
        elif block_type == "table":
            sanitized_block["rows"] = _sanitize_table_rows(raw_block.get("rows"))
        elif block_type == "image":
            sanitized_block["source"] = str(raw_block.get("source") or "")[:100000]
            sanitized_block["caption"] = _sanitize_plain_text(raw_block.get("caption"), "Figure", 240)
            try:
                sanitized_block["width"] = max(10, min(100, int(raw_block.get("width", 75))))
            except (TypeError, ValueError):
                sanitized_block["width"] = 75
            alignment = str(raw_block.get("alignment") or "center").strip().lower()
            sanitized_block["alignment"] = alignment if alignment in {"left", "center", "right"} else "center"
        elif block_type == "equation":
            sanitized_block["latex"] = str(raw_block.get("latex") or "")[:5000]
            sanitized_block["label"] = _sanitize_plain_text(raw_block.get("label"), "", 120)
        elif block_type == "reference":
            sanitized_block["citationKey"] = _sanitize_plain_text(raw_block.get("citationKey"), "", 80)
            sanitized_block["source"] = _sanitize_plain_text(raw_block.get("source"), "", 500)
        elif block_type == "footnote":
            sanitized_block["footnoteKey"] = _sanitize_plain_text(raw_block.get("footnoteKey"), "", 80)
            sanitized_block["content"] = _sanitize_plain_text(raw_block.get("content"), "", 500)

        sanitized_blocks.append(sanitized_block)

    return sanitized_blocks


def _sanitize_image_lookup(images):
    if not isinstance(images, dict):
        return {}

    sanitized_images = {}
    for key, value in list(images.items())[:200]:
        if not isinstance(value, dict):
            continue
        image_id = _sanitize_plain_text(value.get("id") or key, "", 80)
        if not image_id:
            continue
        sanitized_images[image_id] = {
            "id": image_id,
            "name": _sanitize_plain_text(value.get("name"), "Image", 120),
            "mimeType": _sanitize_plain_text(value.get("mimeType"), "image/png", 80),
            "dataBase64": str(value.get("dataBase64") or "")[:5_000_000],
        }

    return sanitized_images


def _sanitize_title_page(title_page):
    if not isinstance(title_page, dict):
        return {}

    return {
        "collegeName": _sanitize_plain_text(title_page.get("collegeName"), "", 160),
        "studentName": _sanitize_plain_text(title_page.get("studentName"), "", 160),
        "course": _sanitize_plain_text(title_page.get("course") or title_page.get("courseName"), "", 160),
        "logoDataUrl": str(title_page.get("logoDataUrl") or "")[:5_000_000],
        "logoWidth": title_page.get("logoWidth", 40),
        "eyebrow": _sanitize_plain_text(title_page.get("eyebrow"), "", 120),
        "subtitle": _sanitize_plain_text(title_page.get("subtitle"), "", 240),
        "note": _sanitize_plain_text(title_page.get("note"), "", 240),
        "headerText": _sanitize_plain_text(title_page.get("headerText"), "", 160),
        "footerText": _sanitize_plain_text(title_page.get("footerText"), "", 160),
    }


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
    return send_from_directory("frontend", "index.html")


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
    try:
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
    except Exception as error:
        return jsonify({"error": f"Unable to process the uploaded file: {error}"}), 400

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
    if request.content_length and request.content_length > MAX_JSON_PAYLOAD_SIZE:
        return jsonify({"error": "Request payload is too large."}), 413

    data = request.get_json(silent=True) or {}
    blocks = data.get("blocks")
    sections = data.get("sections")
    document = data.get("document")
    images = data.get("images")
    comments = data.get("comments")
    title_page = data.get("titlePage")
    document_settings = data.get("documentSettings")
    document_structure = data.get("documentStructure")

    valid_blocks = _sanitize_blocks(blocks)
    if not valid_blocks and isinstance(document, dict):
        valid_blocks = _sanitize_blocks(tiptap_document_to_blocks(document))
    valid_sections = [section for section in sections if isinstance(section, dict)] if isinstance(sections, list) else []
    image_lookup = _sanitize_image_lookup(images)
    valid_comments = [comment for comment in comments if isinstance(comment, dict)] if isinstance(comments, list) else []
    valid_title_page = _sanitize_title_page(title_page)
    valid_document_settings = document_settings if isinstance(document_settings, dict) else {}
    valid_document_structure = document_structure if isinstance(document_structure, dict) else {}

    if not valid_blocks and not valid_sections:
        return jsonify({"error": "Provide a non-empty list of blocks or sections."}), 400

    try:
        file_id = str(uuid.uuid4())
        path = OUTPUT_DIR / f"{file_id}_report.docx"

        create_editor_docx(
            sections=valid_sections if valid_sections else None,
            blocks=valid_blocks if valid_blocks else None,
            output_path=path,
            document_title=_sanitize_plain_text(data.get("title"), "REPORT", 200),
            image_lookup=image_lookup,
            comments=valid_comments if valid_comments else None,
            title_page=valid_title_page if valid_title_page else None,
            document_settings=valid_document_settings if valid_document_settings else None,
            document_structure=valid_document_structure if valid_document_structure else None,
        )

        return send_file(
            path,
            as_attachment=True,
            download_name="report.docx"
        )
    except Exception as error:
        return jsonify({"error": f"Unable to generate the document: {error}"}), 500


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
        "documentStructure": {
            "showCoverPage": False,
            "showTableOfContents": False,
        },
        "titlePage": {
            "collegeName": "College Name",
            "studentName": "Student Name",
            "courseName": "",
            "logoImageId": "",
            "logoWidth": 40,
        },
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
