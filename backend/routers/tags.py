from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List

import models
import schemas
from database import get_db

router = APIRouter(
    prefix="/tags",
    tags=["tags"]
)

@router.get("/", response_model=List[schemas.TagWithCount])
def get_tags(db: Session = Depends(get_db)):
    """Retrieve a list of all tags with their recipe counts, sorted alphabetically."""
    tags_with_count = db.query(
        models.Tag,
        func.count(models.RecipeTag.recipe_id).label("recipe_count")
    ).outerjoin(models.RecipeTag, models.Tag.tag_id == models.RecipeTag.tag_id)\
    .group_by(models.Tag.tag_id)\
    .order_by(models.Tag.tag_name)\
    .all()

    return [{"tag_id": tag.tag_id, "tag_name": tag.tag_name, "recipe_count": count} for tag, count in tags_with_count]

@router.get("/{tag_id}/")
def get_tag(tag_id: int, db: Session = Depends(get_db)):
    """Retrieve a specific tag by its ID."""
    tag = db.query(models.Tag).filter(models.Tag.tag_id == tag_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")
    return tag