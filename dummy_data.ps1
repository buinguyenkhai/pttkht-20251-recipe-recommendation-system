docker exec pttkht-20251-recipe-recommendation-system-server-1 python -c "import random
import string
from datetime import datetime, timedelta

from database import SessionLocal
import models
import auth

NUM_USERS = 30
REVIEWS_PER_USER = 30

def generate_valid_password(length=12):
    while True:
        password = ''.join(random.choice(string.ascii_letters + string.digits + string.punctuation) for i in range(length))
        if (any(c.isdigit() for c in password) and
                any(c.isalpha() for c in password) and
                len(password) >= 8):
            return password

def random_date(start, end):
    delta = end - start
    int_delta = (delta.days * 24 * 60 * 60) + delta.seconds
    random_second = random.randrange(int_delta)
    return start + timedelta(seconds=random_second)

def seed_database():
    db = SessionLocal()
    try:
        # --- 1. Fetch existing recipes ---
        print('Fetching existing recipes...')
        recipe_ids = [recipe.recipe_id for recipe in db.query(models.Recipe.recipe_id).all()]
        
        if not recipe_ids:
            return

        print(f'Found {len(recipe_ids)} recipes to use for reviews.')

        print(f'\nCreating {NUM_USERS} new users...')
        start_date = datetime(2024, 1, 1)
        end_date = datetime(2025, 12, 31)
        
        created_users = []
        for i in range(1, NUM_USERS + 1):
            username = f'User{i}'
            
            # Check if user already exists
            existing_user = db.query(models.User).filter(models.User.username == username).first()
            if existing_user:
                continue

            password = generate_valid_password()
            hashed_password = auth.get_password_hash(password)
            user_created_at = random_date(start_date, end_date)
            
            new_user = models.User(
                username=username,
                hashed_password=hashed_password,
                is_admin=False,
                created_at=user_created_at
            )
            created_users.append(new_user)
        
        if created_users:
            db.add_all(created_users)
            db.commit()
            print(f'Successfully created {len(created_users)} users.')
        else:
            print('No new users to create.')

        print(f'\nCreating {REVIEWS_PER_USER} reviews for each of the {NUM_USERS} users...')
        all_users = db.query(models.User).filter(models.User.username.like('User%')).all()
        
        new_reviews = []
        for user in all_users:
            for _ in range(random.randint(1, REVIEWS_PER_USER)):
                review_created_at = random_date(start_date, end_date)
                
                new_review = models.Review(
                    recipe_id=random.choice(recipe_ids),
                    user_id=user.id,
                    rating=random.randint(1, 5),
                    text=f'This is a dummy review from {user.username}.',
                    created_at=review_created_at
                )
                new_reviews.append(new_review)
        
        if new_reviews:
            db.add_all(new_reviews)
            db.commit()
            print(f'Successfully created {len(new_reviews)} reviews.')
        
        print('\nDatabase seeding complete!')

    finally:
        db.close()

if __name__ == '__main__':
    seed_database()"