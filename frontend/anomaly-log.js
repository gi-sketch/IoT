const API_BASE = "http://127.0.0.1:5000";

const REFRESH_MS = 5000;


// ==========================================
// LOGIN PROTECTION + USER AVATAR
// ==========================================

const loggedUser =
    localStorage.getItem(
        "airiq_user"
    );


if (!loggedUser) {

    window.location.href = "/login";

}

else {

    try {

        const user =
            JSON.parse(
                loggedUser
            );


        const displayName =
            user?.name
                ? user.name
                    .trim()
                    .split(/\s+/)[0]
                : "User";


        const avatar =
            document.getElementById(
                "user-avatar"
            );


        if (avatar) {

            avatar.textContent =
                displayName
                    .charAt(0)
                    .toUpperCase();

        }

    }

    catch (error) {

        console.error(
            "Invalid user data:",
            error
        );


        localStorage.removeItem(
            "airiq_user"
        );


        window.location.href =
            "/login";

    }

}


// ==========================================
// REFRESH BUTTON
// ==========================================

const refreshButton =
    document.getElementById(
        "refresh-btn"
    );


if (refreshButton) {

    refreshButton.addEventListener(
        "click",
        refreshAll
    );

}


// ==========================================
// GET TODAY'S DATE
// ==========================================

function getTodayString() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


// ==========================================
// FORMAT TIME
// ==========================================

function formatTime(timestamp) {

    if (!timestamp) {

        return "—";

    }


    const parts =
        timestamp.split(" ");


    if (
        parts.length < 2
    ) {

        return timestamp;

    }


    const time =
        parts[1];


    const timeParts =
        time.split(":");


    if (
        timeParts.length < 2
    ) {

        return timestamp;

    }


    let hour =
        Number(
            timeParts[0]
        );


    const minute =
        timeParts[1];


    const suffix =
        hour >= 12
            ? "PM"
            : "AM";


    hour =
        hour % 12 ||
        12;


    return `${hour}:${minute} ${suffix}`;

}


// ==========================================
// GET SEVERITY
// ==========================================

function getSeverity(reading) {

    const aqi =
        Number(
            reading.aqi || 0
        );


    const co2 =
        Number(
            reading.co2 || 0
        );


    const voc =
        Number(
            reading.voc || 0
        );


    const temp =
        Number(
            reading.temp || 0
        );


    const humidity =
        Number(
            reading.humidity || 0
        );


    // HIGH RISK
    if (

        aqi > 220 ||

        co2 > 3000 ||

        voc > 1.2 ||

        temp > 40 ||

        humidity > 95

    ) {

        return "High";

    }


    // MEDIUM RISK
    if (

        aqi > 180 ||

        co2 > 2500 ||

        voc > 1.0 ||

        temp > 37 ||

        humidity > 90

    ) {

        return "Medium";

    }


    // LOW RISK
    return "Low";

}


// ==========================================
// GET SEVERITY CLASS
// ==========================================

function getSeverityClass(severity) {

    return severity
        .toLowerCase();

}


// ==========================================
// GENERATE REASON
// ==========================================

function getReason(reading) {

    const reasons = [];


    if (
        Number(reading.aqi) > 150
    ) {

        reasons.push(
            "Elevated AQI"
        );

    }


    if (
        Number(reading.co2) > 2000
    ) {

        reasons.push(
            "Sudden CO₂ spike"
        );

    }


    if (
        Number(reading.voc) > 0.8
    ) {

        reasons.push(
            "Unusual VOC pattern"
        );

    }


    if (
        Number(reading.temp) > 35
    ) {

        reasons.push(
            "Abnormal temperature rise"
        );

    }


    if (
        Number(reading.humidity) > 85
    ) {

        reasons.push(
            "High humidity anomaly"
        );

    }


    if (!reasons.length) {

        return "Unusual sensor pattern";

    }


    return reasons
        .slice(0, 2)
        .join(" · ");

}


// ==========================================
// DERIVED AI SCORE
// ==========================================

function getAIScore(
    reading,
    severity
) {

    let score;


    if (
        severity === "High"
    ) {

        score = -0.42;

    }

    else if (
        severity === "Medium"
    ) {

        score = -0.18;

    }

    else {

        score = -0.08;

    }


    return score
        .toFixed(2);

}


// ==========================================
// UPDATE LAST UPDATED
// ==========================================

