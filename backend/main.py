import os
import time
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

_start_time = time.time()

ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000",
).split(",")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Preload AI models on startup."""
    print("[BioAccess] Starting backend...")
    print("[BioAccess] Preloading MediaPipe models...")

    # Trigger singleton init
    from services.face_detection import face_detector
    from services.landmark_extraction import landmark_extractor

    # Preload DeepFace
    from services.face_verification import face_verifier
    face_verifier.init_model()

    print("[BioAccess] Backend ready.")
    yield
    print("[BioAccess] Shutting down.")


app = FastAPI(
    title="BioAccess AI Backend",
    description="Biometric Access Control — AI Pipeline with Remote Human Supervision",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from api.router import router  # noqa: E402
app.include_router(router)


@app.get("/")
async def root():
    return {
        "service": "BioAccess AI Backend",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health",
    }
