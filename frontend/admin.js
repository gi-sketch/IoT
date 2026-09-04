const API_BASE = "";
const user = JSON.parse(localStorage.getItem("airiq_user") || "null");

let users = [];
let nodes = [];
let config = {};
let currentAdmin = null;
let refreshTimer = null;

const DEFAULT_REFRESH_MS = 10000;

if (!user || !user.id) {
    window.location.replace("/login");
    throw new Error("Authentication required");
}

const $ = (id) => document.getElementById(id);

const escapeHtml = (value) =>
    String(value ?? "").replace(
        /[&<>"']/g,
        (c) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[c])
    );

function showPageError(message) {
    document.body.innerHTML = `
        <div style="
            padding:60px;
            font-family:Inter,Arial,sans-serif;
            background:#f7f7f6;
            min-height:100vh;
            color:#26313d;
        ">
            <h2>Access denied</h2>
            <p>${escapeHtml(message)}</p>
            <a href="/dashboard">Return to dashboard</a>
        </div>
    `;
}

async function api(path, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {})
    };

    headers["X-User-Id"] = String(user.id);

    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(
            data.message || `Request failed (${response.status})`
        );
    }

    return data;
}

function toast(message) {
    const el = $("toast");

    if (!el) return;

    el.textContent = message;
    el.classList.add("show");

    setTimeout(() => {
        el.classList.remove("show");
    }, 2600);
}

function formatDate(value) {
    if (!value) return "Never";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString();
}

function roleLabel(role) {
    const labels = {
        student: "Student",
        faculty: "Faculty",
        researcher: "Researcher"
    };

    return labels[role] || role || "Unknown";
}

function adminLevelLabel(level) {
    const labels = {
        super_admin: "Super Admin",
        admin: "Admin",
        moderator: "Moderator"
    };

    return labels[level] || level || "";
}

function statusBadge(status, type = "active") {
    const cls = status
        ? String(status).toLowerCase().replace(/\s+/g, "-")
        : "inactive";

    return `
        <span class="badge ${type} ${cls}">
            ${escapeHtml(status || "Unknown")}
        </span>
    `;
}

function adminBadge(level) {
    if (!level) return "";

    return `
        <span class="badge admin-level ${escapeHtml(level)}">
            ${escapeHtml(adminLevelLabel(level))}
        </span>
    `;
}

function renderUsers() {
    const q = $("user-search").value.trim().toLowerCase();
    const role = $("role-filter").value;
    const status = $("status-filter").value;
    const adminFilter = $("admin-filter").value;

    const filtered = users.filter((u) => {
        const searchable = `
            ${u.full_name || ""}
            ${u.email || ""}
            ${u.institution || ""}
            ${u.department || ""}
        `.toLowerCase();

        const matchesSearch = searchable.includes(q);
        const matchesRole = !role || u.role === role;

        const matchesStatus =
            !status ||
            (
                status === "active"
                    ? Number(u.is_active) === 1
                    : Number(u.is_active) === 0
            );

        const matchesAdmin =
            !adminFilter ||
            (
                adminFilter === "admin"
                    ? Boolean(u.admin_id)
                    : !u.admin_id
            );

        return (
            matchesSearch &&
            matchesRole &&
            matchesStatus &&
            matchesAdmin
        );
    });

    $("users-body").innerHTML = filtered.length
        ? filtered.map((u) => `
            <tr>
                <td>
                    <div class="user-cell">
                        <strong>${escapeHtml(u.full_name)}</strong>
                        <small>${escapeHtml(u.email)}</small>
                    </div>
                </td>

                <td>
                    <span class="badge role">
                        ${escapeHtml(roleLabel(u.role))}
                    </span>
                    ${adminBadge(u.admin_level)}
                </td>

                <td>
                    ${escapeHtml(u.institution || "—")}
                    ${
                        u.department
                            ? `<small class="table-sub">${escapeHtml(u.department)}</small>`
                            : ""
                    }
                </td>

                <td>
                    ${statusBadge(
                        Number(u.is_active)
                            ? "Active"
                            : "Inactive"
                    )}
                </td>

                <td>
                    ${escapeHtml(formatDate(u.last_login))}
                </td>

                <td>
                    <div class="actions">

                        <button
                            class="action-btn"
                            data-edit-user="${u.user_id}"
                        >
                            Edit
                        </button>

                        <button
                            class="action-btn"
                            data-toggle-user="${u.user_id}"
                        >
                            ${
                                Number(u.is_active)
                                    ? "Disable"
                                    : "Enable"
                            }
                        </button>

                        ${
                            u.admin_id &&
                            currentAdmin?.admin_level === "super_admin" &&
                            String(u.user_id) !== String(currentAdmin.user_id)
                                ? `
                                    <button
                                        class="action-btn"
                                        data-admin-level="${u.user_id}"
                                    >
                                        Admin Level
                                    </button>

                                    <button
                                        class="action-btn danger"
                                        data-remove-admin="${u.user_id}"
                                    >
                                        Remove Admin
                                    </button>
                                `
                                : ""
                        }

                        ${
                            !u.admin_id &&
                            currentAdmin?.admin_level === "super_admin"
                                ? `
                                    <button
                                        class="action-btn"
                                        data-make-admin="${u.user_id}"
                                    >
                                        Make Admin
                                    </button>
                                `
                                : ""
                        }

                        <button
                            class="action-btn danger"
                            data-delete-user="${u.user_id}"
                        >
                            Delete
                        </button>

                    </div>
                </td>
            </tr>
        `).join("")
        : `
            <tr>
                <td colspan="6" class="empty">
                    No users found.
                </td>
            </tr>
        `;
}

