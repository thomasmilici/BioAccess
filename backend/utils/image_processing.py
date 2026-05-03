import base64
import io
from typing import Optional

import cv2
import numpy as np

from config import settings


def decode_image(file_bytes: bytes) -> np.ndarray:
    """Decode JPEG/PNG bytes to BGR numpy array."""
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Unable to decode image. Ensure it is valid JPEG or PNG.")
    return img


def decode_base64_image(b64_string: str) -> np.ndarray:
    """Decode a base64-encoded JPEG/PNG string to BGR numpy array."""
    if b64_string.startswith("data:image"):
        b64_string = b64_string.split(",", 1)[1]
    img_bytes = base64.b64decode(b64_string)
    return decode_image(img_bytes)


def resize_to_max(img: np.ndarray) -> np.ndarray:
    """Resize image so longest side <= settings.MAX_IMAGE_DIMENSION, preserving aspect ratio."""
    h, w = img.shape[:2]
    max_dim = max(h, w)
    if max_dim <= settings.MAX_IMAGE_DIMENSION:
        return img
    scale = settings.MAX_IMAGE_DIMENSION / max_dim
    new_w = int(w * scale)
    new_h = int(h * scale)
    return cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)


def to_grayscale(img: np.ndarray) -> np.ndarray:
    if len(img.shape) == 3:
        return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return img


def laplacian_variance(img: np.ndarray) -> float:
    """Variance of Laplacian — measures image sharpness / texture."""
    gray = to_grayscale(img)
    lap = cv2.Laplacian(gray, cv2.CV_64F)
    return float(lap.var())


def image_quality_score(img: np.ndarray) -> float:
    """
    Returns a quality score in [0, 1].
    Based on sharpness and minimum resolution requirements.
    """
    h, w = img.shape[:2]
    # Resolution factor: penalise images below 320x320
    resolution_factor = min(1.0, (w * h) / (320 * 320))
    # Sharpness factor: Laplacian variance (typical ranges 50-500+)
    sharpness = laplacian_variance(img)
    sharpness_factor = min(1.0, sharpness / 300.0)
    return round(resolution_factor * 0.3 + sharpness_factor * 0.7, 4)


def encode_jpeg_base64(img: np.ndarray, quality: int = 85) -> str:
    """Encode BGR image as base64 JPEG string."""
    success, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    if not success:
        raise ValueError("Failed to encode image as JPEG")
    return base64.b64encode(buf).decode("utf-8")


def draw_face_bbox(img: np.ndarray, bbox: dict, color=(0, 255, 0)) -> np.ndarray:
    """Draw a bounding-box rectangle on the image (in-place copy)."""
    out = img.copy()
    x, y, w_box, h_box = bbox["x"], bbox["y"], bbox["width"], bbox["height"]
    cv2.rectangle(out, (x, y), (x + w_box, y + h_box), color, 2)
    return out
