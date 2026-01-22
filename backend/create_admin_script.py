import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'blueprint_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

def create_super_admin():
    username = 'superadmin'
    email = 'admin@bunnysblueprint.com'
    password = 'AdminPassword123!'

    if not User.objects.filter(username=username).exists():
        User.objects.create_superuser(username, email, password)
        print(f"\n[SUCCESS] Superuser created.")
        print(f"Username: {username}")
        print(f"Password: {password}")
        print(f"Login at: /admin/")
    else:
        print(f"\n[INFO] Superuser '{username}' already exists.")

if __name__ == '__main__':
    create_super_admin()