function renderNodes() {
    const q = $("node-search").value.trim().toLowerCase();
    const status = $("node-status-filter").value;

    const filtered = nodes.filter((n) => {
        const searchable = `
            ${n.node_id || ""}
            ${n.name || ""}
            ${n.location || ""}
            ${n.sensors || ""}
        `.toLowerCase();

        return (
            searchable.includes(q) &&
            (!status || n.status === status)
        );
    });

    $("nodes-body").innerHTML = filtered.length
        ? filtered.map((n) => `
            <tr>
                <td>
                    <div class="node-cell">
                        <strong>${escapeHtml(n.node_id)}</strong>
                        <small>
                            ${escapeHtml(
                                n.name || "ESP32 Sensor Node"
                            )}
                        </small>
                    </div>
                </td>

                <td>
                    ${escapeHtml(n.location || "—")}
                </td>

                <td>
                    ${escapeHtml(
                        n.sensors || "MQ-135, MQ-7, DHT22"
                    )}
                </td>

                <td>
                    ${statusBadge(n.status, "online")}
                </td>

                <td>
                    ${escapeHtml(formatDate(n.last_seen))}
                </td>

                <td>
                    <div class="actions">
                        <button
                            class="action-btn"
                            data-edit-node="${escapeHtml(n.node_id)}"
                        >
                            Edit
                        </button>

                        <button
                            class="action-btn danger"
                            data-delete-node="${escapeHtml(n.node_id)}"
                        >
                            Remove
                        </button>
                    </div>
                </td>
            </tr>
        `).join("")
        : `
            <tr>
                <td colspan="6" class="empty">
                    No nodes found.
                </td>
            </tr>
        `;
}

function renderStats(stats) {
    const totalUsers =
        stats.total_users ?? users.length;

    const activeUsers =
        stats.active_users ??
        users.filter((u) => Number(u.is_active)).length;

    const totalNodes =
        stats.total_nodes ?? nodes.length;

    const onlineNodes =
        stats.online_nodes ??
        nodes.filter((n) => n.status === "online").length;

    const offlineNodes =
        stats.offline_nodes ??
        nodes.filter((n) => n.status === "offline").length;

    $("total-users").textContent = totalUsers;
    $("active-users").textContent = `${activeUsers} active`;
    $("active-accounts").textContent = activeUsers;

    $("total-nodes").textContent = totalNodes;
    $("online-nodes").textContent = `${onlineNodes} online`;
    $("offline-nodes").textContent = offlineNodes;

    if ($("total-admins")) {
        $("total-admins").textContent =
            stats.total_admins ?? users.filter((u) => u.admin_id).length;
    }
}

