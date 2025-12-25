from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models
import auth
from database import get_db
from schemas import RecipeResponse, UserProfile
import nutrition_calculator

router = APIRouter(
    prefix="/custom-meal-plan",
    tags=["custom-meal-plan"]
)

def custom_scale(x, a=800, b=1500, x_min=500, x_max=3000):
    return a + (x - x_min) * (b - a) / (x_max - x_min) if x > 1000 else x


def calculate_calories(gender: str, weight: float, frequency_of_exercise: str) -> float:
    """
    Calculates the estimated daily calorie needs based on gender, weight, and exercise frequency.
    """
    gender_factor = 1 if gender.lower() == "male" else 0.9
    frequency_factor = {
        "sedentary": 0.2,
        "low": 0.3,
        "moderate": 0.4,
        "heavy": 0.5
    }.get(frequency_of_exercise.lower(), 0.4)

    bmr = gender_factor * weight * 24
    calories_needed = bmr + 0.1 * bmr + frequency_factor * bmr
    return calories_needed * 0.45

@router.post("/recipe/{recipe_id}", status_code=201)
def add_recipe_to_custom_plan(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Adds a recipe to the current user's custom meal plan.
    """
    recipe = db.query(models.Recipe).filter(models.Recipe.recipe_id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    existing_entry = db.query(models.CustomMealPlan).filter(
        models.CustomMealPlan.user_id == current_user.id,
        models.CustomMealPlan.recipe_id == recipe_id
    ).first()

    if existing_entry:
        raise HTTPException(status_code=400, detail="Recipe already in custom meal plan")

    new_entry = models.CustomMealPlan(user_id=current_user.id, recipe_id=recipe_id)
    db.add(new_entry)
    db.commit()

    return {"message": "Recipe added to custom meal plan successfully"}

@router.delete("/recipe/{recipe_id}", status_code=200)
def remove_recipe_from_custom_plan(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Removes a recipe from the current user's custom meal plan.
    """
    entry_to_delete = db.query(models.CustomMealPlan).filter(
        models.CustomMealPlan.user_id == current_user.id,
        models.CustomMealPlan.recipe_id == recipe_id
    ).first()

    if not entry_to_delete:
        raise HTTPException(status_code=404, detail="Recipe not found in custom meal plan")

    db.delete(entry_to_delete)
    db.commit()

    return {"message": "Recipe removed from custom meal plan successfully"}

@router.get("/", response_model=List[RecipeResponse])
def get_custom_meal_plan(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Retrieves all recipes in the current user's custom meal plan.
    This endpoint now ensures nutritional information is calculated and included.
    """
    recipes = db.query(models.Recipe).join(models.CustomMealPlan).filter(
        models.CustomMealPlan.user_id == current_user.id
    ).all()
    for recipe in recipes:
        if recipe.calories is None:
            ingredients_with_quantity = db.query(models.Ingredient.name, models.RecipeIngredient.quantity)\
                .join(models.RecipeIngredient, models.Ingredient.ingredient_id == models.RecipeIngredient.ingredient_id)\
                .filter(models.RecipeIngredient.recipe_id == recipe.recipe_id).all()
            
            if ingredients_with_quantity:
                total_nutrition = {"calories": 0.0, "protein": 0.0, "fat": 0.0, "carbs": 0.0}
                for name, quantity in ingredients_with_quantity:
                    ingredient_pair = [name, quantity]
                    calories, protein, fat, carbs = nutrition_calculator.calculate_nutrition(ingredient_pair)
                    total_nutrition["calories"] += calories
                    total_nutrition["protein"] += protein
                    total_nutrition["fat"] += fat
                    total_nutrition["carbs"] += carbs
                
                recipe.calories = round(custom_scale(total_nutrition["calories"]), 2)
                recipe.protein = round(total_nutrition["protein"], 2)
                recipe.fat = round(total_nutrition["fat"], 2)
                recipe.carbs = round(total_nutrition["carbs"], 2)
            else:
                recipe.calories = 0.0
                recipe.protein = 0.0
                recipe.fat = 0.0
                recipe.carbs = 0.0

    db.commit()
    return recipes

@router.post("/calculate-and-get-plan")
def get_custom_meal_plan_with_calories(
    user_profile: UserProfile,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Calculates calorie needs. The recipe plan is now fetched separately.
    """
    calories_needed = calculate_calories(
        user_profile.gender,
        user_profile.weight,
        user_profile.frequency_of_exercise
    )

    return {
        "calories_needed": round(calories_needed, 2)
    }
