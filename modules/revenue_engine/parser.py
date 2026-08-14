"""Turn a free-text project description into split rules. Isolated from RAG."""

from __future__ import annotations

import json
import re

from groq import Groq

from config import GROQ_API_KEY, LLM_MODEL
from modules.revenue_engine.splitter import SplitError

EXTRACT_SYSTEM = (
    "Finansal gelir paylaşımı asistanısın. Kullanıcının anlattığı projeden "
    "paydaşları, yüzde oranlarını ve varsa satış tutarını çıkar. "
    "Metinde olmayan isim, oran veya tutar uydurma. Yalnızca JSON döndür."
)

EXTRACT_SCHEMA = """
Şu JSON şemasını doldur:
{
  "project_name": string veya null,
  "currency": "TRY",
  "amount": number veya null,
  "reference": string veya null,
  "stakeholders": [
    {"name": string, "role": string, "share_percent": number}
  ]
}
Kurallar:
- share_percent 0-100 arası sayı
- paydaş yoksa stakeholders boş dizi
- tutar yoksa amount null
- para birimi belirtilmezse TRY
"""


def _client() -> Groq:
    if not GROQ_API_KEY or GROQ_API_KEY.startswith("gsk_your_key"):
        raise SplitError("GROQ_API_KEY ayarlı değil; anlatımdan çıkarım yapılamaz.")
    return Groq(api_key=GROQ_API_KEY)


def parse_json_object(raw: str) -> dict:
    text = (raw or "").strip()
    fenced = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fenced:
        text = fenced.group(1).strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError as error:
        raise SplitError("Anlatımdan yapılamadı; paydaş ve oranları daha net söyleyin.") from error
    if not isinstance(data, dict):
        raise SplitError("Anlatım JSON nesnesi üretmedi.")
    return data


def extract_split_plan(description: str) -> dict:
    text = (description or "").strip()
    if len(text) < 8:
        raise SplitError("Projeyi biraz daha anlatın: kimler var, yüzde kaç, tutar nedir.")
    completion = _client().chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {"role": "system", "content": EXTRACT_SYSTEM},
            {
                "role": "user",
                "content": f"{EXTRACT_SCHEMA}\n\nAnlatım:\n{text}",
            },
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )
    payload = parse_json_object(completion.choices[0].message.content or "")
    stakeholders = []
    for row in payload.get("stakeholders") or []:
        if not isinstance(row, dict):
            continue
        name = str(row.get("name") or "").strip()
        if not name:
            continue
        percent = row.get("share_percent")
        if isinstance(percent, str):
            percent = percent.replace("%", "").replace(",", ".").strip()
        stakeholders.append(
            {
                "name": name,
                "role": str(row.get("role") or "").strip(),
                "share_percent": percent,
            }
        )
    amount = payload.get("amount")
    if amount == "" or amount == 0:
        amount = None
    return {
        "project_name": (payload.get("project_name") or "").strip() or None,
        "currency": str(payload.get("currency") or "TRY").strip().upper() or "TRY",
        "amount": amount,
        "reference": (payload.get("reference") or "").strip() or None,
        "stakeholders": stakeholders,
    }
