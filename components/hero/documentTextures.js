const LINES = {
  dekont: [
    "T.C. BANKA DEKONTU  ·  ŞUBE 0142",
    "İşlem no  48291034     12.04.2026  14:22",
    "Repo / ters repo    valör  T+0",
    "Tutar              8.400,00 TL",
    "Komisyon              12,40 TL",
    "Hesap TR12 0006 2000 0000 9041",
    "Açıklama  gecelik bağlanma",
  ],
  ekstre: [
    "KREDİ KARTI EKSTRESİ  ·  DÖNEM 04",
    "Kesim  05.04.2026     son ödeme  25.04",
    "Dönem borcu       10.700,00 TL",
    "Asgari ödeme       2.140,00 TL",
    "Nakit avans faiz           %4,89",
    "Gecikme faizi              %5,30",
    "Harcama  17 adet",
  ],
  sozlesme: [
    "İHTİYACİ KREDİ SÖZLEŞMESİ",
    "Madde 7   Temerrüt ve gecikme",
    "Madde 9   Sigorta şartı",
    "Madde 12  Erken kapama",
    "Akdi faiz  sözleşmede belirtilir",
    "KKDF / BSMV  yasal oranlar",
    "Kefalet  varsa ek protokol",
  ],
  bilanco: [
    "BİLANÇO  ·  31.12.2025",
    "Dönen varlıklar     1.284",
    "Duran varlıklar       860",
    "Kısa vadeli yükümlülük  640",
    "Uzun vadeli yükümlülük  410",
    "Özkaynaklar            1.094",
    "Aktif = pasif",
  ],
  havale: [
    "HAVALE / EFT  ·  FAST",
    "Gönderen  TR… 1184",
    "Alıcı     TR… 9041",
    "Tutar     1.250,00 TL",
    "Ücret         2,90 TL",
    "Durum     İLETİLDİ",
    "Ref  26-0412-FAST-09",
  ],
};

const cache = new Map();

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function createDocumentCanvas(kind, size = 512) {
  const width = size;
  const height = Math.round(size * 1.42);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const paper = ctx.createLinearGradient(0, 0, width * 0.15, height);
  paper.addColorStop(0, "#f6efe2");
  paper.addColorStop(0.55, "#efe4ce");
  paper.addColorStop(1, "#d9c7a6");
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(90, 70, 40, 0.045)";
  for (let i = 0; i < 28; i += 1) {
    const y = 48 + i * ((height - 80) / 28);
    ctx.fillRect(28, y, width - 56, 1);
  }

  const lines = LINES[kind] || LINES.dekont;
  ctx.textBaseline = "top";
  lines.forEach((line, index) => {
    const y = 36 + index * Math.round(height * 0.11);
    ctx.fillStyle = index === 0 ? "#3a2a14" : "#4a3b28";
    ctx.font = `${index === 0 ? "700" : "500"} ${Math.round(width * (index === 0 ? 0.042 : 0.034))}px "Avenir Next", "Georgia", serif`;
    ctx.fillText(line, 36, y);
  });

  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const nx = x / width;
      const ny = y / height;
      const edge = Math.min(nx, ny, 1 - nx, 1 - ny);
      const n = hash(x * 0.17 + y * 0.31) * 0.045;
      const cut = 0.018 + n;
      const grain = (hash(x * 1.9 + y * 2.7) - 0.5) * 18;
      data[i] = Math.max(0, Math.min(255, data[i] + grain));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + grain * 0.9));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + grain * 0.7));
      if (edge < cut) {
        data[i + 3] = 0;
      } else if (edge < cut + 0.012) {
        data[i + 3] = Math.floor(255 * ((edge - cut) / 0.012));
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  return { canvas, width, height, aspect: width / height };
}

export function getDocumentCanvas(kind, size) {
  const key = `${kind}-${size}`;
  if (!cache.has(key)) {
    cache.set(key, createDocumentCanvas(kind, size));
  }
  return cache.get(key);
}
