import base64
import hashlib
import hmac
import json
import os
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from pydantic import BaseModel, Field

try:
    import boto3
except Exception:
    boto3 = None

router = APIRouter(prefix="/api", tags=["RBAC"])
ROLES = {"gog", "super_admin", "admin", "evaluator"}

S3_FOLDERS = {
    "question-paper": "question-papers/",
    "ideal-answer": "ideal-answers/",
    "answer-script": "answer-scripts/",
    "annotated-script": "annotated-scripts/",
    "evaluation-report": "evaluation-reports/",
}
ANSWER_SCRIPT_PATTERN = (
    r"^(?P<studentName>[A-Za-z][A-Za-z ]*)_"
    r"(?P<rollNo>[A-Za-z0-9-]+)_"
    r"(?P<examName>[A-Za-z0-9-]+)_"
    r"(?P<subject>[A-Za-z0-9-]+)_Answer_Script\.pdf$"
)

# ─── Storage ──────────────────────────────────────────────────────────────────
# Always resolves to  <folder where rbac.py lives>/data/
DATA_DIR = Path(__file__).resolve().parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

_locks: Dict[str, threading.Lock] = {}
_locks_meta = threading.Lock()

def _lock(name):
    with _locks_meta:
        if name not in _locks:
            _locks[name] = threading.Lock()
        return _locks[name]

def _path(name):
    return DATA_DIR / f"{name}.json"

def _load(name):
    p = _path(name)
    if not p.exists():
        return []
    try:
        txt = p.read_text(encoding="utf-8").strip()
        return json.loads(txt) if txt else []
    except Exception:
        return []

def _save(name, docs):
    _path(name).write_text(
        json.dumps(docs, indent=2, default=str, ensure_ascii=False),
        encoding="utf-8"
    )

def _match(doc, query):
    for k, cond in query.items():
        v = doc.get(k)
        if isinstance(cond, dict):
            if "$in" in cond:
                hits = cond["$in"]
                if isinstance(v, list):
                    if not any(h in v for h in hits): return False
                else:
                    if v not in hits: return False
        else:
            if isinstance(v, list):
                if cond not in v: return False
            else:
                if v != cond: return False
    return True

class _Cur:
    def __init__(self, docs): self._d = list(docs)
    def sort(self, f, d=-1):
        self._d.sort(key=lambda x: x.get(f) or "", reverse=(d==-1))
        return self
    def __iter__(self): return iter(self._d)

class _IR:
    def __init__(self, i): self.inserted_id = i
class _UR:
    def __init__(self, m): self.matched_count = m
class _DR:
    def __init__(self, d): self.deleted_count = d

class _Col:
    def __init__(self, n): self._n = n

    def count_documents(self, q):
        return sum(1 for d in _load(self._n) if _match(d, q))

    def find_one(self, q):
        for d in _load(self._n):
            if _match(d, q): return d
        return None

    def find(self, q=None, projection=None):
        docs = _load(self._n)
        if q: docs = [d for d in docs if _match(d, q)]
        return _Cur(docs)

    def insert_one(self, doc):
        nid = uuid.uuid4().hex
        doc["_id"] = nid
        with _lock(self._n):
            docs = _load(self._n)
            docs.append(doc)
            _save(self._n, docs)
        return _IR(nid)

    def update_one(self, q, upd):
        with _lock(self._n):
            docs = _load(self._n)
            matched = 0
            for doc in docs:
                if _match(doc, q):
                    matched += 1
                    for k, v in upd.get("$set", {}).items(): doc[k] = v
                    for k, v in upd.get("$addToSet", {}).items():
                        lst = doc.setdefault(k, [])
                        if isinstance(lst, list) and v not in lst: lst.append(v)
                    break
            _save(self._n, docs)
        return _UR(matched)

    def delete_one(self, q):
        with _lock(self._n):
            docs = _load(self._n)
            for i, doc in enumerate(docs):
                if _match(doc, q):
                    docs.pop(i)
                    _save(self._n, docs)
                    return _DR(1)
        return _DR(0)

class _DB:
    def __getattr__(self, n): return _Col(n)

def get_db(): return _DB()

