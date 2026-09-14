import asyncio
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.services.seed import ensure_seeded
from app.simulation.live import simulation_loop
from app.api.routes import router as api_router

load_dotenv()

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000,https://netra-x-sih26127.netlify.app")


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_seeded()
    task = asyncio.create_task(simulation_loop())
    yield
    task.cancel()


app = FastAPI(
    title="NETRA-X API",
    description="City-Wide AI Engine for Multi-Camera ANPR Trajectory Tracking and Urban Traffic Analytics",
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


@app.get("/health")
def health():
    return {"status": "healthy"}


app.include_router(api_router, prefix="/api")
