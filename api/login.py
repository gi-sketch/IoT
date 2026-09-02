from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash
from .database import get_mysql_connection
from api.database import get_mysql_connection


login_api = Blueprint("login_api", __name__)


@login_api.route("/api/login", methods=["POST"])
def login():

    # Accept JSON from fetch()
    data = request.get_json(silent=True)

    # Also accept normal HTML form submission
    if not data:
        data = request.form.to_dict()

    if not data:
        return jsonify({
            "success": False,
            "message": "No login data received"
        }), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")


    if not email or not password:

        return jsonify({
            "success": False,
            "message": "Email and password are required"
        }), 400


    connection = None
    cursor = None


    try:

        connection = get_mysql_connection()

        cursor = connection.cursor(
            dictionary=True
        )


        cursor.execute(
            """
            SELECT
                user_id,
                full_name,
                email,
                password_hash,
                role,
                institution,
                department,
                is_active
            FROM users
            WHERE email = %s
            """,
            (email,)
        )


        user = cursor.fetchone()


        if not user:

            return jsonify({
                "success": False,
                "message": "Account not found"
            }), 404


        if not user["is_active"]:

            return jsonify({
                "success": False,
                "message": "Account has been disabled"
            }), 403


        if not check_password_hash(
            user["password_hash"],
            password
        ):

            return jsonify({
                "success": False,
                "message": "Incorrect password"
            }), 401


        # Update last login

        update_cursor = connection.cursor()


        update_cursor.execute(
            """
            UPDATE users
            SET last_login = NOW()
            WHERE user_id = %s
            """,
            (user["user_id"],)
        )


        connection.commit()

        update_cursor.close()


        return jsonify({
            "success": True,
            "message": "Login successful",

            "user": {
                "id": user["user_id"],
                "name": user["full_name"],
                "email": user["email"],
                "role": user["role"],
                "institution": user["institution"],
                "department": user["department"]
            }
        })


    except Exception as error:

        print("LOGIN ERROR:", error)


        return jsonify({
            "success": False,
            "message": str(error)
        }), 500


    finally:

        if cursor:
            cursor.close()


        if connection:
            connection.close()