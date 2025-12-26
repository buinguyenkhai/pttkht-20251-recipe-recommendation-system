from database import engine, Base, SessionLocal
import models
import auth

def setup_database():
    print("Connecting to the database...")
    print("Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully!")
    db = SessionLocal()
    try:
        print("Checking for default admin user...")
        admin_user = db.query(models.User).filter(models.User.username == "admin").first()

        if not admin_user:
            print("Default admin user not found. Creating one...")
            hashed_password = auth.get_password_hash("Abcd@1234")
            
            new_admin = models.User(
                username="admin",
                hashed_password=hashed_password,
                is_admin=True
            )
            
            db.add(new_admin)
            db.commit()
            print("Default admin user 'admin' created successfully.")
        else:
            print("Default admin user 'admin' already exists.")
            
    finally:
        db.close()

if __name__ == "__main__":
    setup_database()