#!/usr/bin/env python
import os
import json
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'OnlineBoardGamers.settings')
django.setup()

from Lobby.models import User

def update_initial_users_password():
    """Extract admin password hash and update all users in initial_users.json"""
    
    try:
        # Get the admin user's hashed password
        admin = User.objects.get(username='admin')
        admin_password_hash = admin.password
        print(f"Admin password hash extracted: {admin_password_hash[:50]}...")
        
        # Read the initial_users.json file
        with open('initial_users.json', 'r', encoding='utf-8') as f:
            users_data = json.load(f)
        
        # Update all users' passwords to match admin's password hash
        for user in users_data:
            user['fields']['password'] = admin_password_hash
        
        # Write the updated data back to the file
        with open('initial_users.json', 'w', encoding='utf-8') as f:
            json.dump(users_data, f, indent=2, ensure_ascii=False)
        
        print(f"Updated {len(users_data)} users with admin password hash")
        return True
        
    except User.DoesNotExist:
        print("Error: Admin user not found!")
        return False
    except Exception as e:
        print(f"Error updating passwords: {e}")
        return False

if __name__ == "__main__":
    update_initial_users_password()
