from flask import Blueprint, request, jsonify

from mysql.connector import Error, IntegrityError

from .database import get_mysql_connection


admin_api = Blueprint(
    "admin_api",
    __name__,
    url_prefix="/api/admin"
)


NORMAL_ROLES = {
    "student",
    "faculty",
    "researcher"
}


# =========================================================
# DATABASE
# =========================================================

def get_db():

    return get_mysql_connection()


# =========================================================
# GET CURRENT ADMIN
# =========================================================

def get_current_admin():

    admin_id = request.headers.get(
        "X-Admin-Id"
    )


    if not admin_id:
        return None


    try:

        admin_id = int(admin_id)

    except (TypeError, ValueError):

        return None


    connection = None
    cursor = None

    try:

        connection = get_db()

        cursor = connection.cursor(
            dictionary=True
        )


        cursor.execute(
            """
            SELECT
                admin_id,
                full_name,
                email,
                is_active,
                created_at,
                last_login
            FROM admins
            WHERE admin_id = %s
            LIMIT 1
            """,
            (admin_id,)
        )


        admin = cursor.fetchone()


        if not admin:
            return None


        if not admin["is_active"]:
            return None


        return admin


    except Error as error:

        print(
            "Admin authentication error:",
            error
        )

        return None


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# REQUIRE ADMIN
# =========================================================

def require_admin():

    admin = get_current_admin()


    if not admin:

        return None, (
            jsonify({
                "success": False,
                "message": "Administrator authentication required."
            }),
            401
        )


    return admin, None


# =========================================================
# ACTIVITY LOG
# =========================================================

def log_activity(
    admin_id,
    action,
    target_type=None,
    target_id=None,
    details=None
):

    connection = None
    cursor = None

    try:

        connection = get_db()

        cursor = connection.cursor()


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
                admin_id,
                action,
                target_type,
                target_id,
                details
            )
        )


        connection.commit()


    except Error as error:

        print(
            "Activity log error:",
            error
        )


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# ADMIN INFORMATION
# =========================================================

@admin_api.route("/me", methods=["GET"])
def admin_me():

    admin, error = require_admin()

    if error:
        return error


    return jsonify({

        "success": True,

        "admin": {

            "id":
                admin["admin_id"],

            "name":
                admin["full_name"],

            "email":
                admin["email"],

            "is_active":
                bool(admin["is_active"])

        }

    }), 200


# =========================================================
# ADMIN STATISTICS
# =========================================================

