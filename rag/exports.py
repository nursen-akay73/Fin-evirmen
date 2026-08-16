from datetime import date
from io import BytesIO
from pathlib import Path

from fpdf import FPDF

FONT_CANDIDATES = [
    Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
    Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
    Path("/Library/Fonts/Arial Unicode.ttf"),
    Path("/Library/Fonts/Arial.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    Path("/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf"),
]
BOLD_CANDIDATES = [
    Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
    Path("/Library/Fonts/Arial Bold.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    Path("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"),
]


def _first_font(paths: list[Path]) -> str | None:
    for path in paths:
        if path.is_file():
            return str(path)
    return None


def _safe(text: str) -> str:
    table = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")
    return str(text or "").translate(table)


class ReportPDF(FPDF):
    def __init__(self, title: str):
        super().__init__(format="A4")
        self.report_title = title
        self.unicode_ok = False
        regular = _first_font(FONT_CANDIDATES)
        bold = _first_font(BOLD_CANDIDATES) or regular
        if regular:
            self.add_font("FC", "", regular)
            self.add_font("FC", "B", bold)
            self.unicode_ok = True
        self.set_auto_page_break(auto=True, margin=18)
        self.set_margins(18, 18, 18)

    def _font(self, bold: bool = False, size: float = 11):
        if self.unicode_ok:
            self.set_font("FC", "B" if bold else "", size)
        else:
            self.set_font("Helvetica", "B" if bold else "", size)

    def _text(self, value: str) -> str:
        return str(value or "") if self.unicode_ok else _safe(value)

    def header(self):
        self._font(True, 11)
        self.set_text_color(232, 163, 61)
        self.cell(0, 8, self._text("FinÇevirmen"), new_x="LMARGIN", new_y="NEXT")
        self._font(False, 9)
        self.set_text_color(120, 130, 145)
        self.cell(0, 6, self._text(self.report_title), new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(232, 163, 61)
        self.line(18, self.get_y() + 2, 192, self.get_y() + 2)
        self.ln(8)

    def footer(self):
        self.set_y(-14)
        self._font(False, 8)
        self.set_text_color(140, 148, 160)
        note = (
            "Taslak rapordur; hukuki tavsiye değildir. Kaynak: sözleşme metni ve mevzuat parçaları."
        )
        self.cell(0, 5, self._text(note), align="C")

    def heading(self, text: str):
        self._font(True, 13)
        self.set_text_color(11, 15, 23)
        self.multi_cell(0, 8, self._text(text))
        self.ln(2)

    def body(self, text: str, size: float = 10.5):
        self._font(False, size)
        self.set_text_color(30, 36, 48)
        self.multi_cell(0, 6, self._text(text))
        self.ln(2)

    def muted(self, text: str):
        self._font(False, 9)
        self.set_text_color(100, 110, 125)
        self.multi_cell(0, 5, self._text(text))
        self.ln(1)


def compare_pdf(filenames: list[str], rows: list[dict], lang: str = "tr") -> bytes:
    title = "Contract comparison" if lang == "en" else "Sözleşme karşılaştırma raporu"
    pdf = ReportPDF(title)
    pdf.add_page()
    pdf.heading(title)
    pdf.muted(" · ".join(filenames or []))
    pdf.muted(date.today().isoformat())
    for row in rows or []:
        pdf.heading(str(row.get("title") or ""))
        values = row.get("values") or []
        for index, value in enumerate(values):
            label = filenames[index] if index < len(filenames) else f"Belge {index + 1}"
            pdf.body(f"{label}: {value}")
        winner = row.get("winner") or ""
        if winner:
            pdf.muted(("Winner: " if lang == "en" else "Tüketici için avantajlı: ") + str(winner))
    pdf.muted(
        "Not legal advice."
        if lang == "en"
        else "Bu çıktı hukuki tavsiye değildir. Resmi metni ve bankanızı doğrulayın."
    )
    buffer = BytesIO()
    pdf.output(buffer)
    return buffer.getvalue()


def petition_pdf(
    bank: str,
    letter_date: str,
    title: str,
    body: str,
    law_refs: list[str],
    lang: str = "tr",
) -> bytes:
    heading = "Consumer objection draft" if lang == "en" else "Tüketici itiraz dilekçesi taslağı"
    pdf = ReportPDF(heading)
    pdf.add_page()
    pdf.heading(title or heading)
    pdf.body(f"{'Bank' if lang == 'en' else 'Banka'}: {bank or '—'}")
    pdf.body(f"{'Date' if lang == 'en' else 'Tarih'}: {letter_date or date.today().isoformat()}")
    pdf.ln(2)
    pdf.body(body or "")
    if law_refs:
        pdf.heading("References" if lang == "en" else "Dayanak")
        for ref in law_refs:
            pdf.muted("• " + str(ref))
    pdf.muted(
        "Draft only. Not legal advice. Sign after reviewing the official statute text."
        if lang == "en"
        else "Taslak metindir; hukuki tavsiye değildir. İmzalamadan önce 6502 sayılı Kanun ve TCMB Tebliği (2020/7) metnini kontrol edin."
    )
    buffer = BytesIO()
    pdf.output(buffer)
    return buffer.getvalue()
