"""Read/write only the additive revenue_* tables. Never touches RAG tables."""

from __future__ import annotations

from pathlib import Path

from psycopg2.extras import Json, RealDictCursor

from db import get_connection
from modules.revenue_engine.splitter import BPS_TOTAL, SplitError, split_amount, to_cents

SCHEMA_PATH = Path(__file__).resolve().parent / "schema.sql"
_schema_ready = False


def _json_row(row: dict) -> dict:
    payload = dict(row)
    for key, value in list(payload.items()):
        if hasattr(value, "isoformat"):
            payload[key] = value.isoformat()
    return payload


def ensure_schema() -> None:
    global _schema_ready
    if _schema_ready:
        return
    sql = SCHEMA_PATH.read_text(encoding="utf-8")
    connection = get_connection()
    connection.autocommit = True
    try:
        with connection.cursor() as cursor:
            for statement in sql.split(";"):
                cleaned = "\n".join(
                    line
                    for line in statement.splitlines()
                    if not line.strip().startswith("--")
                ).strip()
                if cleaned:
                    cursor.execute(cleaned)
    finally:
        connection.close()
    _schema_ready = True


def _connect():
    ensure_schema()
    return get_connection()


def list_projects() -> list[dict]:
    connection = _connect()
    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT id, name, currency, created_at
                FROM revenue_projects
                ORDER BY id DESC
                """
            )
            return [_json_row(row) for row in cursor.fetchall()]
    finally:
        connection.close()


def get_project(project_id: int) -> dict | None:
    connection = _connect()
    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT id, name, currency, created_at
                FROM revenue_projects
                WHERE id = %s
                """,
                (project_id,),
            )
            row = cursor.fetchone()
            return _json_row(row) if row else None
    finally:
        connection.close()