@admin_api.route("/stats", methods=["GET"])
def stats():

    admin, error = require_admin()

    if error:
        return error


    connection = None
    cursor = None

    try:

        connection = get_db()

        cursor = connection.cursor(
            dictionary=True
        )


        # Total users

        cursor.execute(
            """
            SELECT COUNT(*) AS total_users
            FROM users
            """
        )

        total_users = cursor.fetchone()[
            "total_users"
        ]


        # Active users

        cursor.execute(
            """
            SELECT COUNT(*) AS active_users
            FROM users
            WHERE is_active = 1
            """
        )

        active_users = cursor.fetchone()[
            "active_users"
        ]


        # IoT nodes

        cursor.execute(
            """
            SELECT COUNT(*) AS iot_nodes
            FROM iot_devices
            """
        )

        iot_nodes = cursor.fetchone()[
            "iot_nodes"
        ]


        # Online nodes

        cursor.execute(
            """
            SELECT COUNT(*) AS online_nodes
            FROM iot_devices
            WHERE status = 'online'
            """
        )

        online_nodes = cursor.fetchone()[
            "online_nodes"
        ]


        # Offline nodes

        cursor.execute(
            """
            SELECT COUNT(*) AS offline_nodes
            FROM iot_devices
            WHERE status = 'offline'
            """
        )

        offline_nodes = cursor.fetchone()[
            "offline_nodes"
        ]


        return jsonify({

            "success": True,

            "stats": {

                "total_users":
                    total_users,

                "active_users":
                    active_users,

                "iot_nodes":
                    iot_nodes,

                "online_nodes":
                    online_nodes,

                "offline_nodes":
                    offline_nodes,

                "administrators":
                    1

            }

        }), 200


    except Error as error:

        print(
            "Stats error:",
            error
        )


        return jsonify({
            "success": False,
            "message": "Unable to load statistics."
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# LIST USERS
# =========================================================

@admin_api.route("/users", methods=["GET"])
def list_users():

    admin, error = require_admin()

    if error:
        return error


    connection = None
    cursor = None

    try:

        search = request.args.get(
            "search",
            ""
        ).strip()


        role = request.args.get(
            "role",
            ""
        ).strip().lower()


        connection = get_db()

        cursor = connection.cursor(
            dictionary=True
        )


        query = """
            SELECT
                user_id,
                full_name,
                email,
                role,
                institution,
                department,
                is_active,
                last_login
            FROM users
            WHERE 1 = 1
        """


        params = []


        if search:

            query += """
                AND (
                    full_name LIKE %s
                    OR email LIKE %s
                )
            """


            search_value = f"%{search}%"


            params.extend([
                search_value,
                search_value
            ])


        if role in NORMAL_ROLES:

            query += """
                AND role = %s
            """


            params.append(role)


        query += """
            ORDER BY user_id DESC
        """


        cursor.execute(
            query,
            tuple(params)
        )


        users = cursor.fetchall()


        return jsonify({

            "success": True,

            "users":
                users

        }), 200


    except Error as error:

        print(
            "User list error:",
            error
        )


        return jsonify({
            "success": False,
            "message": "Unable to load users."
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# CREATE USER
# =========================================================

@admin_api.route("/users", methods=["POST"])
def create_user():

    admin, error = require_admin()

    if error:
        return error


    data = request.get_json(
        silent=True
    ) or {}


    full_name = str(
        data.get(
            "full_name",
            ""
        )
    ).strip()


    email = str(
        data.get(
            "email",
            ""
        )
    ).strip().lower()


    password = str(
        data.get(
            "password",
            ""
        )
    )


    role = str(
        data.get(
            "role",
            ""
        )
    ).strip().lower()


    institution = data.get(
        "institution"
    )


    department = data.get(
        "department"
    )


    if not full_name or not email or not password:

        return jsonify({
            "success": False,
            "message":
                "Full name, email and password are required."
        }), 400


    if role not in NORMAL_ROLES:

        return jsonify({
            "success": False,
            "message": "Invalid user role."
        }), 400


    connection = None
    cursor = None

    try:

        from werkzeug.security import (
            generate_password_hash
        )


        connection = get_db()

        cursor = connection.cursor()


        password_hash = generate_password_hash(
            password
        )


        cursor.execute(
            """
            INSERT INTO users
            (
                full_name,
                email,
                password_hash,
                role,
                institution,
                department,
                is_active
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s,
                %s,
                %s,
                1
            )
            """,
            (
                full_name,
                email,
                password_hash,
                role,
                institution,
                department
            )
        )


        user_id = cursor.lastrowid


        if role == "student":

            cursor.execute(
                """
                INSERT INTO students (user_id)
                VALUES (%s)
                """,
                (user_id,)
            )


        elif role == "faculty":

            cursor.execute(
                """
                INSERT INTO faculty (user_id)
                VALUES (%s)
                """,
                (user_id,)
            )


        elif role == "researcher":

            cursor.execute(
                """
                INSERT INTO researchers (user_id)
                VALUES (%s)
                """,
                (user_id,)
            )


        connection.commit()


        log_activity(
            admin["admin_id"],
            "Created user",
            "user",
            user_id,
            f"Created {role} account."
        )


        return jsonify({

            "success": True,

            "message":
                "User created successfully.",

            "user_id":
                user_id

        }), 201


    except IntegrityError:

        if connection:
            connection.rollback()


        return jsonify({
            "success": False,
            "message":
                "A user with this email already exists."
        }), 409


    except Error as error:

        if connection:
            connection.rollback()


        print(
            "Create user error:",
            error
        )


        return jsonify({
            "success": False,
            "message": "Unable to create user."
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# UPDATE USER
# =========================================================

@admin_api.route(
    "/users/<int:user_id>",
    methods=["PUT"]
)
def update_user(user_id):

    admin, error = require_admin()

    if error:
        return error


    data = request.get_json(
        silent=True
    ) or {}


    fields = []
    values = []


    if "full_name" in data:

        fields.append(
            "full_name = %s"
        )

        values.append(
            str(
                data["full_name"]
            ).strip()
        )


    if "email" in data:

        fields.append(
            "email = %s"
        )

        values.append(
            str(
                data["email"]
            ).strip().lower()
        )


    if "role" in data:

        role = str(
            data["role"]
        ).strip().lower()


        if role not in NORMAL_ROLES:

            return jsonify({
                "success": False,
                "message": "Invalid role."
            }), 400


        fields.append(
            "role = %s"
        )

        values.append(role)


    if "institution" in data:

        fields.append(
            "institution = %s"
        )

        values.append(
            data["institution"]
        )


    if "department" in data:

        fields.append(
            "department = %s"
        )

        values.append(
            data["department"]
        )


    if not fields:

        return jsonify({
            "success": False,
            "message": "No fields supplied."
        }), 400


    connection = None
    cursor = None

    try:

        connection = get_db()

        cursor = connection.cursor()


        values.append(user_id)


        cursor.execute(
            f"""
            UPDATE users
            SET {", ".join(fields)}
            WHERE user_id = %s
            """,
            tuple(values)
        )


        connection.commit()


        log_activity(
            admin["admin_id"],
            "Updated user",
            "user",
            user_id,
            "User information updated."
        )


        return jsonify({
            "success": True,
            "message": "User updated successfully."
        }), 200


    except IntegrityError:

        if connection:
            connection.rollback()


        return jsonify({
            "success": False,
            "message": "Email is already in use."
        }), 409


    except Error as error:

        if connection:
            connection.rollback()


        print(
            "Update user error:",
            error
        )


        return jsonify({
            "success": False,
            "message": "Unable to update user."
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# ACTIVATE / DEACTIVATE USER
# =========================================================

@admin_api.route(
    "/users/<int:user_id>/status",
    methods=["PATCH"]
)
def update_user_status(user_id):

    admin, error = require_admin()

    if error:
        return error


    data = request.get_json(
        silent=True
    ) or {}


    is_active = data.get(
        "is_active"
    )


    if is_active is None:

        return jsonify({
            "success": False,
            "message": "is_active is required."
        }), 400


    connection = None
    cursor = None

    try:

        connection = get_db()

        cursor = connection.cursor()


        cursor.execute(
            """
            UPDATE users
            SET is_active = %s
            WHERE user_id = %s
            """,
            (
                1 if is_active else 0,
                user_id
            )
        )


        connection.commit()


        log_activity(
            admin["admin_id"],
            "Changed user status",
            "user",
            user_id,
            f"Active status set to {bool(is_active)}."
        )


        return jsonify({
            "success": True,
            "message": "User status updated."
        }), 200


    except Error as error:

        if connection:
            connection.rollback()


        print(
            "Status error:",
            error
        )


        return jsonify({
            "success": False,
            "message":
                "Unable to update user status."
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# DELETE USER
# =========================================================

@admin_api.route(
    "/users/<int:user_id>",
    methods=["DELETE"]
)
def delete_user(user_id):

    admin, error = require_admin()

    if error:
        return error


    connection = None
    cursor = None

    try:

        connection = get_db()

        cursor = connection.cursor(
            dictionary=True
        )


        cursor.execute(
            """
            SELECT email
            FROM users
            WHERE user_id = %s
            LIMIT 1
            """,
            (user_id,)
        )


        user = cursor.fetchone()


        if not user:

            return jsonify({
                "success": False,
                "message": "User not found."
            }), 404


        # Delete role-specific profile

        cursor.execute(
            """
            DELETE FROM students
            WHERE user_id = %s
            """,
            (user_id,)
        )


        cursor.execute(
            """
            DELETE FROM faculty
            WHERE user_id = %s
            """,
            (user_id,)
        )


        cursor.execute(
            """
            DELETE FROM researchers
            WHERE user_id = %s
            """,
            (user_id,)
        )


        cursor.execute(
            """
            DELETE FROM users
            WHERE user_id = %s
            """,
            (user_id,)
        )


        connection.commit()


        log_activity(
            admin["admin_id"],
            "Deleted user",
            "user",
            user_id,
            f"Deleted {user['email']}."
        )


        return jsonify({
            "success": True,
            "message": "User deleted successfully."
        }), 200


    except Error as error:

        if connection:
            connection.rollback()


        print(
            "Delete user error:",
            error
        )


        return jsonify({
            "success": False,
            "message": "Unable to delete user."
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# IOT NODES
# =========================================================

@admin_api.route(
    "/nodes",
    methods=["GET"]
)
def list_nodes():

    admin, error = require_admin()

    if error:
        return error


    connection = None
    cursor = None

    try:

        connection = get_db()

        cursor = connection.cursor(
            dictionary=True
        )


        cursor.execute(
            """
            SELECT
                node_id,
                node_name,
                location,
                status,
                sensors,
                last_seen,
                created_at
            FROM iot_devices
            ORDER BY node_id DESC
            """
        )


        nodes = cursor.fetchall()


        return jsonify({
            "success": True,
            "nodes": nodes
        }), 200


    except Error as error:

        print(
            "Node list error:",
            error
        )


        return jsonify({
            "success": False,
            "message":
                "Unable to load IoT nodes."
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# CREATE IOT NODE
# =========================================================

@admin_api.route(
    "/nodes",
    methods=["POST"]
)
def create_node():

    admin, error = require_admin()

    if error:
        return error


    data = request.get_json(
        silent=True
    ) or {}


    node_name = str(
        data.get(
            "node_name",
            ""
        )
    ).strip()


    location = data.get(
        "location"
    )


    status = data.get(
        "status",
        "offline"
    )


    sensors = data.get(
        "sensors"
    )


    if not node_name:

        return jsonify({
            "success": False,
            "message": "Node name is required."
        }), 400


    connection = None
    cursor = None

    try:

        connection = get_db()

        cursor = connection.cursor()


        cursor.execute(
            """
            INSERT INTO iot_devices
            (
                node_name,
                location,
                status,
                sensors
            )
            VALUES
            (
                %s,
                %s,
                %s,
                %s
            )
            """,
            (
                node_name,
                location,
                status,
                sensors
            )
        )


        node_id = cursor.lastrowid


        connection.commit()


        log_activity(
            admin["admin_id"],
            "Created IoT node",
            "node",
            node_id,
            f"Created node {node_name}."
        )


        return jsonify({
            "success": True,
            "message":
                "IoT node created successfully.",
            "node_id":
                node_id
        }), 201


    except Error as error:

        if connection:
            connection.rollback()


        print(
            "Create node error:",
            error
        )


        return jsonify({
            "success": False,
            "message":
                "Unable to create IoT node."
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# UPDATE IOT NODE
# =========================================================

@admin_api.route(
    "/nodes/<int:node_id>",
    methods=["PUT"]
)
def update_node(node_id):

    admin, error = require_admin()

    if error:
        return error


    data = request.get_json(
        silent=True
    ) or {}


    allowed_fields = [
        "node_name",
        "location",
        "status",
        "sensors",
        "last_seen"
    ]


    fields = []
    values = []


    for field in allowed_fields:

        if field in data:

            fields.append(
                f"{field} = %s"
            )

            values.append(
                data[field]
            )


    if not fields:

        return jsonify({
            "success": False,
            "message": "No fields supplied."
        }), 400


    connection = None
    cursor = None

    try:

        connection = get_db()

        cursor = connection.cursor()


        values.append(node_id)


        cursor.execute(
            f"""
            UPDATE iot_devices
            SET {", ".join(fields)}
            WHERE node_id = %s
            """,
            tuple(values)
        )


        connection.commit()


        log_activity(
            admin["admin_id"],
            "Updated IoT node",
            "node",
            node_id,
            "IoT node updated."
        )


        return jsonify({
            "success": True,
            "message":
                "IoT node updated successfully."
        }), 200


    except Error as error:

        if connection:
            connection.rollback()


        print(
            "Update node error:",
            error
        )


        return jsonify({
            "success": False,
            "message":
                "Unable to update IoT node."
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# DELETE IOT NODE
# =========================================================

@admin_api.route(
    "/nodes/<int:node_id>",
    methods=["DELETE"]
)
def delete_node(node_id):

    admin, error = require_admin()

    if error:
        return error


    connection = None
    cursor = None

    try:

        connection = get_db()

        cursor = connection.cursor()


        cursor.execute(
            """
            DELETE FROM iot_devices
            WHERE node_id = %s
            """,
            (node_id,)
        )


        connection.commit()


        log_activity(
            admin["admin_id"],
            "Deleted IoT node",
            "node",
            node_id,
            "IoT node deleted."
        )


        return jsonify({
            "success": True,
            "message":
                "IoT node deleted successfully."
        }), 200


    except Error as error:

        if connection:
            connection.rollback()


        print(
            "Delete node error:",
            error
        )


        return jsonify({
            "success": False,
            "message":
                "Unable to delete IoT node."
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# SYSTEM CONFIGURATION
# =========================================================

@admin_api.route(
    "/config",
    methods=["GET"]
)
def get_config():

    admin, error = require_admin()

    if error:
        return error


    connection = None
    cursor = None

    try:

        connection = get_db()

        cursor = connection.cursor(
            dictionary=True
        )


        cursor.execute(
            """
            SELECT
                config_key,
                config_value,
                updated_at
            FROM system_config
            ORDER BY config_key
            """
        )


        rows = cursor.fetchall()


        config = {

            row["config_key"]:
                row["config_value"]

            for row in rows

        }


        return jsonify({
            "success": True,
            "config": config
        }), 200


    except Error as error:

        print(
            "Config error:",
            error
        )


        return jsonify({
            "success": False,
            "message":
                "Unable to load configuration."
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# UPDATE SYSTEM CONFIGURATION
# =========================================================

@admin_api.route(
    "/config",
    methods=["PUT"]
)
def update_config():

    admin, error = require_admin()

    if error:
        return error


    data = request.get_json(
        silent=True
    ) or {}


    if not data:

        return jsonify({
            "success": False,
            "message":
                "No configuration values supplied."
        }), 400


    connection = None
    cursor = None

    try:

        connection = get_db()

        cursor = connection.cursor()


        for key, value in data.items():

            cursor.execute(
                """
                INSERT INTO system_config
                (
                    config_key,
                    config_value
                )
                VALUES
                (
                    %s,
                    %s
                )
                ON DUPLICATE KEY UPDATE
                    config_value =
                        VALUES(config_value)
                """,
                (
                    key,
                    str(value)
                )
            )


        connection.commit()


        log_activity(
            admin["admin_id"],
            "Updated system configuration",
            "config",
            None,
            "System configuration updated."
        )


        return jsonify({
            "success": True,
            "message":
                "System configuration updated."
        }), 200


    except Error as error:

        if connection:
            connection.rollback()


        print(
            "Config update error:",
            error
        )


        return jsonify({
            "success": False,
            "message":
                "Unable to update configuration."
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()


# =========================================================
# ACTIVITY LOG
# =========================================================

@admin_api.route(
    "/activity",
    methods=["GET"]
)
def activity():

    admin, error = require_admin()

    if error:
        return error


    connection = None
    cursor = None

    try:

        connection = get_db()

        cursor = connection.cursor(
            dictionary=True
        )


        cursor.execute(
            """
            SELECT
                aa.id,
                aa.admin_id,
                a.full_name AS admin_name,
                a.email AS admin_email,
                aa.action,
                aa.target_type,
                aa.target_id,
                aa.details,
                aa.created_at
            FROM admin_activity aa
            INNER JOIN admins a
                ON a.admin_id = aa.admin_id
            ORDER BY aa.created_at DESC
            LIMIT 200
            """
        )


        activities = cursor.fetchall()


        return jsonify({
            "success": True,
            "activity": activities
        }), 200


    except Error as error:

        print(
            "Activity error:",
            error
        )


        return jsonify({
            "success": False,
            "message":
                "Unable to load activity."
        }), 500


    finally:

        if cursor:
            cursor.close()

        if connection:
            connection.close()