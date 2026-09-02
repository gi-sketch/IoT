// ==========================================
// LOGIN PROTECTION
// ==========================================

const loggedUser =
    localStorage.getItem("airiq_user");


if (!loggedUser) {

    window.location.href = "/login";

}


let currentUser;


try {

    currentUser =
        JSON.parse(loggedUser);

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
// SETTINGS STORAGE KEY
// ==========================================

const SETTINGS_KEY =
    "airiq_settings";


// ==========================================
// DEFAULT SETTINGS
// ==========================================

const defaultSettings = {

    notifications: {

        airQuality: true,

        anomaly: true,

        prediction: true,

        email: false

    },


    dashboard: {

        defaultView: "dashboard",

        refreshInterval: "5000",

        chartDisplay: "line"

    },


    system: {

        temperatureUnit: "celsius",

        timeFormat: "12",

        language: "english"

    },


    privacy: {

        publicProfile: false,

        dataSharing: "anonymous"

    }

};


// ==========================================
// LOAD SAVED SETTINGS
// ==========================================

function loadSettings() {

    const saved =
        localStorage.getItem(
            SETTINGS_KEY
        );


    if (!saved) {

        return defaultSettings;

    }


    try {

        const parsed =
            JSON.parse(saved);


        return {

            notifications: {
                ...defaultSettings.notifications,
                ...parsed.notifications
            },


            dashboard: {
                ...defaultSettings.dashboard,
                ...parsed.dashboard
            },


            system: {
                ...defaultSettings.system,
                ...parsed.system
            },


            privacy: {
                ...defaultSettings.privacy,
                ...parsed.privacy
            }

        };

    }

    catch (error) {

        console.error(
            "Could not load settings:",
            error
        );


        return defaultSettings;

    }

}


// ==========================================
// CURRENT SETTINGS
// ==========================================

let settings =
    loadSettings();


// ==========================================
// USER AVATAR
// ==========================================

function updateUserAvatar() {

    const avatar =
        document.getElementById(
            "user-avatar"
        );


    if (!avatar) return;


    const name =
        currentUser?.name ||
        currentUser?.full_name ||
        "User";


    const initial =
        name
            .trim()
            .charAt(0)
            .toUpperCase();


    avatar.textContent =
        initial;

}


updateUserAvatar();


// ==========================================
// ADMIN ROLE CHECK
// ==========================================

function showAdminSettings() {

    const role =
        String(
            currentUser?.role || ""
        )
            .trim()
            .toLowerCase();


    const adminSection =
        document.getElementById(
            "admin-section"
        );


    if (
        role === "admin" &&
        adminSection
    ) {

        adminSection.style.display =
            "block";

    }

}


showAdminSettings();


// ==========================================
// APPLY SETTINGS TO FORM
// ==========================================

function applySettingsToForm() {

    // Notifications

    document.getElementById(
        "air-quality-alerts"
    ).checked =
        settings.notifications.airQuality;


    document.getElementById(
        "anomaly-alerts"
    ).checked =
        settings.notifications.anomaly;


    document.getElementById(
        "prediction-alerts"
    ).checked =
        settings.notifications.prediction;


    document.getElementById(
        "email-notifications"
    ).checked =
        settings.notifications.email;


    // Dashboard

    document.getElementById(
        "default-view"
    ).value =
        settings.dashboard.defaultView;


    document.getElementById(
        "refresh-interval"
    ).value =
        settings.dashboard.refreshInterval;


    document.getElementById(
        "chart-display"
    ).value =
        settings.dashboard.chartDisplay;


    // System

    document.getElementById(
        "temperature-unit"
    ).value =
        settings.system.temperatureUnit;


    document.getElementById(
        "time-format"
    ).value =
        settings.system.timeFormat;


    document.getElementById(
        "language"
    ).value =
        settings.system.language;


    // Privacy

    document.getElementById(
        "public-profile"
    ).checked =
        settings.privacy.publicProfile;


    document.getElementById(
        "data-sharing"
    ).value =
        settings.privacy.dataSharing;

}


applySettingsToForm();


// ==========================================
// GET SETTINGS FROM FORM
// ==========================================

function getSettingsFromForm() {

    return {

        notifications: {

            airQuality:
                document.getElementById(
                    "air-quality-alerts"
                ).checked,


            anomaly:
                document.getElementById(
                    "anomaly-alerts"
                ).checked,


            prediction:
                document.getElementById(
                    "prediction-alerts"
                ).checked,


            email:
                document.getElementById(
                    "email-notifications"
                ).checked

        },


        dashboard: {

            defaultView:
                document.getElementById(
                    "default-view"
                ).value,


            refreshInterval:
                document.getElementById(
                    "refresh-interval"
                ).value,


            chartDisplay:
                document.getElementById(
                    "chart-display"
                ).value

        },


        system: {

            temperatureUnit:
                document.getElementById(
                    "temperature-unit"
                ).value,


            timeFormat:
                document.getElementById(
                    "time-format"
                ).value,


            language:
                document.getElementById(
                    "language"
                ).value

        },


        privacy: {

            publicProfile:
                document.getElementById(
                    "public-profile"
                ).checked,


            dataSharing:
                document.getElementById(
                    "data-sharing"
                ).value

        }

    };

}


// ==========================================
// SAVE SETTINGS
// ==========================================

function saveSettings() {

    settings =
        getSettingsFromForm();


    localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(settings)
    );


    updateSaveStatus(
        "Changes saved"
    );

}


const saveButton =
    document.getElementById(
        "save-btn"
    );


if (saveButton) {

    saveButton.addEventListener(
        "click",
        saveSettings
    );

}


// ==========================================
// SAVE STATUS
// ==========================================

function updateSaveStatus(message) {

    const status =
        document.getElementById(
            "save-status"
        );


    if (!status) return;


    status.textContent =
        message;


    setTimeout(
        () => {

            status.textContent =
                "Changes saved";

        },
        2500
    );

}


// ==========================================
// AUTO DETECT CHANGES
// ==========================================

const formElements =
    document.querySelectorAll(
        "input, select"
    );


formElements.forEach(
    element => {

        element.addEventListener(
            "change",
            () => {

                updateSaveStatus(
                    "Unsaved changes"
                );

            }
        );

    }
);


// ==========================================
// EXPORT SYSTEM DATA
// ==========================================

const exportButton =
    document.getElementById(
        "export-data-btn"
    );


if (exportButton) {

    exportButton.addEventListener(
        "click",
        () => {

            const exportData = {

                exported_at:
                    new Date()
                        .toISOString(),

                user:
                    currentUser,

                settings:
                    settings

            };


            const blob =
                new Blob(
                    [
                        JSON.stringify(
                            exportData,
                            null,
                            2
                        )
                    ],
                    {
                        type:
                            "application/json"
                    }
                );


            const url =
                URL.createObjectURL(
                    blob
                );


            const link =
                document.createElement(
                    "a"
                );


            link.href =
                url;


            link.download =
                "airiq-system-settings.json";


            document.body.appendChild(
                link
            );


            link.click();


            document.body.removeChild(
                link
            );


            URL.revokeObjectURL(
                url
            );

        }
    );

}