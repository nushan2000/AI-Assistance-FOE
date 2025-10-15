from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from src.database import SessionLocal
from src.models import MRBSSwapRequest, MRBSEntry, MRBSUser, MRBSModule
from pydantic import BaseModel

router = APIRouter()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class SwapRequestCreate(BaseModel):
    requested_by_email: str
    requested_booking_id: int
    offered_booking_id: int | None = None
# you are not allowed to add swap request fron\m ald requests, you should usw new
@router.post("/swap/request")
def create_swap(payload: SwapRequestCreate, db: Session = Depends(get_db)):
    # 1️⃣ Find the user making the request
    user = db.query(MRBSUser).filter(MRBSUser.email == payload.requested_by_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 2️⃣ Find the offered user (if any)
    offered_user = None
    if payload.offered_booking_id:
        offered_user = (
            db.query(MRBSUser)
            .join(MRBSModule, MRBSModule.lecture_id == MRBSUser.id)
            .join(MRBSEntry, MRBSEntry.name == MRBSModule.module_code)
            .filter(MRBSEntry.id == payload.offered_booking_id)
            .first()
        )
        if not offered_user:
            raise HTTPException(status_code=404, detail="Offered user not found")

    # 3️⃣ Create the swap request
    swap = MRBSSwapRequest(
        requested_by=user.id,
        requested_booking_id=payload.requested_booking_id,
        offered_booking_id=payload.offered_booking_id,
        offered_by=offered_user.id if offered_user else None,
        status="pending"
    )

    db.add(swap)
    db.commit()
    db.refresh(swap)

    # 4️⃣ Return response
    return {
        "message": "Swap request created successfully",
        "swap_id": swap.id,
        "requested_by": user.id,
        "requested_booking_id": payload.requested_booking_id,
        "offered_booking_id": payload.offered_booking_id,
        "offered_by": offered_user.id if offered_user else None,
        "status": swap.status
    }

@router.post("/swap/respond")
def respond_swap(swap_id: int, owner_id: int, response: str, db: Session = Depends(get_db)):
    swap = db.query(MRBSSwapRequest).filter(MRBSSwapRequest.id == swap_id).first()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap request not found")

    requested_booking = db.query(MRBSEntry).filter(MRBSEntry.id == swap.requested_booking_id).first()
    offered_booking = db.query(MRBSEntry).filter(MRBSEntry.id == swap.offered_booking_id).first() if swap.offered_booking_id else None

    if response == "approved":
        requested_booking.create_by = swap.requested_by
        if offered_booking:
            offered_booking.create_by = owner_id
        swap.status = "approved"
        db.commit()
        return {"message": "Swap approved and bookings updated"}
    elif response == "rejected":
        swap.status = "rejected"
        db.commit()
        return {"message": "Swap rejected"}
    else:
        raise HTTPException(status_code=400, detail="Invalid response")

@router.get("/swap/pending/{user_id}")
def pending_swaps(user_id: int, db: Session = Depends(get_db)):
    swaps = db.query(MRBSSwapRequest).join(MRBSEntry, MRBSSwapRequest.requested_booking_id == MRBSEntry.id).filter(
        MRBSEntry.create_by == user_id, MRBSSwapRequest.status == "pending"
    ).all()
    return {"pending_requests": [{"swap_id": s.id, "requested_by": s.requested_by, "requested_booking_id": s.requested_booking_id} for s in swaps]}

@router.get("/swap/get_all/{user_id}")
def get_all_swaps(user_id: int, db: Session = Depends(get_db)):
    swaps = db.query(MRBSSwapRequest).filter(
        (MRBSSwapRequest.requested_by == user_id) | (MRBSSwapRequest.offered_booking_id == user_id)
    ).all()
    return {"all_swaps": [{"swap_id": s.id, "requested_by": s.requested_by, "requested_booking_id": s.requested_booking_id} for s in swaps]}