# ─── Helpers ──────────────────────────────────────────────────────────────────
def utc_now(): return datetime.now(timezone.utc).isoformat()

def clean_doc(doc):
    if not doc: return None
    doc = dict(doc)
    if "_id" in doc: doc["id"] = str(doc.pop("_id"))
    doc.pop("passwordHash", None)
    return doc

def oid(v): return str(v) if v else v

def hash_password(pw: str) -> str:
    salt = os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 100_000)
    return base64.b64encode(salt).decode() + ":" + base64.b64encode(dk).decode()

def verify_password(pw: str, stored: str) -> bool:
    try:
        salt_b64, dk_b64 = stored.split(":")
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(dk_b64)
        actual = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt, 100_000)
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False

def _b64u(b): return base64.urlsafe_b64encode(b).rstrip(b"=").decode()

def _jwt_secret():
    return os.getenv("JWT_SECRET_KEY", "dev_secret_gradeai_2024").encode()

def sign_token(payload):
    h = _b64u(json.dumps({"alg":"HS256","typ":"JWT"}, separators=(",",":")).encode())
    p = _b64u(json.dumps(payload, separators=(",",":")).encode())
    s = _b64u(hmac.new(_jwt_secret(), f"{h}.{p}".encode(), hashlib.sha256).digest())
    return f"{h}.{p}.{s}"

