// ==========================================
// LOGIN PROTECTION
// ==========================================

const loggedUser =
    localStorage.getItem("airiq_user");


if (!loggedUser) {

    window.location.href = "/login";

}


let user;


try {

    user = JSON.parse(loggedUser);

} catch (error) {

    console.error(
        "Invalid user data:",
        error
    );


    localStorage.removeItem(
        "airiq_user"
    );


    window.location.href = "/login";

}


// ==========================================
// LAST LOGIN
// ==========================================

const previousLogin =
    localStorage.getItem(
        "airiq_last_login"
    );


const now = new Date();


localStorage.setItem(
    "airiq_last_login",
    now.toISOString()
);


// ==========================================
// HELPERS
// ==========================================

function getInitials(name) {

    if (!name) {

        return "U";

    }


    const parts =
        name
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    return parts
        .slice(0, 2)
        .map(part =>
            part.charAt(0).toUpperCase()
        )
        .join("");

}


function formatDate(value) {

    if (!value) {

        return "Not available";

    }


    const date =
        new Date(value);


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "Not available";

    }


    return date.toLocaleString(
        undefined,
        {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


function normalizeRole(role) {

    if (!role) {

        return "Student";

    }


    return (
        role.charAt(0).toUpperCase() +
        role.slice(1).toLowerCase()
    );

}


// ==========================================
// PROFILE DATA
// ==========================================

function renderProfile() {

    const name =
        user.name ||
        "AirIQ User";


    const email =
        user.email ||
        "Not provided";


    const role =
        normalizeRole(
            user.role
        );


    const institution =
        user.institution ||
        "Not provided";


    const department =
        user.department ||
        "Not provided";


    const initials =
        getInitials(name);


    // Header avatar

    const headerAvatar =
        document.getElementById(
            "header-avatar"
        );


    if (headerAvatar) {

        headerAvatar.textContent =
            initials;

    }


    // Profile avatar

    const profileAvatar =
        document.getElementById(
            "profile-avatar"
        );


    if (profileAvatar) {

        profileAvatar.textContent =
            initials;

    }


    // Profile header

    document.getElementById(
        "profile-name"
    ).textContent =
        name;


    document.getElementById(
        "profile-role"
    ).textContent =
        role;


    document.getElementById(
        "profile-email"
    ).textContent =
        email;


    document.getElementById(
        "profile-institution"
    ).textContent =
        institution;


    // Personal information

    document.getElementById(
        "info-name"
    ).textContent =
        name;


    document.getElementById(
        "info-email"
    ).textContent =
        email;


    document.getElementById(
        "info-institution"
    ).textContent =
        institution;


    document.getElementById(
        "info-department"
    ).textContent =
        department;


    document.getElementById(
        "info-role"
    ).textContent =
        role;


    // Account information

    document.getElementById(
        "member-since"
    ).textContent =
        user.created_at
            ? formatDate(user.created_at)
            : "Not available";


    document.getElementById(
        "last-login"
    ).textContent =
        previousLogin
            ? formatDate(previousLogin)
            : "Current session";


    // Account status

    const isActive =
        user.is_active !== false;


    const statusText =
        isActive
            ? "Active"
            : "Inactive";


    document.getElementById(
        "account-status-text"
    ).textContent =
        statusText;


    document.getElementById(
        "account-status"
    ).innerHTML =
        `<i></i>${statusText}`;


    renderAccess(role);

}


// ==========================================
// ROLE ACCESS
// ==========================================

function renderAccess(role) {

    const accessGrid =
        document.getElementById(
            "access-grid"
        );


    if (!accessGrid) {

        return;

    }


    const commonAccess = [

        {
            icon: "▦",
            title: "Dashboard",
            description:
                "View live air quality metrics and sensor data."
        },

        {
            icon: "☰",
            title: "Campus Heatmap",
            description:
                "Explore air quality conditions across locations."
        },

        {
            icon: "⚠",
            title: "Anomaly Detection",
            description:
                "Review unusual pollution events."
        },

        {
            icon: "↗",
            title: "AQI Predictions",
            description:
                "View AI-powered short-term AQI forecasts."
        }

    ];


    const facultyAccess = [

        {
            icon: "◉",
            title: "Monitoring",
            description:
                "Analyze campus-wide air quality activity."
        }

    ];


    const researcherAccess = [

        {
            icon: "✦",
            title: "Research Insights",
            description:
                "Access advanced data analysis and AI insights."
        },

        {
            icon: "★",
            title: "Advanced Analytics",
            description:
                "Explore patterns for research and experimentation."
        }

    ];


    let access =
        [...commonAccess];


    if (role === "Faculty") {

        access = [
            ...access,
            ...facultyAccess
        ];

    }


    if (role === "Researcher") {

        access = [
            ...access,
            ...facultyAccess,
            ...researcherAccess
        ];

    }


    accessGrid.innerHTML =
        access
            .map(item => `

                <article class="access-item">

                    <span class="access-icon">
                        ${item.icon}
                    </span>

                    <strong>
                        ${item.title}
                    </strong>

                    <span>
                        ${item.description}
                    </span>

                </article>

            `)
            .join("");

}


// ==========================================
// EDIT PROFILE
// ==========================================

const editModal =
    document.getElementById(
        "edit-modal"
    );


const editButton =
    document.getElementById(
        "edit-profile-btn"
    );


function openEditModal() {

    document.getElementById(
        "edit-name"
    ).value =
        user.name || "";


    document.getElementById(
        "edit-email"
    ).value =
        user.email || "";


    document.getElementById(
        "edit-institution"
    ).value =
        user.institution || "";


    document.getElementById(
        "edit-department"
    ).value =
        user.department || "";


    editModal.classList.add(
        "show"
    );

}


function closeEditModal() {

    editModal.classList.remove(
        "show"
    );

}


editButton.addEventListener(
    "click",
    openEditModal
);


document.getElementById(
    "close-modal-btn"
).addEventListener(
    "click",
    closeEditModal
);


document.getElementById(
    "cancel-edit-btn"
).addEventListener(
    "click",
    closeEditModal
);


document.getElementById(
    "edit-profile-form"
).addEventListener(
    "submit",
    event => {

        event.preventDefault();


        user.name =
            document
                .getElementById(
                    "edit-name"
                )
                .value
                .trim();


        user.email =
            document
                .getElementById(
                    "edit-email"
                )
                .value
                .trim();


        user.institution =
            document
                .getElementById(
                    "edit-institution"
                )
                .value
                .trim();


        user.department =
            document
                .getElementById(
                    "edit-department"
                )
                .value
                .trim();


        localStorage.setItem(
            "airiq_user",
            JSON.stringify(user)
        );


        renderProfile();


        closeEditModal();

    }
);


// ==========================================
// CHANGE PASSWORD
// ==========================================

const passwordModal =
    document.getElementById(
        "password-modal"
    );


document.getElementById(
    "change-password-btn"
).addEventListener(
    "click",
    () => {

        passwordModal.classList.add(
            "show"
        );

    }
);


function closePasswordModal() {

    passwordModal.classList.remove(
        "show"
    );

}


document.getElementById(
    "close-password-btn"
).addEventListener(
    "click",
    closePasswordModal
);


document.getElementById(
    "cancel-password-btn"
).addEventListener(
    "click",
    closePasswordModal
);


document.getElementById(
    "password-form"
).addEventListener(
    "submit",
    event => {

        event.preventDefault();


        alert(
            "Password update API is not connected yet."
        );


        closePasswordModal();

    }
);


// ==========================================
// LOGOUT
// ==========================================

document.getElementById(
    "logout-btn"
).addEventListener(
    "click",
    () => {

        localStorage.removeItem(
            "airiq_user"
        );


        window.location.href =
            "/login";

    }
);


// ==========================================
// CLOSE MODAL ON BACKDROP CLICK
// ==========================================

[editModal, passwordModal].forEach(
    modal => {

        modal.addEventListener(
            "click",
            event => {

                if (
                    event.target === modal
                ) {

                    modal.classList.remove(
                        "show"
                    );

                }

            }
        );

    }
);


// ==========================================
// INITIAL LOAD
// ==========================================

renderProfile();