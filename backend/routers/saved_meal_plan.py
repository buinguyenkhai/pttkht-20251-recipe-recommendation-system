# saved_meal_plan.py

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session, joinedload
from typing import List
import models
import auth
from database import get_db
import schemas

router = APIRouter(
    prefix="/saved-meal-plans",
    tags=["saved-meal-plans"]
)

@router.post("/", response_model=schemas.SavedMealPlanResponse, status_code=201)
def save_meal_plan(
    plan_data: schemas.SavedMealPlanCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Saves a new meal plan for the current user. A plan consists of a name,
    a list of recipe IDs, and their total nutritional values.
    """
    recipes = db.query(models.Recipe).filter(models.Recipe.recipe_id.in_(plan_data.recipe_ids)).all()
    if len(recipes) != len(set(plan_data.recipe_ids)):
        raise HTTPException(status_code=404, detail="One or more recipes not found.")

    new_plan = models.SavedMealPlan(
        user_id=current_user.id,
        name=plan_data.name,
        total_calories=plan_data.nutrition.total_calories,
        total_protein=plan_data.nutrition.total_protein,
        total_fat=plan_data.nutrition.total_fat,
        total_carbs=plan_data.nutrition.total_carbs
    )
    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)

    for recipe_id in plan_data.recipe_ids:
        plan_recipe_link = models.SavedMealPlanRecipe(
            plan_id=new_plan.id,
            recipe_id=recipe_id
        )
        db.add(plan_recipe_link)
    
    db.commit()
    new_plan.recipes = recipes
    return new_plan

@router.get("/", response_model=List[schemas.SavedMealPlanInfoResponse])
def get_user_saved_plans(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Retrieves a list of all meal plans saved by the current user.
    Returns only the ID and name, perfect for populating a dropdown menu.
    """
    plans = db.query(models.SavedMealPlan).filter(models.SavedMealPlan.user_id == current_user.id).order_by(models.SavedMealPlan.created_at.desc()).all()
    return plans

@router.get("/{plan_id}", response_model=schemas.SavedMealPlanResponse)
def get_saved_plan_details(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Retrieves the full details of a specific saved meal plan, including all its recipes.
    Ensures the plan belongs to the current user.
    """
    plan = db.query(models.SavedMealPlan).options(
        joinedload(models.SavedMealPlan.recipes_association).joinedload(models.SavedMealPlanRecipe.recipe)
    ).filter(
        models.SavedMealPlan.id == plan_id,
        models.SavedMealPlan.user_id == current_user.id
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Saved meal plan not found.")

    plan.recipes = [assoc.recipe for assoc in plan.recipes_association]
    return plan

@router.delete("/{plan_id}", status_code=204)
def delete_saved_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Deletes a user's saved meal plan. Cascade rules in the model will handle
    the removal of associated recipe links.
    """
    plan_to_delete = db.query(models.SavedMealPlan).filter(
        models.SavedMealPlan.id == plan_id,
        models.SavedMealPlan.user_id == current_user.id
    ).first()

    if not plan_to_delete:
        raise HTTPException(status_code=404, detail="Saved meal plan not found or you do not have permission to delete it.")

    db.delete(plan_to_delete)
    db.commit()

    return Response(status_code=204)

@router.put("/{plan_id}/name", response_model=schemas.SavedMealPlanInfoResponse)
def update_saved_plan_name(
    plan_id: int,
    plan_update: schemas.SavedMealPlanUpdateName,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Updates the name of a specific saved meal plan.
    """
    plan = db.query(models.SavedMealPlan).filter(
        models.SavedMealPlan.id == plan_id,
        models.SavedMealPlan.user_id == current_user.id
    ).first()

    if not plan:
        raise HTTPException(status_code=404, detail="Saved meal plan not found.")

    plan.name = plan_update.name
    db.commit()
    db.refresh(plan)

    return plan