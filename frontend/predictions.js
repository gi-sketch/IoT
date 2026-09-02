const API_BASE = "http://127.0.0.1:5000";

const REFRESH_MS = 5000;

let predictionChart;


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
// AQI STATUS
// ==========================================

function getAQIStatus(aqi) {

    const value =
        Number(aqi);


    if (
        value <= 50
    ) {

        return "Good air quality";

    }


    if (
        value <= 100
    ) {

        return "Moderate air quality";

    }


    if (
        value <= 150
    ) {

        return "Sensitive groups should take care";

    }


    if (
        value <= 200
    ) {

        return "Unhealthy air quality";

    }


    return "Very unhealthy air quality";

}


// ==========================================
// FORMAT TIMESTAMP
// ==========================================

function formatChartTime(timestamp) {

    if (!timestamp) {

        return "";

    }


    const date =
        timestamp instanceof Date
            ? timestamp
            : new Date(
                String(timestamp)
                    .replace(" ", "T")
            );


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return date.toLocaleTimeString(
        undefined,
        {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true
        }
    );

}


// ==========================================
// SIMPLE FORECAST MODEL
// ==========================================

function generatePredictions(
    historicalValues
) {

    const values =
        historicalValues
            .filter(
                value =>
                    value !== null &&
                    value !== undefined &&
                    !isNaN(
                        Number(value)
                    )
            )
            .map(
                Number
            );


    if (!values.length) {

        return {
            current: 82,
            min30: 86,
            hour1: 92,
            hour2: 105
        };

    }


    const current =
        values[
            values.length - 1
        ];


    // Calculate recent trend

    const recent =
        values.slice(
            -6
        );


    let averageChange =
        0;


    if (
        recent.length > 1
    ) {

        let totalChange =
            0;


        for (
            let i = 1;
            i < recent.length;
            i++
        ) {

            totalChange +=
                recent[i] -
                recent[i - 1];

        }


        averageChange =
            totalChange /
            (
                recent.length - 1
            );

    }


    // Prevent unrealistic jumps

    averageChange =
        Math.max(
            -8,
            Math.min(
                12,
                averageChange
            )
        );


    const min30 =
        Math.max(
            0,
            Math.round(
                current +
                averageChange * 1.5
            )
        );


    const hour1 =
        Math.max(
            0,
            Math.round(
                current +
                averageChange * 3
            )
        );


    const hour2 =
        Math.max(
            0,
            Math.round(
                current +
                averageChange * 6
            )
        );


    return {

        current,

        min30,

        hour1,

        hour2

    };

}


// ==========================================
// UPDATE FORECAST CARDS
// ==========================================

function updateForecastCards(
    forecast
) {

    const current =
        document.getElementById(
            "current-aqi"
        );


    const prediction30 =
        document.getElementById(
            "prediction-30"
        );


    const prediction60 =
        document.getElementById(
            "prediction-60"
        );


    const prediction120 =
        document.getElementById(
            "prediction-120"
        );


    if (current) {

        current.textContent =
            forecast.current;

    }


    if (prediction30) {

        prediction30.textContent =
            forecast.min30;

    }


    if (prediction60) {

        prediction60.textContent =
            forecast.hour1;

    }


    if (prediction120) {

        prediction120.textContent =
            forecast.hour2;

    }


    // Current status

    const currentStatus =
        document.getElementById(
            "current-status"
        );


    if (currentStatus) {

        currentStatus.textContent =
            getAQIStatus(
                forecast.current
            );

    }


    const status30 =
        document.getElementById(
            "status-30"
        );


    if (status30) {

        status30.textContent =
            getAQIStatus(
                forecast.min30
            );

    }


    const status60 =
        document.getElementById(
            "status-60"
        );


    if (status60) {

        status60.textContent =
            getAQIStatus(
                forecast.hour1
            );

    }


    const status120 =
        document.getElementById(
            "status-120"
        );


    if (status120) {

        status120.textContent =
            getAQIStatus(
                forecast.hour2
            );

    }

}


// ==========================================
// UPDATE AI RECOMMENDATION
// ==========================================

