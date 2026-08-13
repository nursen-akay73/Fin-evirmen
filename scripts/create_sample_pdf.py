"""Örnek bir ihtiyaç kredisi sözleşmesi PDF'i üretir."""

import sys
from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = ROOT / "data" / "ornek_kredi_sozlesmesi.pdf"

FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/Library/Fonts/Arial.ttf",
    "/System/Library/Fonts/Supplemental/Times New Roman.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSans.ttf",
]

CONTRACT_PARAGRAPHS = [
    "ÖRNEK İHTİYAÇ KREDİSİ SÖZLEŞMESİ (test belgesi)",
    "İşbu sözleşme FinÇevirmen testleri için hazırlanmış hayali bir metindir.",
    "Madde 1 - Kredi Tutarı ve Vade: Banka, Müşteri'ye 120.000 TL tutarında, 24 ay vadeli ihtiyaç kredisi tahsis eder. Taksitler her ayın 15'inde tahsil edilir.",
    "Madde 2 - Akdi Faiz: Kredinin akdi faiz oranı aylık %3,49, yıllık yüzde olarak sözleşmede ayrıca belirtilen etkin faiz oranıdır. Faiz, kalan anapara üzerinden işler.",
    "Madde 3 - Vergi ve Fonlar: Akdi faiz tutarı üzerinden yasal KKDF ve BSMV tahsil edilir. Bu kalemler taksit tutarına dahildir.",
    "Madde 4 - Tahsis Ücreti: Kredi kullandırımında anaparanın binde 5'i oranında tahsis ücreti peşin tahsil edilir.",
    "Madde 5 - Gecikme ve Temerrüt: Taksitin vadesinde ödenmemesi halinde Müşteri temerrüde düşer. Temerrüt halinde gecikme faizi, akdi faizin 1,3 katını aşmamak üzere işletilir. 90 günü aşan gecikmede yasal takip başlatılabilir.",
    "Madde 6 - Erken Kapama: Müşteri krediyi vadesinden önce kısmen veya tamamen kapatabilir. Erken ödeme tazminatı, kalan vadeye göre değişmek üzere erken ödenen anaparanın yüzde 1'ini veya yüzde 2'sini aşamaz.",
    "Madde 7 - İptal: Müşteri, sözleşmenin imzalandığı tarihten itibaren 14 gün içinde herhangi bir gerekçe göstermeksizin cayma hakkını kullanabilir. Cayma halinde kullanılan anapara ve işleyen faiz iade edilir.",
    "Madde 8 - Teminat: Banka gerekli görürse kefil veya ek teminat talep edebilir. Teminat çözümü, borcun ferileriyle birlikte tamamen kapanmasından sonra yapılır.",
]


def find_font() -> str:
    for path in FONT_CANDIDATES:
        if Path(path).exists():
            return path
    raise FileNotFoundError(
        "Türkçe karakter destekleyen bir TTF font bulunamadı. "
        "macOS'ta Arial veya Linux'ta DejaVuSans bekleniyor."
    )


def main():
    font_path = find_font()
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()
    pdf.add_font("ContractFont", fname=font_path)
    pdf.set_font("ContractFont", size=12)

    for index, paragraph in enumerate(CONTRACT_PARAGRAPHS):
        size = 16 if index == 0 else 12
        pdf.set_font("ContractFont", size=size)
        pdf.multi_cell(0, 8, paragraph)
        pdf.ln(4)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUTPUT_PATH))
    print(f"Örnek sözleşme yazıldı: {OUTPUT_PATH}")


if __name__ == "__main__":
    sys.exit(main() or 0)
