from typing import Optional

from pydantic import BaseModel, Field


# --- Response Models ---

class HealthResponse(BaseModel):
    status: str
    models_loaded: list[str]
    uptime_seconds: float


class DetectionResponse(BaseModel):
    faces_detected: int
    detections: list[dict]
    processing_time_ms: float


class LandmarkResponse(BaseModel):
    face_id: Optional[int]
    landmarks_count: int
    key_measurements: Optional[dict]
    geometry_score: float
    processing_time_ms: float
    error: Optional[str] = None


class LivenessResponse(BaseModel):
    liveness_score: float
    checks: dict
    processing_time_ms: float


class VerificationResponse(BaseModel):
    match: bool
    user_id: Optional[str]
    similarity_score: float
    model_used: str
    distance_metric: str
    distance: float
    threshold_passed: bool
    processing_time_ms: float


class PipelineResponse(BaseModel):
    turnstile_id: Optional[str]
    turnstile_type: Optional[str]
    person_name: Optional[str]
    company: Optional[str]
    timestamp: str
    pipeline_results: list[dict]
    components: dict
    confidence: float
    decision: str
    decision_label: str
    thresholds: dict
    video_snippet_base64: Optional[str] = None
    total_processing_time_ms: float
    error: Optional[str] = None


class StatsResponse(BaseModel):
    total_passages: int = 0
    today_passages: int = 0
    avg_confidence: float = 0.0
    supervision_rate: float = 0.0
    active_operators: int = 0
    ai_uptime_pct: float = 100.0
    last_audit: str = ""


class RegisterResponse(BaseModel):
    user_id: str
    registered: bool
    embedding_model: str
    embedding_size: int
    processing_time_ms: float
    error: Optional[str] = None


class SupervisionResolveRequest(BaseModel):
    turnstile_id: str
    operator_decision: str  # "approved" or "denied"
    operator_notes: Optional[str] = ""


class StatsUpdateRequest(BaseModel):
    confidence: float
    decision: str
    turnstile_type: str = "stable"
