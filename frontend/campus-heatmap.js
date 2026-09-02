// ==========================================
// AIRIQ CAMPUS HEATMAP
// ==========================================

const API_BASE = "http://127.0.0.1:5000";

const REFRESH_MS = 5000;

let map = null;
let heatLayer = null;
let nodeMarkers = [];


// ==========================================
// LOGIN PROTECTION
// ==========================================

const loggedUser =
    localStorage.getItem("airiq_user");

if (!loggedUser) {
    window.location.href = "/login";
}


// ==========================================
// NODE LOCATIONS
//
// IMPORTANT:
// These coordinates are examples.
// Replace them with your actual ESP32
// locations later.
// ==========================================

const NODE_LOCATIONS = {

    // API returns "nodeA"
    "nodeA": {

        name: "Node A — Main Block",

        area: "Main Block",

        lat: 9.9312,

        lng: 76.2673

    },

    // API may return "nodeB"
    "nodeB": {

        name: "Node B — Campus Ground",

        area: "Campus Ground",

        lat: 9.9320,

        lng: 76.2685

    },

    // Also support these formats
    // in case your database changes later.

    "Node A": {

        name: "Node A — Main Block",

        area: "Main Block",

        lat: 9.9312,

        lng: 76.2673

    },

    "Node B": {

        name: "Node B — Campus Ground",

        area: "Campus Ground",

        lat: 9.9320,

        lng: 76.2685

    }

};


// ==========================================
// USER GREETING
// ==========================================

function loadUserGreeting() {

    try {

        const user =
            JSON.parse(
                localStorage.getItem("airiq_user")
            );

        if (!user) {
            return;
        }

        const displayName =
            user.name
                ? user.name
                    .trim()
                    .split(/\s+/)[0]
                : "User";


        const greeting =
            document.getElementById(
                "user-greeting"
            );

        if (greeting) {

            greeting.textContent =
                `Hi, ${displayName}!`;

        }


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
            "User loading failed:",
            error
        );

    }

}


// ==========================================
// INITIALIZE MAP
// ==========================================

function initializeMap() {

    const mapElement =
        document.getElementById(
            "campus-map"
        );


    if (!mapElement) {

        console.error(
            " campus-map element not found"
        );

        return;

    }


    // Make sure Leaflet is loaded

    if (typeof L === "undefined") {

        console.error(
            " Leaflet is not loaded"
        );

        return;

    }


    map =
        L.map(
            "campus-map",
            {
                zoomControl: true
            }
        )
        .setView(
            [
                9.9316,
                76.2679
            ],
            17
        );


    L.tileLayer(

        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",

        {

            maxZoom: 21,

            attribution:
                "&copy; OpenStreetMap contributors"

        }

    ).addTo(map);


    // Fix Leaflet rendering

    setTimeout(
        () => {

            if (map) {

                map.invalidateSize();

            }

        },
        300
    );


    // Add current-location button

    addLocationButton();


    console.log(
        " Map initialized"
    );

}


// ==========================================
// CURRENT LOCATION BUTTON
// ==========================================

function addLocationButton() {

    if (!map) {
        return;
    }


    const LocationControl =
        L.Control.extend({

            options: {
                position: "topleft"
            },


            onAdd: function () {

                const container =
                    L.DomUtil.create(
                        "div",
                        "leaflet-bar leaflet-control"
                    );


                const button =
                    L.DomUtil.create(
                        "a",
                        "",
                        container
                    );


                button.href = "#";

                button.title =
                    "Show my current location";

                button.innerHTML = "⌖";


                button.style.width =
                    "30px";

                button.style.height =
                    "30px";

                button.style.lineHeight =
                    "30px";

                button.style.textAlign =
                    "center";

                button.style.fontSize =
                    "20px";

                button.style.fontWeight =
                    "bold";


                L.DomEvent.disableClickPropagation(
                    container
                );


                L.DomEvent.on(
                    button,
                    "click",
                    function (event) {

                        event.preventDefault();

                        locateUser();

                    }
                );


                return container;

            }

        });


    map.addControl(
        new LocationControl()
    );

}


// ==========================================
// GET USER CURRENT LOCATION
// ==========================================

