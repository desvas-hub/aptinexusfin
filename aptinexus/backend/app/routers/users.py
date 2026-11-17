from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies import get_current_user
from app.models import User, UserData

router = APIRouter(tags=["User data"])


def read_value(db: Session, user_id: int, key: str, default):
    item = db.scalar(select(UserData).where(UserData.user_id == user_id, UserData.data_key == key))
    return item.value if item else default


def write_value(db: Session, user_id: int, key: str, value):
    item = db.scalar(select(UserData).where(UserData.user_id == user_id, UserData.data_key == key))
    if item is None:
        item = UserData(user_id=user_id, data_key=key, value=value)
        db.add(item)
    else:
        item.value = value
    db.commit()
    return value


@router.get("/profiles/me")
def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return read_value(db, user.id, "profile", {
        "personal": {"name": user.name, "headline": user.headline, "location": ""},
        "sections": {}
    })


@router.put("/profiles/me")
def put_profile(payload: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return write_value(db, user.id, "profile", payload)


@router.get("/projects")
def get_projects(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return read_value(db, user.id, "projects", [])


@router.put("/projects")
def put_projects(payload: list, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return write_value(db, user.id, "projects", payload)


@router.get("/skillproof/evidence")
def get_evidence(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return read_value(db, user.id, "evidence", [])


@router.put("/skillproof/evidence")
def put_evidence(payload: list, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Evidence can be submitted by users; verified status must only be granted by a reviewer.
    for item in payload:
        if isinstance(item, dict) and item.get("status") == "Verified":
            item["status"] = "Demonstrated"
    return write_value(db, user.id, "evidence", payload)


@router.get("/assessments/results")
def get_results(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return read_value(db, user.id, "results", [])


@router.put("/assessments/results")
def put_results(payload: list, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return write_value(db, user.id, "results", payload)


@router.get("/users/me/settings")
def get_settings(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return read_value(db, user.id, "settings", {})


@router.put("/users/me/settings")
def put_settings(payload: dict, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return write_value(db, user.id, "settings", payload)


@router.get("/notifications/read")
def get_notifications_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return read_value(db, user.id, "notifRead", [])


@router.put("/notifications/read")
def put_notifications_read(payload: list, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return write_value(db, user.id, "notifRead", payload)


@router.get("/roadmaps/{career_id}/progress")
def get_roadmap_progress(career_id: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return read_value(db, user.id, f"roadmap:{career_id}", [])


@router.put("/roadmaps/{career_id}/progress")
def put_roadmap_progress(career_id: str, payload: list, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return write_value(db, user.id, f"roadmap:{career_id}", payload)
