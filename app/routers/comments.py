from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.schemas.comment import CommentCreate, CommentUpdate, CommentResponse
from app.models.comment import Comment
from app.models.ticket import Ticket
from app.models.user import User
from app.core.dependencies import get_current_user
from app.utils.enums import UserRole
from app.services.notification_service import create_notification
from app.utils.enums import NotificationType

router = APIRouter()


@router.post("/", response_model=CommentResponse, status_code=201)
def create_comment(
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == data.ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    if data.is_internal and current_user.role == UserRole.END_USER:
        raise HTTPException(status_code=403, detail="Sin permiso para comentarios internos")

    comment = Comment(
        body=data.body,
        is_internal=data.is_internal,
        ticket_id=data.ticket_id,
        author_id=current_user.id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    if ticket.created_by_id != current_user.id:
        create_notification(
            db=db,
            user_id=ticket.created_by_id,
            message=f"Nuevo comentario en tu ticket '{ticket.title}'",
            type=NotificationType.COMMENT_ADDED,
            ticket_id=ticket.id,
        )

    return comment


@router.get("/ticket/{ticket_id}", response_model=List[CommentResponse])
def list_comments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket no encontrado")

    query = db.query(Comment).filter(Comment.ticket_id == ticket_id)

    if current_user.role == UserRole.END_USER:
        query = query.filter(Comment.is_internal == False)

    return query.all()


@router.patch("/{comment_id}", response_model=CommentResponse)
def update_comment(
    comment_id: int,
    data: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    if comment.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sin permiso para editar este comentario")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(comment, field, value)

    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/{comment_id}", status_code=204)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comentario no encontrado")
    if comment.author_id != current_user.id and current_user.role == UserRole.END_USER:
        raise HTTPException(status_code=403, detail="Sin permiso para eliminar este comentario")
    db.delete(comment)
    db.commit()