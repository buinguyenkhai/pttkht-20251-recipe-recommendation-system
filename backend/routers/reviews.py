from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pathlib import Path
from datetime import datetime

import models
import schemas
import auth
from database import get_db

router = APIRouter(
    tags=["reviews"]
)

def load_bad_words(file_path: Path) -> set:
    """Loads a set of bad words from a text file."""
    if not file_path.is_file():
        return set()
    with open(file_path, "r", encoding="utf-8") as f:
        words = {line.strip().lower() for line in f if line.strip()}
    return words

BAD_WORDS_FILE = Path(__file__).parent.parent / "Data" / "bad_words.txt"
BAD_WORDS = load_bad_words(BAD_WORDS_FILE)

@router.post("/recipes/{recipe_id}/reviews", response_model=schemas.Review, status_code=status.HTTP_201_CREATED)
def create_review(
    recipe_id: int,
    review: schemas.ReviewCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    existing_review = db.query(models.Review).filter(
        models.Review.recipe_id == recipe_id,
        models.Review.user_id == current_user.id
    ).first()
    if existing_review:
        raise HTTPException(status_code=409, detail="You have already reviewed this recipe.")

    if not review.rating and not (review.text and review.text.strip()):
        raise HTTPException(status_code=422, detail="Empty review detected, please provide star rating or text review.")
    
    if review.text and any(bad_word in review.text.lower() for bad_word in BAD_WORDS):
        raise HTTPException(status_code=422, detail="Review contains inappropriate language.")

    db_review = models.Review(
        recipe_id=recipe_id,
        user_id=current_user.id,
        rating=review.rating,
        text=review.text,
        created_at=datetime.utcnow()
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review

@router.get("/recipes/{recipe_id}/reviews", response_model=List[schemas.Review])
def get_reviews(recipe_id: int, db: Session = Depends(get_db), start_date: Optional[datetime] = None, end_date: Optional[datetime] = None):
    query = db.query(models.Review).filter(models.Review.recipe_id == recipe_id).options(joinedload(models.Review.user)).order_by(models.Review.created_at.desc())
    
    if start_date:
        query = query.filter(models.Review.created_at >= start_date)
    if end_date:
        query = query.filter(models.Review.created_at <= end_date)
        
    reviews = query.all()
    
    for review in reviews:
        if review.user is None:
            review.reviewer_username = "Deleted user"
        else:
            review.reviewer_username = review.user.username
            
    return reviews

@router.put("/reviews/{review_id}", response_model=schemas.Review)
def update_review(
    review_id: int,
    review_update: schemas.ReviewCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db_review = db.query(models.Review).filter(models.Review.id == review_id).first()

    if not db_review:
        raise HTTPException(status_code=404, detail="Review not found")

    if db_review.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this review")

    if not review_update.rating and not (review_update.text and review_update.text.strip()):
        raise HTTPException(status_code=422, detail="Empty review detected, please provide star rating or text review.")
    
    if review_update.text and any(bad_word in review_update.text.lower() for bad_word in BAD_WORDS):
        raise HTTPException(status_code=422, detail="Review contains inappropriate language.")
    
    db_review.rating = review_update.rating
    db_review.text = review_update.text
    db.commit()
    db.refresh(db_review)
    return db_review

@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(
    review_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db_review = db.query(models.Review).filter(models.Review.id == review_id).first()

    if not db_review:
        raise HTTPException(status_code=404, detail="Review not found")

    if db_review.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Not authorized to delete this review")
    
    db.delete(db_review)
    db.commit()
    return