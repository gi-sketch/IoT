const API_BASE = "http://127.0.0.1:5000";
const REFRESH_MS = 5000;

let aqiChart = null;


// ============================================================
// LOGIN PROTECTION + USER GREETING
// ============================================================

function setupUser() {

    const loggedUser = localStorage.getItem("airiq_user");

    if (!loggedUser) {
        window.location.href = "/login";
        return false;
    }

    try {

        const user = JSON.parse(loggedUser);

        const displayName =
            user?.name?.trim()
                ? user.name.trim().split(/\s+/)[0]
                : "User";

        const greeting =
            document.getElementById("user-greeting");

        if (greeting) {
            greeting.textContent = `Hi, ${displayName}!`;
        }

        const avatar =
            document.getElementById("user-avatar");

        if (avatar) {
            avatar.textContent =
                displayName.charAt(0).toUpperCase();
        }

        return true;

    } catch (error) {

        console.error("Invalid user data:", error);

        localStorage.removeItem("airiq_user");

        window.location.href = "/login";

        return false;
    }
}


// ============================================================
// CLOCK
// ============================================================

function tickClock() {

    const clockLine =
        document.getElementById("clock-line");

    if (!clockLine) return;

    const now = new Date();

    const date =
        now.toLocaleDateString(
            undefined,
            {
                weekday: "long",
                month: "long",
                day: "numeric"
            }
        );

    const time =
        now.toLocaleTimeString(
            undefined,
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        );

    clockLine.textContent =
        `${date} · ${time}`;
}

setInterval(tickClock, 1000);

tickClock();


// ============================================================
// FORMAT VALUE
// ============================================================

function formatValue(value, decimals = 0) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "—";
    }

    const number = Number(value);

    if (Number.isNaN(number)) {
        return "—";
    }

    return number.toFixed(decimals);
}


// ============================================================
// AQI LEVEL
// ============================================================

function getAQILevel(aqi) {

    const value = Number(aqi);

    if (Number.isNaN(value)) {
        return "unknown";
    }

    if (value <= 50) {
        return "good";
    }

    if (value <= 100) {
        return "moderate";
    }

    if (value <= 150) {
        return "unhealthy";
    }

    if (value <= 200) {
        return "very-unhealthy";
    }

    return "hazardous";
}


// ============================================================
// AQI STATUS
// ============================================================

function getAQIStatus(aqi) {

    const level = getAQILevel(aqi);

    switch (level) {

        case "good":
            return "Good";

        case "moderate":
            return "Moderate";

        case "unhealthy":
            return "Unhealthy";

        case "very-unhealthy":
            return "Very Unhealthy";

        case "hazardous":
            return "Hazardous";

        default:
            return "No Data";
    }
}


// ============================================================
// UPDATE AQI STATUS
// ============================================================

function updateAQIStatus(aqi) {

    const element =
        document.getElementById("aqi-status");

    if (!element) return;

    const status = getAQIStatus(aqi);

    element.textContent =
        `● ${status}`;

    element.className =
        "status-moderate";

    const level =
        getAQILevel(aqi);

    if (level === "good") {

        element.classList.add(
            "status-good"
        );

    }

    if (
        level === "unhealthy" ||
        level === "very-unhealthy" ||
        level === "hazardous"
    ) {

        element.classList.add(
            "status-danger"
        );

    }
}


// ============================================================
// UPDATE HEALTH RECOMMENDATION
// ============================================================

