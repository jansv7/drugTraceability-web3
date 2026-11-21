"""Mengubah docs/LAPORAN_UAS.md menjadi docs/LAPORAN_UAS.docx (Word yang dapat direvisi tim).

Konverter sederhana untuk subset markdown yang dipakai laporan:
judul (#..####), paragraf, daftar berbutir, daftar bernomor, tabel, blok kode,
dan tebal (**teks**). Tangkapan layar di folder docs/gambar ikut dilampirkan.
"""
import os
import re
import sys

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "LAPORAN_UAS.md")
OUT = os.path.join(BASE, "LAPORAN_UAS.docx")
IMG_DIR = os.path.join(BASE, "gambar")

ACCENT = RGBColor(0x0F, 0x6B, 0x63)


def style_doc(doc):
    normal = doc.styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.15
    normal._element.rPr.rFonts.set(qn("w:eastAsia"), "Calibri")

    for name, size, color in (("Heading 1", 18, ACCENT), ("Heading 2", 14, ACCENT), ("Heading 3", 12, ACCENT)):
        st = doc.styles[name]
        st.font.name = "Calibri"
        st.font.size = Pt(size)
        st.font.bold = True
        st.font.color.rgb = color
        st.paragraph_format.space_before = Pt(14)
        st.paragraph_format.space_after = Pt(6)


def add_runs(par, text):
    """Menangani **tebal** dan `kode` di dalam paragraf."""
    parts = re.split(r"(\*\*[^*]+\*\*|`[^`]+`)", text)
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            r = par.add_run(part[2:-2])
            r.bold = True
        elif part.startswith("`") and part.endswith("`"):
            r = par.add_run(part[1:-1])
            r.font.name = "Consolas"
            r.font.size = Pt(10)
        else:
            par.add_run(part)


def split_row(line):
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    return cells


def main():
    with open(SRC, encoding="utf-8") as f:
        lines = f.read().split("\n")

    doc = Document()
    style_doc(doc)

    i = 0
    in_code = False
    code_buf = []

    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # blok kode
        if stripped.startswith("```"):
            if in_code:
                p = doc.add_paragraph()
                p.paragraph_format.left_indent = Inches(0.25)
                p.paragraph_format.space_after = Pt(8)
                r = p.add_run("\n".join(code_buf))
                r.font.name = "Consolas"
                r.font.size = Pt(9.5)
                code_buf = []
                in_code = False
            else:
                in_code = True
            i += 1
            continue
        if in_code:
            code_buf.append(line)
            i += 1
            continue

        # garis pemisah
        if stripped in ("---", "***", "___"):
            i += 1
            continue

        # judul
        m = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if m:
            level = len(m.group(1))
            text = m.group(2)
            if level == 1:
                h = doc.add_heading(text, level=0)
                h.alignment = WD_ALIGN_PARAGRAPH.CENTER
            else:
                doc.add_heading(text, level=min(level - 1, 3))
            i += 1
            continue

        # tabel
        if stripped.startswith("|") and i + 1 < len(lines) and re.match(r"^\|[\s:|-]+\|$", lines[i + 1].strip()):
            header = split_row(stripped)
            i += 2
            body = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                body.append(split_row(lines[i]))
                i += 1
            table = doc.add_table(rows=1, cols=len(header))
            table.style = "Light Grid Accent 1"
            hdr = table.rows[0].cells
            for j, h in enumerate(header):
                hdr[j].text = ""
                add_runs(hdr[j].paragraphs[0], h)
                for r in hdr[j].paragraphs[0].runs:
                    r.bold = True
            for row in body:
                cells = table.add_row().cells
                for j in range(len(header)):
                    val = row[j] if j < len(row) else ""
                    cells[j].text = ""
                    add_runs(cells[j].paragraphs[0], val)
            doc.add_paragraph()
            continue

        # daftar berbutir
        m = re.match(r"^[-*]\s+(.*)$", stripped)
        if m:
            p = doc.add_paragraph(style="List Bullet")
            add_runs(p, m.group(1))
            i += 1
            continue

        # daftar bernomor
        m = re.match(r"^(\d+)\.\s+(.*)$", stripped)
        if m:
            p = doc.add_paragraph(style="List Number")
            add_runs(p, m.group(2))
            i += 1
            continue

        # paragraf
        if stripped:
            p = doc.add_paragraph()
            add_runs(p, stripped)
        i += 1

    # lampiran gambar
    if os.path.isdir(IMG_DIR):
        doc.add_page_break()
        doc.add_heading("Lampiran: Tangkapan Layar Antarmuka", level=1)
        for name in sorted(os.listdir(IMG_DIR)):
            if not name.lower().endswith((".png", ".jpg", ".jpeg")):
                continue
            label = os.path.splitext(name)[0].replace("-", " ")
            doc.add_heading(label, level=3)
            doc.add_picture(os.path.join(IMG_DIR, name), width=Inches(6.1))
            doc.paragraphs[-1].alignment = WD_ALIGN_PARAGRAPH.CENTER
            doc.add_paragraph()

    doc.save(OUT)
    print("ditulis:", OUT, os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