function locateUser() {

    if (!navigator.geolocation) {

        alert(
            "Your browser does not support location access."
        );

        return;

    }


    navigator.geolocation.getCurrentPosition(

        function (position) {

            const lat =
                position.coords.latitude;

            const lng =
                position.coords.longitude;

            const accuracy =
                position.coords.accuracy;


            console.log(
                "📍 Current location:",
                lat,
                lng
            );


            // Remove previous location

            if (
                window.userLocationMarker
            ) {

                map.removeLayer(
                    window.userLocationMarker
                );

            }


            if (
                window.userAccuracyCircle
            ) {

                map.removeLayer(
                    window.userAccuracyCircle
                );

            }


            // Blue current-location marker

            window.userLocationMarker =
                L.circleMarker(

                    [
                        lat,
                        lng
                    ],

                    {

                        radius: 9,

                        color: "#ffffff",

                        weight: 3,

                        fillColor: "#2563eb",

                        fillOpacity: 1

                    }

                ).addTo(map);


            window.userLocationMarker.bindPopup(
                "<strong>Your Current Location</strong>"
            );


            // Accuracy circle

            window.userAccuracyCircle =
                L.circle(

                    [
                        lat,
                        lng
                    ],

                    {

                        radius: accuracy,

                        color: "#2563eb",

                        fillColor: "#2563eb",

                        fillOpacity: 0.08,

                        weight: 1

                    }

                ).addTo(map);


            // Move map

            map.setView(
                [
                    lat,
                    lng
                ],
                17
            );


            window.userLocationMarker.openPopup();

        },


        function (error) {

            console.error(
                "Location error:",
                error
            );


            alert(
                "Location access was denied. Please allow location access in your browser."
            );

        },

        {

            enableHighAccuracy: true,

            timeout: 10000,

            maximumAge: 0

        }

    );

}


// ==========================================
// GET LATEST READING FOR EACH NODE
// ==========================================

function getLatestNodeReadings(rows) {

    const latestByNode = {};


    for (
        const reading of rows
    ) {

        const nodeId =
            reading.node_id;


        if (!nodeId) {
            continue;
        }


        if (!latestByNode[nodeId]) {

            latestByNode[nodeId] =
                reading;

            continue;

        }


        const currentTimestamp =
            latestByNode[nodeId]
                .timestamp;


        const readingTimestamp =
            reading.timestamp;


        const currentTime =
            new Date(
                String(currentTimestamp)
                    .replace(" ", "T")
            ).getTime();


        const readingTime =
            new Date(
                String(readingTimestamp)
                    .replace(" ", "T")
            ).getTime();


        if (
            readingTime >
            currentTime
        ) {

            latestByNode[nodeId] =
                reading;

        }

    }


    return Object.values(
        latestByNode
    );

}


// ==========================================
// AQI HEAT INTENSITY
// ==========================================

function getHeatIntensity(aqi) {

    const value =
        Number(aqi);


    if (
        Number.isNaN(value)
    ) {

        return 0;

    }


    // AQI 0 → 200

    return Math.min(

        1,

        Math.max(

            0.15,

            value / 200

        )

    );

}


// ==========================================
// AQI STATUS
// ==========================================

function getAQIStatus(aqi) {

    const value =
        Number(aqi);


    if (
        Number.isNaN(value)
    ) {

        return {

            label: "Unknown",

            className: "unknown"

        };

    }


    if (value <= 50) {

        return {

            label: "Clean",

            className: "good"

        };

    }


    if (value <= 100) {

        return {

            label: "Moderate",

            className: "moderate"

        };

    }


    if (value <= 150) {

        return {

            label: "Unhealthy",

            className: "unhealthy"

        };

    }


    return {

        label: "Very High",

        className: "severe"

    };

}


// ==========================================
// NODE ONLINE STATUS
// ==========================================

function getNodeStatus(timestamp) {

    if (!timestamp) {

        return {

            text: "Offline",

            className: "offline"

        };

    }


    const readingTime =
        new Date(
            String(timestamp)
                .replace(" ", "T")
        ).getTime();


    if (
        Number.isNaN(
            readingTime
        )
    ) {

        return {

            text: "Offline",

            className: "offline"

        };

    }


    const difference =
        Date.now() -
        readingTime;


    const fiveMinutes =
        5 * 60 * 1000;


    if (
        difference >= 0 &&
        difference < fiveMinutes
    ) {

        return {

            text: "Online",

            className: "online"

        };

    }


    return {

        text: "Offline",

        className: "offline"

    };

}


