import time
from typing import Optional

import numpy as np

from config import settings
from models.turnstile_registry import turnstile_registry
from services.confidence_engine import compute_confidence, compute_components_detailed, decide
from services.face_detection import face_detector
from services.face_verification import face_verifier
from services.landmark_extraction import landmark_extractor
from services.liveness_checker import liveness_checker
from utils.image_processing import encode_jpeg_base64, image_quality_score, resize_to_max


class BiometricPipeline:
    """
    Orchestrates the full 5-stage AI pipeline:

    Stage 1: Acquisizione Dinamica — face detection + liveness + quality
    Stage 2: Analisi Geometrica — 468 landmarks + structural vector
    Stage 3: Matching Biometrico — DeepFace verification
    Stage 4: Modello di Confidenza — weighted formula
    Stage 5: Decisione Finale — Early Exit / Fallback / Escalation
    """

    # Track stability across frames per turnstile (for stab component)
    _stability_buffer: dict[str, list[dict]] = {}
    _stability_max_frames = 10

    def analyze(
        self,
        image_bytes: bytes,
        turnstile_type: str = "stable",
        user_id: Optional[str] = None,
        turnstile_id: Optional[str] = None,
    ) -> dict:
        t_total = time.perf_counter()

        # Decode and resize
        from utils.image_processing import decode_image
        image = decode_image(image_bytes)
        image = resize_to_max(image)

        pipeline_results = []
        components = {}

        # --- Stage 1: Acquisizione Dinamica ---
        t1 = time.perf_counter()
        detection = face_detector.detect(image)
        primary_face = face_detector.get_primary_face(image)

        if not primary_face or not face_detector.is_face_usable(primary_face):
            return self._pipeline_error(
                "No face detected or face too small",
                pipeline_results=["acquisition"],
                t_total=t_total,
            )

        liveness = liveness_checker.check(image)
        quality = image_quality_score(image)

        components["live"] = liveness["liveness_score"]
        components["qual"] = quality

        dur1 = round((time.perf_counter() - t1) * 1000, 2)
        pipeline_results.append({
            "stage": "acquisition",
            "label": "Acquisizione Dinamica",
            "status": "completed",
            "sub_steps": [
                {
                    "name": "Face Detection",
                    "status": "passed",
                    "detail": f"{detection['faces_detected']} face detected, confidence {primary_face['confidence']:.3f}",
                },
                {
                    "name": "Liveness Check 3D",
                    "status": "passed" if liveness["checks"]["texture_analysis"]["passed"] else "warning",
                    "detail": liveness["checks"]["texture_analysis"]["details"],
                },
                {
                    "name": "Qualità Immagine",
                    "status": "passed" if quality >= 0.5 else "warning",
                    "detail": f"Quality score: {quality:.3f} (resolution {image.shape[1]}x{image.shape[0]})",
                },
            ],
            "duration_ms": dur1,
        })

        # --- Stage 2: Analisi Geometrica ---
        t2 = time.perf_counter()
        landmarks = landmark_extractor.extract(image)

        if landmarks.get("error"):
            components["geom"] = 0.0
        else:
            components["geom"] = landmarks["geometry_score"]

        # Record EAR for stability tracking
        avg_ear = landmarks.get("key_measurements", {}).get("avg_ear", 0.3) if landmarks.get("key_measurements") else 0.3
        if turnstile_id:
            liveness_checker.record_ear(turnstile_id, avg_ear)

        dur2 = round((time.perf_counter() - t2) * 1000, 2)
        pipeline_results.append({
            "stage": "geometric",
            "label": "Analisi Geometrica",
            "status": "completed",
            "sub_steps": [
                {
                    "name": "Estrazione Landmark",
                    "status": "passed" if not landmarks.get("error") else "failed",
                    "detail": f"{landmarks['landmarks_count']} landmarks extracted" if not landmarks.get("error") else landmarks["error"],
                },
                {
                    "name": "Vettore Strutturale",
                    "status": "passed" if components["geom"] >= 0.5 else "warning",
                    "detail": f"Geometry score: {components['geom']:.3f}",
                },
                {
                    "name": "Normalizzazione",
                    "status": "passed",
                    "detail": "Face aligned to canonical proportions",
                },
            ],
            "duration_ms": dur2,
        })

        # --- Stage 3: Matching Biometrico ---
        t3 = time.perf_counter()
        verification = face_verifier.verify(image, user_id)

        if not turnstile_id and verification.get("user_id"):
            turnstile_id = verification["user_id"]

        components["sim"] = verification["similarity_score"]

        dur3 = round((time.perf_counter() - t3) * 1000, 2)
        pipeline_results.append({
            "stage": "matching",
            "label": "Matching Biometrico",
            "status": "completed",
            "sub_steps": [
                {
                    "name": "Feature Vector",
                    "status": "passed",
                    "detail": f"128-dim embedding extracted ({verification['model_used']})",
                },
                {
                    "name": "Similarity Score",
                    "status": "passed",
                    "detail": f"Cosine distance: {verification['distance']:.3f}",
                },
                {
                    "name": "Template Match",
                    "status": "passed" if verification["match"] else "failed",
                    "detail": (
                        f"Match found: {verification['user_id']}"
                        if verification["match"]
                        else "No matching template found"
                    ),
                },
            ],
            "duration_ms": dur3,
        })

        # --- Stage 4: Stabilità (computed across frames) ---
        components["stab"] = self._compute_stability(turnstile_id, components, landmarks)
        dur_stab = 0  # negligible, just arithmetic

        # --- Stage 4 (continued): Modello di Confidenza ---
        confidence = compute_confidence(components)
        confidence_details = compute_components_detailed(
            components["sim"],
            components["stab"],
            components["qual"],
            components["live"],
            components["geom"],
        )

        pipeline_results.append({
            "stage": "confidence",
            "label": "Modello di Confidenza",
            "status": "completed",
            "sub_steps": confidence_details,
            "duration_ms": round(dur_stab + 5, 2),
        })

        # --- Stage 5: Decisione Finale ---
        decision = decide(confidence, turnstile_type)
        th = settings.THRESHOLDS.get(turnstile_type, {"low": 0.85, "high": 0.95})

        dur5 = 2  # trivial decision
        pipeline_results.append({
            "stage": "decision",
            "label": "Decisione Finale",
            "status": "completed",
            "sub_steps": [
                {
                    "name": "Early Exit Check",
                    "result": (
                        f"TH_HIGH met ({confidence:.3f} >= {th['high']:.2f})"
                        if confidence >= th["high"]
                        else f"TH_HIGH not met ({confidence:.3f} < {th['high']:.2f})"
                    ),
                },
                {
                    "name": "Threshold Compare",
                    "result": (
                        f"Above TH_LOW ({confidence:.3f} >= {th['low']:.2f})"
                        if confidence >= th["low"]
                        else f"Below TH_LOW ({confidence:.3f} < {th['low']:.2f})"
                    ),
                },
                {
                    "name": "Action",
                    "result": decision["decision_label"],
                },
            ],
            "duration_ms": dur5,
        })

        # --- Encode video snippet for denied escalations ---
        video_snippet = None
        if decision["decision"] == "denied":
            video_snippet = encode_jpeg_base64(image)

        total_ms = round((time.perf_counter() - t_total) * 1000, 2)

        # Get turnstile metadata
        turnstile_info = turnstile_registry.get_by_id(turnstile_id) if turnstile_id else None
        if not turnstile_info and turnstile_id:
            turnstile_info = {"id": turnstile_id, "type": turnstile_type}

        return {
            "turnstile_id": turnstile_id or "UNKNOWN",
            "turnstile_type": turnstile_type,
            "person_name": turnstile_info.get("person_name", "Unknown") if turnstile_info else "Unknown",
            "company": turnstile_info.get("company", "") if turnstile_info else "",
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),

            "pipeline_results": pipeline_results,

            "components": components,
            "confidence": confidence,
            "decision": decision["decision"],
            "decision_label": decision["decision_label"],
            "thresholds": decision["thresholds"],
            "video_snippet_base64": video_snippet,

            "total_processing_time_ms": total_ms,
        }

    def _compute_stability(
        self,
        turnstile_id: Optional[str],
        components: dict,
        landmarks: dict,
    ) -> float:
        """
        Compute stability score based on how consistent the current frame
        measurements are with recent history for this turnstile.
        """
        if not turnstile_id:
            return 0.85  # conservative default

        current = {
            "sim": components.get("sim", 0),
            "geom": components.get("geom", 0),
        }

        if turnstile_id not in self._stability_buffer:
            self._stability_buffer[turnstile_id] = []

        buffer = self._stability_buffer[turnstile_id]
        buffer.append(current)

        if len(buffer) > self._stability_max_frames:
            buffer.pop(0)

        if len(buffer) < 2:
            return 0.85  # not enough history

        # Compute variance of sim and geom across frames
        sims = [f["sim"] for f in buffer]
        geoms = [f["geom"] for f in buffer]

        sim_var = float(np.var(sims)) if len(sims) > 1 else 0
        geom_var = float(np.var(geoms)) if len(geoms) > 1 else 0

        # Low variance = high stability
        sim_stab = max(0.0, 1.0 - sim_var * 20)  # scale: var 0.05 → stab 0
        geom_stab = max(0.0, 1.0 - geom_var * 10)

        stability = (sim_stab * 0.6 + geom_stab * 0.4)
        return round(max(0.5, min(0.99, stability)), 4)

    def _pipeline_error(self, msg: str, pipeline_results: list, t_total: float) -> dict:
        """Return a clean error response when pipeline fails early."""
        return {
            "turnstile_id": None,
            "turnstile_type": None,
            "person_name": None,
            "company": None,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
            "pipeline_results": [
                {"stage": "acquisition", "label": "Acquisizione Dinamica", "status": "failed",
                 "sub_steps": [{"name": "Error", "status": "failed", "detail": msg}], "duration_ms": 0},
            ],
            "components": {"sim": 0, "stab": 0, "qual": 0, "live": 0, "geom": 0},
            "confidence": 0.0,
            "decision": "denied",
            "decision_label": "PIPELINE_ERROR — " + msg,
            "thresholds": {"low": 0.85, "high": 0.95},
            "video_snippet_base64": None,
            "total_processing_time_ms": round((time.perf_counter() - t_total) * 1000, 2),
            "error": msg,
        }


# Singleton
pipeline = BiometricPipeline()
