from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
import mysql.connector

from .database import get_mysql_connection


# ==========================================
# BLUEPRINT
# ==========================================

signup_api = Blueprint(
    "signup_api",
    __name__
)


# ==========================================
# SIGNUP API
# ==========================================

@signup_api.route("/api/signup", methods=["POST"])
def signup():

    print("\n========== SIGNUP REQUEST ==========")


    # ==========================================
    # GET JSON DATA
    # ==========================================

    data = request.get_json(silent=True)

    print("Received data:", data)


    if not data:

        return jsonify({
            "success": False,
            "message": "No data received"
        }), 400


    # ==========================================
    # GET FORM DATA
    # ==========================================

    full_name = data.get(
        "full_name",
        ""
    ).strip()


    email = data.get(
        "email",
        ""
    ).strip().lower()


    password = data.get(
        "password",
        ""
    )


    role = data.get(
        "role",
        ""
    ).strip().lower()


    # ==========================================
    # VALIDATION
    # ==========================================

    if not full_name:

        return jsonify({
            "success": False,
            "message": "Full name is required"
        }), 400


    if not email:

        return jsonify({
            "success": False,
            "message": "Email is required"
        }), 400


    if not password:

        return jsonify({
            "success": False,
            "message": "Password is required"
        }), 400


    if not role:

        return jsonify({
            "success": False,
            "message": "Role is required"
        }), 400


    # ==========================================
    # ALLOWED ROLES
    # ==========================================

    allowed_roles = [

        "student",

        "faculty",

        "researcher"

    ]


    if role not in allowed_roles:

        return jsonify({
            "success": False,
            "message": "Invalid role selected"
        }), 400


    # ==========================================
    # PASSWORD VALIDATION
    # ==========================================

    if len(password) < 8:

        return jsonify({
            "success": False,
            "message": "Password must contain at least 8 characters"
        }), 400


    # ==========================================
    # HASH PASSWORD
    # ==========================================

    password_hash = generate_password_hash(
        password
    )


    connection = None

    cursor = None


    try:

        print("Connecting to MySQL...")


        # ==========================================
        # CONNECT TO MYSQL
        # ==========================================

        connection = get_mysql_connection()

        cursor = connection.cursor()


        # ==========================================
        # CHECK IF EMAIL ALREADY EXISTS
        # ==========================================

        cursor.execute(
            """
            SELECT user_id
            FROM users
            WHERE email = %s
            """,
            (
                email,
            )
        )


        existing_user = cursor.fetchone()


        if existing_user:

            print(
                "Email already exists:",
                email
            )


            return jsonify({
                "success": False,
                "message": "An account with this email already exists"
            }), 409


        # ==========================================
        # CREATE USER
        # ==========================================

        print(
            "Creating user:",
            full_name,
            email,
            role
        )


        cursor.execute(
            """
            INSERT INTO users
            (
                full_name,
                email,
                password_hash,
                role,
                is_active
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                full_name,
                email,
                password_hash,
                role,
                True
            )
        )


        # Get ID of newly created user

        user_id = cursor.lastrowid


        print(
            "User created with ID:",
            user_id
        )


        # ==========================================
        # CREATE ROLE-SPECIFIC RECORD
        # ==========================================


        # ------------------------------------------
        # STUDENT
        # ------------------------------------------

        if role == "student":

            print(
                "Creating student profile..."
            )


            cursor.execute(
                """
                INSERT INTO students
                (
                    user_id
                )
                VALUES
                (
                    %s
                )
                """,
                (
                    user_id,
                )
            )


        # ------------------------------------------
        # FACULTY
        # ------------------------------------------

        elif role == "faculty":

            print(
                "Creating faculty profile..."
            )


            cursor.execute(
                """
                INSERT INTO faculty
                (
                    user_id
                )
                VALUES
                (
                    %s
                )
                """,
                (
                    user_id,
                )
            )


        # ------------------------------------------
        # RESEARCHER
        # ------------------------------------------

        elif role == "researcher":

            print(
                "Creating researcher profile..."
            )


            cursor.execute(
                """
                INSERT INTO researchers
                (
                    user_id
                )
                VALUES
                (
                    %s
                )
                """,
                (
                    user_id,
                )
            )


        # ==========================================
        # COMMIT EVERYTHING
        # ==========================================

        connection.commit()


        print("\n========== ACCOUNT CREATED ==========")

        print(
            "User ID:",
            user_id
        )

        print(
            "Name:",
            full_name
        )

        print(
            "Email:",
            email
        )

        print(
            "Role:",
            role
        )

        print(
            "Role profile created:",
            role
        )

        print("====================================\n")


        # ==========================================
        # SUCCESS RESPONSE
        # ==========================================

        return jsonify({

            "success": True,

            "message":
                "Account created successfully",

            "user": {

                "id":
                    user_id,

                "name":
                    full_name,

                "email":
                    email,

                "role":
                    role

            }

        }), 201


    # ==========================================
    # MYSQL ERROR
    # ==========================================

    except mysql.connector.Error as error:

        print("\n========== MYSQL ERROR ==========")

        print(error)

        print("================================\n")


        if connection:

            connection.rollback()


        return jsonify({

            "success": False,

            "message":
                str(error)

        }), 500


    # ==========================================
    # GENERAL ERROR
    # ==========================================

    except Exception as error:

        print("\n========== SIGNUP ERROR ==========")

        print(error)

        print("=================================\n")


        if connection:

            connection.rollback()


        return jsonify({

            "success": False,

            "message":
                str(error)

        }), 500


    # ==========================================
    # CLOSE DATABASE
    # ==========================================

    finally:

        if cursor:

            cursor.close()


        if connection:

            connection.close()