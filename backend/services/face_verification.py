import time
from typing import Optional

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision

from config import settings
from models.embedding_store import embedding_store


# Key landmark indices for geometric embedding
GEOMETRIC_LANDMARKS = {
    "left_eye_outer": 33, "left_eye_inner": 133, "left_eye_top": 159, "left_eye_bottom": 145,
    "right_eye_inner": 362, "right_eye_outer": 263, "right_eye_top": 386, "right_eye_bottom": 374,
    "nose_tip": 1, "nose_bridge": 6, "nose_bottom": 2, "nose_left": 98, "nose_right": 327,
    "mouth_left": 61, "mouth_right": 291, "mouth_top": 13, "mouth_bottom": 14,
    "upper_lip_top": 0, "lower_lip_bottom": 17,
    "chin": 152, "left_jaw": 172, "right_jaw": 397, "forehead_glabella": 10,
    "left_brow": 70, "right_brow": 300,
}


class FaceVerifier:
    """Face verification using MediaPipe FaceLandmarker geometric embedding."""

    def __init__(self):
        self._model_name = "MediaPipe-Geometric-Embedding"
        self._ready = False
        self._landmarker = None

    @property
    def ready(self) -> bool:
        return self._ready

    def init_model(self):
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
            print(f"[FaceVerifier] {self._model_name} ready")
        except Exception as e:
            print(f"[FaceVerifier] WARNING: init failed: {e}")
            self._ready = False

    def verify(self, image: np.ndarray, user_id: Optional[str] = None) -> dict:
        t0 = time.perf_counter()

        embedding = self._extract_embedding(image)

        if embedding is None:
            elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
            return {
                "match": False, "user_id": user_id, "similarity_score": 0.0,
                "model_used": self._model_name, "distance_metric": "cosine",
                "distance": 1.0, "threshold_passed": False,
                "processing_time_ms": elapsed_ms,
                "error": "Could not extract facial landmarks",
            }

        if user_id and user_id in embedding_store.user_ids:
            stored = embedding_store.get(user_id)
            if stored is not None:
                distance = float(self._cosine(embedding, stored))
                similarity = round(1.0 - distance, 4)
                match = distance < settings.VERIFY_DISTANCE_THRESHOLD
            else:
                distance, similarity, match = 1.0, 0.0, False
        else:
            best_id, best_dist = embedding_store.find_nearest(embedding)
            distance = best_dist
            similarity = round(1.0 - best_dist, 4) if best_id else 0.0
            user_id = best_id
            match = best_dist < settings.VERIFY_DISTANCE_THRESHOLD if best_id else False

        elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)

        return {
            "match": match, "user_id": user_id, "similarity_score": similarity,
            "model_used": self._model_name, "distance_metric": "cosine",
            "distance": round(distance, 4), "threshold_passed": match,
            "processing_time_ms": elapsed_ms,
        }

    def register_embedding(self, image: np.ndarray, user_id: str) -> dict:
        t0 = time.perf_counter()

        if not self._ready:
            return {
                "user_id": user_id, "registered": False,
                "error": "MediaPipe not available", "embedding_model": self._model_name,
                "embedding_size": 0,
                "processing_time_ms": round((time.perf_counter() - t0) * 1000, 2),
            }

        embedding = self._extract_embedding(image)

        if embedding is None:
            return {
                "user_id": user_id, "registered": False,
                "error": "Could not extract facial landmarks",
                "embedding_model": self._model_name, "embedding_size": 0,
                "processing_time_ms": round((time.perf_counter() - t0) * 1000, 2),
            }

        embedding_store.register(user_id, embedding.tolist())

        return {
            "user_id": user_id, "registered": True,
            "embedding_model": self._model_name, "embedding_size": len(embedding),
            "processing_time_ms": round((time.perf_counter() - t0) * 1000, 2),
        }

    def _extract_embedding(self, image: np.ndarray) -> Optional[np.ndarray]:
        if not self._ready or self._landmarker is None:
            return None

        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
        results = self._landmarker.detect(mp_image)

        if not results.face_landmarks:
            return None

        landmarks = results.face_landmarks[0]
        h, w = image.shape[:2]

        def pt(idx):
            lm = landmarks[idx]
            return np.array([lm.x * w, lm.y * h])

        def dist(p1, p2):
            return float(np.linalg.norm(p1 - p2))

        pts = {name: pt(idx) for name, idx in GEOMETRIC_LANDMARKS.items()}

        features = [
            dist(pts["left_eye_outer"], pts["left_eye_inner"]),
            dist(pts["right_eye_inner"], pts["right_eye_outer"]),
            dist(pts["left_eye_outer"], pts["right_eye_outer"]),
            dist(pts["left_eye_inner"], pts["right_eye_inner"]),
            dist(pts["left_eye_top"], pts["left_eye_bottom"]),
            dist(pts["right_eye_top"], pts["right_eye_bottom"]),
            dist(pts["nose_bridge"], pts["nose_tip"]),
            dist(pts["nose_left"], pts["nose_right"]),
            dist(pts["nose_bottom"], pts["nose_bridge"]),
            dist(pts["mouth_left"], pts["mouth_right"]),
            dist(pts["mouth_top"], pts["mouth_bottom"]),
            dist(pts["forehead_glabella"], pts["nose_bottom"]),
            dist(pts["nose_bottom"], pts["chin"]),
            dist(pts["forehead_glabella"], pts["chin"]),
            dist(pts["left_jaw"], pts["right_jaw"]),
            dist(pts["left_brow"], pts["left_eye_top"]),
            dist(pts["right_brow"], pts["right_eye_top"]),
            dist(pts["upper_lip_top"], pts["lower_lip_bottom"]),
        ]

        features = np.array(features, dtype=np.float64)
        face_height = dist(pts["forehead_glabella"], pts["chin"])

        if face_height < 1e-6:
            return None

        features = features / face_height

        ratios = np.array([
            features[0] / max(1e-6, features[1]),
            features[8] / max(1e-6, features[6]),
            features[10] / max(1e-6, features[11]),
            features[13] / max(1e-6, features[2]),
            features[4] / max(1e-6, features[11]),
        ], dtype=np.float64)

        embedding = np.concatenate([features, ratios])
        embedding = embedding / (np.linalg.norm(embedding) + 1e-10)

        return embedding

    @staticmethod
    def _cosine(a: np.ndarray, b: np.ndarray) -> float:
        return float(1.0 - np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-10))


# Singleton
face_verifier = FaceVerifier()
