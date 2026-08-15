import base64

from datetime import date, datetime, timedelta

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

SYSTEM_PROMPT_EN = (
    "You explain financial terms in plain, everyday English. "
    "Use only the given context; do not invent facts that are not there. "
    "Context may come from a glossary, contract-clause guide, consumer guide, "
    "or terms, documents and images the user added. "
    "Support the answer with a short example. Keep it concise. "
    "Write several points as numbered items; each item must be "
    "'1. **Title**: explanation'. If a single term is asked, the first line "
    "must be '1. **Term name**: plain explanation'. "
    "If you are unsure, say 'not in the context'. "
    "Do not invent current rate caps, tax rates or statute numbers."
)

CONTRACT_SYSTEM_PROMPT = (
    "Sen kredi ve kredi kartı sözleşmelerini sade Türkçeye çeviren bir asistansın. "
    "Sadece verilen sözleşme metnine ve terim bağlamına dayan. "
    "Metinde olmayan faiz, ceza veya iptal şartı uydurma. "
    "Kritik maddeleri numaralı kartlar halinde, anlaşılır dilde özetle. "
    "Her madde tam olarak şu biçimde olsun: "
    "'1. **Başlık**: [Standart] açıklama' veya "
    "'1. **Başlık**: [Dikkat] açıklama'. "
    "Başlık kısa ve belirgin olsun (ör. Faiz Oranları, Gecikme ve Ceza). "
    "Tipik veya beklenen bir maddeyse [Standart] yaz. "
    "Madde piyasa ortalamasının üzerinde bir ceza veya faiz oranı içeriyorsa, "
    "erken kapama bedeli yüksekse, tek taksitte tüm borcun istenmesi gibi "
    "ağır bir muacceliyet varsa ya da kullanıcıyı şaşırtabilecek bir şart varsa "
    "[Dikkat] yaz ve nedenini kısaca açıkla."
)

CONTRACT_SYSTEM_PROMPT_EN = (
    "You translate loan and credit-card contracts into plain English. "
    "Rely only on the given contract text and term context. "
    "Do not invent interest, penalties or cancellation terms that are not in the text. "
    "Summarise critical clauses as numbered cards. "
    "Each item must be exactly: "
    "'1. **Title**: [Standard] explanation' or "
    "'1. **Title**: [Attention] explanation'. "
    "Keep titles short (e.g. Interest Rates, Late Fees). "
    "Use [Standard] for typical expected clauses. "
    "Use [Attention] when a penalty or rate is above market, early-termination "
    "fees are high, the whole debt can be called at once, or a term may surprise the user, "
    "and briefly say why."
)

FRESHNESS_WARNING = (
    "Bu bilgi {date} itibarıyla günceldir, güncel mevzuatı "
    "kontrol etmenizi öneririz."
)
FRESHNESS_WARNING_EN = (
    "This information is current as of {date}; please verify the latest regulations."
)
STALE_AFTER_DAYS = 365


def _require_groq_key():
    if not GROQ_API_KEY or GROQ_API_KEY.startswith("gsk_your_key"):
        raise RuntimeError(
            "GROQ_API_KEY .env dosyasında ayarlanmamış. "
            "https://console.groq.com adresinden anahtar alıp .env içine yazın."
        )


def _parse_date(value) -> date | None:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    text = str(value).strip()[:10]
    try:
        return date.fromisoformat(text)
    except ValueError:
        return None


def _normalize_lang(language: str | None) -> str:
    value = str(language or "tr").strip().lower()
    return "en" if value.startswith("en") else "tr"


def freshness_notice(last_updated_dates: list | None, language: str = "tr") -> str:
    """Fixed warning when retrieved knowledge is older than STALE_AFTER_DAYS."""
    parsed = [_parse_date(value) for value in (last_updated_dates or [])]
    parsed = [value for value in parsed if value]
    if not parsed:
        return ""
    oldest = min(parsed)
    if date.today() - oldest <= timedelta(days=STALE_AFTER_DAYS):
        return ""
    template = FRESHNESS_WARNING_EN if _normalize_lang(language) == "en" else FRESHNESS_WARNING
    return template.format(date=oldest.strftime("%d.%m.%Y"))


def generate_answer(
    question: str,
    context_chunks: list[str],
    extra_instructions: str = "",
    system_prompt: str | None = None,
    last_updated_dates: list | None = None,
    language: str = "tr",
    history: list[dict] | None = None,
) -> str:
    """Send retrieved context + user question to the configured LLM provider."""
    if LLM_PROVIDER != "groq":
        raise RuntimeError(
            f"Desteklenmeyen LLM sağlayıcısı: {LLM_PROVIDER}. "
            "Şimdilik yalnızca groq tanımlı."
        )
    _require_groq_key()

    lang = _normalize_lang(language)
    client = Groq(api_key=GROQ_API_KEY)
    context = "\n\n".join(context_chunks) if context_chunks else (
        "No context found." if lang == "en" else "Bağlam bulunamadı."
    )
    user_content = f"Bağlam:\n{context}\n\nSoru:\n{question}"
    if extra_instructions:
        user_content += f"\n\nEk talimat:\n{extra_instructions}"

    messages = [
        {
            "role": "system",
            "content": system_prompt
            or (SYSTEM_PROMPT_EN if lang == "en" else SYSTEM_PROMPT),
        }
    ]
    for turn in (history or [])[-6:]:
        question_text = (turn.get("q") or "").strip()
        answer_text = (turn.get("a") or "").strip()
        if question_text:
            messages.append({"role": "user", "content": question_text})
        if answer_text:
            messages.append({"role": "assistant", "content": answer_text})
    messages.append({"role": "user", "content": user_content})

    completion = client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        temperature=0.3,
    )
    answer = completion.choices[0].message.content or ""
    notice = freshness_notice(last_updated_dates, language=lang)
    if notice:
        answer = answer.rstrip() + "\n\n" + notice
    return answer


WHISPER_MODEL = "whisper-large-v3"


def transcribe_audio(
    file_bytes: bytes,
    filename: str,
    mime_type: str = "audio/webm",
    language: str = "tr",
) -> str:
    """Speech-to-text via Groq Whisper. Does not call the chat LLM."""
    _require_groq_key()
    client = Groq(api_key=GROQ_API_KEY)
    result = client.audio.transcriptions.create(
        file=(filename, file_bytes, mime_type),
        model=WHISPER_MODEL,
        language=_normalize_lang(language),
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
