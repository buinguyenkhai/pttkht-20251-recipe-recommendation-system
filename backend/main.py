from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from database import Base, engine
from routers import authentication, recipes, reviews, ingredients, tags, admin, users, meal_plan, custom_meal_plan, saved_meal_plan

Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost",
]
# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all the routers
app.include_router(authentication.router)
app.include_router(recipes.router)
app.include_router(reviews.router)
app.include_router(ingredients.router)
app.include_router(tags.router)
app.include_router(admin.router)
app.include_router(users.router)
app.include_router(meal_plan.router)
app.include_router(custom_meal_plan.router)
app.include_router(saved_meal_plan.router)

@app.get("/health")
def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)