// ==========================================
// FORMAT VALUE
// ==========================================

function formatValue(
    value,
    fallback = "—"
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return fallback;

    }


    return value;

}


// ==========================================
// GET AQI COLOR
// ==========================================

function getAQIColor(aqi) {

    const value =
        Number(aqi);


    if (value <= 50) {

        return "#22c55e";

    }


    if (value <= 100) {

        return "#eab308";

    }


    if (value <= 150) {

        return "#f97316";

    }


    return "#ef4444";

}


// ==========================================
// CREATE NODE ICON
// ==========================================

function createNodeIcon(
    aqi,
    status
) {

    const aqiStatus =
        getAQIStatus(aqi);


    return L.divIcon({

        className:
            "custom-node-marker",

        html:

            `

            <div class="
                map-node-marker
                ${aqiStatus.className}
                ${status.className}
            ">

                <div
                    class="map-node-marker-dot"
                    style="
                        background:${getAQIColor(aqi)};
                    "
                ></div>

                <span>
                    ${formatValue(aqi)}
                </span>

            </div>

            `,

        iconSize:
            [50, 50],

        iconAnchor:
            [25, 25],

        popupAnchor:
            [0, -25]

    });

}


// ==========================================
// CLEAR MAP DATA
// ==========================================

function clearMapData() {

    if (!map) {
        return;
    }


    if (heatLayer) {

        map.removeLayer(
            heatLayer
        );

        heatLayer = null;

    }


    for (
        const marker of nodeMarkers
    ) {

        map.removeLayer(
            marker
        );

    }


    nodeMarkers = [];

}


// ==========================================
// UPDATE HEATMAP
// ==========================================

function updateHeatmap(nodes) {

    if (!map) {

        console.error(
            "Map is not initialized"
        );

        return;

    }


    clearMapData();


    const heatPoints = [];


    console.log(
        " Nodes received:",
        nodes
    );


    for (
        const reading of nodes
    ) {

        const location =
            NODE_LOCATIONS[
                reading.node_id
            ];


        if (!location) {

            console.warn(
                "⚠️ No location configured for:",
                reading.node_id
            );

            continue;

        }


        const aqi =
            Number(
                reading.aqi
            );


        if (
            Number.isNaN(aqi)
        ) {

            continue;

        }


        heatPoints.push(

            [

                location.lat,

                location.lng,

                getHeatIntensity(aqi)

            ]

        );

    }


    // ==========================================
    // CREATE HEATMAP
    // ==========================================

    if (
        heatPoints.length > 0
    ) {

        if (
            typeof L.heatLayer !==
            "function"
        ) {

            console.error(
                "❌ Leaflet.heat is not loaded"
            );

        }

        else {

            heatLayer =
                L.heatLayer(

                    heatPoints,

                    {

                        radius: 90,

                        blur: 60,

                        maxZoom: 19,

                        minOpacity: 0.45,

                        gradient: {

                            0.15:
                                "#22c55e",

                            0.35:
                                "#84cc16",

                            0.50:
                                "#eab308",

                            0.70:
                                "#f97316",

                            0.85:
                                "#ef4444",

                            1.00:
                                "#991b1b"

                        }

                    }

                )
                .addTo(map);

        }

    }


    // ==========================================
    // CREATE SENSOR MARKERS
    // ==========================================

    for (
        const reading of nodes
    ) {

        const location =
            NODE_LOCATIONS[
                reading.node_id
            ];


        if (!location) {
            continue;
        }


        const status =
            getNodeStatus(
                reading.timestamp
            );


        const aqiStatus =
            getAQIStatus(
                reading.aqi
            );


        const marker =
            L.marker(

                [
                    location.lat,
                    location.lng
                ],

                {

                    icon:
                        createNodeIcon(
                            reading.aqi,
                            status
                        )

                }

            ).addTo(map);


        marker.bindPopup(

            `

            <div class="node-popup">

                <h3>
                    ${location.name}
                </h3>

                <div class="popup-row">

                    <span>AQI</span>

                    <strong>
                        ${formatValue(
                            reading.aqi
                        )}
                    </strong>

                </div>

                <div class="popup-row">

                    <span>CO₂</span>

                    <strong>
                        ${formatValue(
                            reading.co2
                        )} ppm
                    </strong>

                </div>

                <div class="popup-row">

                    <span>Temperature</span>

                    <strong>
                        ${formatValue(
                            reading.temp
                        )}°C
                    </strong>

                </div>

                <div class="popup-row">

                    <span>Status</span>

                    <strong>
                        ${
                            status.text === "Online"
                                ? " Online"
                                : " Offline"
                        }
                    </strong>

                </div>

                <div class="
                    popup-footer
                    ${aqiStatus.className}
                ">

                    AQI Level:
                    ${aqiStatus.label}

                </div>

            </div>

            `

        );


        nodeMarkers.push(
            marker
        );

    }


    // ==========================================
    // AUTO FIT TO SENSORS
    // ==========================================

    if (
        heatPoints.length > 1
    ) {

        const bounds =
            L.latLngBounds(

                heatPoints.map(
                    point => [
                        point[0],
                        point[1]
                    ]
                )

            );


        map.fitBounds(
            bounds.pad(0.5)
        );

    }

    else if (
        heatPoints.length === 1
    ) {

        map.setView(

            [
                heatPoints[0][0],
                heatPoints[0][1]
            ],

            18

        );

    }

}


