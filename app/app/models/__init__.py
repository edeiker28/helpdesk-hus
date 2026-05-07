# app/models/__init__.py
# Importar todos los modelos aquí para que SQLAlchemy y Alembic
# los detecten automáticamente al generar las migraciones.
# El orden importa: primero los que no dependen de otros.

from app.models.user import User
from app.models.incident import Incident
from app.models.ticket import Ticket
from app.models.comment import Comment
from app.models.attachment import Attachment
from app.models.notification import Notification

__all__ = [
    "User",
    "Incident",
    "Ticket",
    "Comment",
    "Attachment",
    "Notification",
]