function updateHealthRecommendation(aqi) {

    const statusElement =
        document.getElementById("health-status");

    const messageElement =
        document.getElementById("health-message");

    const level =
        getAQILevel(aqi);

    let statusText =
        "No AQI Data";

    let message =
        "Waiting for the latest air quality reading.";


    if (level === "good") {

        statusText =
            "Good Air Quality";

        message =
            "Air quality is good. Outdoor activities can continue normally.";

    }

    else if (level === "moderate") {

        statusText =
            "Moderate Air Quality";

        message =
            "Air quality is acceptable for most people. Sensitive individuals should consider limiting prolonged outdoor activity.";

    }

    else if (level === "unhealthy") {

        statusText =
            "Unhealthy Air Quality";

        message =
            "Air quality may affect sensitive individuals. Consider reducing prolonged outdoor activity and monitor the live AQI.";

    }

    else if (level === "very-unhealthy") {

        statusText =
            "Very Unhealthy Air Quality";

        message =
            "Health effects are possible for everyone. Reduce outdoor activity and keep indoor areas well ventilated.";

    }

    else if (level === "hazardous") {

        statusText =
            "Hazardous Air Quality";

        message =
            "Air quality is hazardous. Avoid unnecessary outdoor activity and follow appropriate health precautions.";

    }


    if (statusElement) {

        statusElement.innerHTML = `
            <i></i>
            ${statusText}
        `;

    }


    if (messageElement) {

        messageElement.textContent =
            message;

    }
}


// ============================================================
// UPDATE DASHBOARD METRICS
// ============================================================

function updateMetricCards(data) {

    // AQI
    const aqi =
        document.getElementById("val-aqi");

    if (aqi) {

        aqi.textContent =
            formatValue(data.aqi);

    }


    // CO2
    const co2 =
        document.getElementById("val-co2");

    if (co2) {

        co2.textContent =
            formatValue(data.co2);

    }


    // CO
    const co =
        document.getElementById("val-co");

    if (co) {

        co.textContent =
            formatValue(data.co);

    }


    // VOC
    const voc =
        document.getElementById("val-voc");

    if (voc) {

        voc.textContent =
            formatValue(data.voc, 2);

    }


    // Temperature
    const temp =
        document.getElementById("val-temp");

    if (temp) {

        temp.textContent =
            formatValue(data.temp, 1);

    }


    // Humidity
    const humidity =
        document.getElementById("val-humidity");

    if (humidity) {

        humidity.textContent =
            formatValue(data.humidity, 1);

    }


    updateAQIStatus(data.aqi);

    updateHealthRecommendation(data.aqi);
}


// ============================================================
// PARSE TIMESTAMP
// ============================================================

function parseTimestamp(timestamp) {

    if (!timestamp) {
        return null;
    }

    let date =
        new Date(timestamp);

    if (Number.isNaN(date.getTime())) {

        date =
            new Date(
                timestamp.replace(" ", "T")
            );

    }

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;
}


// ============================================================
// FORMAT CHART TIME
// ============================================================

function formatChartTime(date) {

    if (!date) {
        return "";
    }

    return date.toLocaleTimeString(
        undefined,
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );
}


// ============================================================
// AQI BACKGROUND ZONES PLUGIN
// ============================================================

const aqiZonesPlugin = {

    id: "aqiZones",

    beforeDraw(chart) {

        if (!chart.chartArea) {
            return;
        }

        const {
            ctx,
            chartArea,
            scales
        } = chart;

        const y =
            scales.y;

        if (!y) {
            return;
        }


        const left =
            chartArea.left;

        const right =
            chartArea.right;

        const top =
            chartArea.top;

        const bottom =
            chartArea.bottom;


        function fillZone(
            min,
            max,
            color
        ) {

            const yTop =
                y.getPixelForValue(max);

            const yBottom =
                y.getPixelForValue(min);

            ctx.save();

            ctx.fillStyle =
                color;

            ctx.fillRect(
                left,
                Math.max(top, yTop),
                right - left,
                Math.min(
                    bottom,
                    yBottom
                ) -
                Math.max(
                    top,
                    yTop
                )
            );

            ctx.restore();
        }


        // SAFE: 0–50
        fillZone(
            0,
            50,
            "rgba(76, 175, 80, 0.10)"
        );


        // MODERATE: 51–100
        fillZone(
            50,
            100,
            "rgba(255, 193, 7, 0.12)"
        );


        // DANGER: 101–150
        fillZone(
            100,
            150,
            "rgba(244, 67, 54, 0.10)"
        );
    }
};


// ============================================================
// CREATE / UPDATE AQI CHART
// ============================================================

