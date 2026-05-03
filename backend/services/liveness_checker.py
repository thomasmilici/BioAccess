import time

import numpy as np

from config import settings
from services.landmark_extraction import landmark_extractor
from utils.image_processing import laplacian_variance


class LivenessChecker:
    """
    Anti-spoofing liveness detection using two methods:
    1. Texture analysis — Laplacian variance of face region
    2. Depth consistency — geometric ratio validation via landmarks
    3. Blink detection — EAR computation (requires multiple frames; single-frame uses depth fallback)
    """

    def __init__(self):
        self._ear_history: dict[str, list[float]] = {}

    def check(self, image: np.ndarray) -> dict:
        t0 = time.perf_counter()

        texture_result = self._check_texture(image)
        depth_result = self._check_depth_consistency(image)

        scores = []
        if texture_result["passed"]:
            scores.append(texture_result["score"])
        if depth_result["passed"]:
            scores.append(depth_result["score"])

        # Fallback: if neither passed conclusively, use a conservative average
        if not scores:
            scores = [0.5]

        liveness_score = round(float(np.mean(scores)), 4)

        elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

        return {
            "liveness_score": liveness_score,
            "checks": {
                "texture_analysis": texture_result,
                "depth_consistency": depth_result,
            },
            "processing_time_ms": elapsed_ms,
        }

    def _check_texture(self, image: np.ndarray) -> dict:
        """
        Real faces have skin texture (pores, micro-shadows) → high Laplacian variance.
        Printed/spoofed faces are flat → low variance.
        """
        lv = laplacian_variance(image)
        passed = lv >= settings.TEXTURE_LAPLACIAN_MIN

        # Normalise score: 0..1 mapping from variance
        score = min(1.0, lv / (settings.TEXTURE_LAPLACIAN_MIN * 3))
        score = round(score, 4)

        return {
            "passed": passed,
            "score": score,
            "details": (
                f"Laplacian variance: {lv:.1f} "
                f"({'above' if passed else 'below'} threshold {settings.TEXTURE_LAPLACIAN_MIN})"
            ),
        }

    def _check_depth_consistency(self, image: np.ndarray) -> dict:
        """
        Verify that landmark ratios are consistent with a 3D face projection.
        A flat photo would have distorted or missing landmarks, failing the
        normative range check used in geometry_score.
        """
        result = landmark_extractor.extract(image)

        if result.get("error"):
            return {
                "passed": False,
                "score": 0.0,
                "details": "Unable to extract landmarks for depth check",
            }

        geo_score = result["geometry_score"]
        passed = geo_score >= 0.5  # at least half of ratios within range

        return {
            "passed": passed,
            "score": geo_score,
            "details": (
                f"Facial proportions within normative range: {int(geo_score * 100)}% "
                f"({'consistent' if passed else 'anomalous'} with 3D structure)"
            ),
        }

    def record_ear(self, turnstile_id: str, avg_ear: float) -> dict:
        """
        Record EAR for a turnstile and check if a natural blink pattern is detected.
        Returns a blink detection result.
        """
        if turnstile_id not in self._ear_history:
            self._ear_history[turnstile_id] = []

        history = self._ear_history[turnstile_id]
        history.append(avg_ear)

        # Keep only last N frames
        if len(history) > settings.EAR_FRAMES_NEEDED * 2:
            self._ear_history[turnstile_id] = history[-settings.EAR_FRAMES_NEEDED * 2:]

        if len(history) < settings.EAR_FRAMES_NEEDED:
            return {
                "passed": True,  # Not enough data yet; assume OK
                "score": 0.5,
                "details": f"Insufficient EAR data ({len(history)}/{settings.EAR_FRAMES_NEEDED} frames)",
            }

        recent = history[-settings.EAR_FRAMES_NEEDED:]
        # A blink is detected if EAR dropped below threshold and recovered
        min_ear = min(recent)
        max_ear = max(recent)
        has_blink = min_ear < settings.EAR_BLINK_THRESHOLD and max_ear > settings.EAR_BLINK_THRESHOLD * 1.5

        return {
            "passed": has_blink,
            "score": min(1.0, max_ear / (settings.EAR_BLINK_THRESHOLD * 3)) if has_blink else 0.4,
            "details": (
                f"EAR range: {min_ear:.3f}-{max_ear:.3f}, "
                f"blink {'detected' if has_blink else 'not detected'}"
            ),
        }


# Singleton
liveness_checker = LivenessChecker()
