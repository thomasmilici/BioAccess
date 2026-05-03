"""Download MediaPipe model files on first run if not already cached."""

import os
import urllib.request

_MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".models")
os.makedirs(_MODEL_DIR, exist_ok=True)

MODELS = {
    "face_landmarker": (
        "face_landmarker.task",
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
    ),
}


def get_model_path(name: str) -> str:
    """Get local path to a MediaPipe model, downloading it if needed."""
    if name not in MODELS:
        raise ValueError(f"Unknown model: {name}. Available: {list(MODELS.keys())}")

    filename, url = MODELS[name]
    local_path = os.path.join(_MODEL_DIR, filename)

    if not os.path.exists(local_path):
        print(f"[ModelLoader] Downloading {name} model...")
        try:
            urllib.request.urlretrieve(url, local_path)
            print(f"[ModelLoader] {name} downloaded to {local_path}")
        except Exception as e:
            raise RuntimeError(
                f"Failed to download {name} model from {url}: {e}\n"
                f"Please manually download it and place at: {local_path}"
            )

    return local_path