function updateRecommendation(
    forecast
) {

    const title =
        document.getElementById(
            "recommendation-title"
        );


    const text =
        document.getElementById(
            "recommendation-text"
        );


    if (
        !title ||
        !text
    ) {

        return;

    }


    const increase =
        forecast.hour2 -
        forecast.current;


    if (
        forecast.hour2 >
        forecast.current + 10
    ) {

        title.textContent =
            "AQI is predicted to increase";


        text.textContent =
            "AQI is predicted to increase over the next two hours. Consider reducing outdoor activities for sensitive groups and monitor air quality conditions before extended outdoor exposure.";

    }

    else if (
        forecast.hour2 <
        forecast.current - 10
    ) {

        title.textContent =
            "Air quality is expected to improve";


        text.textContent =
            "AQI is predicted to decrease over the next two hours. Air quality conditions may gradually improve if the current trend continues.";

    }

    else {

        title.textContent =
            "Air quality is expected to remain stable";


        text.textContent =
            "AQI is predicted to remain relatively stable over the next two hours. Continue monitoring conditions for any sudden changes in pollution levels.";

    }

}


// ==========================================
// UPDATE CHART
// ==========================================

// ==========================================
// UPDATE CHART
// ==========================================

function updateChart(
    historicalRows,
    forecast
) {

    const canvas =
        document.getElementById(
            "predictionChart"
        );


    if (!canvas) {

        console.error(
            "Prediction chart canvas not found"
        );

        return;

    }


    // ------------------------------------------
    // Keep chronological order
    // ------------------------------------------

    const recentRows =
        historicalRows
            .slice(-12);


    // ------------------------------------------
    // Historical labels
    // ------------------------------------------

    const historicalLabels =
        recentRows.map(
            reading =>
                formatChartTime(
                    reading.timestamp
                )
        );


    // ------------------------------------------
    // Historical AQI values
    // ------------------------------------------

    const historicalValues =
        recentRows.map(
            reading =>
                Number(
                    reading.aqi
                )
        );


    // ------------------------------------------
    // Get latest sensor timestamp
    // ------------------------------------------

    let latestTimestamp = null;


    if (recentRows.length > 0) {

        const lastReading =
            recentRows[
                recentRows.length - 1
            ];


        if (lastReading.timestamp) {

            latestTimestamp =
                new Date(
                    lastReading.timestamp
                        .replace(" ", "T")
                );

        }

    }


    // ------------------------------------------
    // If no sensor timestamp exists,
    // use current computer time
    // ------------------------------------------

    if (
        !latestTimestamp ||
        isNaN(
            latestTimestamp.getTime()
        )
    ) {

        latestTimestamp =
            new Date();

    }


    // ------------------------------------------
    // Create forecast timestamps
    // ------------------------------------------

    const prediction30Time =
        new Date(
            latestTimestamp.getTime()
            +
            30 * 60 * 1000
        );


    const prediction60Time =
        new Date(
            latestTimestamp.getTime()
            +
            60 * 60 * 1000
        );


    const prediction120Time =
        new Date(
            latestTimestamp.getTime()
            +
            120 * 60 * 1000
        );


    // ------------------------------------------
    // Format forecast times
    // ------------------------------------------

    const prediction30Label =
        formatChartTime(
            prediction30Time
        );


    const prediction60Label =
        formatChartTime(
            prediction60Time
        );


    const prediction120Label =
        formatChartTime(
            prediction120Time
        );


    // ------------------------------------------
    // Labels
    // ------------------------------------------

    const labels = [

        ...historicalLabels,

        prediction30Label,

        prediction60Label,

        prediction120Label

    ];


    // ------------------------------------------
    // Historical line
    // ------------------------------------------

    const historicalData = [

        ...historicalValues,

        forecast.current,

        null,

        null

    ];


    // ------------------------------------------
    // Prediction line
    // ------------------------------------------

    const predictedData = [

        ...new Array(
            historicalValues.length - 1
        ).fill(null),

        forecast.current,

        forecast.min30,

        forecast.hour1,

        forecast.hour2

    ];


    // ------------------------------------------
    // Destroy previous chart
    // ------------------------------------------

    if (predictionChart) {

        predictionChart.destroy();

    }


    // ------------------------------------------
    // Create chart
    // ------------------------------------------

    predictionChart =
        new Chart(
            canvas.getContext("2d"),
            {

                type: "line",


                data: {

                    labels,


                    datasets: [

                        {

                            label:
                                "Historical AQI",


                            data:
                                historicalData,


                            borderColor:
                                "#20272e",


                            backgroundColor:
                                "rgba(32,39,46,0.05)",


                            borderWidth:
                                3,


                            tension:
                                0.35,


                            pointRadius:
                                3,


                            pointHoverRadius:
                                5,


                            pointBackgroundColor:
                                "#20272e",


                            fill:
                                true,


                            spanGaps:
                                false

                        },


                        {

                            label:
                                "Predicted AQI",


                            data:
                                predictedData,


                            borderColor:
                                "#6d7780",


                            borderWidth:
                                3,


                            borderDash:
                                [8, 7],


                            tension:
                                0.35,


                            pointRadius:
                                4,


                            pointHoverRadius:
                                6,


                            pointBackgroundColor:
                                "#ffffff",


                            pointBorderColor:
                                "#20272e",


                            pointBorderWidth:
                                2,


                            fill:
                                false,


                            spanGaps:
                                true

                        }

                    ]

                },


                options: {

                    responsive:
                        true,


                    maintainAspectRatio:
                        false,


                    interaction: {

                        mode:
                            "index",


                        intersect:
                            false

                    },


                    plugins: {

                        legend: {

                            display:
                                false

                        },


                        tooltip: {

                            backgroundColor:
                                "#20272e",


                            titleColor:
                                "#ffffff",


                            bodyColor:
                                "#d6dce0",


                            padding:
                                12,


                            displayColors:
                                false

                        }

                    },


                    scales: {

                        x: {

                            grid: {

                                display:
                                    false

                            },


                            ticks: {

                                color:
                                    "#7d858d",


                                font: {

                                    size:
                                        10

                                },


                                maxRotation:
                                    0,


                                autoSkip:
                                    true,


                                maxTicksLimit:
                                    12

                            }

                        },


                        y: {

                            beginAtZero:
                                false,


                            grid: {

                                color:
                                    "rgba(32,39,46,0.07)"

                            },


                            ticks: {

                                color:
                                    "#7d858d",


                                font: {

                                    size:
                                        10

                                },


                                callback:
                                    value =>
                                        value +
                                        " AQI"

                            }

                        }

                    }

                }

            }
        );

}


