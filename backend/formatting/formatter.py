from docx import Document
from docx.shared import Pt, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


def add_table_of_contents(doc: Document):
    paragraph = doc.add_paragraph()
    run = paragraph.add_run()

    fldChar = OxmlElement("w:fldChar")
    fldChar.set(qn("w:fldCharType"), "begin")

    instrText = OxmlElement("w:instrText")
    instrText.text = 'TOC \\o "1-3" \\h \\z \\u'

    fldChar2 = OxmlElement("w:fldChar")
    fldChar2.set(qn("w:fldCharType"), "end")

    run._r.append(fldChar)
    run._r.append(instrText)
    run._r.append(fldChar2)


def create_professional_docx(structured_data, output_path):
    doc = Document()

    # Page margins
    section = doc.sections[0]
    section.top_margin = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)

    # Title Page
    title = doc.add_heading("LAB REPORT", level=0)
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_page_break()

    # Table of Contents
    toc_title = doc.add_paragraph("Table of Contents")
    toc_title.style = "Heading 1"
    toc_title.alignment = WD_ALIGN_PARAGRAPH.CENTER

    add_table_of_contents(doc)

    doc.add_page_break()

    # Main Content
    for section_data in structured_data:
        heading = doc.add_heading(section_data["heading"], level=1)
        heading.alignment = WD_ALIGN_PARAGRAPH.LEFT

        paragraph = doc.add_paragraph(section_data["content"])
        paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        paragraph.paragraph_format.space_after = Pt(8)
        paragraph.paragraph_format.line_spacing = 1.15

        for run in paragraph.runs:
            run.font.name = "Times New Roman"
            run.font.size = Pt(12)

    doc.save(output_path)