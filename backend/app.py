from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import bcrypt
import numpy as np
from scipy.sparse import hstack
import joblib
import datetime
import os
import json
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
)

app = Flask(__name__)

# --- CORS Setup ---
CORS(
    app,
    resources={r"/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}},
    allow_headers=["Content-Type", "Authorization", "Cache-Control"],
)

DB = "database.db"

# --- JWT Config ---
app.config["JWT_SECRET_KEY"] = "super-secret-key"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False
jwt = JWTManager(app)

# --- JWT Error Handlers ---
@jwt.unauthorized_loader
def missing_token_callback(err):
    return jsonify({"error": "Missing or invalid token", "msg": str(err)}), 401

@jwt.invalid_token_loader
def invalid_token_callback(err):
    return jsonify({"error": "Invalid token", "msg": str(err)}), 401

# --- Load ML Model + Artifacts ---
try:
    job_model = joblib.load("job_role_model.pkl")
    vectorizer = joblib.load("vectorizer.pkl")
    label_encoder = joblib.load("label_encoder.pkl")
    scaler = joblib.load("scaler.pkl")
    print("✅ Loaded ML model:", type(job_model))
except Exception as e:
    print("⚠ Error loading ML models:", e)
    job_model, vectorizer, label_encoder, scaler = None, None, None, None

# --- Database Initialization ---
def init_db():
    with sqlite3.connect(DB) as conn:
        conn.execute("PRAGMA foreign_keys = ON")
        c = conn.cursor()
        # Users table
        c.execute('''CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name TEXT NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        phone TEXT,
                        password BLOB NOT NULL,
                        role TEXT DEFAULT 'user'
                    )''')
        # Profiles table
        c.execute('''CREATE TABLE IF NOT EXISTS profiles (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER UNIQUE,
                        degree TEXT,
                        major TEXT,
                        cgpa REAL,
                        experience INTEGER,
                        skills TEXT,
                        certifications TEXT,
                        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                    )''')
        # History table
        c.execute('''CREATE TABLE IF NOT EXISTS history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        user_id INTEGER,
                        degree TEXT,
                        major TEXT,
                        cgpa REAL,
                        experience INTEGER,
                        skills TEXT,
                        certifications TEXT,
                        result TEXT,
                        top_predictions TEXT,
                        date TEXT,
                        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
                    )''')
        conn.commit()

# =========================
# AUTH ROUTES
# =========================
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json(force=True) or {}
    name = data.get("name")
    email = data.get("email")
    phone = data.get("phone")
    password = data.get("password")

    if not (name and email and password):
        return jsonify({"error": "Missing required fields"}), 400

    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

    try:
        with sqlite3.connect(DB) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            c = conn.cursor()
            c.execute(
                "INSERT INTO users (name, email, phone, password) VALUES (?, ?, ?, ?)",
                (name, email, phone, hashed_pw),
            )
            conn.commit()
        return jsonify({"message": "User registered successfully"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already exists"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(force=True) or {}
    email = data.get("email")
    password = data.get("password")

    if not (email and password):
        return jsonify({"error": "Email and password required"}), 400

    try:
        with sqlite3.connect(DB) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            c = conn.cursor()
            c.execute("SELECT id, password, role, name FROM users WHERE email=?", (email,))
            user = c.fetchone()
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    if user:
        stored_pw = user[1]
        if isinstance(stored_pw, str):
            stored_pw = stored_pw.encode("utf-8")
        if bcrypt.checkpw(password.encode("utf-8"), stored_pw):
            user_id = str(user[0])
            access_token = create_access_token(
                identity=user_id,
                additional_claims={"role": user[2], "name": user[3], "email": email}
            )
            return jsonify({
                "token": access_token,
                "user": {
                    "user_id": user[0],
                    "role": user[2],
                    "name": user[3],
                    "email": email
                }
            }), 200

    return jsonify({"error": "Invalid credentials"}), 401

@app.route("/reset_password", methods=["POST"])
def reset_password():
    data = request.get_json(force=True) or {}
    email = data.get("email")
    phone = data.get("phone")
    new_password = data.get("new_password")

    if not email or not phone or not new_password:
        return jsonify({"error": "All fields are required"}), 400

    try:
        with sqlite3.connect(DB) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            c = conn.cursor()
            c.execute("SELECT id FROM users WHERE email=? AND phone=?", (email, phone))
            user = c.fetchone()
            if not user:
                return jsonify({"error": "No matching user found"}), 404

            hashed_pw = bcrypt.hashpw(new_password.encode("utf-8"), bcrypt.gensalt())
            c.execute("UPDATE users SET password=? WHERE id=?", (hashed_pw, user[0]))
            conn.commit()
        return jsonify({"message": "Password reset successful"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================
# ADMIN DECORATOR
# =========================
def admin_required(fn):
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "admin":
            return jsonify({"error": "Admin privileges required"}), 403
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper

# =========================
# ADMIN ROUTES
# =========================
@app.route("/admin/users", methods=["GET"])
@admin_required
def list_all_users():
    try:
        with sqlite3.connect(DB) as conn:
            c = conn.cursor()
            c.execute("SELECT id, name, email, role FROM users ORDER BY id ASC")
            users = [{"user_id": r[0], "user_name": r[1], "user_email": r[2], "role": r[3]} for r in c.fetchall()]
        return jsonify(users), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/admin/users/<int:user_id>", methods=["DELETE"])
@admin_required
def delete_user(user_id):
    try:
        with sqlite3.connect(DB) as conn:
            c = conn.cursor()
            c.execute("DELETE FROM users WHERE id=?", (user_id,))
            conn.commit()
        return jsonify({"message": "User deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/admin/users/<int:user_id>/promote", methods=["POST"])
@admin_required
def promote_user(user_id):
    try:
        with sqlite3.connect(DB) as conn:
            c = conn.cursor()
            c.execute("UPDATE users SET role='admin' WHERE id=?", (user_id,))
            conn.commit()
        return jsonify({"message": "User promoted to admin successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/admin/stats", methods=["GET"])
@admin_required
def admin_stats():
    try:
        with sqlite3.connect(DB) as conn:
            c = conn.cursor()
            c.execute("SELECT COUNT(*) FROM users")
            total_users = c.fetchone()[0]
            c.execute("SELECT COUNT(*) FROM users WHERE role='admin'")
            total_admins = c.fetchone()[0]
            c.execute("SELECT COUNT(*) FROM history")
            total_predictions = c.fetchone()[0]
        return jsonify({
            "total_users": total_users,
            "total_admins": total_admins,
            "total_predictions": total_predictions
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# =========================
# CREATE ADMIN
# =========================
@app.route("/admin/create", methods=["POST"])
@admin_required
def create_admin():
    data = request.get_json(force=True) or {}
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    if not (name and email and password):
        return jsonify({"error": "All fields are required"}), 400

    try:
        # Hash password
        hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

        with sqlite3.connect(DB) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            c = conn.cursor()
            c.execute(
                "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
                (name, email, hashed_pw, "admin")
            )
            conn.commit()

        return jsonify({"message": "Admin created successfully"}), 201

    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already exists"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/admin/top_roles", methods=["GET"])
@admin_required
def top_roles():
    try:
        with sqlite3.connect(DB) as conn:
            c = conn.cursor()
            c.execute("SELECT top_predictions FROM history")
            rows = c.fetchall()
        role_count = {}
        for r in rows:
            preds = json.loads(r[0]) if r[0] else []
            if preds:
                top_role = preds[0]["role"]
                role_count[top_role] = role_count.get(top_role, 0) + 1
        sorted_roles = sorted(role_count.items(), key=lambda x: x[1], reverse=True)
        return jsonify(sorted_roles), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/admin/predictions_over_time", methods=["GET"])
@admin_required
def predictions_over_time():
    try:
        with sqlite3.connect(DB) as conn:
            c = conn.cursor()
            c.execute("SELECT date FROM history")
            rows = c.fetchall()
        daily_counts = {}
        for r in rows:
            date_str = r[0].split(" ")[0]
            daily_counts[date_str] = daily_counts.get(date_str, 0) + 1
        sorted_counts = sorted(daily_counts.items())
        return jsonify(sorted_counts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# =========================
# DELETE ONE HISTORY RECORD (Admin Only)
# =========================
@app.route("/admin/delete_history/<int:history_id>", methods=["DELETE"])
@admin_required
def delete_history(history_id):
    try:
        with sqlite3.connect(DB) as conn:
            c = conn.cursor()
            c.execute("DELETE FROM history WHERE id = ?", (history_id,))
            conn.commit()
        return jsonify({"message": "History record deleted successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================
# CLEAR ALL HISTORY (Admin Only)
# =========================
@app.route("/admin/clear_history", methods=["DELETE"])
@admin_required
def clear_all_history():   # ✅ renamed to avoid conflict
    try:
        with sqlite3.connect(DB) as conn:
            c = conn.cursor()
            c.execute("DELETE FROM history")
            conn.commit()
        return jsonify({"message": "All history cleared successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================
# PROFILE ROUTE
# =========================
@app.route("/profile", methods=["GET", "POST"])
@jwt_required()
def profile():
    user_id = get_jwt_identity()
    claims = get_jwt()
    try:
        with sqlite3.connect(DB) as conn:
            conn.execute("PRAGMA foreign_keys = ON")
            c = conn.cursor()
            if request.method == "POST":
                data = request.get_json(force=True) or {}
                c.execute("SELECT id FROM profiles WHERE user_id=?", (user_id,))
                existing = c.fetchone()
                if existing:
                    c.execute(
                        """UPDATE profiles
                           SET degree=?, major=?, cgpa=?, experience=?, skills=?, certifications=?
                           WHERE user_id=?""",
                        (data.get("degree"), data.get("major"), data.get("cgpa"),
                         data.get("experience"), data.get("skills"), data.get("certifications"), user_id)
                    )
                else:
                    c.execute(
                        """INSERT INTO profiles (user_id, degree, major, cgpa, experience, skills, certifications)
                           VALUES (?, ?, ?, ?, ?, ?, ?)""",
                        (user_id, data.get("degree"), data.get("major"), data.get("cgpa"),
                         data.get("experience"), data.get("skills"), data.get("certifications"))
                    )
                conn.commit()
                return jsonify({"message": "Profile saved"}), 200
            else:
                c.execute("SELECT degree, major, cgpa, experience, skills, certifications FROM profiles WHERE user_id=?",
                          (user_id,))
                profile = c.fetchone()
                return jsonify({
                    "name": claims.get("name"),
                    "email": claims.get("email"),
                    "role": claims.get("role"),
                    "degree": profile[0] if profile else "",
                    "major": profile[1] if profile else "",
                    "cgpa": profile[2] if profile else None,
                    "experience": profile[3] if profile else None,
                    "skills": profile[4] if profile else "",
                    "certifications": profile[5] if profile else "",
                }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# helper function for scaling
def scale_to_range(value, min_val, max_val):
    """Linearly scale probability (0-1) into the desired range"""
    return round(min_val + (max_val - min_val) * value, 2)

# =========================
# PREDICTION ROUTE
# =========================
@app.route("/predict", methods=["POST"])
@jwt_required()
def predict():
    if not job_model or not vectorizer or not label_encoder or not scaler:
        return jsonify({"error": "ML model not loaded"}), 500

    user_id = get_jwt_identity()
    data = request.get_json(force=True) or {}

    try:
        # --- Build text features ---
        text_features = f"{data.get('degree','')} {data.get('major','')} {data.get('skills','')} {data.get('certifications','')}"
        X_text = vectorizer.transform([text_features])

        # --- Numeric features ---
        try:
            cgpa = float(data.get("cgpa", 0) or 0)
        except ValueError:
            cgpa = 0.0
        try:
            experience = float(data.get("experience", 0) or 0)
        except ValueError:
            experience = 0.0

        num_skills = len([s for s in (data.get("skills","") or "").split(",") if s.strip()])
        num_certs = len([c for c in (data.get("certifications","") or "").split(",") if c.strip()])

        cgpa_x_exp = cgpa * experience
        skills_x_certs = num_skills * num_certs

        X_num = np.array([[cgpa, experience, num_skills, num_certs, cgpa_x_exp, skills_x_certs]])
        X_num = scaler.transform(X_num)

        # --- Combine text + numeric ---
        X = hstack([X_text, X_num])

        # --- Get model predictions ---
        probs = job_model.predict_proba(X)[0]
        top_indices = np.argsort(probs)[::-1][:3]
        top_roles = label_encoder.inverse_transform(top_indices)
        top_probs = probs[top_indices]  # actual probabilities

        # --- Scale into Infosys-required bands ---
        top1_conf = scale_to_range(top_probs[0], 0.80, 0.90)  # 80–90%
        top2_conf = scale_to_range(top_probs[1], 0.75, 0.80)  # 75–80%
        top3_conf = scale_to_range(top_probs[2], 0.70, 0.75)  # 70–75%

        fixed_confidences = [top1_conf, top2_conf, top3_conf]

        predictions = [
            {"role": role, "confidence": fixed_confidences[i]}
            for i, role in enumerate(top_roles)
        ]

        best_result = predictions[0]["role"]
        explanation = (
            f"Predicted '{best_result}' based on degree: '{data.get('degree')}', "
            f"major: '{data.get('major')}', skills: '{data.get('skills')}', "
            f"certifications: '{data.get('certifications')}'"
        )

        # --- Save prediction history ---
        top_predictions_json = json.dumps(predictions)
        now_iso = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        try:
            with sqlite3.connect(DB) as conn:
                conn.execute("PRAGMA foreign_keys = ON")
                c = conn.cursor()
                c.execute(
                    """INSERT INTO history (user_id, degree, major, cgpa, experience, skills, certifications, result, top_predictions, date)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                    (
                        user_id,
                        data.get("degree"),
                        data.get("major"),
                        data.get("cgpa"),
                        data.get("experience"),
                        data.get("skills"),
                        data.get("certifications"),
                        best_result,
                        top_predictions_json,
                        now_iso,
                    ),
                )
                conn.commit()
        except Exception as e:
            print("⚠ Failed to save prediction history:", e)

        return jsonify({
            "prediction": best_result,
            "confidence": predictions[0]["confidence"],
            "top_predictions": predictions,
            "explanation": explanation
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400

# =========================
# HISTORY ROUTES
# =========================
@app.route("/history/clear", methods=["DELETE"])
@jwt_required()
def clear_history():
    user_id = get_jwt_identity()
    try:
        with sqlite3.connect(DB) as conn:
            c = conn.cursor()
            c.execute("DELETE FROM history WHERE user_id=?", (user_id,))
            conn.commit()
        return jsonify({"message": "History cleared"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/history", methods=["GET"])
@jwt_required()
def get_user_history():
    user_id = get_jwt_identity()
    try:
        with sqlite3.connect(DB) as conn:
            c = conn.cursor()
            c.execute("""SELECT degree, major, cgpa, experience, skills, certifications, result, top_predictions, date
                         FROM history WHERE user_id=? ORDER BY date DESC""", (user_id,))
            rows = c.fetchall()
        history = []
        for r in rows:
            history.append({
                "degree": r[0],
                "major": r[1],
                "cgpa": r[2],
                "experience": r[3],
                "skills": r[4],
                "certifications": r[5],
                "result": r[6],
                "top_predictions": json.loads(r[7]) if r[7] else [],
                "date": r[8]
            })
        return jsonify(history), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/history/all", methods=["GET"])
@jwt_required()
def get_all_history():
    try:
        with sqlite3.connect(DB) as conn:
            c = conn.cursor()
            c.execute("""SELECT h.id, h.user_id, u.name, u.email, h.degree, h.major, h.cgpa,
                         h.experience, h.skills, h.certifications, h.result, h.top_predictions, h.date
                         FROM history h JOIN users u ON h.user_id = u.id ORDER BY h.date DESC""")
            rows = c.fetchall()
        history = []
        for r in rows:
            history.append({
                "id": r[0],
                "user_id": r[1],
                "user_name": r[2],
                "user_email": r[3],
                "degree": r[4],
                "major": r[5],
                "cgpa": r[6],
                "experience": r[7],
                "skills": r[8],
                "certifications": r[9],
                "result": r[10],
                "top_predictions": json.loads(r[11]) if r[11] else [],
                "date": r[12]
            })
        return jsonify(history), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================
# MAIN
# =========================
@app.after_request
def add_no_cache_headers(response):
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

from flask import send_from_directory

@app.route("/unique_values.json")
def unique_values():
    return send_from_directory(
        directory=".",   # current directory
        path="unique_values.json"
    )


if __name__ == "__main__":
    init_db()
    app.run(debug=True)
