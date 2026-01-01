docker exec pttkht-20251-recipe-recommendation-system-server-1 python -c "from database import engine, Base, SessionLocal; import models, auth; print('Creating tables...'); Base.metadata.create_all(bind=engine); print('Tables created.'); db = SessionLocal(); admin_user = db.query(models.User).filter(models.User.username == 'admin').first(); print('Checking for admin user...');
if not admin_user:
    print('Creating default admin user...');
    hashed_password = auth.get_password_hash('Abcd@1234');
    db.add(models.User(username='admin', hashed_password=hashed_password, is_admin=True));
    db.commit();
    print('Admin user created.');
else:
    print('Admin user already exists.');
db.close(); print('Setup complete.')"

curl.exe -X POST "http://localhost:8000/recipes/import_recipes/?filename=vaobep.json&delete_existing=true"
curl.exe -X POST "http://localhost:8000/recipes/import_recipes/?filename=sotaynauan.json&delete_existing=false"
curl.exe -X POST "http://localhost:8000/recipes/import_recipes/?filename=monngonmoingay.json&delete_existing=false"
curl.exe -X POST "http://localhost:8000/import_meal_plans/?filename=thuc_don_chi_tiet.json&delete_existing=true"