import threading
import time
import uuid

from config import CONTRACT_SESSION_TTL

_LOCK = threading.Lock()
_SESSIONS: dict = {}
_SHARES: dict = {}


def _purge(now: float | None = None) -> None:
    stamp = now if now is not None else time.time()
    expired = [
        key
        for key, value in _SESSIONS.items()
        if stamp - value.get("updated_at", 0) > CONTRACT_SESSION_TTL
    ]
    for key in expired:
        _SESSIONS.pop(key, None)


def new_session_id() -> str:
    return str(uuid.uuid4())


def get_session(session_id: str | None) -> dict | None:
    if not session_id:
        return None
    with _LOCK:
        _purge()
        session = _SESSIONS.get(session_id)
        if not session:
            return None
        session["updated_at"] = time.time()
        return session


def put_docs(session_id: str, docs: list[dict]) -> dict:
    with _LOCK:
        _purge()
        session = {
            "created_at": time.time(),
            "updated_at": time.time(),
            "docs": docs,
            "history": [],
        }
        _SESSIONS[session_id] = session
        return session


def session_chunks(session_id: str | None) -> list[dict]:
    session = get_session(session_id)
    if not session:
        return []
    chunks = []
    for doc in session.get("docs") or []:
        chunks.extend(doc.get("chunks") or [])
    return chunks


def session_docs(session_id: str | None) -> list[dict]:
    session = get_session(session_id)
    if not session:
        return []
    return session.get("docs") or []


def append_history(session_id: str, question: str, answer: str) -> None:
    session = get_session(session_id)
    if not session:
        return
    with _LOCK:
        history = session.setdefault("history", [])
        history.append({"q": question, "a": answer})
        session["history"] = history[-6:]
        session["updated_at"] = time.time()


def session_history(session_id: str | None) -> list[dict]:
    session = get_session(session_id)
    if not session:
        return []
    return list(session.get("history") or [])


def _purge_shares(now: float | None = None) -> None:
    stamp = now if now is not None else time.time()
    expired = [
        key
        for key, value in _SHARES.items()
        if stamp - value.get("updated_at", 0) > CONTRACT_SESSION_TTL
    ]
    for key in expired:
        _SHARES.pop(key, None)


def put_share(payload: dict) -> str:
    share_id = uuid.uuid4().hex[:12]
    with _LOCK:
        _purge_shares()
        _SHARES[share_id] = {
            "payload": payload,
            "updated_at": time.time(),
        }
    return share_id


def get_share(share_id: str | None) -> dict | None:
    if not share_id:
        return None
    with _LOCK:
        _purge_shares()
        item = _SHARES.get(share_id)
        if not item:
            return None
        item["updated_at"] = time.time()
        return dict(item.get("payload") or {})
