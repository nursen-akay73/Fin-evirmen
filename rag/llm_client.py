import base64

from groq import Groq

from config import GROQ_API_KEY, LLM_MODEL, LLM_PROVIDER, VISION_MODEL

SYSTEM_PROMPT = (
    "Sen finansal terimleri sade Türkçe anlatan bir asistansın. "
    "Sadece sana verilen bağlamı kullan, bağlamda olmayan bilgi uydurma. "
        "Bağlam terim sözlüğü, sözleşme maddesi rehberi, tüketici rehberi "
        "veya kullanıcının eklediği terim, belge ve görüntülerden gelebilir. "
    "Cevabını örnekle destekle. Kısa, net ve günlük dilde yaz. "
    "Birden fazla noktayı numaralı maddeler halinde yaz; her madde "
    "'1. **Başlık**: açıklama' biçiminde olsun. Tek bir terim soruluyorsa "
    "ilk satır '1. **Terim adı**: sade açıklama' olsun. "
    "Emin olmadığın noktayı 'bağlamda yok' diye belirt. "
    "Güncel faiz tavanı, vergi oranı veya yasal madde numarası uydurma."
)

CONTRACT_SYSTEM_PROMPT = (
    "Sen kredi ve kredi kartı sözleşmelerini sade Türkçeye çeviren bir asistansın. "
    "Sadece verilen sözleşme metnine ve terim bağlamına dayan. "
    "Metinde olmayan faiz, ceza veya iptal şartı uydurma. "
    "Kritik maddeleri numaralı kartlar halinde, anlaşılır dilde özetle. "
    "Her madde tam olarak şu biçimde olsun: '1. **Başlık**: açıklama'. "
    "Başlık kısa ve belirgin olsun (ör. Faiz Oranları, Gecikme ve Ceza)."
)


def _require_groq_key():
    if not GROQ_API_KEY or GROQ_API_KEY.startswith("gsk_your_key"):
        raise RuntimeError(
            "GROQ_API_KEY .env dosyasında ayarlanmamış. "
            "https://console.groq.com adresinden anahtar alıp .env içine yazın."
        )


def generate_answer(
    question: str,
    context_chunks: list[str],
    extra_instructions: str = "",
    system_prompt: str | None = None,
) -> str:
    """Send retrieved context + user question to the configured LLM provider."""
    if LLM_PROVIDER != "groq":
        raise RuntimeError(
            f"Desteklenmeyen LLM sağlayıcısı: {LLM_PROVIDER}. "
            "Şimdilik yalnızca groq tanımlı."
        )
    _require_groq_key()

    client = Groq(api_key=GROQ_API_KEY)
    context = "\n\n".join(context_chunks) if context_chunks else "Bağlam bulunamadı."
    user_content = f"Bağlam:\n{context}\n\nSoru:\n{question}"
    if extra_instructions:
        user_content += f"\n\nEk talimat:\n{extra_instructions}"

    completion = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": system_prompt or SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        temperature=0.3,
    )
    return completion.choices[0].message.content or ""


WHISPER_MODEL = "whisper-large-v3"


def transcribe_audio(file_bytes: bytes, filename: str, mime_type: str = "audio/webm") -> str:
    """Speech-to-text via Groq Whisper. Does not call the chat LLM."""
    _require_groq_key()
    client = Groq(api_key=GROQ_API_KEY)
    result = client.audio.transcriptions.create(
        file=(filename, file_bytes, mime_type),
        model=WHISPER_MODEL,
        language="tr",
        response_format="text",
    )
    if isinstance(result, str):
        return result.strip()
    return (getattr(result, "text", None) or str(result)).strip()


IMAGE_EXTRACT_PROMPT = (
    "Bu görüntüdeki tüm okunabilir metni olduğu gibi çıkar. "
    "Finansal tablo, dekont, ekstre, sözleşme veya el yazısı olsa da "
    "satır satır aktar. Yorum yapma, uydurma, özetleme. "
    "Metin yoksa 'METIN_YOK' yaz."
)


def extract_text_from_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> str:
    """Read printed/handwritten text from an image via Groq vision."""
    _require_groq_key()
    client = Groq(api_key=GROQ_API_KEY)
    encoded = base64.b64encode(image_bytes).decode("ascii")
    data_url = f"data:{mime_type};base64,{encoded}"
    completion = client.chat.completions.create(
        model=VISION_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": IMAGE_EXTRACT_PROMPT},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            }
        ],
        temperature=0,
    )
    text = (completion.choices[0].message.content or "").strip()
    if not text or text.upper() == "METIN_YOK":
        return ""
    return text