function renderAdminIdentity() {
    if (!currentAdmin) return;

    const firstName =
        (currentAdmin.full_name || "Admin")
            .trim()
            .split(/\s+/)[0];

    $("user-avatar").textContent =
        firstName.charAt(0).toUpperCase();

    if ($("admin-name")) {
        $("admin-name").textContent =
            currentAdmin.full_name || "Administrator";
    }

    if ($("admin-level")) {
        $("admin-level").textContent =
            adminLevelLabel(currentAdmin.admin_level);
    }

    if ($("admin-role-badge")) {
        $("admin-role-badge").textContent =
            adminLevelLabel(currentAdmin.admin_level);
    }
}

function renderActivity(activity) {
    $("activity-list").innerHTML =
        activity.length
            ? activity.map((item) => `
                <div class="activity-item">
                    <strong>
                        ${escapeHtml(item.action)}
                    </strong>

                    <small>
                        ${escapeHtml(
                            formatDate(item.created_at)
                        )}
                        ·
                        ${escapeHtml(
                            item.admin_name || "Admin"
                        )}
                        ${
                            item.admin_level
                                ? ` · ${escapeHtml(
                                    adminLevelLabel(
                                        item.admin_level
                                    )
                                )}`
                                : ""
                        }
                    </small>
                </div>
            `).join("")
            : `
                <div class="empty">
                    No activity recorded.
                </div>
            `;
}

async function loadAdminIdentity() {
    const result = await api("/api/admin/me");
    currentAdmin = result.admin;
    renderAdminIdentity();
}

async function loadAll() {
    try {
        const [usersResult, nodesResult, configResult, statsResult, activityResult] =
            await Promise.all([
                api("/api/admin/users"),
                api("/api/admin/nodes"),
                api("/api/admin/config"),
                api("/api/admin/stats"),
                api("/api/admin/activity")
            ]);

        users = usersResult.users || [];
        nodes = nodesResult.nodes || [];
        config = configResult.config || {};

        renderUsers();
        renderNodes();
        renderStats(statsResult);

        Object.entries(config).forEach(([key, value]) => {
            const el = $(`cfg-${key}`);

            if (el) {
                el.value = value;
            }
        });

        renderActivity(activityResult.activity || []);

        $("last-updated").textContent =
            `Updated ${new Date().toLocaleTimeString()}`;

    } catch (error) {
        console.error(error);

        if (
            error.message.includes("Administrator") ||
            error.message.includes("administrator") ||
            error.message.includes("access denied")
        ) {
            showPageError(error.message);
            return;
        }

        toast(error.message);
    }
}

function openModal(title, fields, submit, eyebrow = "ADMIN") {
    $("modal-eyebrow").textContent = eyebrow;
    $("modal-title").textContent = title;

    $("modal-form").innerHTML = `
        <div class="form-grid">
            ${fields.map((field) => `
                <div class="form-field ${field.full ? "full" : ""}">
                    <label>
                        ${escapeHtml(field.label)}
                    </label>

                    ${
                        field.type === "select"
                            ? `
                                <select
                                    name="${escapeHtml(field.name)}"
                                    ${field.required ? "required" : ""}
                                >
                                    ${field.options.map((option) => `
                                        <option
                                            value="${escapeHtml(option.value)}"
                                            ${
                                                String(option.value) ===
                                                String(field.value)
                                                    ? "selected"
                                                    : ""
                                            }
                                        >
                                            ${escapeHtml(option.label)}
                                        </option>
                                    `).join("")}
                                </select>
                            `
                            : `
                                <input
                                    name="${escapeHtml(field.name)}"
                                    type="${escapeHtml(field.type || "text")}"
                                    value="${escapeHtml(field.value ?? "")}"
                                    ${field.required ? "required" : ""}
                                    ${field.min !== undefined ? `min="${escapeHtml(field.min)}"` : ""}
                                    ${field.step !== undefined ? `step="${escapeHtml(field.step)}"` : ""}
                                >
                            `
                    }
                </div>
            `).join("")}
        </div>
    `;

    $("modal").classList.remove("hidden");

    $("modal-form").onsubmit = async (event) => {
        event.preventDefault();

        const data = Object.fromEntries(
            new FormData(event.target).entries()
        );

        try {
            await submit(data);

            $("modal").classList.add("hidden");

            await loadAll();

            toast("Saved successfully");

        } catch (error) {
            toast(error.message);
        }
    };
}