function updateAQIChart(rows) {

    const canvas = document.getElementById("aqiChart");

    if (!canvas) {
        console.error("❌ aqiChart canvas not found");
        return;
    }

    if (typeof Chart === "undefined") {
        console.error("❌ Chart.js is not loaded");
        return;
    }

    console.log("📊 Chart received rows:", rows);


    // ========================================================
    // PREPARE REAL SENSOR DATA
    // ========================================================

    const readings = rows
        .map(row => {

            const date = new Date(
                String(row.timestamp).replace(" ", "T")
            );

            return {
                date: date,
                aqi: Number(row.aqi)
            };

        })
        .filter(row => {

            return (
                !isNaN(row.date.getTime()) &&
                !isNaN(row.aqi)
            );

        })
        .sort((a, b) => a.date - b.date);


    console.log(
        "📈 Valid AQI readings:",
        readings
    );


    if (readings.length === 0) {

        console.error(
            "❌ No valid AQI readings available for chart"
        );

        return;
    }


    // ========================================================
    // USE MOST RECENT 24 HOURS OF AVAILABLE SENSOR DATA
    // ========================================================

    const latestDate =
        readings[readings.length - 1].date;


    const twentyFourHoursAgo =
        new Date(
            latestDate.getTime() -
            24 * 60 * 60 * 1000
        );


    let chartData =
        readings.filter(
            reading =>
                reading.date >= twentyFourHoursAgo
        );


    // If there are not enough readings in 24 hours,
    // display the latest real readings available.

    if (chartData.length < 2) {

        chartData =
            readings.slice(-50);

    }


    console.log(
        "📊 Readings being plotted:",
        chartData
    );


    // ========================================================
    // LABELS
    // ========================================================

    const labels =
        chartData.map(
            reading => {

                return reading.date.toLocaleTimeString(
                    undefined,
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                );

            }
        );


    // ========================================================
    // AQI VALUES
    // ========================================================

    const values =
        chartData.map(
            reading =>
                reading.aqi
        );


    console.log(
        "🟢 Chart labels:",
        labels
    );

    console.log(
        "🟢 Chart values:",
        values
    );


    // ========================================================
    // CREATE CHART
    // ========================================================

    if (aqiChart) {

        aqiChart.destroy();

        aqiChart = null;

    }


    const ctx =
        canvas.getContext("2d");


    aqiChart =
        new Chart(
            ctx,
            {

                type: "line",


                data: {

                    labels: labels,

                    datasets: [

                        {

                            label: "AQI",

                            data: values,

                            borderColor: "#111111",

                            backgroundColor:
                                "rgba(17, 17, 17, 0.04)",

                            borderWidth: 3,

                            fill: true,

                            tension: 0.35,

                            pointRadius: 4,

                            pointHoverRadius: 7,

                            pointBackgroundColor:
                                "#111111",

                            pointBorderColor:
                                "#111111"

                        }

                    ]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio: false,


                    animation: {

                        duration: 600

                    },


                    interaction: {

                        mode: "index",

                        intersect: false

                    },


                    plugins: {

                        legend: {

                            display: false

                        },


                        tooltip: {

                            enabled: true,

                            callbacks: {

                                label:
                                    function(context) {

                                        return (
                                            " AQI: " +
                                            context.parsed.y
                                        );

                                    }

                            }

                        }

                    },


                    scales: {

                        x: {

                            display: true,

                            ticks: {

                                color: "#626262",

                                maxTicksLimit: 10,

                                autoSkip: true

                            },

                            grid: {

                                display: false

                            }

                        },


                        y: {

                            display: true,

                            min: 0,

                            max: 150,

                            ticks: {

                                color: "#626262",

                                stepSize: 25

                            },

                            grid: {

                                color:
                                    "rgba(14, 14, 14, 0.08)"

                            }

                        }

                    }

                },


                plugins: [

                    {

                        id: "aqiBackgroundZones",

                        beforeDraw(chart) {

                            const {
                                ctx,
                                chartArea,
                                scales
                            } = chart;


                            if (
                                !chartArea ||
                                !scales.y
                            ) {
                                return;
                            }


                            const y =
                                scales.y;


                            const left =
                                chartArea.left;

                            const width =
                                chartArea.right -
                                chartArea.left;


                            // --------------------------------
                            // SAFE: 0 - 50
                            // --------------------------------

                            const safeTop =
                                y.getPixelForValue(50);

                            const safeBottom =
                                y.getPixelForValue(0);


                            ctx.save();

                            ctx.fillStyle =
                                "rgba(76, 175, 80, 0.10)";

                            ctx.fillRect(
                                left,
                                safeTop,
                                width,
                                safeBottom - safeTop
                            );


                            // --------------------------------
                            // MODERATE: 50 - 100
                            // --------------------------------

                            const moderateTop =
                                y.getPixelForValue(100);

                            const moderateBottom =
                                y.getPixelForValue(50);


                            ctx.fillStyle =
                                "rgba(255, 193, 7, 0.12)";

                            ctx.fillRect(
                                left,
                                moderateTop,
                                width,
                                moderateBottom -
                                moderateTop
                            );


                            // --------------------------------
                            // DANGER: 100 - 150
                            // --------------------------------

                            const dangerTop =
                                y.getPixelForValue(150);

                            const dangerBottom =
                                y.getPixelForValue(100);


                            ctx.fillStyle =
                                "rgba(244, 67, 54, 0.10)";

                            ctx.fillRect(
                                left,
                                dangerTop,
                                width,
                                dangerBottom -
                                dangerTop
                            );


                            ctx.restore();

                        }

                    }

                ]

            }
        );


    console.log(
        " AQI chart successfully created"
    );

}


