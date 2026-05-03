import time
from typing import Optional

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

from config import settings


class FaceDetector:
    """Face detection using MediaPipe FaceLandmarker (reuses the same model)."""

    def __init__(self):
        self._ready = False
        self._landmarker = None
        try:
            from services.model_loader import get_model_path
            model_path = get_model_path("face_landmarker")
            base_options = mp_python.BaseOptions(model_asset_path=model_path)
            options = vision.FaceLandmarkerOptions(
                base_options=base_options,
                output_face_blendshapes=False,
                output_facial_transformation_matrixes=False,
                num_faces=5,
                min_face_detection_confidence=settings.MIN_DETECTION_CONFIDENCE,
            )
            self._landmarker = vision.FaceLandmarker.create_from_options(options)
            self._ready = True
            print("[FaceDetector] MediaPipe FaceLandmarker ready (detection mode)")
        except Exception as e:
            print(f"[FaceDetector] ERROR: {e}")
            self._landmarker = None

    @property
    def ready(self) -> bool:
        return self._ready

    def detect(self, image: np.ndarray) -> dict:
        t0 = time.perf_counter()

        if not self._ready:
            return self._empty_result(t0, "Face detector not initialized")

        try:
            rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            results = self._landmarker.detect(mp_image)
            h, w = image.shape[:2]

            detections = []
            if results.face_landmarks:
                for face_lms in results.face_landmarks:
                    # Compute bounding box from landmarks
                    xs = [lm.x * w for lm in face_lms]
                    ys = [lm.y * h for lm in face_lms]
                    x_min, x_max = min(xs), max(xs)
                    y_min, y_max = min(ys), max(ys)
                    bbox_w = x_max - x_min
                    bbox_h = y_max - y_min

                    # Estimate confidence from face size relative to image
                    face_area_ratio = (bbox_w * bbox_h) / (w * h)
                    confidence = min(0.99, 0.6 + face_area_ratio * 5)

                    detections.append({
                        "bbox": {
                            "x": int(x_min),
                            "y": int(y_min),
                            "width": int(bbox_w),
                            "height": int(bbox_h),
                        },
                        "confidence": round(confidence, 4),
                        "landmark_presence": True,
                    })

            elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

            return {
                "faces_detected": len(detections),
                "detections": detections,
                "processing_time_ms": elapsed_ms,
            }

        except Exception as e:
            return self._empty_result(t0, str(e))

    def get_primary_face(self, image: np.ndarray) -> Optional[dict]:
        result = self.detect(image)
        if not result["detections"]:
            return None
        return max(
            result["detections"],
            key=lambda d: d["bbox"]["width"] * d["bbox"]["height"],
        )

    def is_face_usable(self, detection: dict) -> bool:
        bbox = detection["bbox"]
        return (
            bbox["width"] >= settings.MIN_FACE_SIZE_PX
            and bbox["height"] >= settings.MIN_FACE_SIZE_PX
        )

    def _empty_result(self, t0: float, error: str = "") -> dict:
        return {
            "faces_detected": 0,
            "detections": [],
            "processing_time_ms": round((time.perf_counter() - t0) * 1000, 2),
            "error": error,
        }


# Singleton
face_detector = FaceDetector()