def create_project(name: str, currency: str = "TRY") -> dict:
    connection = _connect()
    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                INSERT INTO revenue_projects (name, currency)
                VALUES (%s, %s)
                RETURNING id, name, currency, created_at
                """,
                (name.strip(), (currency or "TRY").strip().upper()),
            )
            row = _json_row(cursor.fetchone())
        connection.commit()
        return row
    finally:
        connection.close()


def get_or_create_default_project() -> dict:
    projects = list_projects()
    if projects:
        return projects[0]
    return create_project("FinÇevirmen", "TRY")


def list_stakeholders(project_id: int, active_only: bool = True) -> list[dict]:
    connection = _connect()
    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            sql = """
                SELECT id, project_id, display_name, email, role, share_bps, is_active, created_at
                FROM project_stakeholders
                WHERE project_id = %s
                """
            params: list = [project_id]
            if active_only:
                sql += " AND is_active = TRUE"
            sql += " ORDER BY id"
            cursor.execute(sql, params)
            return [_json_row(row) for row in cursor.fetchall()]
    finally:
        connection.close()


def replace_stakeholders(project_id: int, rows: list[dict]) -> list[dict]:
    if get_project(project_id) is None:
        raise SplitError("Proje bulunamadı.")
    prepared = []
    total = 0
    for row in rows:
        name = (row.get("name") or row.get("display_name") or "").strip()
        if not name:
            raise SplitError("Paydaş adı zorunlu.")
        bps = int(row.get("share_bps") or round(float(row.get("share_percent") or 0) * 100))
        if bps < 0 or bps > BPS_TOTAL:
            raise SplitError("Pay 0–100 aralığında olmalıdır.")
        total += bps
        prepared.append(
            {
                "display_name": name,
                "email": (row.get("email") or "").strip() or None,
                "role": (row.get("role") or "").strip() or None,
                "share_bps": bps,
            }
        )
    if prepared and total != BPS_TOTAL:
        raise SplitError(f"Paylar toplamı 100%% olmalıdır (şu an {total / 100:.2f}%%).")

    connection = _connect()
    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "UPDATE project_stakeholders SET is_active = FALSE WHERE project_id = %s",
                (project_id,),
            )
            saved = []
            for item in prepared:
                cursor.execute(
                    """
                    INSERT INTO project_stakeholders
                        (project_id, display_name, email, role, share_bps, is_active)
                    VALUES (%s, %s, %s, %s, %s, TRUE)
                    RETURNING id, project_id, display_name, email, role, share_bps, is_active, created_at
                    """,
                    (
                        project_id,
                        item["display_name"],
                        item["email"],
                        item["role"],
                        item["share_bps"],
                    ),
                )
                saved.append(_json_row(cursor.fetchone()))
            cursor.execute(
                "UPDATE split_rules SET is_active = FALSE WHERE project_id = %s",
                (project_id,),
            )
            cursor.execute(
                """
                INSERT INTO split_rules (project_id, name, is_active)
                VALUES (%s, 'active', TRUE)
                RETURNING id
                """,
                (project_id,),
            )
            rule_id = cursor.fetchone()["id"]
            for item in saved:
                cursor.execute(
                    """
                    INSERT INTO split_rule_items (split_rule_id, stakeholder_id, share_bps)
                    VALUES (%s, %s, %s)
                    """,
                    (rule_id, item["id"], item["share_bps"]),
                )
        connection.commit()
        return saved
    finally:
        connection.close()


def _active_rule_id(cursor, project_id: int) -> int | None:
    cursor.execute(
        """
        SELECT id FROM split_rules
        WHERE project_id = %s AND is_active = TRUE
        ORDER BY id DESC
        LIMIT 1
        """,
        (project_id,),
    )
    row = cursor.fetchone()
    return row["id"] if row else None


def record_split(project_id: int, amount, currency: str | None, reference: str | None) -> dict:
    project = get_project(project_id)
    if project is None:
        raise SplitError("Proje bulunamadı.")
    stakeholders = list_stakeholders(project_id, active_only=True)
    if not stakeholders:
        raise SplitError("Aktif paydaş yok. Önce oranları kaydedin.")
    result = split_amount(
        amount,
        [
            {
                "id": row["id"],
                "name": row["display_name"],
                "role": row["role"],
                "share_bps": row["share_bps"],
            }
            for row in stakeholders
        ],
        currency=currency or project["currency"],
    )
    connection = _connect()
    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            rule_id = _active_rule_id(cursor, project_id)
            cursor.execute(
                """
                INSERT INTO transaction_split_audits
                    (project_id, split_rule_id, reference, amount_cents, currency, allocations)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id, created_at
                """,
                (
                    project_id,
                    rule_id,
                    (reference or "").strip() or None,
                    result["amount_cents"],
                    result["currency"],
                    Json(result["allocations"]),
                ),
            )
            audit = dict(cursor.fetchone())
        connection.commit()
    finally:
        connection.close()
    result["audit_id"] = audit["id"]
    result["created_at"] = audit["created_at"].isoformat()
    result["project_id"] = project_id
    result["reference"] = (reference or "").strip() or None
    return result


def list_audits(project_id: int, limit: int = 20) -> list[dict]:
    connection = _connect()
    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT id, reference, amount_cents, currency, allocations, created_at
                FROM transaction_split_audits
                WHERE project_id = %s
                ORDER BY id DESC
                LIMIT %s
                """,
                (project_id, limit),
            )
            rows = []
            for row in cursor.fetchall():
                item = dict(row)
                item["created_at"] = item["created_at"].isoformat()
                rows.append(item)
            return rows
    finally:
        connection.close()


def _balances(project_id: int) -> dict[int, dict]:
    stakeholders = {row["id"]: {**row, "earned_cents": 0, "paid_cents": 0} for row in list_stakeholders(project_id, False)}
    connection = _connect()
    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                "SELECT allocations FROM transaction_split_audits WHERE project_id = %s",
                (project_id,),
            )
            for row in cursor.fetchall():
                for piece in row["allocations"] or []:
                    sid = piece.get("stakeholder_id")
                    if sid in stakeholders:
                        stakeholders[sid]["earned_cents"] += int(piece.get("amount_cents") or 0)
            cursor.execute(
                """
                SELECT stakeholder_id, COALESCE(SUM(amount_cents), 0) AS paid
                FROM payout_requests
                WHERE project_id = %s AND status IN ('pending', 'approved', 'paid')
                GROUP BY stakeholder_id
                """,
                (project_id,),
            )
            for row in cursor.fetchall():
                sid = row["stakeholder_id"]
                if sid in stakeholders:
                    stakeholders[sid]["paid_cents"] = int(row["paid"])
    finally:
        connection.close()
    return stakeholders