// ============================================================
// LOAD LATEST SENSOR READING
// ============================================================

async function loadLatest() {

    try {

        const response =
            await fetch(
                `${API_BASE}/api/latest`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log(
            "Latest sensor reading:",
            data
        );


        if (data.error) {

            console.error(
                "Latest API error:",
                data.error
            );

            return;
        }


        updateMetricCards(data);

    }

    catch (error) {

        console.error(
            "loadLatest failed:",
            error
        );

    }

}


// ============================================================
// LOAD ALL SENSOR DATA
// ============================================================

async function loadAll() {

    try {

        const response =
            await fetch(
                `${API_BASE}/api/all`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const rows =
            await response.json();


        console.log(
            "All sensor readings:",
            rows
        );


        if (!Array.isArray(rows)) {

            console.error(
                "Invalid /api/all response:",
                rows
            );

            return;
        }


        updateAQIChart(rows);

    }

    catch (error) {

        console.error(
            "loadAll failed:",
            error
        );

    }

}


// ============================================================
// LOAD ANOMALIES
// ============================================================

async function loadAnomalies() {

    try {

        const response =
            await fetch(
                `${API_BASE}/api/anomalies`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const rows =
            await response.json();


        console.log(
            "Anomaly data:",
            rows
        );

    }

    catch (error) {

        console.error(
            "loadAnomalies failed:",
            error
        );

    }

}


// ============================================================
// REFRESH EVERYTHING
// ============================================================

async function refreshAll() {

    console.log(
        "Refreshing AirIQ sensor data..."
    );


    await Promise.allSettled([

        loadLatest(),

        loadAll(),

        loadAnomalies()

    ]);

}


// ============================================================
// BUTTON EVENTS
// ============================================================

function setupButtons() {

    const refreshButton =
        document.getElementById("refresh-btn");


    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async function() {

                refreshButton.disabled =
                    true;

                refreshButton.textContent =
                    "↻ Refreshing...";


                await refreshAll();


                refreshButton.disabled =
                    false;

                refreshButton.textContent =
                    "↻ Refresh";

            }
        );

    }


    const anomalyButton =
        document.getElementById(
            "view-anomalies-btn"
        );


    if (anomalyButton) {

        anomalyButton.addEventListener(
            "click",
            function() {

                window.location.href =
                    "anomaly-log.html";

            }
        );

    }

}


// ============================================================
// INITIALIZE DASHBOARD
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        if (!setupUser()) {
            return;
        }


        setupButtons();


        refreshAll();


        setInterval(
            refreshAll,
            REFRESH_MS
        );

    }
);