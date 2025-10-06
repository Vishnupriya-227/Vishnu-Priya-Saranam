import sqlite3
import bcrypt

# ---------------- Config ----------------
DB_PATH = "database.db"  # Your SQLite database file

# Admin details
admin_name = "Saranam Vishnu Priya"
admin_email = "vishnupriya@gmail.com"
admin_password = "Vishnu@123"
admin_role = "admin"

# ---------------- Main ----------------
try:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Check if users table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users';")
    if not cursor.fetchone():
        print("Error: 'users' table does not exist in database.")
        exit()

    # Check if user with same email exists
    cursor.execute("SELECT * FROM users WHERE email = ?", (admin_email,))
    existing_user = cursor.fetchone()
    if existing_user:
        print(f"User with email {admin_email} already exists.")
    else:
        # Hash password using bcrypt
        hashed_pw = bcrypt.hashpw(admin_password.encode("utf-8"), bcrypt.gensalt())

        # Insert admin user (store password as BLOB)
        cursor.execute("""
            INSERT INTO users (name, email, password, role)
            VALUES (?, ?, ?, ?)
        """, (admin_name, admin_email, sqlite3.Binary(hashed_pw), admin_role))

        conn.commit()
        print(f"✅ Admin user '{admin_name}' created successfully!")

except sqlite3.Error as e:
    print("SQLite error:", e)
finally:
    if conn:
        conn.close()
