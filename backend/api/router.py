import time
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from api.schemas import (
    StatsUpdateRequest,
    SupervisionResolveRequest,
)
from models.embedding_store import embedding_store
from models.turnstile_registry import turnstile_registry
from services.confidence_engine import decide
from services.face_detection import face_detector
from services.face_verification import face_verifier
from services.landmark_extraction import landmark_extractor
from services.liveness_checker import liveness_checker
from services.pipeline import pipeline
from utils.image_processing import decode_image, resize_to_max

router = APIRouter(prefix="/api")

_start_time = time.time()

# --- System stats accumulator ---
_system_stats = {
    "total_passages": 0,
    "today_passages": 0,
    "avg_confidence": 0.0,
    "supervision_rate": 0.0,
    "active_operators": 1,
    "ai_uptime_pct": 100.0,
    "last_audit": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
    "_confidence_acc": 0.0,
    "_count": 0,
    "_escalation_count": 0,
}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@router.get("/health")
async def health():
    return {
        "status": "healthy",
        "models_loaded": [
            "face_detection",
            "face_mesh",
            f"deepface_{face_verifier._model_name}" if face_verifier.ready else "deepface_unavailable",
        ],
        "uptime_seconds": round(time.time() - _start_time, 1),
        "active_turnstiles": len(turnstile_registry.get_all()),
        "stored_embeddings": embedding_store.count,
    }


# ---------------------------------------------------------------------------
# Face Detection
# ---------------------------------------------------------------------------
@router.post("/detect-face")
async def detect_face(image: UploadFile = File(...)):
    try:
        img_bytes = await image.read()
        img = decode_image(img_bytes)
        img = resize_to_max(img)
        return face_detector.detect(img)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# Landmark Extraction
# ---------------------------------------------------------------------------
@router.post("/extract-landmarks")
async def extract_landmarks(image: UploadFile = File(...)):
    try:
        img_bytes = await image.read()
        img = decode_image(img_bytes)
        img = resize_to_max(img)
        result = landmark_extractor.extract(img)
        if result.get("error"):
            raise HTTPException(status_code=422, detail=result["error"])
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# Liveness Check
# ---------------------------------------------------------------------------
@router.post("/check-liveness")
async def check_liveness(image: UploadFile = File(...)):
    try:
        img_bytes = await image.read()
        img = decode_image(img_bytes)
        img = resize_to_max(img)
        return liveness_checker.check(img)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# Face Verification
# ---------------------------------------------------------------------------
@router.post("/verify-face")
async def verify_face(
    image: UploadFile = File(...),
    user_id: Optional[str] = Form(None),
):
    try:
        img_bytes = await image.read()
        img = decode_image(img_bytes)
        img = resize_to_max(img)
        return face_verifier.verify(img, user_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# Full Pipeline
# ---------------------------------------------------------------------------
@router.post("/analyze")
async def analyze(
    image: UploadFile = File(...),
    turnstile_type: str = Form("stable"),
    user_id: Optional[str] = Form(None),
    turnstile_id: Optional[str] = Form(None),
):
    try:
        img_bytes = await image.read()
        result = pipeline.analyze(img_bytes, turnstile_type, user_id, turnstile_id)

        # Update running stats
        _update_stats(result["confidence"], result["decision"], turnstile_type)

        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------
@router.get("/stats")
async def get_stats():
    return {
        "total_passages": _system_stats["total_passages"],
        "today_passages": _system_stats["today_passages"],
        "avg_confidence": round(_system_stats["avg_confidence"], 3),
        "supervision_rate": round(_system_stats["supervision_rate"], 3),
        "active_operators": _system_stats["active_operators"],
        "ai_uptime_pct": _system_stats["ai_uptime_pct"],
        "last_audit": _system_stats["last_audit"],
    }


@router.post("/stats/update")
async def update_stats(body: StatsUpdateRequest):
    _update_stats(body.confidence, body.decision, body.turnstile_type)
    return await get_stats()


def _update_stats(confidence: float, decision: str, turnstile_type: str):
    _system_stats["total_passages"] += 1
    _system_stats["today_passages"] += 1
    _system_stats["_confidence_acc"] += confidence
    _system_stats["_count"] += 1
    _system_stats["avg_confidence"] = (
        _system_stats["_confidence_acc"] / _system_stats["_count"]
    )
    if decision in ("denied", "review"):
        _system_stats["_escalation_count"] += 1
    _system_stats["supervision_rate"] = (
        _system_stats["_escalation_count"] / max(1, _system_stats["_count"])
    )
    _system_stats["last_audit"] = time.strftime(
        "%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()
    )


# ---------------------------------------------------------------------------
# Register Embedding
# ---------------------------------------------------------------------------
@router.post("/register-embedding")
async def register_embedding(
    image: UploadFile = File(...),
    user_id: str = Form(...),
):
    try:
        img_bytes = await image.read()
        img = decode_image(img_bytes)
        img = resize_to_max(img)
        return face_verifier.register_embedding(img, user_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# Resolve Supervision
# ---------------------------------------------------------------------------
@router.post("/resolve-supervision")
async def resolve_supervision(body: SupervisionResolveRequest):
    approved = body.operator_decision.lower() == "approved"

    # Update stats: approved escalations are no longer escalations
    if approved:
        _system_stats["_escalation_count"] = max(0, _system_stats["_escalation_count"] - 1)
        _system_stats["supervision_rate"] = (
            _system_stats["_escalation_count"] / max(1, _system_stats["_count"])
        )

    return {
        "resolved": True,
        "turnstile_id": body.turnstile_id,
        "new_status": "granted" if approved else "denied",
        "operator_notes": body.operator_notes,
        "audit_log_hash": f"sha256:{hash(body.turnstile_id + str(time.time())) & 0xFFFFFFFFFFFFFFFF:016x}",
    }