def project_shares(project_id: int) -> dict:
    project = get_project(project_id)
    if project is None:
        raise SplitError("Proje bulunamadı.")
    balances = _balances(project_id)
    shares = []
    for row in balances.values():
        available = max(0, row["earned_cents"] - row["paid_cents"])
        shares.append(
            {
                "id": row["id"],
                "name": row["display_name"],
                "email": row["email"],
                "role": row["role"],
                "share_bps": row["share_bps"],
                "share_percent": row["share_bps"] / 100,
                "is_active": row["is_active"],
                "earned_cents": row["earned_cents"],
                "paid_cents": row["paid_cents"],
                "available_cents": available,
            }
        )
    shares.sort(key=lambda item: item["id"])
    return {
        "project": {
            "id": project["id"],
            "name": project["name"],
            "currency": project["currency"],
        },
        "shares": shares,
        "audits": list_audits(project_id),
        "payouts": list_payouts(project_id),
    }


def list_payouts(project_id: int) -> list[dict]:
    connection = _connect()
    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                SELECT p.id, p.stakeholder_id, s.display_name, p.amount_cents,
                       p.currency, p.status, p.note, p.created_at
                FROM payout_requests p
                JOIN project_stakeholders s ON s.id = p.stakeholder_id
                WHERE p.project_id = %s
                ORDER BY p.id DESC
                """,
                (project_id,),
            )
            rows = []
            for row in cursor.fetchall():
                item = dict(row)
                item["created_at"] = item["created_at"].isoformat()
                rows.append(item)
            return rows
    finally:
        connection.close()


def create_payout(project_id: int, stakeholder_id: int, amount, note: str | None) -> dict:
    project = get_project(project_id)
    if project is None:
        raise SplitError("Proje bulunamadı.")
    amount_cents = to_cents(amount)
    if amount_cents <= 0:
        raise SplitError("Çekim tutarı 0'dan büyük olmalıdır.")
    balances = _balances(project_id)
    holder = balances.get(int(stakeholder_id))
    if holder is None or not holder["is_active"]:
        raise SplitError("Paydaş bulunamadı.")
    available = max(0, holder["earned_cents"] - holder["paid_cents"])
    if amount_cents > available:
        raise SplitError("Kullanılabilir hakediş bu tutardan küçük.")
    connection = _connect()
    try:
        with connection.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(
                """
                INSERT INTO payout_requests
                    (project_id, stakeholder_id, amount_cents, currency, status, note)
                VALUES (%s, %s, %s, %s, 'pending', %s)
                RETURNING id, project_id, stakeholder_id, amount_cents, currency, status, note, created_at
                """,
                (
                    project_id,
                    stakeholder_id,
                    amount_cents,
                    project["currency"],
                    (note or "").strip() or None,
                ),
            )
            row = dict(cursor.fetchone())
        connection.commit()
        row["created_at"] = row["created_at"].isoformat()
        return row
    finally:
        connection.close()


def apply_from_plan(project_id: int, plan: dict, apply_split: bool = True) -> dict:
    stakeholders = plan.get("stakeholders") or []
    if not stakeholders:
        raise SplitError("Anlatımda paydaş bulunamadı.")
    saved = replace_stakeholders(project_id, stakeholders)
    split_result = None
    if apply_split and plan.get("amount") is not None:
        split_result = record_split(
            project_id,
            plan["amount"],
            plan.get("currency"),
            plan.get("reference") or plan.get("project_name"),
        )
    return {
        "extracted": plan,
        "stakeholders": saved,
        "split": split_result,
        "shares": project_shares(project_id),
    }
