import time

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

from config import settings
from utils.ear_calculator import compute_ear


class LandmarkExtractor:
    """Wraps MediaPipe FaceLandmarker (Tasks API, 478 landmarks) for geometric analysis."""

    def __init__(self):
        self._ready = False
        try:
            from services.model_loader import get_model_path
            model_path = get_model_path("face_landmarker")
            base_options = mp_python.BaseOptions(model_asset_path=model_path)
            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                output_face_blendshapes=False,
                output_facial_transformation_matrixes=False,
                num_faces=1,
                min_face_detection_confidence=0.5,
            )
            self._landmarker = vision.FaceLandmarker.create_from_options(options)
            self._ready = True
        except Exception as e:
            print(f"[LandmarkExtractor] ERROR: {e}")
            self._landmarker = None

    @property
    def ready(self) -> bool:
        return self._ready

    def extract(self, image: np.ndarray) -> dict:
        t0 = time.perf_counter()

        if not self._ready:
            return self._empty_result(t0, "Landmark extractor not initialized")

        try:
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            results = self._landmarker.detect(mp_image)
            h, w = image.shape[:2]

            if not results.face_landmarks:
                return self._empty_result(t0, "No face mesh detected")

            landmarks = results.face_landmarks[0]
            measurements = self._compute_measurements(landmarks, w, h)
            ear = compute_ear_from_task(landmarks, w, h)
            geometry_score = self._compute_geometry_score(measurements)

            elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

            return {
                "face_id": 0,
                "landmarks_count": len(landmarks),
                "key_measurements": {**measurements, **ear},
                "geometry_score": round(geometry_score, 4),
                "processing_time_ms": elapsed_ms,
            }
        except Exception as e:
            return self._empty_result(t0, str(e))

    def _compute_measurements(self, landmarks, img_w: int, img_h: int) -> dict:
        # Key landmark indices for FaceLandmarker (same as old FaceMesh)
        def pt(idx):
            lm = landmarks[idx]
            return np.array([lm.x * img_w, lm.y * img_h])

        interpupillary = float(np.linalg.norm(pt(33) - pt(263)))
        face_width = float(np.linalg.norm(pt(234) - pt(454)))
        face_height = float(np.linalg.norm(pt(10) - pt(152)))

        nose_to_chin = float(np.linalg.norm(pt(1) - pt(152)))
        lower_face = float(np.linalg.norm(pt(2) - pt(152)))
        forehead_height = float(np.linalg.norm(pt(10) - pt(2)))

        return {
            "interpupillary_distance_px": round(interpupillary, 1),
            "face_width_px": round(face_width, 1),
            "face_height_px": round(face_height, 1),
            "interpupillary_to_face_width": round(interpupillary / (face_width + 1e-6), 4),
            "nose_to_chin_to_lower_face": round(nose_to_chin / (lower_face + 1e-6), 4),
            "forehead_to_face_height": round(forehead_height / (face_height + 1e-6), 4),
            "face_width_to_height": round(face_width / (face_height + 1e-6), 4),
        }

    def _compute_geometry_score(self, measurements: dict) -> float:
        if measurements is None:
            return 0.0

        checks = {
            "interpupillary_to_face_width": measurements.get("interpupillary_to_face_width", 0),
            "nose_to_chin_to_lower_face": measurements.get("nose_to_chin_to_lower_face", 0),
            "forehead_to_face_height": measurements.get("forehead_to_face_height", 0),
            "face_width_to_height": measurements.get("face_width_to_height", 0),
        }

        passed = 0
        total = len(checks)
        for key, value in checks.items():
            lo, hi = settings.IDEAL_RATIOS.get(key, (0, 1))
            if lo <= value <= hi:
                passed += 1

        return round(passed / total, 4)

    def _empty_result(self, t0: float, error: str) -> dict:
        return {
            "face_id": None,
            "landmarks_count": 0,
            "key_measurements": None,
            "geometry_score": 0.0,
            "processing_time_ms": round((time.perf_counter() - t0) * 1000, 2),
            "error": error,
        }


def compute_ear_from_task(landmarks, img_w: int, img_h: int) -> dict:
    """Compute EAR from FaceLandmarker result landmarks."""
    LEFT_EYE = [362, 385, 387, 263, 373, 380]
    RIGHT_EYE = [33, 160, 158, 133, 153, 144]

    def eye_pts(indices):
        pts = np.zeros((6, 2), dtype=np.float64)
        for i, idx in enumerate(indices):
            lm = landmarks[idx]
            pts[i, 0] = lm.x * img_w
            pts[i, 1] = lm.y * img_h
        return pts

    def ear(pts):
        a = np.linalg.norm(pts[1] - pts[5])
        b = np.linalg.norm(pts[2] - pts[4])
        c = np.linalg.norm(pts[0] - pts[3])
        return float((a + b) / (2.0 * c)) if c > 1e-6 else 0.0

    left = ear(eye_pts(LEFT_EYE))
    right = ear(eye_pts(RIGHT_EYE))

    return {
        "left_ear": round(left, 4),
        "right_ear": round(right, 4),
        "avg_ear": round((left + right) / 2.0, 4),
    }


# Singleton
landmark_extractor = LandmarkExtractor()
