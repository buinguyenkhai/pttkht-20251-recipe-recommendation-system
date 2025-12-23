from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Text, Float, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship, Mapped
from database import Base
from typing import List

class SavedMealPlan(Base):
    __tablename__ = "saved_meal_plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    total_calories = Column(Float, nullable=True)
    total_protein = Column(Float, nullable=True)
    total_fat = Column(Float, nullable=True)
    total_carbs = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="saved_meal_plans")
    recipes_association = relationship("SavedMealPlanRecipe", back_populates="plan", cascade="all, delete-orphan")

class SavedMealPlanRecipe(Base):
    __tablename__ = "saved_meal_plan_recipes"

    plan_id = Column(Integer, ForeignKey("saved_meal_plans.id", ondelete="CASCADE"), primary_key=True)
    recipe_id = Column(Integer, ForeignKey("recipes.recipe_id", ondelete="CASCADE"), primary_key=True)

    plan = relationship("SavedMealPlan", back_populates="recipes_association")
    recipe = relationship("Recipe", back_populates="saved_in_plans_association")


class Recipe(Base):
    __tablename__ = "recipes"

    recipe_id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)
    num_of_people = Column(String)
    image_url = Column(String)
    url = Column(String)
    date = Column(DateTime, nullable=True)
    source_id = Column(Integer, ForeignKey("sources.source_id"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    
    # Nutritional information
    calories = Column(Float, nullable=True)
    protein = Column(Float, nullable=True)
    fat = Column(Float, nullable=True)
    carbs = Column(Float, nullable=True)

    reviews: Mapped[List["Review"]] = relationship(back_populates="recipe", cascade="all, delete-orphan")
    ingredients_association = relationship("RecipeIngredient", back_populates="recipe", cascade="all, delete-orphan")
    steps = relationship("Step", back_populates="recipe", cascade="all, delete-orphan")
    tags_association = relationship("RecipeTag", back_populates="recipe", cascade="all, delete-orphan")
    source = relationship("Source", back_populates="recipes")
    
    saved_by_users_association = relationship("UserSavedRecipe", back_populates="recipe", cascade="all, delete-orphan")
    creator = relationship("User", back_populates="created_recipes")
    meal_plans = relationship("MealPlanRecipe", back_populates="recipe")
    
    custom_meal_plans = relationship("CustomMealPlan", back_populates="recipe", cascade="all, delete-orphan")
    saved_in_plans_association = relationship("SavedMealPlanRecipe", back_populates="recipe", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviews = relationship("Review", back_populates="user")

    saved_recipes_association = relationship("UserSavedRecipe", back_populates="user", cascade="all, delete-orphan")
    created_recipes = relationship("Recipe", back_populates="creator")
    
    custom_meal_plan = relationship("CustomMealPlan", back_populates="user", cascade="all, delete-orphan")
    saved_meal_plans = relationship("SavedMealPlan", back_populates="user", cascade="all, delete-orphan")
class UserSavedRecipe(Base):
    __tablename__ = "user_saved_recipes"
    user_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    recipe_id = Column(Integer, ForeignKey("recipes.recipe_id"), primary_key=True)
    saved_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="saved_recipes_association")
    recipe = relationship("Recipe", back_populates="saved_by_users_association")

class Source(Base):
    __tablename__ = "sources"

    source_id = Column(Integer, primary_key=True, index=True)
    source_name = Column(String, unique=True, nullable=False)
    recipes = relationship("Recipe", back_populates="source")

class Ingredient(Base):
    __tablename__ = "ingredients"

    ingredient_id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    recipes_association = relationship("RecipeIngredient", back_populates="ingredient", overlaps="recipes")
    
    recipes: Mapped[List["RecipeIngredient"]] = relationship(back_populates="ingredient", cascade="all, delete-orphan")

class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"

    recipe_id = Column(Integer, ForeignKey("recipes.recipe_id"), primary_key=True)
    ingredient_id = Column(Integer, ForeignKey("ingredients.ingredient_id"), primary_key=True)
    quantity = Column(String)
    recipe = relationship("Recipe", back_populates="ingredients_association")
    ingredient = relationship("Ingredient", back_populates="recipes_association")

class Step(Base):
    __tablename__ = "steps"

    recipe_id = Column(Integer, ForeignKey("recipes.recipe_id"), primary_key=True)
    step_number = Column(Integer, primary_key=True)
    step_detail = Column(String, nullable=False)
    recipe = relationship("Recipe", back_populates="steps")

class Tag(Base):
    __tablename__ = "tags"
    tag_id = Column(Integer, primary_key=True, index=True)
    tag_name = Column(String, unique=True)
    recipes_association = relationship("RecipeTag", back_populates="tag")

class RecipeTag(Base):
    __tablename__ = "recipe_tags"
    recipe_id = Column(Integer, ForeignKey("recipes.recipe_id"), primary_key=True)
    tag_id = Column(Integer, ForeignKey("tags.tag_id"), primary_key=True)
    recipe = relationship("Recipe", back_populates="tags_association")
    tag = relationship("Tag", back_populates="recipes_association")

class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.recipe_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    rating = Column(Integer)
    text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    recipe = relationship("Recipe", back_populates="reviews")
    user = relationship("User", back_populates="reviews")

class MealPlan(Base):
    __tablename__ = "meal_plans"

    meal_plan_id = Column(Integer, primary_key=True, index=True)
    meal_name = Column(String, nullable=False)
    num_people = Column(Integer, nullable=False)

    recipes = relationship("MealPlanRecipe", back_populates="meal_plan", cascade="all, delete-orphan")

    __table_args__ = (UniqueConstraint('meal_name', 'num_people', name='_meal_name_num_people_uc'),)


class MealPlanRecipe(Base):
    __tablename__ = "meal_plan_recipes"

    meal_plan_id = Column(Integer, ForeignKey("meal_plans.meal_plan_id"), primary_key=True)
    recipe_id = Column(Integer, ForeignKey("recipes.recipe_id"), primary_key=True)

    meal_plan = relationship("MealPlan", back_populates="recipes")
    recipe = relationship("Recipe", back_populates="meal_plans")

class CustomMealPlan(Base):
    __tablename__ = 'custom_meal_plan'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete="CASCADE"), nullable=False)
    recipe_id = Column(Integer, ForeignKey('recipes.recipe_id', ondelete="CASCADE"), nullable=False)
    user = relationship("User", back_populates="custom_meal_plan")
    recipe = relationship("Recipe", back_populates="custom_meal_plans")

