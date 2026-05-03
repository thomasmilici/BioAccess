from dataclasses import dataclass, field


@dataclass
class Settings:
    # Confidence weights (mirrors frontend CONFIDENCE_WEIGHTS)
    W1_SIMILARITY: float = 0.35
    W2_STABILITY: float = 0.20
    W3_QUALITY: float = 0.20
    W4_LIVENESS: float = 0.15
    W5_GEOMETRY: float = 0.10

    # Thresholds per turnstile type
    THRESHOLDS: dict = field(default_factory=lambda: {
        "stable": {"low": 0.85, "high": 0.95},
        "nonStable": {"low": 0.90, "high": 0.97},
        "visitor": {"low": 0.92, "high": 0.98},
    })

    # MediaPipe
    FACE_DETECTION_MODEL: int = 0  # 0=short-range (<2m), 1=full-range (<5m)
    MIN_DETECTION_CONFIDENCE: float = 0.5

    # Liveness
    EAR_BLINK_THRESHOLD: float = 0.20
    TEXTURE_LAPLACIAN_MIN: float = 100.0
    EAR_FRAMES_NEEDED: int = 5  # consecutive frames for blink detection

    # DeepFace
    DEEPFACE_MODEL: str = "Facenet"
    VERIFY_DISTANCE_THRESHOLD: float = 0.40  # cosine distance below this = match

    # Image
    MAX_IMAGE_DIMENSION: int = 640
    MIN_FACE_SIZE_PX: int = 80

    # Normative facial proportions (for geometry_score)
    IDEAL_RATIOS: dict = field(default_factory=lambda: {
        "interpupillary_to_face_width": (0.42, 0.50),
        "nose_to_chin_to_lower_face": (0.65, 0.78),
        "forehead_to_face_height": (0.28, 0.35),
        "face_width_to_height": (0.72, 0.85),
    })


settings = Settings()