$("add-user-btn").onclick = () => {
    openModal(
        "Add User",
        [
            {
                name: "full_name",
                label: "Full Name",
                required: true,
                full: true
            },
            {
                name: "email",
                label: "Email",
                type: "email",
                required: true
            },
            {
                name: "password",
                label: "Temporary Password",
                type: "password",
                required: true
            },
            {
                name: "role",
                label: "Role",
                type: "select",
                options: [
                    { value: "student", label: "Student" },
                    { value: "faculty", label: "Faculty" },
                    { value: "researcher", label: "Researcher" }
                ],
                value: "student"
            },
            {
                name: "institution",
                label: "Institution"
            },
            {
                name: "department",
                label: "Department"
            }
        ],
        (data) =>
            api("/api/admin/users", {
                method: "POST",
                body: JSON.stringify(data)
            }),
        "USER MANAGEMENT"
    );
};

$("add-node-btn").onclick = () => {
    openModal(
        "Add IoT Node",
        [
            {
                name: "node_id",
                label: "Node ID",
                required: true
            },
            {
                name: "name",
                label: "Node Name"
            },
            {
                name: "location",
                label: "Location",
                required: true
            },
            {
                name: "sensors",
                label: "Sensors",
                value: "MQ-135, MQ-7, DHT22",
                full: true
            }
        ],
        (data) =>
            api("/api/admin/nodes", {
                method: "POST",
                body: JSON.stringify(data)
            }),
        "DEVICE MANAGEMENT"
    );
};