function updateLastUpdated() {

    const element =
        document.getElementById(
            "last-updated"
        );


    if (!element) {

        return;

    }


    const now =
        new Date();


    const time =
        now.toLocaleTimeString(
            undefined,
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );


    element.textContent =
        `Updated ${time}`;

}


// ==========================================
// UPDATE SUMMARY
// ==========================================

function updateSummary(rows) {

    const anomalyCount =
        rows.length;


    // Current API only returns anomalies.
    // Therefore normal readings cannot be
    // calculated from this endpoint alone.

    const totalReadings =
        document.getElementById(
            "total-readings"
        );


    const normalReadings =
        document.getElementById(
            "normal-readings"
        );


    const anomalyElement =
        document.getElementById(
            "anomaly-count"
        );


    const highRiskElement =
        document.getElementById(
            "high-risk-count"
        );


    if (totalReadings) {

        totalReadings.textContent =
            anomalyCount;

    }


    if (normalReadings) {

        normalReadings.textContent =
            "—";

    }


    if (anomalyElement) {

        anomalyElement.textContent =
            anomalyCount;

    }


    const highRiskCount =
        rows.filter(
            reading =>

                getSeverity(
                    reading
                ) === "High"

        ).length;


    if (highRiskElement) {

        highRiskElement.textContent =
            highRiskCount;

    }

}


// ==========================================
// UPDATE ANOMALY TABLE
// ==========================================

function updateTable(rows) {

    const tableBody =
        document.getElementById(
            "anomaly-table-body"
        );


    if (!tableBody) {

        return;

    }


    if (!rows.length) {

        tableBody.innerHTML = `

            <tr>

                <td
                    colspan="5"
                    class="loading-row"
                >

                    No anomalies detected

                </td>

            </tr>

        `;


        return;

    }


    tableBody.innerHTML =
        rows
            .map(reading => {


                const severity =
                    getSeverity(
                        reading
                    );


                const severityClass =
                    getSeverityClass(
                        severity
                    );


                const aiScore =
                    getAIScore(
                        reading,
                        severity
                    );


                const reason =
                    getReason(
                        reading
                    );


                return `

                    <tr>


                        <td>

                            ${formatTime(
                                reading.timestamp
                            )}

                        </td>


                        <td>

                            <strong>

                                ${reading.node_id ?? "—"}

                            </strong>

                        </td>


                        <td>

                            <span
                                class="
                                    severity
                                    ${severityClass}
                                "
                            >

                                ${severity}

                            </span>

                        </td>


                        <td>

                            <span
                                class="ai-score"
                            >

                                <i
                                    class="score-dot"
                                ></i>

                                ${aiScore}

                            </span>

                        </td>


                        <td
                            class="reason"
                        >

                            ${reason}

                        </td>


                    </tr>

                `;

            })
            .join("");

}


// ==========================================
// LOAD ANOMALIES
// ==========================================

async function loadAnomalies() {

    try {

        const response =
            await fetch(
                `${API_BASE}/api/anomalies`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP error ${response.status}`
            );

        }


        const rows =
            await response.json();


        if (!Array.isArray(rows)) {

            throw new Error(
                "Invalid anomaly data"
            );

        }


        updateSummary(
            rows
        );


        updateTable(
            rows
        );


        updateLastUpdated();

    }

    catch (error) {

        console.error(
            "Failed to load anomalies:",
            error
        );


        const tableBody =
            document.getElementById(
                "anomaly-table-body"
            );


        if (tableBody) {

            tableBody.innerHTML = `

                <tr>

                    <td
                        colspan="5"
                        class="loading-row"
                    >

                        Unable to load anomaly data

                    </td>

                </tr>

            `;

        }

    }

}


// ==========================================
// REFRESH
// ==========================================

async function refreshAll() {

    if (refreshButton) {

        refreshButton.disabled =
            true;


        refreshButton.textContent =
            "↻ Refreshing...";

    }


    await loadAnomalies();


    if (refreshButton) {

        refreshButton.disabled =
            false;


        refreshButton.textContent =
            "↻ Refresh";

    }

}


// ==========================================
// INITIAL LOAD
// ==========================================

refreshAll();


// ==========================================
// AUTO REFRESH
// ==========================================

setInterval(
    loadAnomalies,
    REFRESH_MS
);