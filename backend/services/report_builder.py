import re

LAB_TEMPLATE = [
    "Title",
    "Objective",
    "Theory",
    "Procedure",
    "Observations",
    "Results",
    "Conclusion"
]


def split_into_sections(text):
    sections = {key: "" for key in LAB_TEMPLATE}
    current_section = None

    lines = text.split("\n")

    for line in lines:
        clean_line = line.strip()

        if not clean_line:
            continue

        for section in LAB_TEMPLATE:
            if section.lower() in clean_line.lower():
                current_section = section
                break

        if current_section:
            sections[current_section] += clean_line + "\n"

    return sections


def apply_numbering(sections):
    structured_output = []

    for i, section in enumerate(LAB_TEMPLATE, start=1):
        content = sections.get(section, "").strip()

        structured_output.append({
            "heading": f"{i}. {section}",
            "content": content if content else " "
        })

    return structured_output


def build_structured_report(raw_text):
    sections = split_into_sections(raw_text)
    structured = apply_numbering(sections)
    return structured