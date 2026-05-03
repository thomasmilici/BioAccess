"""
Eye Aspect Ratio (EAR) calculator.
Used for blink detection in liveness verification.

EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)

MediaPipe Face Mesh eye landmark indices (468 total):
  Left eye:  [362, 385, 387, 263, 373, 380]
  Right eye: [33,  160, 158, 133, 153, 144]
"""

import numpy as np

# MediaPipe Face Mesh indices for the 6 eye contour points per eye
LEFT_EYE_INDICES = [362, 385, 387, 263, 373, 380]
RIGHT_EYE_INDICES = [33, 160, 158, 133, 153, 144]


def eye_aspect_ratio(eye_pts: np.ndarray) -> float:
    """
    Compute EAR for 6 eye landmark points.
    eye_pts: shape (6, 2) with (x, y) coordinates.
    """
    # Vertical distances
    a = np.linalg.norm(eye_pts[1] - eye_pts[5])
    b = np.linalg.norm(eye_pts[2] - eye_pts[4])
    # Horizontal distance
    c = np.linalg.norm(eye_pts[0] - eye_pts[3])

    if c < 1e-6:
        return 0.0
    return float((a + b) / (2.0 * c))


def compute_ear(
    landmarks_list: list,
    img_w: int = 1,
    img_h: int = 1,
) -> dict:
    """
    Compute EAR for both eyes from a MediaPipe Face Mesh landmarks list.

    Args:
        landmarks_list: list of 468 NormalizedLandmark objects (each with .x, .y)
        img_w, img_h: image dimensions for denormalisation

    Returns:
        dict with left_ear, right_ear, avg_ear, is_blink
    """
    left_pts = _extract_eye_points(landmarks_list, LEFT_EYE_INDICES, img_w, img_h)
    right_pts = _extract_eye_points(landmarks_list, RIGHT_EYE_INDICES, img_w, img_h)

    left_ear = eye_aspect_ratio(left_pts)
    right_ear = eye_aspect_ratio(right_pts)
    avg_ear = (left_ear + right_ear) / 2.0

    return {
        "left_ear": round(left_ear, 4),
        "right_ear": round(right_ear, 4),
        "avg_ear": round(avg_ear, 4),
    }


def _extract_eye_points(
    landmarks_list: list,
    indices: list[int],
    img_w: int,
    img_h: int,
) -> np.ndarray:
    pts = np.zeros((6, 2), dtype=np.float64)
    for i, idx in enumerate(indices):
        lm = landmarks_list[idx]
        pts[i, 0] = lm.x * img_w
        pts[i, 1] = lm.y * img_h
    return pts
