from sqlalchemy.orm import Session
from app.models.notification import Notification
from app.utils.enums import NotificationType


def create_notification(
    db: Session,
    user_id: int,
    message: str,
    type: NotificationType,
    ticket_id: int = None,
) -> Notification:
    notification = Notification(
        user_id=user_id,
        message=message,
        type=type,
        ticket_id=ticket_id,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification