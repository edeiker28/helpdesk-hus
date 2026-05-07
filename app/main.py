from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import os

from app.config import settings
from app.database import verify_database_connection
from app.routers import auth, users, tickets, incidents, comments, attachments, notifications, dashboard, locations

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"🚀 Iniciando {settings.APP_NAME} v{settings.APP_VERSION}")
    if not verify_database_connection():
        raise RuntimeError("No se pudo conectar a la base de datos.")
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    logger.info(f"📁 Directorio de uploads: {settings.UPLOAD_DIR}")
    logger.info("✅ Aplicación lista para recibir requests")
    yield
    logger.info("🛑 Cerrando la aplicación...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## Sistema de Mesa de Ayuda — Hospital Universitario de Sincelejo

    API REST para gestión de tickets, incidentes, usuarios, sedes y notificaciones.

    ### Roles del sistema:
    - **Admin**: Acceso total al sistema
    - **Technician**: Gestión de tickets e incidentes asignados
    - **End User**: Creación y seguimiento de sus propios tickets
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount(
    "/uploads",
    StaticFiles(directory=settings.UPLOAD_DIR),
    name="uploads",
)

app.include_router(auth.router,          prefix="/api/v1/auth",          tags=["Autenticación"])
app.include_router(users.router,         prefix="/api/v1/users",         tags=["Usuarios"])
app.include_router(tickets.router,       prefix="/api/v1/tickets",       tags=["Tickets"])
app.include_router(incidents.router,     prefix="/api/v1/incidents",     tags=["Incidentes"])
app.include_router(comments.router,      prefix="/api/v1/comments",      tags=["Comentarios"])
app.include_router(attachments.router,   prefix="/api/v1/attachments",   tags=["Adjuntos"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notificaciones"])
app.include_router(dashboard.router,     prefix="/api/v1/dashboard",     tags=["Dashboard"])
app.include_router(locations.router,     prefix="/api/v1/locations",     tags=["Sedes"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    db_ok = verify_database_connection()
    return {
        "status": "healthy" if db_ok else "unhealthy",
        "database": "connected" if db_ok else "disconnected",
    }