// ==========================================
// UPDATE WORST / CLEANEST
// ==========================================

function updateDailySummary(nodes) {

    const validNodes =
        nodes.filter(

            node => {

                const aqi =
                    Number(
                        node.aqi
                    );

                return !Number.isNaN(
                    aqi
                );

            }

        );


    const worstArea =
        document.getElementById(
            "worst-area"
        );


    const worstDetails =
        document.getElementById(
            "worst-details"
        );


    const cleanestArea =
        document.getElementById(
            "cleanest-area"
        );


    const cleanestDetails =
        document.getElementById(
            "cleanest-details"
        );


    if (
        !validNodes.length
    ) {

        if (worstArea) {

            worstArea.textContent =
                "No data";

        }


        if (worstDetails) {

            worstDetails.textContent =
                "Waiting for sensor data";

        }


        if (cleanestArea) {

            cleanestArea.textContent =
                "No data";

        }


        if (cleanestDetails) {

            cleanestDetails.textContent =
                "Waiting for sensor data";

        }


        return;

    }


    const sorted =
        [...validNodes]
            .sort(

                (a, b) =>
                    Number(b.aqi) -
                    Number(a.aqi)

            );


    const worst =
        sorted[0];


    const cleanest =
        sorted[
            sorted.length - 1
        ];


    const worstLocation =
        NODE_LOCATIONS[
            worst.node_id
        ];


    const cleanestLocation =
        NODE_LOCATIONS[
            cleanest.node_id
        ];


    if (worstArea) {

        worstArea.textContent =
            `${worstLocation?.area || worst.node_id} — AQI ${worst.aqi}`;

    }


    if (worstDetails) {

        worstDetails.textContent =
            `Latest reading from ${
                worstLocation?.name ||
                worst.node_id
            }`;

    }


    if (cleanestArea) {

        cleanestArea.textContent =
            `${cleanestLocation?.area || cleanest.node_id} — AQI ${cleanest.aqi}`;

    }


    if (cleanestDetails) {

        cleanestDetails.textContent =
            `Latest reading from ${
                cleanestLocation?.name ||
                cleanest.node_id
            }`;

    }

}


// ==========================================
// UPDATE NODE CARDS
// ==========================================