document.addEventListener("click", async (event) => {
    const editUser =
        event.target.dataset.editUser;

    const toggleUser =
        event.target.dataset.toggleUser;

    const deleteUser =
        event.target.dataset.deleteUser;

    const editNode =
        event.target.dataset.editNode;

    const deleteNode =
        event.target.dataset.deleteNode;

    const makeAdmin =
        event.target.dataset.makeAdmin;

    const adminLevel =
        event.target.dataset.adminLevel;

    const removeAdmin =
        event.target.dataset.removeAdmin;

    if (editUser) {
        const target = users.find(
            (x) => String(x.user_id) === String(editUser)
        );

        if (!target) return;

        openModal(
            "Edit User",
            [
                {
                    name: "full_name",
                    label: "Full Name",
                    value: target.full_name,
                    required: true,
                    full: true
                },
                {
                    name: "email",
                    label: "Email",
                    type: "email",
                    value: target.email,
                    required: true
                },
                {
                    name: "role",
                    label: "Role",
                    type: "select",
                    options: [
                        { value: "student", label: "Student" },
                        { value: "faculty", label: "Faculty" },
                        { value: "researcher", label: "Researcher" }
                    ],
                    value: target.role
                },
                {
                    name: "institution",
                    label: "Institution",
                    value: target.institution || ""
                },
                {
                    name: "department",
                    label: "Department",
                    value: target.department || ""
                }
            ],
            (data) =>
                api(`/api/admin/users/${editUser}`, {
                    method: "PUT",
                    body: JSON.stringify(data)
                }),
            "USER MANAGEMENT"
        );
    }

    if (toggleUser) {
        const target = users.find(
            (x) => String(x.user_id) === String(toggleUser)
        );

        if (!target) return;

        try {
            await api(
                `/api/admin/users/${toggleUser}/status`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        is_active:
                            !Number(target.is_active)
                    })
                }
            );

            await loadAll();

            toast("Account status updated");

        } catch (error) {
            toast(error.message);
        }
    }

    if (deleteUser) {
        if (
            !confirm(
                "Delete this user? This cannot be undone."
            )
        ) {
            return;
        }

        try {
            await api(
                `/api/admin/users/${deleteUser}`,
                {
                    method: "DELETE"
                }
            );

            await loadAll();

            toast("User deleted");

        } catch (error) {
            toast(error.message);
        }
    }

    if (makeAdmin) {
        if (
            !confirm(
                "Grant administrator access to this user?"
            )
        ) {
            return;
        }

        openModal(
            "Grant Administrator Access",
            [
                {
                    name: "admin_level",
                    label: "Admin Level",
                    type: "select",
                    options: [
                        {
                            value: "admin",
                            label: "Admin"
                        },
                        {
                            value: "moderator",
                            label: "Moderator"
                        },
                        {
                            value: "super_admin",
                            label: "Super Admin"
                        }
                    ],
                    value: "admin"
                }
            ],
            (data) =>
                api(`/api/admin/users/${makeAdmin}/admin`, {
                    method: "POST",
                    body: JSON.stringify(data)
                }),
            "ADMINISTRATION"
        );
    }

    if (adminLevel) {
        const target = users.find(
            (x) => String(x.user_id) === String(adminLevel)
        );

        if (!target) return;

        openModal(
            "Change Admin Level",
            [
                {
                    name: "admin_level",
                    label: "Admin Level",
                    type: "select",
                    options: [
                        {
                            value: "admin",
                            label: "Admin"
                        },
                        {
                            value: "moderator",
                            label: "Moderator"
                        },
                        {
                            value: "super_admin",
                            label: "Super Admin"
                        }
                    ],
                    value: target.admin_level
                }
            ],
            (data) =>
                api(`/api/admin/users/${adminLevel}/admin-level`, {
                    method: "PATCH",
                    body: JSON.stringify(data)
                }),
            "ADMINISTRATION"
        );
    }

    if (removeAdmin) {
        if (
            !confirm(
                "Remove administrator privileges from this user?"
            )
        ) {
            return;
        }

        try {
            await api(
                `/api/admin/users/${removeAdmin}/admin`,
                {
                    method: "DELETE"
                }
            );

            await loadAll();

            toast("Administrator privileges removed");

        } catch (error) {
            toast(error.message);
        }
    }

    if (editNode) {
        const target = nodes.find(
            (x) => String(x.node_id) === String(editNode)
        );

        if (!target) return;

        openModal(
            "Edit IoT Node",
            [
                {
                    name: "name",
                    label: "Node Name",
                    value: target.name || ""
                },
                {
                    name: "location",
                    label: "Location",
                    value: target.location || "",
                    required: true
                },
                {
                    name: "sensors",
                    label: "Sensors",
                    value: target.sensors || ""
                },
                {
                    name: "status",
                    label: "Status",
                    type: "select",
                    options: [
                        {
                            value: "online",
                            label: "Online"
                        },
                        {
                            value: "offline",
                            label: "Offline"
                        }
                    ],
                    value: target.status
                }
            ],
            (data) =>
                api(
                    `/api/admin/nodes/${encodeURIComponent(editNode)}`,
                    {
                        method: "PUT",
                        body: JSON.stringify(data)
                    }
                ),
            "DEVICE MANAGEMENT"
        );
    }

    if (deleteNode) {
        if (!confirm("Remove this IoT node?")) {
            return;
        }

        try {
            await api(
                `/api/admin/nodes/${encodeURIComponent(deleteNode)}`,
                {
                    method: "DELETE"
                }
            );

            await loadAll();

            toast("Node removed");

        } catch (error) {
            toast(error.message);
        }
    }
});

$("save-config-btn").onclick = async () => {
    const data = {};

    document
        .querySelectorAll("[id^='cfg-']")
        .forEach((element) => {
            data[
                element.id.replace("cfg-", "")
            ] = element.value;
        });

    try {
        await api("/api/admin/config", {
            method: "PUT",
            body: JSON.stringify(data)
        });

        await loadAll();

        toast("Configuration saved");

    } catch (error) {
        toast(error.message);
    }
});

[
    "user-search",
    "role-filter",
    "status-filter",
    "admin-filter"
].forEach((id) => {
    $(id).addEventListener("input", renderUsers);
});

[
    "node-search",
    "node-status-filter"
].forEach((id) => {
    $(id).addEventListener("input", renderNodes);
});

$("refresh-btn").onclick = loadAll;

$("modal-close").onclick =
    $("modal-cancel").onclick =
        () => $("modal").classList.add("hidden");

async function initialize() {
    try {
        await loadAdminIdentity();
        await loadAll();

        refreshTimer = setInterval(
            loadAll,
            DEFAULT_REFRESH_MS
        );

    } catch (error) {
        console.error(error);
        showPageError(error.message);
    }
}

initialize();
