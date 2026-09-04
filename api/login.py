from flask import Blueprint, request, jsonify
from werkzeug.security import check_password_hash

from .database import get_mysql_connection


login_api = Blueprint(
    "login_api",
    __name__,
    url_prefix="/api"
)


# =========================================================
# LOGIN
# =========================================================

@login_api.route("/login", methods=["POST"])
def login():

    connection = None
    cursor = None

    try:

        data = request.get_json(silent=True)

        if not data:
            return jsonify({
                "success": False,
                "message": "Invalid request."
            }), 400


        email = str(
            data.get("email", "")
        ).strip().lower()


        password = str(
            data.get("password", "")
        )


        if not email or not password:

            return jsonify({
                "success": False,
                "message": "Email and password are required."
            }), 400


        connection = get_mysql_connection()

        cursor = connection.cursor(
            dictionary=True
        )


        # =================================================
        # CHECK ADMIN FIRST
        # =================================================

        cursor.execute(
            """
            SELECT
                admin_id,
                full_name,
                email,
                password_hash,
                is_active
            FROM admins
            WHERE LOWER(email) = %s
            LIMIT 1
            """,
            (email,)
        )


        admin = cursor.fetchone()


        if admin:

            # ---------------------------------------------
            # ADMIN ACCOUNT EXISTS
            # ---------------------------------------------

            if not admin["is_active"]:

                return jsonify({
                    "success": False,
                    "message": "Administrator account is inactive."
                }), 403


            if not check_password_hash(
                admin["password_hash"],
                password
            ):

                return jsonify({
                    "success": False,
                    "message": "Invalid email or password."
                }), 401


            # ---------------------------------------------
            # UPDATE ADMIN LAST LOGIN
            # ---------------------------------------------

            cursor.execute(
                """
                UPDATE admins
                SET last_login = CURRENT_TIMESTAMP
                WHERE admin_id = %s
                """,
                (admin["admin_id"],)
            )


            # ---------------------------------------------
            # LOG ADMIN LOGIN
            # ---------------------------------------------

            cursor.execute(
                """
                INSERT INTO admin_activity
                (
                    admin_id,
                    action,
                    target_type,
                    target_id,
                    details
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
                    admin["admin_id"],
                    "Administrator login",
                    "admin",
                    admin["admin_id"],
                    "Administrator logged into AirIQ."
                )
            )


            connection.commit()


            return jsonify({

                "success": True,

                "message":
                    "Administrator login successful.",

                "user": {

                    "id":
                        admin["admin_id"],

                    "name":
                        admin["full_name"],

                    "email":
                        admin["email"],

                    "role":
                        "admin",

                    "is_admin":
                        True

                }

            }), 200


        # =================================================
        # NORMAL USER LOGIN
        # =================================================

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
            WHERE LOWER(email) = %s
            LIMIT 1
            """,
            (email,)
        )


        user = cursor.fetchone()


        if not user:

            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401


        if not user["is_active"]:

            return jsonify({
                "success": False,
                "message": "This account has been deactivated."
            }), 403


        if not check_password_hash(
            user["password_hash"],
            password
        ):

            return jsonify({
                "success": False,
                "message": "Invalid email or password."
            }), 401


        # =================================================
        # UPDATE LAST LOGIN
        # =================================================

        cursor.execute(
            """
            UPDATE users
            SET last_login = CURRENT_TIMESTAMP
            WHERE user_id = %s
            """,
            (user["user_id"],)
        )


        connection.commit()


        return jsonify({

            "success": True,

            "message":
                "Login successful.",

            "user": {

                "id":
                    user["user_id"],

                "name":
                    user["full_name"],

                "email":
                    user["email"],

                "role":
                    user["role"],

                "institution":
                    user["institution"],

                "department":
                    user["department"],

                "is_admin":
                    False

            }

        }), 200


    except Exception as error:

        if connection:
            connection.rollback()


        print(
            "Login error:",
            error
        )


        return jsonify({
            "success": False,
            "message": "An internal server error occurred."
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()