function updateNodeCards(nodes) {

    const grid =
        document.getElementById(
            "node-grid"
        );


    // Your current HTML may not have
    // node-grid, so don't treat that as
    // an error.

    if (!grid) {

        return;

    }


    if (!nodes.length) {

        grid.innerHTML =
            `
            <div class="heatmap-loading">
                No sensor node data available.
            </div>
            `;

        return;

    }


    grid.innerHTML =
        nodes
            .map(

                reading => {

                    const location =
                        NODE_LOCATIONS[
                            reading.node_id
                        ];


                    const status =
                        getNodeStatus(
                            reading.timestamp
                        );


                    const aqiStatus =
                        getAQIStatus(
                            reading.aqi
                        );


                    return `

                        <div class="heatmap-node-card">

                            <div class="node-card-header">

                                <div>

                                    <div class="heatmap-node-name">

                                        ${
                                            location?.name ||
                                            reading.node_id
                                        }

                                    </div>

                                    <div class="heatmap-node-location">

                                        📍 ${
                                            location?.area ||
                                            "Campus Area"
                                        }

                                    </div>

                                </div>

                                <span class="
                                    node-status
                                    ${status.className}
                                ">

                                    ${
                                        status.text === "Online"
                                            ? " Online"
                                            : " Offline"
                                    }

                                </span>

                            </div>


                            <div class="heatmap-node-aqi">

                                ${formatValue(
                                    reading.aqi
                                )}

                            </div>


                            <div class="heatmap-node-metrics">

                                <div>

                                    <span>AQI</span>

                                    <strong>
                                        ${formatValue(
                                            reading.aqi
                                        )}
                                    </strong>

                                </div>


                                <div>

                                    <span>CO₂</span>

                                    <strong>
                                        ${formatValue(
                                            reading.co2
                                        )} ppm
                                    </strong>

                                </div>


                                <div>

                                    <span>Temperature</span>

                                    <strong>
                                        ${formatValue(
                                            reading.temp
                                        )}°C
                                    </strong>

                                </div>


                                <div>

                                    <span>AQI Level</span>

                                    <strong>
                                        ${aqiStatus.label}
                                    </strong>

                                </div>

                            </div>

                        </div>

                    `;

                }

            )
            .join("");

}


// ==========================================
// LAST UPDATED
// ==========================================

function updateLastUpdated() {

    // Your current HTML uses this ID

    const updateText =
        document.getElementById(
            "last-updated"
        );


    if (!updateText) {
        return;
    }


    updateText.textContent =
        `Last updated ${new Date().toLocaleTimeString(
            undefined,
            {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit"
            }
        )}`;

}


// ==========================================
// LOAD SENSOR DATA
// ==========================================

async function loadHeatmapData() {

    try {

        console.log(
            " Loading sensor data..."
        );


        const response =
            await fetch(
                `${API_BASE}/api/all`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const rows =
            await response.json();


        if (!Array.isArray(rows)) {

            throw new Error(
                "API did not return an array"
            );

        }


        console.log(
            "API rows:",
            rows
        );


        const latestNodes =
            getLatestNodeReadings(
                rows
            );


        console.log(
            " Latest nodes:",
            latestNodes
        );


        updateHeatmap(
            latestNodes
        );


        updateDailySummary(
            latestNodes
        );


        updateNodeCards(
            latestNodes
        );


        updateLastUpdated();


        // Change connection text if
        // your HTML contains it

        const connection =
            document.getElementById(
                "heatmap-status"
            );


        if (connection) {

            connection.textContent =
                "Live IoT Data";

        }

    }

    catch (error) {

        console.error(
            " Heatmap loading failed:",
            error
        );


        const updateText =
            document.getElementById(
                "last-updated"
            );


        if (updateText) {

            updateText.textContent =
                "Unable to load sensor data";

        }

    }

}


// ==========================================
// REFRESH BUTTON
// ==========================================

function setupRefreshButton() {

    const refreshButton =
        document.getElementById(
            "refresh-btn"
        );


    if (!refreshButton) {

        console.warn(
            "Refresh button not found"
        );

        return;

    }


    refreshButton.addEventListener(

        "click",

        async () => {

            refreshButton.disabled =
                true;


            const originalText =
                refreshButton.textContent;


            refreshButton.textContent =
                "Refreshing...";


            await loadHeatmapData();


            refreshButton.textContent =
                originalText;


            refreshButton.disabled =
                false;

        }

    );

}


// ==========================================
// START PAGE
// ==========================================

function initializeHeatmapPage() {

    console.log(
        " AirIQ Heatmap starting..."
    );


    loadUserGreeting();


    initializeMap();


    setupRefreshButton();


    loadHeatmapData();


    setInterval(
        loadHeatmapData,
        REFRESH_MS
    );

}


document.addEventListener(
    "DOMContentLoaded",
    initializeHeatmapPage
);