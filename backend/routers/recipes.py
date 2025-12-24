# backend/routers/recipes.py

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, exists, text
from typing import List, Optional
from pathlib import Path
from datetime import datetime
import uuid
import os
import json
import models
import schemas
from database import get_db
import nutrition_calculator
import auth

UPLOAD_DIRECTORY = "/app/uploads"
os.makedirs(UPLOAD_DIRECTORY, exist_ok=True)


router = APIRouter(
    prefix="/recipes",
    tags=["recipes"]
)


@router.post("/upload-image/", status_code=status.HTTP_201_CREATED)
async def upload_recipe_image(image: UploadFile = File(...)):
    try:
        file_extension = image.filename.split(".")[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = os.path.join(UPLOAD_DIRECTORY, unique_filename)

        with open(file_path, "wb") as buffer:
            buffer.write(await image.read())

        image_url = f"http://localhost:8080/images/{unique_filename}"
        return {"image_url": image_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")

@router.get("/random-featured/")
def get_random_featured_recipes(
    db: Session = Depends(get_db),
    count: int = Query(5, ge=1, le=10, description="Number of random recipes to return.")
):
    """
    Get a specified number of random recipes for the featured carousel.
    Returns a simplified payload with only id, title, and image URL.
    Filters out recipes without an image.
    """
    featured_recipes = db.query(
        models.Recipe.recipe_id,
        models.Recipe.title,
        models.Recipe.image_url
    ).filter(models.Recipe.image_url != None).order_by(func.random()).limit(count).all()

    if not featured_recipes:
        return []

    return [
        {"recipe_id": r.recipe_id, "title": r.title, "image_url": r.image_url}
        for r in featured_recipes
    ]


def custom_scale(x, a=800, b=1500, x_min=500, x_max=3000):
    return a + (x - x_min) * (b - a) / (x_max - x_min) if x > 1000 else x

def load_bad_words(file_path: Path) -> set:
    """Loads a set of bad words from a text file."""
    if not file_path.is_file():
        return set()
    with open(file_path, "r", encoding="utf-8") as f:
        words = {line.strip().lower() for line in f if line.strip()}
    return words

BAD_WORDS_FILE = Path(__file__).parent.parent / "Data" / "bad_words.txt"
BAD_WORDS = load_bad_words(BAD_WORDS_FILE)

def contains_bad_word(text: str) -> bool:
    """Checks if a string contains any bad words."""
    if not text:
        return False
    return any(bad_word in text.lower() for bad_word in BAD_WORDS)

@router.post("/", status_code=status.HTTP_201_CREATED, response_model=schemas.RecipeResponse)
def create_recipe(
    recipe: schemas.RecipeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if contains_bad_word(recipe.title) or contains_bad_word(recipe.description):
        raise HTTPException(status_code=422, detail="Title or description contains inappropriate language.")
    for step in recipe.steps:
        if not step.strip():
            raise HTTPException(status_code=422, detail="Steps cannot be empty.")
        if contains_bad_word(step):
            raise HTTPException(status_code=422, detail="A step contains inappropriate language.")
    if not recipe.tags:
        raise HTTPException(status_code=422, detail="At least one tag is required.")
    for tag_name in recipe.tags:
        if contains_bad_word(tag_name):
            raise HTTPException(status_code=422, detail="A tag contains inappropriate language.")
    if not recipe.ingredients:
        raise HTTPException(status_code=422, detail="At least one ingredient is required.")
    for ing in recipe.ingredients:
        try:
            float(ing.quantity)
        except ValueError:
            raise HTTPException(status_code=422, detail=f"Ingredient quantity '{ing.quantity}' must be a number.")
        if contains_bad_word(ing.name):
            raise HTTPException(status_code=422, detail="An ingredient name contains inappropriate language.")
        if ing.unit and contains_bad_word(ing.unit):
            raise HTTPException(status_code=422, detail="An ingredient unit contains inappropriate language.")

    source_name = f"Uploaded by {current_user.username}"
    source = db.query(models.Source).filter(models.Source.source_name == source_name).first()
    if not source:
        source = models.Source(source_name=source_name)
        db.add(source)
        db.flush()

    num_of_people_str = f"Cho {recipe.servings} người"
    new_recipe = models.Recipe(
        title=recipe.title,
        description=recipe.description,
        num_of_people=num_of_people_str,
        source_id=source.source_id,
        user_id=current_user.id,
        date=datetime.utcnow(),
        image_url=recipe.image_url
    )
    db.add(new_recipe)
    db.flush()

    for i, step_detail in enumerate(recipe.steps):
        new_step = models.Step(recipe_id=new_recipe.recipe_id, step_number=i + 1, step_detail=step_detail)
        db.add(new_step)
    for tag_name in recipe.tags:
        tag = db.query(models.Tag).filter(func.lower(models.Tag.tag_name) == func.lower(tag_name)).first()
        if not tag:
            tag = models.Tag(tag_name=tag_name)
            db.add(tag)
            db.flush()
        recipe_tag = models.RecipeTag(recipe_id=new_recipe.recipe_id, tag_id=tag.tag_id)
        db.add(recipe_tag)
    for ing in recipe.ingredients:
        ingredient_name_lower = ing.name.lower()
        ingredient = db.query(models.Ingredient).filter(models.Ingredient.name == ingredient_name_lower).first()
        if not ingredient:
            ingredient = models.Ingredient(name=ingredient_name_lower)
            db.add(ingredient)
            db.flush()
        quantity_str = f"{ing.quantity} {ing.unit}".strip()
        recipe_ingredient = models.RecipeIngredient(
            recipe_id=new_recipe.recipe_id,
            ingredient_id=ingredient.ingredient_id,
            quantity=quantity_str
        )
        db.add(recipe_ingredient)

    db.commit()
    db.refresh(new_recipe)

    return new_recipe

@router.put("/{recipe_id}", status_code=status.HTTP_200_OK, response_model=schemas.RecipeResponse)
def update_recipe(
    recipe_id: int,
    recipe_update: schemas.RecipeUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db_recipe = db.query(models.Recipe).filter(models.Recipe.recipe_id == recipe_id).first()

    if not db_recipe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")

    if db_recipe.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to edit this recipe")

    db_recipe.title = recipe_update.title
    db_recipe.description = recipe_update.description
    db_recipe.num_of_people = f"Cho {recipe_update.servings} người"
    db_recipe.image_url = recipe_update.image_url

    db.query(models.Step).filter(models.Step.recipe_id == recipe_id).delete()
    for i, step_detail in enumerate(recipe_update.steps):
        new_step = models.Step(recipe_id=recipe_id, step_number=i + 1, step_detail=step_detail)
        db.add(new_step)

    db.query(models.RecipeTag).filter(models.RecipeTag.recipe_id == recipe_id).delete()
    for tag_name in recipe_update.tags:
        tag = db.query(models.Tag).filter(func.lower(models.Tag.tag_name) == func.lower(tag_name)).first()
        if not tag:
            tag = models.Tag(tag_name=tag_name)
            db.add(tag)
            db.flush()
        recipe_tag = models.RecipeTag(recipe_id=recipe_id, tag_id=tag.tag_id)
        db.add(recipe_tag)

    db.query(models.RecipeIngredient).filter(models.RecipeIngredient.recipe_id == recipe_id).delete()
    for ing in recipe_update.ingredients:
        ingredient_name_lower = ing.name.lower()
        ingredient = db.query(models.Ingredient).filter(models.Ingredient.name == ingredient_name_lower).first()
        if not ingredient:
            ingredient = models.Ingredient(name=ingredient_name_lower)
            db.add(ingredient)
            db.flush()
        quantity_str = f"{ing.quantity} {ing.unit}".strip()
        recipe_ingredient = models.RecipeIngredient(
            recipe_id=recipe_id,
            ingredient_id=ingredient.ingredient_id,
            quantity=quantity_str,
        )
        db.add(recipe_ingredient)

    db.commit()
    db.refresh(db_recipe)
    return db_recipe

@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    db_recipe = db.query(models.Recipe).filter(models.Recipe.recipe_id == recipe_id).first()

    if not db_recipe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")

    if db_recipe.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to delete this recipe")

    db.delete(db_recipe)
    db.commit()

def enrich_recipe_data(recipes: List[models.Recipe], db: Session):
    recipe_ids = [r.recipe_id for r in recipes]
    if not recipe_ids:
        return []

    ingredients_q = db.query(models.RecipeIngredient).filter(models.RecipeIngredient.recipe_id.in_(recipe_ids)).options(joinedload(models.RecipeIngredient.ingredient)).all()

    recipe_ingredients_map = {}
    for ri in ingredients_q:
        if ri.recipe_id not in recipe_ingredients_map:
            recipe_ingredients_map[ri.recipe_id] = []
        recipe_ingredients_map[ri.recipe_id].append({"name": ri.ingredient.name, "quantity": ri.quantity})
    
    for r in recipes:
        r.ingredients = recipe_ingredients_map.get(r.recipe_id, [])

    return recipes

@router.get("/search/")
def search_recipes(
    db: Session = Depends(get_db),
    query: Optional[str] = Query(None, alias="query"),
    tag_inc: List[str] = Query(None, alias="tag_inc"),
    tag_exc: List[str] = Query(None, alias="tag_exc"),
    ing_inc: List[str] = Query(None, alias="ing_inc"),
    ing_exc: List[str] = Query(None, alias="ing_exc"),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = 1,
    limit: int = 12
):
    final_query = db.query(models.Recipe).options(joinedload(models.Recipe.source))

    if start_date:
        final_query = final_query.filter(models.Recipe.date >= start_date)
    if end_date:
        final_query = final_query.filter(models.Recipe.date <= end_date)

    if tag_inc:
        for i, tag_name in enumerate(tag_inc):
            alias = f"tag_{i}"
            tag_subquery = db.query(models.RecipeTag.recipe_id).join(models.Tag).filter(models.Tag.tag_name == tag_name).subquery(alias)
            final_query = final_query.join(tag_subquery, models.Recipe.recipe_id == tag_subquery.c.recipe_id)

    if ing_inc:
        for i, ingredient_name in enumerate(ing_inc):
            alias = f"ing_{i}"
            ing_subquery = db.query(models.RecipeIngredient.recipe_id).join(models.Ingredient).filter(models.Ingredient.name == ingredient_name).subquery(alias)
            final_query = final_query.join(ing_subquery, models.Recipe.recipe_id == ing_subquery.c.recipe_id)

    if tag_exc:
        final_query = final_query.filter(~exists().where((models.RecipeTag.recipe_id == models.Recipe.recipe_id) & (models.RecipeTag.tag_id == models.Tag.tag_id) & (models.Tag.tag_name.in_(tag_exc))))

    if ing_exc:
        final_query = final_query.filter(~exists().where((models.RecipeIngredient.recipe_id == models.Recipe.recipe_id) & (models.RecipeIngredient.ingredient_id == models.Ingredient.ingredient_id) & (models.Ingredient.name.in_(ing_exc))))

    if query:
        final_query = final_query.filter(func.lower(models.Recipe.title).contains(func.lower(query)))

    total_count = final_query.count()
    skip = (page - 1) * limit
    recipes = final_query.order_by(models.Recipe.date.desc().nullslast(), models.Recipe.recipe_id.desc()).offset(skip).limit(limit).all()

    recipes_with_data = enrich_recipe_data(recipes, db)
    for recipe in recipes_with_data:
        recipe.tags = [rt.tag.tag_name for rt in recipe.tags_association]
        if recipe.creator is None:
            recipe.creator_username = "Deleted user"
        else:
            recipe.creator_username = recipe.creator.username


    return {"recipes": recipes_with_data, "total_count": total_count}

@router.get("/")
def get_recipes(db: Session = Depends(get_db), skip: int = 0, limit: int = 12):
    query = db.query(models.Recipe).options(joinedload(models.Recipe.source))
    total_count = query.count()
    recipes = query.order_by(models.Recipe.date.desc().nullslast(), models.Recipe.recipe_id.desc()).offset(skip).limit(limit).all()
   
    recipes_with_data = enrich_recipe_data(recipes, db)
    for recipe in recipes_with_data:
        recipe.tags = [rt.tag.tag_name for rt in recipe.tags_association]
        if recipe.creator is None:
            recipe.creator_username = "Deleted user"
        else:
            recipe.creator_username = recipe.creator.username

    return {"recipes": recipes_with_data, "total_count": total_count}

@router.get("/{recipe_id}")
def get_recipe(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(models.Recipe).options(
        joinedload(models.Recipe.source), 
        joinedload(models.Recipe.creator)
    ).filter(models.Recipe.recipe_id == recipe_id).first()
    
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    
    if recipe.creator is None:
        recipe.creator_username = "Deleted user"
    else:
        recipe.creator_username = recipe.creator.username
        
    return recipe

@router.get("/{recipe_id}/ingredients/")
def get_recipe_ingredients(recipe_id: int, db: Session = Depends(get_db)):
    if not db.query(models.Recipe).filter(models.Recipe.recipe_id == recipe_id).first():
        raise HTTPException(status_code=404, detail="Recipe not found")
    ingredients_with_quantity = db.query(models.Ingredient.name, models.RecipeIngredient.quantity).join(models.RecipeIngredient, models.Ingredient.ingredient_id == models.RecipeIngredient.ingredient_id).filter(models.RecipeIngredient.recipe_id == recipe_id).all()
    return [{"name": name, "quantity": quantity} for name, quantity in ingredients_with_quantity]

@router.get("/{recipe_id}/steps/")
def get_recipe_steps(recipe_id: int, db: Session = Depends(get_db)):
    if not db.query(models.Recipe).filter(models.Recipe.recipe_id == recipe_id).first():
        raise HTTPException(status_code=404, detail="Recipe not found")
    return db.query(models.Step).filter(models.Step.recipe_id == recipe_id).order_by(models.Step.step_number).all()

@router.get("/{recipe_id}/tags/")
def get_recipe_tags(recipe_id: int, db: Session = Depends(get_db)):
    if not db.query(models.Recipe).filter(models.Recipe.recipe_id == recipe_id).first():
        raise HTTPException(status_code=404, detail="Recipe not found")
    return db.query(models.Tag).join(models.RecipeTag).filter(models.RecipeTag.recipe_id == recipe_id).all()


@router.post("/{recipe_id}/save", status_code=status.HTTP_200_OK)
def save_recipe_for_user(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    recipe = db.query(models.Recipe).filter(models.Recipe.recipe_id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recipe not found")
    existing_save = db.query(models.UserSavedRecipe).filter(
        models.UserSavedRecipe.user_id == current_user.id,
        models.UserSavedRecipe.recipe_id == recipe_id
    ).first()
    if existing_save:
        return {"message": "Recipe already saved"}
    new_save = models.UserSavedRecipe(user_id=current_user.id, recipe_id=recipe_id)
    db.add(new_save)
    db.commit()
    return {"message": "Recipe saved successfully"}

@router.delete("/{recipe_id}/save", status_code=status.HTTP_204_NO_CONTENT)
def unsave_recipe_for_user(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    saved_recipe_record = db.query(models.UserSavedRecipe).filter(
        models.UserSavedRecipe.user_id == current_user.id,
        models.UserSavedRecipe.recipe_id == recipe_id
    ).first()
    if not saved_recipe_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved recipe record not found")
    db.delete(saved_recipe_record)
    db.commit()
    return None


@router.get("/{recipe_id}/nutrition")
def get_recipe_nutrition(recipe_id: int, db: Session = Depends(get_db)):
    recipe = db.query(models.Recipe).filter(models.Recipe.recipe_id == recipe_id).first()
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    if recipe.calories is not None and recipe.protein is not None and recipe.fat is not None and recipe.carbs is not None:
        return {
            "calories": recipe.calories,
            "protein": recipe.protein,
            "fat": recipe.fat,
            "carbs": recipe.carbs
        }
    ingredients_with_quantity = db.query(models.Ingredient.name, models.RecipeIngredient.quantity)\
        .join(models.RecipeIngredient, models.Ingredient.ingredient_id == models.RecipeIngredient.ingredient_id)\
        .filter(models.RecipeIngredient.recipe_id == recipe_id).all()
    if not ingredients_with_quantity:
        raise HTTPException(status_code=404, detail="No ingredients found for this recipe to calculate nutrition.")
    total_nutrition = {"calories": 0.0, "protein": 0.0, "fat": 0.0, "carbs": 0.0}
    for name, quantity in ingredients_with_quantity:
        ingredient_pair = [name, quantity]
        calories, protein, fat, carbs = nutrition_calculator.calculate_nutrition(ingredient_pair)
        total_nutrition["calories"] += calories
        total_nutrition["protein"] += protein
        total_nutrition["fat"] += fat
        total_nutrition["carbs"] += carbs
    for key in total_nutrition:
        total_nutrition[key] = round(custom_scale(total_nutrition[key]), 2)

    recipe.calories = total_nutrition["calories"]
    recipe.protein = total_nutrition["protein"]
    recipe.fat = total_nutrition["fat"]
    recipe.carbs = total_nutrition["carbs"]
    db.commit()
    return total_nutrition

@router.post("/import_recipes/")
def import_recipes(
    filename: str = Query("vaobep.json", description="Name of the JSON file (in the Data/ directory) to import"),
    delete_existing: bool = Query(False, description="Delete existing data before importing"),
    db: Session = Depends(get_db)
):
    tables = ["reviews", "recipe_tags", "steps", "recipe_ingredients", "meal_plan_recipes", "ingredients", "tags", "recipes", "sources"]
    serial_table = {"reviews": "id", "recipes": "recipe_id", "ingredients": "ingredient_id", "tags": "tag_id", "sources": "source_id"}

    if delete_existing:
        for table in tables:
            result = db.execute(text(f"SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = '{table}')")).scalar()
            if result:
                db.execute(text(f"DELETE FROM {table}"))
                if table in serial_table:
                    db.execute(text(f"ALTER SEQUENCE {table}_{serial_table[table]}_seq RESTART WITH 1"))
        db.commit()

    file_path = f"Data/{filename}"
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            recipes_data = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")

    for recipe in recipes_data:
        source_name = recipe.get("source", "Unknown")
        source = db.query(models.Source).filter(models.Source.source_name == source_name).first()
        if not source:
            source = models.Source(source_name=source_name)
            db.add(source)
            db.commit()
            db.refresh(source)

        new_recipe = models.Recipe(
            title=recipe["title"],
            description=recipe.get("description"),
            num_of_people=recipe.get("num_of_people"),
            date=recipe.get("date"),
            image_url=recipe["image"],
            url=recipe["url"],
            source_id=source.source_id
        )
        db.add(new_recipe)
        db.commit()
        db.refresh(new_recipe)

        added_ingredients = set()
        for ingredient_data in recipe["ingredients"]:
            if not ingredient_data or len(ingredient_data) < 1:
                continue
            ingredient_name = ingredient_data[0]
            if ingredient_name in added_ingredients:
                continue

            added_ingredients.add(ingredient_name)
            quantity = ingredient_data[1] if len(ingredient_data) > 1 else None
            ingredient = db.query(models.Ingredient).filter(models.Ingredient.name == ingredient_name).first()
            if not ingredient:
                ingredient = models.Ingredient(name=ingredient_name)
                db.add(ingredient)
                db.commit()
                db.refresh(ingredient)

            existing_recipe_ing = db.query(models.RecipeIngredient).filter(
                models.RecipeIngredient.recipe_id == new_recipe.recipe_id,
                models.RecipeIngredient.ingredient_id == ingredient.ingredient_id
            ).first()
            if not existing_recipe_ing:
                recipe_ing = models.RecipeIngredient(
                    recipe_id=new_recipe.recipe_id,
                    ingredient_id=ingredient.ingredient_id,
                    quantity=quantity
                )
                db.add(recipe_ing)
            else:
                print(f"Ingredient {ingredient_name} already exists in recipe {new_recipe.title}")

        steps = recipe.get("step-detail", "").split("\n")
        for i, step_detail in enumerate(steps, start=1):
            if step_detail.strip():
                step = models.Step(
                    recipe_id=new_recipe.recipe_id,
                    step_number=i,
                    step_detail=step_detail.strip()
                )
                db.add(step)

        existing_recipe_tags = set(
            (rt.recipe_id, rt.tag_id)
            for rt in db.query(models.RecipeTag).filter(models.RecipeTag.recipe_id == new_recipe.recipe_id).all()
        )

        tags = recipe.get("tags", []) or []
        for tag_name in tags:
            tag = db.query(models.Tag).filter(models.Tag.tag_name == tag_name).first()
            if not tag:
                tag = models.Tag(tag_name=tag_name)
                db.add(tag)
                db.commit()
                db.refresh(tag)

            pair = (new_recipe.recipe_id, tag.tag_id)
            if pair not in existing_recipe_tags:
                recipe_tag = models.RecipeTag(
                    recipe_id=new_recipe.recipe_id,
                    tag_id=tag.tag_id
                )
                db.add(recipe_tag)
                existing_recipe_tags.add(pair)

        db.commit()

    return {"message": "Recipes imported successfully"}
