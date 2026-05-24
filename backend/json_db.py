"""
json_db.py  —  Lightweight JSON file storage
Drop-in replacement for MongoDB / pymongo.

Each collection = one JSON file inside DATA_DIR (default: ./data/).
Collections auto-create on first write.

Supported operations:
  count_documents(query)
  find_one(query)
  find(query)           → Cursor  (supports .sort(field, direction))
  insert_one(doc)       → InsertResult  (.inserted_id)
  update_one(query, update)  → UpdateResult  (.matched_count)
    operators: $set, $addToSet
  delete_one(query)     → DeleteResult  (.deleted_count)

Query operators supported:
  { field: value }          exact match / array-contains
  { field: { $in: [...] } } value in list
"""

import json
import os
import threading
import uuid
from pathlib import Path
from typing import Any, Dict, List, Optional

# ── Storage directory ─────────────────────────────────────────────────────────

DATA_DIR = Path(os.getenv("DATA_DIR", "./data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

# ── Per-collection file locks (prevents concurrent write corruption) ──────────

_locks: Dict[str, threading.Lock] = {}
_locks_meta = threading.Lock()


def _get_lock(name: str) -> threading.Lock:
    with _locks_meta:
        if name not in _locks:
            _locks[name] = threading.Lock()
        return _locks[name]


# ── Raw file I/O ──────────────────────────────────────────────────────────────

def _file_path(name: str) -> Path:
    return DATA_DIR / f"{name}.json"


def _load(name: str) -> List[Dict[str, Any]]:
    path = _file_path(name)
    if not path.exists():
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return []


def _save(name: str, docs: List[Dict[str, Any]]) -> None:
    path = _file_path(name)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(docs, f, indent=2, default=str)


# ── Query matching ────────────────────────────────────────────────────────────

def _match(doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
    """Minimal MongoDB-style query matcher."""
    for key, condition in query.items():
        val = doc.get(key)

        if isinstance(condition, dict):
            if "$in" in condition:
                candidates = condition["$in"]
                # Array field: check if any candidate is in the array
                if isinstance(val, list):
                    if not any(c in val for c in candidates):
                        return False
                else:
                    # Scalar field: check if value is in candidates list
                    if val not in candidates:
                        return False
            # add more operators here if needed

        else:
            # Array-contains check OR exact match
            if isinstance(val, list):
                if condition not in val:
                    return False
            else:
                if val != condition:
                    return False

    return True


# ── Result types ──────────────────────────────────────────────────────────────

class InsertResult:
    def __init__(self, inserted_id: str):
        self.inserted_id = inserted_id


class UpdateResult:
    def __init__(self, matched_count: int):
        self.matched_count = matched_count


class DeleteResult:
    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count


# ── Cursor (lazy list + .sort()) ──────────────────────────────────────────────

class Cursor:
    def __init__(self, docs: List[Dict[str, Any]]):
        self._docs = docs

    def sort(self, field: str, direction: int = -1) -> "Cursor":
        """direction: -1 = descending (default), 1 = ascending"""
        self._docs = sorted(
            self._docs,
            key=lambda d: d.get(field) or "",
            reverse=(direction == -1),
        )
        return self

    def __iter__(self):
        return iter(self._docs)

    def __len__(self):
        return len(self._docs)


# ── Collection ────────────────────────────────────────────────────────────────

class Collection:
    def __init__(self, name: str):
        self._name = name

    # reads ───────────────────────────────────────────────────────────────────

    def count_documents(self, query: Dict[str, Any]) -> int:
        return sum(1 for d in _load(self._name) if _match(d, query))

    def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for d in _load(self._name):
            if _match(d, query):
                return d
        return None

    def find(
        self,
        query: Optional[Dict[str, Any]] = None,
        projection: Optional[Dict[str, Any]] = None,   # accepted, not applied
    ) -> Cursor:
        docs = _load(self._name)
        if query:
            docs = [d for d in docs if _match(d, query)]
        return Cursor(list(docs))

    # writes (file-level lock) ────────────────────────────────────────────────

    def insert_one(self, doc: Dict[str, Any]) -> InsertResult:
        new_id = uuid.uuid4().hex
        doc["_id"] = new_id
        lock = _get_lock(self._name)
        with lock:
            docs = _load(self._name)
            docs.append(doc)
            _save(self._name, docs)
        return InsertResult(new_id)

    def update_one(
        self, query: Dict[str, Any], update: Dict[str, Any]
    ) -> UpdateResult:
        lock = _get_lock(self._name)
        with lock:
            docs = _load(self._name)
            matched = 0
            for doc in docs:
                if _match(doc, query):
                    matched += 1
                    # $set
                    for k, v in update.get("$set", {}).items():
                        doc[k] = v
                    # $addToSet
                    for k, v in update.get("$addToSet", {}).items():
                        lst = doc.setdefault(k, [])
                        if isinstance(lst, list) and v not in lst:
                            lst.append(v)
                    break  # update_one → first match only
            _save(self._name, docs)
        return UpdateResult(matched)

    def delete_one(self, query: Dict[str, Any]) -> DeleteResult:
        lock = _get_lock(self._name)
        with lock:
            docs = _load(self._name)
            for i, doc in enumerate(docs):
                if _match(doc, query):
                    docs.pop(i)
                    _save(self._name, docs)
                    return DeleteResult(1)
        return DeleteResult(0)


# ── Database (attribute access → Collection) ──────────────────────────────────

class JsonDB:
    """
    Usage:
        db = JsonDB()
        db.users.insert_one({...})
        db.institutes.find({"status": "active"}).sort("createdAt", -1)
    """
    def __getattr__(self, name: str) -> Collection:
        return Collection(name)


# ── FastAPI dependency ────────────────────────────────────────────────────────

def get_db() -> JsonDB:
    """Use as FastAPI Depends: db: JsonDB = Depends(get_db)"""
    return JsonDB()