def decode_token(token):
    try:
        h, p, s = token.split(".")
        exp = _b64u(hmac.new(_jwt_secret(), f"{h}.{p}".encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(exp, s): raise ValueError("bad sig")
        payload = json.loads(base64.urlsafe_b64decode(p + "==="))
        if payload.get("exp", 0) < int(time.time()): raise ValueError("expired")
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")

def current_user(authorization: Optional[str] = Header(default=None), db=Depends(get_db)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token.")
    payload = decode_token(authorization.split(" ", 1)[1])
    user = db.users.find_one({"_id": payload["sub"]})
    if not user: raise HTTPException(status_code=401, detail="User not found.")
    return clean_doc(user)

def require_roles(*roles):
    def checker(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions.")
        return user
    return checker

# ─── Models ───────────────────────────────────────────────────────────────────
class LoginIn(BaseModel):
    email: str
    password: str

class UserIn(BaseModel):
    name: str
    email: str
    password: str = Field(min_length=8)
    role: str
    department: Optional[str] = ""
    assignedExams: List[str] = []
    instituteId: Optional[str] = None

class InstituteIn(BaseModel):
    name: str
    code: Optional[str] = ""
    address: Optional[str] = ""
    contactEmail: Optional[str] = ""
    contactPhone: Optional[str] = ""
    status: str = "active"

class InstituteUpdateIn(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    contactEmail: Optional[str] = None
    contactPhone: Optional[str] = None
    status: Optional[str] = None

class ExaminationIn(BaseModel):
    examName: str
    subject: str
    department: str
    semester: Optional[str] = ""
    date: Optional[str] = ""
    time: Optional[str] = ""
    status: str = "draft"
    assignedAdmin: Optional[str] = None
    assignedEvaluators: List[str] = []

class ApprovalIn(BaseModel):
    status: str
    remarks: Optional[str] = ""

class AssignAdminIn(BaseModel):
    adminId: str

class AssignEvaluatorIn(BaseModel):
    evaluatorId: str

class PresignIn(BaseModel):
    purpose: str
    fileName: str
    fileType: str = "application/pdf"
    fileSize: int
    examId: Optional[str] = None

class FileRecordIn(BaseModel):
    examId: str
    fileName: str
    fileType: str = "application/pdf"
    fileUrl: str
    remarks: Optional[str] = ""

class CriteriaIn(BaseModel):
    examId: str
    questions: List[Dict[str, Any]] = []
    leniencyRange: int = Field(default=5, ge=1, le=10)
    idealAnswerUrl: Optional[str] = None
    fileName: Optional[str] = None

class AnswerScriptIn(BaseModel):
    examId: str
    studentName: str
    rollNo: str
    examName: str
    subject: str
    fileName: str
    fileUrl: str

class UserUpdateIn(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None

class EvaluationResultIn(BaseModel):
    examId: Optional[str] = None
    answerScriptId: Optional[str] = None
    studentName: str = ""
    rollNumber: str = ""
    subject: str = ""
    marks: float = 0
    maxMarks: float = 0
    percentage: float = 0
    grade: str = ""
    report: Dict[str, Any]

# ─── Auth ──────────────────────────────────────────────────────────────────────
@router.post("/auth/bootstrap-gog")
def bootstrap_gog(payload: UserIn, db=Depends(get_db)):
    if db.users.count_documents({}) > 0:
        raise HTTPException(status_code=409, detail="Bootstrap disabled after first user.")
    if payload.role != "gog":
        raise HTTPException(status_code=400, detail="First user must be gog.")
    doc = payload.model_dump(exclude={"password"})
    doc["email"] = payload.email.lower().strip()
    doc["passwordHash"] = hash_password(payload.password)
    doc["createdBy"] = None
    doc["instituteId"] = None
    doc["createdAt"] = utc_now()
    doc["updatedAt"] = utc_now()
    r = db.users.insert_one(doc)
    return clean_doc(db.users.find_one({"_id": r.inserted_id}))

@router.post("/auth/bootstrap-super-admin")
def bootstrap_super_admin(payload: UserIn, db=Depends(get_db)):
    if db.users.count_documents({}) > 0:
        raise HTTPException(status_code=409, detail="Bootstrap disabled after first user.")
    if payload.role != "super_admin":
        raise HTTPException(status_code=400, detail="First user must be super_admin.")
    doc = payload.model_dump(exclude={"password"})
    doc["email"] = payload.email.lower().strip()
    doc["passwordHash"] = hash_password(payload.password)
    doc["createdBy"] = None
    doc["createdAt"] = utc_now()
    doc["updatedAt"] = utc_now()
    r = db.users.insert_one(doc)
    return clean_doc(db.users.find_one({"_id": r.inserted_id}))

@router.post("/auth/login")
def login(payload: LoginIn, db=Depends(get_db)):
    user = db.users.find_one({"email": payload.email.lower().strip()})
    if not user or not verify_password(payload.password, user.get("passwordHash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = sign_token({
        "sub": str(user["_id"]),
        "role": user["role"],
        "exp": int(time.time()) + 60 * 60 * 12,
    })
    return {"access_token": token, "token_type": "bearer", "user": clean_doc(user)}

@router.get("/auth/me")
def me(user=Depends(current_user)):
    return user

# ─── Users ────────────────────────────────────────────────────────────────────
@router.post("/users")
def create_user(payload: UserIn, user=Depends(require_roles("gog","super_admin","admin")), db=Depends(get_db)):
    if payload.role not in ROLES:
        raise HTTPException(status_code=400, detail="Invalid role.")
    if user["role"] == "admin" and payload.role != "evaluator":
        raise HTTPException(status_code=403, detail="Admins can only create evaluators.")
    if user["role"] == "super_admin" and payload.role not in {"admin","evaluator"}:
        raise HTTPException(status_code=403, detail="Super admins can only create admins or evaluators.")
    if user["role"] == "gog" and payload.role == "gog":
        raise HTTPException(status_code=403, detail="Cannot create another gog.")
    # ── Resolve target instituteId ──────────────────────────────────────
    # GoG must provide instituteId in payload (selected from dropdown)
    # Super Admin / Admin inherit their own instituteId automatically
    if payload.role in {"super_admin", "admin", "evaluator"}:
        if user["role"] == "gog":
            tid = payload.instituteId   # GoG must select institute
        else:
            tid = user.get("instituteId")  # SA/Admin inherit their institute
        if not tid:
            raise HTTPException(status_code=400, detail="instituteId required.")
        if not db.institutes.find_one({"_id": oid(tid)}):
            raise HTTPException(status_code=404, detail="Institute not found.")
    else:
        tid = None
    if db.users.find_one({"email": payload.email.lower().strip()}):
        raise HTTPException(status_code=409, detail="Email already exists.")
    doc = payload.model_dump(exclude={"password"})
    doc["email"] = payload.email.lower().strip()
    doc["passwordHash"] = hash_password(payload.password)
    doc["createdBy"] = user["id"]
    doc["instituteId"] = tid  # None only for gog role itself
    doc["createdAt"] = utc_now()
    doc["updatedAt"] = utc_now()
    r = db.users.insert_one(doc)
    return clean_doc(db.users.find_one({"_id": r.inserted_id}))

@router.get("/users")
def list_users(role: Optional[str]=Query(default=None), instituteId: Optional[str]=Query(default=None),
               user=Depends(require_roles("gog","super_admin","admin")), db=Depends(get_db)):
    q: Dict[str,Any] = {}
    if user["role"] == "admin":
        # Admin sees only evaluators in same institute
        q["role"] = "evaluator"
        q["instituteId"] = user.get("instituteId")
    elif user["role"] == "super_admin":
        # Super admin sees admins + evaluators in same institute
        if role:
            q["role"] = role
        else:
            q["role"] = {"$in": ["admin", "evaluator"]}
        q["instituteId"] = user.get("instituteId")
    elif user["role"] == "gog":
        # GoG sees everyone — optional filter by role or institute
        if role: q["role"] = role
        if instituteId: q["instituteId"] = instituteId
    return [clean_doc(d) for d in db.users.find(q).sort("createdAt",-1)]

@router.patch("/users/{user_id}")
def update_user(
    user_id: str,
    payload: UserUpdateIn,
    user=Depends(require_roles("gog","super_admin","admin")),
    db=Depends(get_db)
):
    target = db.users.find_one({"_id": oid(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    # Permission check — can only edit users in same institute or below
    if user["role"] != "gog" and target.get("instituteId") != user.get("instituteId"):
        raise HTTPException(status_code=403, detail="Cannot edit user from another institute.")
    upd = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not upd:
        raise HTTPException(status_code=400, detail="No fields to update.")
    if "email" in upd:
        upd["email"] = upd["email"].lower().strip()
        # Check email uniqueness
        existing = db.users.find_one({"email": upd["email"]})
        if existing and str(existing["_id"]) != user_id:
            raise HTTPException(status_code=409, detail="Email already in use.")
    upd["updatedAt"] = utc_now()
    db.users.update_one({"_id": oid(user_id)}, {"$set": upd})
    return clean_doc(db.users.find_one({"_id": oid(user_id)}))


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    user=Depends(require_roles("gog","super_admin","admin")),
    db=Depends(get_db)
):
    target = db.users.find_one({"_id": oid(user_id)})
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if str(target["_id"]) == str(user.get("id")):
        raise HTTPException(status_code=400, detail="Cannot delete your own account.")
    if user["role"] != "gog" and target.get("instituteId") != user.get("instituteId"):
        raise HTTPException(status_code=403, detail="Cannot delete user from another institute.")
    if target.get("role") == "gog":
        raise HTTPException(status_code=403, detail="Cannot delete a GoG account.")
    db.users.delete_one({"_id": oid(user_id)})
    return {"deleted": True, "id": user_id}


# ─── Institutes ───────────────────────────────────────────────────────────────
@router.post("/institutes")
def create_institute(payload: InstituteIn, user=Depends(require_roles("gog")), db=Depends(get_db)):
    if db.institutes.find_one({"name": payload.name}):
        raise HTTPException(status_code=409, detail="Institute name already exists.")
    doc = payload.model_dump()
    doc["createdBy"] = user["id"]; doc["createdAt"] = utc_now(); doc["updatedAt"] = utc_now()
    r = db.institutes.insert_one(doc)
    return clean_doc(db.institutes.find_one({"_id": r.inserted_id}))

@router.get("/institutes")
def list_institutes(user=Depends(current_user), db=Depends(get_db)):
    if user["role"] == "gog": return [clean_doc(d) for d in db.institutes.find({}).sort("createdAt",-1)]
    if user.get("instituteId"): return [clean_doc(d) for d in db.institutes.find({"_id": oid(user["instituteId"])})]
    return []

@router.patch("/institutes/{iid}")
def update_institute(iid: str, payload: InstituteUpdateIn, user=Depends(require_roles("gog")), db=Depends(get_db)):
    upd = {k:v for k,v in payload.model_dump().items() if v is not None}
    if not upd: raise HTTPException(status_code=400, detail="No fields to update.")
    upd["updatedAt"] = utc_now()
    r = db.institutes.update_one({"_id": oid(iid)}, {"$set": upd})
    if r.matched_count == 0: raise HTTPException(status_code=404, detail="Institute not found.")
    return clean_doc(db.institutes.find_one({"_id": oid(iid)}))

@router.delete("/institutes/{iid}")
def delete_institute(iid: str, user=Depends(require_roles("gog")), db=Depends(get_db)):
    if db.users.count_documents({"instituteId": iid}) > 0:
        raise HTTPException(status_code=409, detail="Cannot delete: institute has users.")
    r = db.institutes.delete_one({"_id": oid(iid)})
    if r.deleted_count == 0: raise HTTPException(status_code=404, detail="Institute not found.")
    return {"deleted": True, "id": iid}

# ─── Analytics ────────────────────────────────────────────────────────────────
@router.get("/analytics/token-cost")
def token_cost_overview(instituteId: Optional[str]=Query(default=None),
                        user=Depends(require_roles("gog")), db=Depends(get_db)):
    m: Dict[str,Any] = {}
    if instituteId: m["instituteId"] = instituteId
    records = list(db.cost_records.find(m).sort("createdAt",-1))
    totals = {"input_tokens":0,"output_tokens":0,"total_tokens":0,"cost_usd":0.0,"cost_inr":0.0,"evaluations":len(records)}
    by_inst: Dict[str,Any] = {}
    for r in records:
        totals["input_tokens"]  += int(r.get("input_tokens") or 0)
        totals["output_tokens"] += int(r.get("output_tokens") or 0)
        totals["total_tokens"]  += int(r.get("total_tokens") or 0)
        totals["cost_usd"]      += float(r.get("cost_usd") or 0)
        totals["cost_inr"]      += float(r.get("cost_inr") or 0)
        iid = r.get("instituteId") or "unassigned"
        s = by_inst.setdefault(iid,{"instituteId":iid,"input_tokens":0,"output_tokens":0,"total_tokens":0,"cost_usd":0.0,"cost_inr":0.0,"evaluations":0})
        s["input_tokens"]  += int(r.get("input_tokens") or 0)
        s["output_tokens"] += int(r.get("output_tokens") or 0)
        s["total_tokens"]  += int(r.get("total_tokens") or 0)
        s["cost_usd"]      += float(r.get("cost_usd") or 0)
        s["cost_inr"]      += float(r.get("cost_inr") or 0)
        s["evaluations"]   += 1
    il = {d["_id"]: d.get("name","") for d in db.institutes.find({})}
    for iid, s in by_inst.items():
        s["instituteName"] = il.get(iid,"Unassigned")
        s["cost_usd"] = round(s["cost_usd"],6); s["cost_inr"] = round(s["cost_inr"],4)
    totals["cost_usd"] = round(totals["cost_usd"],6); totals["cost_inr"] = round(totals["cost_inr"],4)
    recent = []
    for r in records[:50]:
        r = dict(r); r["id"] = str(r.pop("_id","")); recent.append(r)
    return {"totals":totals,"byInstitute":sorted(by_inst.values(),key=lambda x:x["cost_inr"],reverse=True),"recent":recent}

def record_cost(db, *, user, cost_block, purpose="evaluate"):
    g = (cost_block or {}).get("gemini") or {}
    v = (cost_block or {}).get("vision") or {}
    doc = {
        "userId":(user or {}).get("id"), "userEmail":(user or {}).get("email"),
        "userRole":(user or {}).get("role"), "instituteId":(user or {}).get("instituteId"),
        "purpose":purpose,
        "input_tokens":int(g.get("input_tokens") or 0),
        "output_tokens":int(g.get("output_tokens") or 0),
        "total_tokens":int(g.get("total_tokens") or 0),
        "cost_usd":round(float(g.get("cost_usd") or 0)+float(v.get("cost_usd") or 0),8),
        "cost_inr":round(float(g.get("cost_inr") or 0)+float(v.get("cost_inr") or 0),6),
        "createdAt":utc_now(),
    }
    try: db.cost_records.insert_one(doc)
    except Exception: pass

# ─── Examinations ─────────────────────────────────────────────────────────────
@router.post("/examinations")
def create_exam(payload: ExaminationIn, user=Depends(require_roles("gog","super_admin","admin")), db=Depends(get_db)):
    doc = payload.model_dump()
    doc["createdBy"] = user["id"]; doc["instituteId"] = user.get("instituteId")
    doc["createdAt"] = utc_now(); doc["updatedAt"] = utc_now()
    if user["role"] == "admin": doc["assignedAdmin"] = user["id"]; doc["status"] = "schedule_pending"
    r = db.examinations.insert_one(doc)
    return clean_doc(db.examinations.find_one({"_id": r.inserted_id}))

@router.get("/examinations")
def list_exams(user=Depends(current_user), db=Depends(get_db)):
    q: Dict[str,Any] = {}
    if user["role"] == "gog":
        pass  # sees all exams
    elif user["role"] == "super_admin":
        q["instituteId"] = user.get("instituteId")   # all exams in institute
    elif user["role"] == "admin":
        # sees exams assigned to them OR in their institute
        q["instituteId"] = user.get("instituteId")
    elif user["role"] == "evaluator":
        # Show exams where evaluator is assigned OR all exams in their institute
        q["instituteId"] = user.get("instituteId")
    return [clean_doc(d) for d in db.examinations.find(q).sort("createdAt",-1)]

@router.patch("/examinations/{eid}/schedule-review")
def review_schedule(eid: str, payload: ApprovalIn, user=Depends(require_roles("gog","super_admin")), db=Depends(get_db)):
    if payload.status not in {"approved","rejected"}: raise HTTPException(status_code=400, detail="Invalid status.")
    db.examinations.update_one({"_id":oid(eid)},{"$set":{"status":f"schedule_{payload.status}","scheduleRemarks":payload.remarks,"updatedAt":utc_now()}})
    return clean_doc(db.examinations.find_one({"_id":oid(eid)}))

@router.patch("/examinations/{eid}/assign-admin")
def assign_admin(eid: str, payload: AssignAdminIn, user=Depends(require_roles("gog","super_admin")), db=Depends(get_db)):
    a = db.users.find_one({"_id":oid(payload.adminId),"role":"admin","instituteId":user.get("instituteId")})
    if not a: raise HTTPException(status_code=404, detail="Admin not found.")
    db.examinations.update_one({"_id":oid(eid)},{"$set":{"assignedAdmin":payload.adminId,"status":"admin_assigned","updatedAt":utc_now()}})
    db.users.update_one({"_id":oid(payload.adminId)},{"$addToSet":{"assignedExams":eid}})
    return clean_doc(db.examinations.find_one({"_id":oid(eid)}))

@router.patch("/examinations/{eid}/assign-evaluator")
def assign_evaluator(eid: str, payload: AssignEvaluatorIn, user=Depends(require_roles("gog","super_admin","admin")), db=Depends(get_db)):
    # Allow admin to assign evaluator to any exam in their institute
    exam = db.examinations.find_one({"_id": oid(eid), "instituteId": user.get("instituteId")})
    if not exam: raise HTTPException(status_code=404, detail="Exam not found in this institute.")
    ev = db.users.find_one({"_id": oid(payload.evaluatorId), "role": "evaluator", "instituteId": user.get("instituteId")})
    if not ev: raise HTTPException(status_code=404, detail="Evaluator not found in this institute.")
    db.examinations.update_one({"_id":oid(eid)},{"$addToSet":{"assignedEvaluators":payload.evaluatorId},"$set":{"updatedAt":utc_now()}})
    db.users.update_one({"_id":oid(payload.evaluatorId)},{"$addToSet":{"assignedExams":eid}})
    return clean_doc(db.examinations.find_one({"_id":oid(eid)}))

# ─── Uploads ──────────────────────────────────────────────────────────────────
@router.post("/uploads/presign")
def presign(payload: PresignIn, user=Depends(current_user)):
    if payload.fileType != "application/pdf" or not payload.fileName.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF allowed.")
    if payload.fileSize > int(os.getenv("MAX_UPLOAD_BYTES", str(25*1024*1024))):
        raise HTTPException(status_code=400, detail="File too large.")
    folder = S3_FOLDERS.get(payload.purpose)
    if not folder: raise HTTPException(status_code=400, detail="Invalid purpose.")
    if payload.purpose in {"question-paper","ideal-answer","answer-script"} and user["role"] != "evaluator":
        raise HTTPException(status_code=403, detail="Only evaluators can upload this.")
    if boto3 is None: raise HTTPException(status_code=503, detail="boto3 not installed.")
    bucket = os.getenv("AWS_S3_BUCKET_NAME"); region = os.getenv("AWS_REGION")
    if not bucket or not region: raise HTTPException(status_code=503, detail="S3 not configured.")
    key = f"{folder}{payload.examId or 'unassigned'}/{uuid.uuid4().hex}-{payload.fileName.replace('/','_')}"
    url = boto3.client("s3",region_name=region).generate_presigned_url("put_object",
        Params={"Bucket":bucket,"Key":key,"ContentType":payload.fileType},ExpiresIn=900)
    return {"uploadUrl":url,"fileUrl":f"https://{bucket}.s3.{region}.amazonaws.com/{key}","key":key}

# ─── Question Papers ──────────────────────────────────────────────────────────
@router.post("/question-papers")
def create_qp(payload: FileRecordIn, user=Depends(require_roles("gog","evaluator")), db=Depends(get_db)):
    doc = payload.model_dump()
    doc.update({"evaluatorId":user["id"],"status":"pending","uploadedBy":user["id"],"uploadedAt":utc_now()})
    r = db.question_papers.insert_one(doc)
    return clean_doc(db.question_papers.find_one({"_id":r.inserted_id}))

@router.patch("/question-papers/{pid}/review")
def review_qp(pid: str, payload: ApprovalIn, user=Depends(require_roles("gog","super_admin","admin")), db=Depends(get_db)):
    db.question_papers.update_one({"_id":oid(pid)},{"$set":{"status":payload.status,"remarks":payload.remarks,"reviewedBy":user["id"],"updatedAt":utc_now()}})
    return clean_doc(db.question_papers.find_one({"_id":oid(pid)}))

@router.get("/question-papers")
def list_qp(user=Depends(current_user), db=Depends(get_db)):
    if user["role"] == "evaluator":
        q = {"evaluatorId": user["id"]}
    elif user["role"] in ("admin", "super_admin"):
        evals = [str(d["_id"]) for d in db.users.find({"role":"evaluator","instituteId":user.get("instituteId")})]
        q = {"evaluatorId": {"$in": evals}} if evals else {"evaluatorId": {"$in": ["__none__"]}}
    else:
        q = {}  # gog sees all
    return [clean_doc(d) for d in db.question_papers.find(q).sort("uploadedAt",-1)]

# ─── Evaluation Criteria ──────────────────────────────────────────────────────
@router.post("/evaluation-criteria")
def create_criteria(payload: CriteriaIn, user=Depends(require_roles("gog","evaluator")), db=Depends(get_db)):
    doc = payload.model_dump()
    doc.update({"evaluatorId":user["id"],"status":"pending","createdAt":utc_now(),"updatedAt":utc_now()})
    r = db.evaluation_criteria.insert_one(doc)
    return clean_doc(db.evaluation_criteria.find_one({"_id":r.inserted_id}))

@router.patch("/evaluation-criteria/{cid}/review")
def review_criteria(cid: str, payload: ApprovalIn, user=Depends(require_roles("gog","super_admin","admin")), db=Depends(get_db)):
    db.evaluation_criteria.update_one({"_id":oid(cid)},{"$set":{"status":payload.status,"remarks":payload.remarks,"reviewedBy":user["id"],"updatedAt":utc_now()}})
    return clean_doc(db.evaluation_criteria.find_one({"_id":oid(cid)}))

@router.get("/evaluation-criteria")
def list_criteria(user=Depends(current_user), db=Depends(get_db)):
    if user["role"] == "evaluator":
        q = {"evaluatorId": user["id"]}
    elif user["role"] in ("admin", "super_admin"):
        evals = [str(d["_id"]) for d in db.users.find({"role":"evaluator","instituteId":user.get("instituteId")})]
        q = {"evaluatorId": {"$in": evals}} if evals else {"evaluatorId": {"$in": ["__none__"]}}
    else:
        q = {}  # gog sees all
    return [clean_doc(d) for d in db.evaluation_criteria.find(q).sort("createdAt",-1)]

# ─── Answer Scripts ───────────────────────────────────────────────────────────
@router.post("/answer-scripts")
def create_as(payload: AnswerScriptIn, user=Depends(require_roles("gog","evaluator")), db=Depends(get_db)):
    doc = payload.model_dump()
    doc.update({"evaluatorId":user["id"],"evaluationStatus":"uploaded","marks":None,"feedback":"","annotatedFileUrl":"","uploadedAt":utc_now()})
    r = db.answer_scripts.insert_one(doc)
    return clean_doc(db.answer_scripts.find_one({"_id":r.inserted_id}))

@router.get("/answer-scripts")
def list_as(user=Depends(current_user), db=Depends(get_db)):
    if user["role"] == "evaluator":
        q = {"evaluatorId": user["id"]}
    elif user["role"] in ("admin", "super_admin"):
        evals = [str(d["_id"]) for d in db.users.find({"role":"evaluator","instituteId":user.get("instituteId")})]
        q = {"evaluatorId": {"$in": evals}} if evals else {"evaluatorId": {"$in": ["__none__"]}}
    else:
        q = {}  # gog sees all
    return [clean_doc(d) for d in db.answer_scripts.find(q).sort("uploadedAt",-1)]

# ─── Evaluation Results ───────────────────────────────────────────────────────
@router.post("/evaluation-results")
def create_er(payload: EvaluationResultIn, user=Depends(require_roles("gog","evaluator")), db=Depends(get_db)):
    if payload.examId:
        if not db.examinations.find_one({"_id":oid(payload.examId),"assignedEvaluators":user["id"]}):
            raise HTTPException(status_code=403, detail="Not assigned to this exam.")
    doc = payload.model_dump()
    doc.update({"evaluatorId":user["id"],"reviewStatus":"pending_review","createdAt":utc_now(),"updatedAt":utc_now()})
    r = db.evaluation_results.insert_one(doc)
    if payload.answerScriptId:
        db.answer_scripts.update_one({"_id":oid(payload.answerScriptId),"evaluatorId":user["id"]},
            {"$set":{"evaluationStatus":"evaluated","marks":payload.marks,"feedback":str(payload.report.get("overall_feedback","")),"updatedAt":utc_now()}})
    return clean_doc(db.evaluation_results.find_one({"_id":r.inserted_id}))

@router.get("/evaluation-results")
def list_er(user=Depends(current_user), db=Depends(get_db)):
    q: Dict[str,Any] = {}
    if user["role"] == "evaluator":
        q["evaluatorId"] = user["id"]
    elif user["role"] in ("admin", "super_admin"):
        eids = [str(d["_id"]) for d in db.users.find({"role":"evaluator","instituteId":user.get("instituteId")})]
        q["evaluatorId"] = {"$in": eids} if eids else {"$in": ["__none__"]}
    # gog: no filter → sees all results
    return [clean_doc(d) for d in db.evaluation_results.find(q).sort("createdAt",-1)]

# ─── Name Validation ──────────────────────────────────────────────────────────
@router.post("/answer-scripts/validate-names")
def validate_names(files: List[str], user=Depends(require_roles("gog","evaluator"))):
    import re as _re
    valid, invalid = [], []
    for name in files:
        m = _re.match(ANSWER_SCRIPT_PATTERN, name)
        if m: valid.append({"fileName":name,**m.groupdict()})
        else: invalid.append({"fileName":name,"error":"Expected StudentName_RollNo_ExamName_Subject_Answer_Script.pdf"})
    return {"valid":valid,"invalid":invalid}