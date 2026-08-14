"""Pure revenue splitter. No I/O, no Flask, no existing RAG imports."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_EVEN
from typing import Any

BPS_TOTAL = 10_000


class SplitError(Exception):
    pass


def to_cents(amount: Any) -> int:
    try:
        value = Decimal(str(amount))
    except Exception as error:
        raise SplitError("Tutar sayısal olmalıdır.") from error
    if value < 0:
        raise SplitError("Tutar negatif olamaz.")
    return int((value * 100).quantize(Decimal("1"), rounding=ROUND_HALF_EVEN))


def cents_to_amount(cents: int) -> str:
    return f"{(Decimal(int(cents)) / 100).quantize(Decimal('0.01'))}"


def _share_bps(rule: dict[str, Any]) -> int:
    if "share_bps" in rule and rule["share_bps"] is not None:
        try:
            bps = int(rule["share_bps"])
        except (TypeError, ValueError) as error:
            raise SplitError("share_bps tam sayı olmalıdır.") from error
        return bps
    if "share_percent" in rule and rule["share_percent"] is not None:
        try:
            percent = Decimal(str(rule["share_percent"]))
        except Exception as error:
            raise SplitError("share_percent sayısal olmalıdır.") from error
        bps = int((percent * 100).quantize(Decimal("1"), rounding=ROUND_HALF_EVEN))
        return bps
    raise SplitError("Her paydaş için share_bps veya share_percent gerekli.")


def split_amount(
    amount: Any,
    rules: list[dict[str, Any]],
    currency: str = "TRY",
) -> dict[str, Any]:
    """Split `amount` by stakeholder rules using integer cents / kuruş.

    Each rule: {id?, name?, share_bps?} or {share_percent?}.
    Shares must sum to exactly 10_000 basis points (100%).
    Remainder kuruş go to the largest fractional remainders.
    """
    amount_cents = to_cents(amount)
    currency_code = (currency or "TRY").strip().upper() or "TRY"
    if not rules:
        raise SplitError("En az bir paydaş kuralı gerekli.")

    prepared: list[dict[str, Any]] = []
    total_bps = 0
    for index, rule in enumerate(rules):
        bps = _share_bps(rule)
        if bps < 0 or bps > BPS_TOTAL:
            raise SplitError("Pay 0–10000 bps aralığında olmalıdır.")
        total_bps += bps
        prepared.append(
            {
                "stakeholder_id": rule.get("id") or rule.get("stakeholder_id"),
                "name": rule.get("name") or rule.get("stakeholder") or f"Paydaş {index + 1}",
                "role": rule.get("role") or "",
                "share_bps": bps,
                "share_percent": str((Decimal(bps) / 100).quantize(Decimal("0.01"))),
            }
        )

    if total_bps != BPS_TOTAL:
        raise SplitError(
            f"Paylar toplamı 100%% olmalıdır (şu an {total_bps / 100:.2f}%%)."
        )

    ranked: list[dict[str, Any]] = []
    for item in prepared:
        product = amount_cents * item["share_bps"]
        ranked.append(
            {
                **item,
                "amount_cents": product // BPS_TOTAL,
                "remainder": product % BPS_TOTAL,
            }
        )

    leftover = amount_cents - sum(row["amount_cents"] for row in ranked)
    order = sorted(
        range(len(ranked)),
        key=lambda i: (-ranked[i]["remainder"], i),
    )
    for i in range(leftover):
        ranked[order[i]]["amount_cents"] += 1

    allocations = []
    for row in ranked:
        allocations.append(
            {
                "stakeholder_id": row["stakeholder_id"],
                "name": row["name"],
                "role": row["role"],
                "share_bps": row["share_bps"],
                "share_percent": row["share_percent"],
                "amount_cents": row["amount_cents"],
                "amount": cents_to_amount(row["amount_cents"]),
            }
        )

    allocated = sum(item["amount_cents"] for item in allocations)
    return {
        "amount": cents_to_amount(amount_cents),
        "amount_cents": amount_cents,
        "currency": currency_code,
        "allocations": allocations,
        "balanced": allocated == amount_cents,
    }
