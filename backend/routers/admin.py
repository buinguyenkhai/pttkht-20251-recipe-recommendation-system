from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import models
import schemas
import auth
from database import get_db

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(auth.require_admin)]
)

@router.post("/users/{username}/grant-admin", status_code=status.HTTP_200_OK)
def grant_admin_privileges(username: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    
    user.is_admin = True
    db.commit()
    
    return {"message": f"Admin privileges granted to user {username}"}

@router.delete("/recipes/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(models.Recipe).filter(models.Recipe.recipe_id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    
    db.delete(recipe)
    db.commit()

@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review not found")
        
    db.delete(review)
    db.commit()

@router.get("/dashboard/users", response_model=List[schemas.UserAdminView])
def get_users_for_admin_dashboard(
    db: Session = Depends(get_db),
    sort_by: Optional[str] = Query(None, enum=["created_recipes", "reviews_count", "average_rating"]),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    query = db.query(
        models.User,
        func.count(models.Recipe.recipe_id).label("created_recipes_count"),
        func.count(models.Review.id).label("reviews_count"),
        func.avg(models.Review.rating).label("average_rating")
    ).outerjoin(models.Recipe, models.User.id == models.Recipe.user_id)\
     .outerjoin(models.Review, models.User.id == models.Review.user_id)\
     .group_by(models.User.id)

    if start_date:
        query = query.filter(models.User.created_at >= start_date)
    if end_date:
        query = query.filter(models.User.created_at <= end_date)

    if sort_by:
        if sort_by == "created_recipes":
            query = query.order_by(func.count(models.Recipe.recipe_id).desc())
        elif sort_by == "reviews_count":
            query = query.order_by(func.count(models.Review.id).desc())
        elif sort_by == "average_rating":
            query = query.order_by(func.avg(models.Review.rating).desc())

    users_stats = query.all()

    result = []
    for user, created_recipes_count, reviews_count, average_rating in users_stats:
        result.append({
            "id": user.id,
            "username": user.username,
            "created_at": user.created_at,
            "is_admin": user.is_admin,
            "created_recipes_count": created_recipes_count,
            "reviews_count": reviews_count,
            "average_rating": average_rating
        })
    return result

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user_by_admin(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    db.delete(user)
    db.commit()

@router.get("/charts/recipes-by-date")
def get_recipes_by_date_chart(db: Session = Depends(get_db)):
    data = db.query(func.date(models.Recipe.date), func.count(models.Recipe.recipe_id)).group_by(func.date(models.Recipe.date)).all()
    return {str(date): count for date, count in data}

@router.get("/charts/users-by-date")
def get_users_by_date_chart(db: Session = Depends(get_db)):
    data = db.query(func.date(models.User.created_at), func.count(models.User.id)).group_by(func.date(models.User.created_at)).all()
    return {str(date): count for date, count in data}

@router.get("/charts/reviews-by-date")
def get_reviews_by_date_chart(db: Session = Depends(get_db), start_date: Optional[datetime] = None, end_date: Optional[datetime] = None):
    query = db.query(func.date(models.Review.created_at), func.count(models.Review.id))
    if start_date:
        query = query.filter(models.Review.created_at >= start_date)
    if end_date:
        query = query.filter(models.Review.created_at <= end_date)
    
    data = query.group_by(func.date(models.Review.created_at)).all()
    return {str(date): count for date, count in data}