import threading
from typing import Optional

import numpy as np


class EmbeddingStore:
    """Thread-safe in-memory storage for face embeddings (128-dim Facenet vectors)."""

    def __init__(self):
        self._store: dict[str, np.ndarray] = {}
        self._lock = threading.Lock()

    def register(self, user_id: str, embedding: list[float]) -> None:
        vec = np.array(embedding, dtype=np.float64)
        with self._lock:
            self._store[user_id] = vec

    def get(self, user_id: str) -> Optional[np.ndarray]:
        with self._lock:
            return self._store.get(user_id)

    def remove(self, user_id: str) -> bool:
        with self._lock:
            if user_id in self._store:
                del self._store[user_id]
                return True
            return False

    def find_nearest(self, query: np.ndarray) -> tuple[Optional[str], float]:
        """Returns (user_id, min_cosine_distance) or (None, inf) if store empty."""
        best_id: Optional[str] = None
        best_dist: float = float("inf")

        with self._lock:
            for uid, emb in self._store.items():
                dist = self._cosine(query, emb)
                if dist < best_dist:
                    best_dist = dist
                    best_id = uid

        return best_id, best_dist

    @property
    def user_ids(self) -> list[str]:
        with self._lock:
            return list(self._store.keys())

    @property
    def count(self) -> int:
        with self._lock:
            return len(self._store)

    @staticmethod
    def _cosine(a: np.ndarray, b: np.ndarray) -> float:
        a_norm = a / (np.linalg.norm(a) + 1e-10)
        b_norm = b / (np.linalg.norm(b) + 1e-10)
        return float(1.0 - np.dot(a_norm, b_norm))


# Singleton
embedding_store = EmbeddingStore()