// ==========================================
// LAST UPDATED
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


    element.textContent =
        `Updated ${now.toLocaleTimeString(
            undefined,
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        )}`;

}


// ==========================================
// LOAD PREDICTION DATA
// ==========================================

async function loadPredictionData() {

    try {

        const response =
            await fetch(
                `${API_BASE}/api/all`
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
                "Invalid sensor data"
            );

        }


        // API returns newest → oldest
        // Reverse for chronological order

        const ordered =
            [...rows]
                .reverse()
                .filter(
                    reading =>
                        reading.aqi !== null &&
                        reading.aqi !== undefined
                );


        const historicalValues =
            ordered.map(
                reading =>
                    Number(
                        reading.aqi
                    )
            );


        const forecast =
            generatePredictions(
                historicalValues
            );


        updateForecastCards(
            forecast
        );


        updateChart(
            ordered,
            forecast
        );


        updateRecommendation(
            forecast
        );


        updateLastUpdated();

    }

    catch (error) {

        console.error(
            "Failed to load prediction data:",
            error
        );


        // Fallback example values

        const fallbackForecast = {

            current: 82,

            min30: 86,

            hour1: 92,

            hour2: 105

        };


        updateForecastCards(
            fallbackForecast
        );


        updateRecommendation(
            fallbackForecast
        );


        updateChart(
            [],
            fallbackForecast
        );

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


    await loadPredictionData();


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
    loadPredictionData,
    REFRESH_MS
);