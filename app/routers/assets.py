from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.schemas.asset import AssetCreate, AssetUpdate, AssetResponse, AssetSummary
from app.models.asset import Asset
from app.models.user import User
from app.core.dependencies import get_current_user, require_technician_or_admin
from app.utils.enums import AssetType, AssetStatus

router = APIRouter()


@router.get("/", response_model=List[AssetSummary])
def list_assets(
    location_id: Optional[int] = None,
    asset_type: Optional[AssetType] = None,
    status: Optional[AssetStatus] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Asset)
    if location_id:
        query = query.filter(Asset.location_id == location_id)
    if asset_type:
        query = query.filter(Asset.asset_type == asset_type)
    if status:
        query = query.filter(Asset.status == status)
    return query.all()


@router.post("/", response_model=AssetResponse, status_code=201)
def create_asset(
    data: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    asset = Asset(**data.model_dump())
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


@router.get("/stats")
def asset_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    total = db.query(Asset).count()
    active = db.query(Asset).filter(Asset.status == AssetStatus.ACTIVE).count()
    in_repair = db.query(Asset).filter(Asset.status == AssetStatus.IN_REPAIR).count()
    maintenance = db.query(Asset).filter(Asset.status == AssetStatus.MAINTENANCE).count()
    retired = db.query(Asset).filter(Asset.status == AssetStatus.RETIRED).count()

    by_type = {}
    for t in AssetType:
        count = db.query(Asset).filter(Asset.asset_type == t).count()
        if count > 0:
            by_type[t.value] = count

    return {
        "total": total,
        "active": active,
        "in_repair": in_repair,
        "maintenance": maintenance,
        "retired": retired,
        "by_type": by_type,
    }


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    return asset


@router.patch("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: int,
    data: AssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(asset, field, value)
    db.commit()
    db.refresh(asset)
    return asset


@router.delete("/{asset_id}", status_code=204)
def delete_asset(
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_technician_or_admin),
):
    asset = db.query(Asset).filter(Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Activo no encontrado")
    db.delete(asset)
    db.commit()
