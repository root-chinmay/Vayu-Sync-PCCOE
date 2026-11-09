from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.config import settings
from .api import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Personalized Mausam Intelligence Engine for SIH Problem Statement ID: 26076.\n\n"
        "Translates raw IMD / meteorological telemetry into personalized decisions, "
        "activity scores, proactive routine protection, and voice-assisted intelligence."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": "1.0.0",
        "sih_problem_statement": "26076 - Development of Personalized Homepage for Mausam Mobile Application",
        "team": "VayuSync",
        "docs": "/docs",
        "status": "operational",
    }

@app.get("/health")
async def health():
    return {"status": "ok"}
