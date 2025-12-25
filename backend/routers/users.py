from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
import auth
from datetime import datetime

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Creates a new user."""
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        username=user.username, 
        hashed_password=hashed_password,
        created_at=datetime.utcnow()
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@router.get("/me/", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    """Returns the current authenticated user."""
    return current_user

@router.get("/me/created-recipes")
def get_created_recipes_for_user(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
    skip: int = 0,
    limit: int = 12
):
    """
    Retrieves the list of recipes created by the currently authenticated user,
    with pagination.
    """
    base_query = db.query(models.Recipe).filter(models.Recipe.user_id == current_user.id)

    total_count = base_query.count()

    created_recipes = base_query.order_by(
        models.Recipe.date.desc()
    ).offset(skip).limit(limit).all()

    for recipe in created_recipes:
        recipe.tags = [rt.tag.tag_name for rt in recipe.tags_association]

    return {"recipes": created_recipes, "total_count": total_count}

@router.get("/me/saved-recipes")
def get_saved_recipes_for_user(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
    skip: int = 0,
    limit: int = 12
):
    """
    Retrieves the list of recipes saved by the currently authenticated user,
    with pagination.
    """
    base_query = db.query(models.Recipe).join(
        models.UserSavedRecipe, models.UserSavedRecipe.recipe_id == models.Recipe.recipe_id
    ).filter(models.UserSavedRecipe.user_id == current_user.id)

    total_count = base_query.count()

    saved_recipes = base_query.order_by(
        models.UserSavedRecipe.saved_at.desc()
    ).offset(skip).limit(limit).all()

    for recipe in saved_recipes:
        recipe.tags = [rt.tag.tag_name for rt in recipe.tags_association]

    return {"recipes": saved_recipes, "total_count": total_count}