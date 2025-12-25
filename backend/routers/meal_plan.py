from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
import models
from database import get_db
from pathlib import Path
import json
import random
import nutrition_calculator
from schemas import RecipeDetailResponse


router = APIRouter(
    tags=["meal_plan"]
)

def custom_scale(x, a=800, b=1500, x_min=500, x_max=3000):
    return a + (x - x_min) * (b - a) / (x_max - x_min) if x > 1000 else x

@router.post("/import_meal_plans/")
def import_meal_plans(
    filename: str = Query("thuc_don_chi_tiet.json", description="Tên file JSON chứa thực đơn chi tiết"),
    delete_existing: bool = Query(True, description="Xóa dữ liệu thực đơn cũ nếu tồn tại"),
    db: Session = Depends(get_db)
):
    if delete_existing:
        db.query(models.MealPlanRecipe).delete()
        db.query(models.MealPlan).delete()
        db.execute(text("ALTER SEQUENCE meal_plans_meal_plan_id_seq RESTART WITH 1;"))
        db.commit()

    file_path = Path(__file__).parent.parent / "Data" / "thuc_don_chi_tiet.json"

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            meal_data = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy file: {filename}")

    imported_count = 0
    for meal_name, meal_details in meal_data.items():
        for num_people_str, recipe_titles in meal_details.items():
            try:
                num_people = int(num_people_str.split('_')[0])
            except (ValueError, IndexError):
                print(f"Bỏ qua định dạng không hợp lệ: {num_people_str}")
                continue

            new_meal_plan = models.MealPlan(meal_name=meal_name, num_people=num_people)
            db.add(new_meal_plan)
            db.commit()
            db.refresh(new_meal_plan)

            for title in recipe_titles:
                title = title.strip()  # Remove leading/trailing whitespace
                # Use case-insensitive matching for better compatibility
                recipe = db.query(models.Recipe).filter(
                    models.Recipe.title.ilike(title)
                ).first()
                if recipe:
                    meal_plan_recipe = models.MealPlanRecipe(
                        meal_plan_id=new_meal_plan.meal_plan_id,
                        recipe_id=recipe.recipe_id
                    )
                    db.add(meal_plan_recipe)
                else:
                    print(f"Cảnh báo: Không tìm thấy công thức với tiêu đề '{title}'. Bỏ qua liên kết.")
            
            imported_count += 1
    
    db.commit()
    return {"message": f"Đã import thành công {imported_count} thực đơn."}

@router.get("/random_meal/", response_model=list[RecipeDetailResponse])
def get_random_meal(num_people: int, db: Session = Depends(get_db)):
    meal_plan_ids_query = db.query(models.MealPlan.meal_plan_id).filter(models.MealPlan.num_people == num_people)
    meal_plan_ids = meal_plan_ids_query.all()

    if not meal_plan_ids:
        raise HTTPException(
            status_code=404, 
            detail=f"Không tìm thấy thực đơn nào cho {num_people} người. Vui lòng import dữ liệu trước."
        )

    random_meal_plan_id = random.choice([item[0] for item in meal_plan_ids])

    recipe_ids_query = db.query(models.MealPlanRecipe.recipe_id).filter(
        models.MealPlanRecipe.meal_plan_id == random_meal_plan_id
    )
    recipe_ids_list = [rid[0] for rid in recipe_ids_query.all()]

    if not recipe_ids_list:
        raise HTTPException(
            status_code=404, 
            detail="Bữa ăn được chọn không có món ăn nào."
        )

    recipes = db.query(models.Recipe).filter(models.Recipe.recipe_id.in_(recipe_ids_list)).all()

    for recipe in recipes:
        if recipe.calories is None or recipe.protein is None or recipe.fat is None or recipe.carbs is None:
            ingredients_with_quantity = db.query(models.Ingredient.name, models.RecipeIngredient.quantity)\
                .join(models.RecipeIngredient, models.Ingredient.ingredient_id == models.RecipeIngredient.ingredient_id)\
                .filter(models.RecipeIngredient.recipe_id == recipe.recipe_id).all()

            if not ingredients_with_quantity:
                recipe.calories = 0.0
                recipe.protein = 0.0
                recipe.fat = 0.0
                recipe.carbs = 0.0
                continue

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

    db.commit()
    return recipes