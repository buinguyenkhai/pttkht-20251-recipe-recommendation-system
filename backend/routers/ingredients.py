from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/ingredients",
    tags=["ingredients"]
)

@router.get("/", response_model=List[schemas.IngredientWithCount])
def get_ingredients(db: Session = Depends(get_db)):
    """Retrieve a list of all ingredients with their recipe counts, sorted alphabetically."""
    ingredients_with_count = db.query(
        models.Ingredient,
        func.count(models.RecipeIngredient.recipe_id).label("recipe_count")
    ).outerjoin(models.RecipeIngredient, models.Ingredient.ingredient_id == models.RecipeIngredient.ingredient_id)\
    .group_by(models.Ingredient.ingredient_id)\
    .order_by(models.Ingredient.name)\
    .all()

    return [{"ingredient_id": ing.ingredient_id, "name": ing.name, "recipe_count": count} for ing, count in ingredients_with_count]


@router.get("/{ingredient_id}/")
def get_ingredient(ingredient_id: int, db: Session = Depends(get_db)):
    """Retrieve a specific ingredient by its ID."""
    ingredient = db.query(models.Ingredient).filter(models.Ingredient.ingredient_id == ingredient_id).first()
    if not ingredient:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return ingredient