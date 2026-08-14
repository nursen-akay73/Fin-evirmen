"""Isolated Flask blueprint. Does not replace existing /api/* RAG routes."""

from flask import Blueprint, jsonify, request

from modules.revenue_engine import store
from modules.revenue_engine.parser import extract_split_plan
from modules.revenue_engine.splitter import SplitError, split_amount

revenue_bp = Blueprint("revenue_engine", __name__, url_prefix="/api/revenue")


def _error(message: str, status: int = 400):
    return jsonify({"error": message}), status


@revenue_bp.get("/projects")
def list_projects():
    try:
        project = store.get_or_create_default_project()
        return jsonify({"projects": store.list_projects(), "current": project})
    except Exception as error:
        return _error(str(error), 500)


@revenue_bp.post("/projects")
def create_project():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    if not name:
        return _error("Proje adı zorunlu.")
    try:
        return jsonify(store.create_project(name, payload.get("currency") or "TRY"))
    except SplitError as error:
        return _error(str(error))
    except Exception as error:
        return _error(str(error), 500)


@revenue_bp.get("/projects/<int:project_id>/shares")
def project_shares(project_id: int):
    try:
        return jsonify(store.project_shares(project_id))
    except SplitError as error:
        return _error(str(error), 404 if "bulunamadı" in str(error) else 400)
    except Exception as error:
        return _error(str(error), 500)


@revenue_bp.post("/projects/<int:project_id>/stakeholders")
def save_stakeholders(project_id: int):
    payload = request.get_json(silent=True) or {}
    rows = payload.get("stakeholders") or payload.get("rules") or []
    if not isinstance(rows, list):
        return _error("stakeholders bir dizi olmalıdır.")
    try:
        saved = store.replace_stakeholders(project_id, rows)
        return jsonify({"ok": True, "stakeholders": saved})
    except SplitError as error:
        return _error(str(error))
    except Exception as error:
        return _error(str(error), 500)


@revenue_bp.post("/split")
def split_sale():
    payload = request.get_json(silent=True) or {}
    project_id = payload.get("project_id")
    amount = payload.get("amount")
    if project_id is None or amount is None:
        return _error("project_id ve amount zorunlu.")
    try:
        result = store.record_split(
            int(project_id),
            amount,
            payload.get("currency"),
            payload.get("reference"),
        )
        return jsonify(result)
    except SplitError as error:
        return _error(str(error))
    except Exception as error:
        return _error(str(error), 500)


@revenue_bp.post("/simulate")
def simulate():
    payload = request.get_json(silent=True) or {}
    amount = payload.get("amount")
    rules = payload.get("rules") or payload.get("stakeholders") or []
    if amount is None:
        return _error("amount zorunlu.")
    if not isinstance(rules, list):
        return _error("rules bir dizi olmalıdır.")
    try:
        return jsonify(
            split_amount(amount, rules, currency=payload.get("currency") or "TRY")
        )
    except SplitError as error:
        return _error(str(error))
    except Exception as error:
        return _error(str(error), 500)


@revenue_bp.post("/from-description")
def from_description():
    payload = request.get_json(silent=True) or {}
    text = (payload.get("text") or payload.get("description") or "").strip()
    project_id = payload.get("project_id")
    apply_split = payload.get("apply", True)
    if not text:
        return _error("Proje anlatımı zorunlu.")
    if project_id in (None, ""):
        return _error("project_id zorunlu.")
    try:
        plan = extract_split_plan(text)
        result = store.apply_from_plan(int(project_id), plan, apply_split=bool(apply_split))
        return jsonify(result)
    except SplitError as error:
        return _error(str(error))
    except Exception as error:
        return _error(str(error), 500)


@revenue_bp.post("/payouts")
def request_payout():
    payload = request.get_json(silent=True) or {}
    try:
        project_id = payload.get("project_id")
        stakeholder_id = payload.get("stakeholder_id")
        amount = payload.get("amount")
        if project_id in (None, "") or stakeholder_id in (None, "") or amount in (None, ""):
            return _error("Paydaş ve tutar zorunlu.")
        result = store.create_payout(
            int(project_id),
            int(stakeholder_id),
            amount,
            payload.get("note"),
        )
        return jsonify(result)
    except SplitError as error:
        return _error(str(error))
    except (TypeError, ValueError):
        return _error("Paydaş ve tutar zorunlu.")
    except Exception as error:
        return _error(str(error), 500)
