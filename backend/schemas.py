from pydantic import BaseModel, field_validator, Field
import re
from typing import Optional, List
from datetime import datetime
from typing import Literal

class UserCreate(BaseModel):
    username: str
    password: str

    @field_validator('password')
    def password_complexity(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[a-zA-Z]', v):
            raise ValueError('Password must contain at least one letter')
        return v

class User(BaseModel):
    id: int
    username: str
    created_at: datetime
    is_admin: bool

    class Config:
        from_attributes = True

class UserAdminView(User):
    created_recipes_count: int
    reviews_count: int
    average_rating: Optional[float] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class Tag(BaseModel):
    tag_id: int
    tag_name: str

    class Config:
        from_attributes = True

class TagWithCount(Tag):
    recipe_count: int

class Ingredient(BaseModel):
    ingredient_id: int
    name: str

    class Config:
        from_attributes = True

class IngredientWithCount(Ingredient):
    recipe_count: int

class Review(BaseModel):
    id: int
    recipe_id: int
    user_id: Optional[int]
    rating: Optional[int] = None
    text: Optional[str] = None
    created_at: datetime
    user: Optional[User]

    class Config:
        from_attributes = True

class ReviewCreate(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    text: Optional[str] = None

class IngredientCreate(BaseModel):
    name: str
    quantity: str
    unit: Optional[str] = ""

class RecipeCreate(BaseModel):
    title: str = Field(..., max_length=100)
    description: str = Field(..., max_length=500)
    servings: str
    steps: List[str]
    tags: List[str]
    ingredients: List[IngredientCreate]
    image_url: Optional[str] = None

class RecipeUpdate(RecipeCreate):
    pass

class RecipeResponse(BaseModel):
    recipe_id: int
    title: str
    description: Optional[str] = None
    image_url: Optional[str] = None 
    calories: Optional[float] = None
    protein: Optional[float] = None
    fat: Optional[float] = None
    carbs: Optional[float] = None
    date: Optional[datetime] = None
    creator_username: Optional[str] = None
    tags: Optional[List[str]] = []

    class Config:
        from_attributes = True

class RecipeDetailResponse(RecipeResponse):
    description: Optional[str] = None
    image_url: Optional[str] = None
    date: Optional[datetime] = None
    is_saved: bool = False
    calories: Optional[float] = None
    protein: Optional[float] = None
    fat: Optional[float] = None
    carbs: Optional[float] = None

    class Config:
        from_attributes = True

class UserProfile(BaseModel):
    gender: Literal['Male', 'Female']
    weight: float = Field(..., gt=0, description="Weight in kg")
    frequency_of_exercise: Literal['Sedentary', 'Low', 'Moderate', 'Heavy']

class MealPlanNutrition(BaseModel):
    total_calories: float
    total_protein: float
    total_fat: float
    total_carbs: float

class SavedMealPlanCreate(BaseModel):
    """Schema for creating a new saved meal plan."""
    name: str = Field(..., min_length=3, max_length=100)
    recipe_ids: List[int]
    nutrition: MealPlanNutrition

class SavedMealPlanInfoResponse(BaseModel):
    """A lightweight schema for listing plans in a dropdown."""
    id: int
    name: str

    class Config:
        from_attributes = True

class SavedMealPlanResponse(SavedMealPlanInfoResponse):
    """The full schema for a saved meal plan, including its recipes."""
    created_at: datetime
    total_calories: Optional[float] = None
    total_protein: Optional[float] = None
    total_fat: Optional[float] = None
    total_carbs: Optional[float] = None
    recipes: List[RecipeResponse]

    class Config:
        from_attributes = True

class SavedMealPlanUpdateName(BaseModel):
    """Schema for updating the name of a saved meal plan."""
    name: str = Field(..., min_length=3, max_length=100)
