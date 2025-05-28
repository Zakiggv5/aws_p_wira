// API Endpoints - CRITICAL: Update these with your actual deployed API Gateway URLs
const getDataApiUrl = 'https://56zrov84h2.execute-api.ap-southeast-1.amazonaws.com/prod/data';
// This is the NEW endpoint for sending mode changes and manual commands
const setCommandApiUrl = 'https://56zrov84h2.execute-api.ap-southeast-1.amazonaws.com/prod/manual-command'; // <<< UPDATE THIS

// DOM Elements
const humidityValueEl = document.getElementById('humidity-value');
const tempValueEl = document.getElementById('temp-value');
const luxValueEl = document.getElementById('lux-value');
const timestampValueEl = document.getElementById('timestamp-value');

const modeToggleEl = document.getElementById('modeToggle');
const modeStatusTextEl = document.getElementById('modeStatusText');
const manualControlsContainerEl = document.getElementById('manualControlsContainer');

const dcMotorSliderEl = document.getElementById('dcMotorSlider');
const dcMotorValueTextEl = document.getElementById('dcMotorValueText');
const stepperSliderEl = document.getElementById('stepperSlider');
const stepperValueTextEl = document.getElementById('stepperValueText');
const sendManualCommandButtonEl = document.getElementById('sendManualCommandButton');

const dcMotorStatusEl = document.getElementById('dc-motor-status');
const stepperStatusEl = document.getElementById('stepper-status');
const commandSourceEl = document.getElementById('command-source');
const lastCommandTimeEl = document.getElementById('last-command-time');

let currentApiMode = "AUTO"; // Keep track of mode fetched from API

function updateDashboard(data) {
    // --- Sensor Data ---
    tempValueEl.textContent = data.temperature !== undefined ? data.temperature.toFixed(1) : '--';
    humidityValueEl.textContent = data.humidity !== undefined ? data.humidity.toFixed(1) : '--';
    luxValueEl.textContent = data.lux !== undefined ? data.lux : '--';

    if (data.timestamp) {
        const sensorDate = new Date(data.timestamp * 1000);
        timestampValueEl.textContent = sensorDate.toLocaleString();
    } else {
        timestampValueEl.textContent = '--';
    }

    // --- Last Logged Actuator Status ---
    // These come from the DeviceActuatorCommandsLog table via GetDashboardData Lambda
    dcMotorStatusEl.textContent = data.last_logged_dc_motor !== undefined ? data.last_logged_dc_motor : '--';
    stepperStatusEl.textContent = data.last_logged_stepper !== undefined ? data.last_logged_stepper : '--';
    commandSourceEl.textContent = data.last_command_source || '--';
    if (data.last_command_timestamp) {
        const commandDate = new Date(data.last_command_timestamp * 1000);
        lastCommandTimeEl.textContent = commandDate.toLocaleString();
    } else {
        lastCommandTimeEl.textContent = '--';
    }

    // --- Control Mode and Manual Controls UI ---
    currentApiMode = data.mode || "AUTO"; // Update based on API response
    modeStatusTextEl.textContent = currentApiMode;

    if (currentApiMode === "MANUAL") {
        modeToggleEl.checked = true;
        manualControlsContainerEl.style.display = 'block';
        // Pre-fill sliders with last known manual values from API, or default
        dcMotorSliderEl.value = data.manual_dc_motor !== undefined ? data.manual_dc_motor : 50;
        stepperSliderEl.value = data.manual_stepper !== undefined ? data.manual_stepper : 50;
        dcMotorValueTextEl.textContent = dcMotorSliderEl.value;
        stepperValueTextEl.textContent = stepperSliderEl.value;
    } else { // AUTO mode
        modeToggleEl.checked = false;
        manualControlsContainerEl.style.display = 'none';
    }
}

async function sendControlCommand(payload) {
    console.log("Sending command to API:", JSON.stringify(payload));
    try {
        const response = await fetch(setCommandApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Set command API Error Response:', errorText, 'Status:', response.status);
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }
        const result = await response.json();
        console.log('Set command API success response:', result);
        fetchData(); // Refresh dashboard data after sending command to see updated state
    } catch (error) {
        console.error('Error sending control command:', error);
        alert(`Error sending command: ${error.message}`); // User feedback
    }
}

// Event Listeners
if (modeToggleEl) {
    modeToggleEl.addEventListener('change', function() {
        const newMode = this.checked ? "MANUAL" : "AUTO";
        modeStatusTextEl.textContent = newMode; // Optimistic UI update
        if (newMode === "MANUAL") {
            manualControlsContainerEl.style.display = 'block';
            // Optionally pre-fill sliders from current display or defaults if no API data yet
            dcMotorValueTextEl.textContent = dcMotorSliderEl.value;
            stepperValueTextEl.textContent = stepperSliderEl.value;
            // We don't send a command yet, just update the mode locally.
            // The actual command is sent when the "Send Manual Command" button is clicked,
            // or you could send the current slider values immediately when switching to MANUAL.
            // For now, we'll just update the mode in the backend.
            sendControlCommand({ mode: "MANUAL" }); // Tell backend mode has changed
        } else { // Switching to AUTO
            manualControlsContainerEl.style.display = 'none';
            sendControlCommand({ mode: "AUTO" }); // Tell backend to switch to AUTO
        }
    });
}

if (dcMotorSliderEl) {
    dcMotorSliderEl.addEventListener('input', function() {
        dcMotorValueTextEl.textContent = this.value;
    });
}

if (stepperSliderEl) {
    stepperSliderEl.addEventListener('input', function() {
        stepperValueTextEl.textContent = this.value;
    });
}

if (sendManualCommandButtonEl) {
    sendManualCommandButtonEl.addEventListener('click', function() {
        if (modeToggleEl.checked) { // Ensure we are in MANUAL mode (toggle is checked)
            sendControlCommand({
                mode: "MANUAL",
                dc_motor: parseInt(dcMotorSliderEl.value),
                stepper: parseInt(stepperSliderEl.value)
            });
        } else {
            alert("Please switch to MANUAL mode to send actuator commands.");
        }
    });
}

function fetchData() {
    console.log("Fetching data from API...", getDataApiUrl);
    fetch(getDataApiUrl)
        .then(response => {
            if (!response.ok) {
                response.text().then(text => console.error('Get data API Error Response:', text, 'Status:', response.status));
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Data received for dashboard:", data);
            if (data && Object.keys(data).length === 0 && data.constructor === Object) {
                console.warn("Received empty data object from get API.");
            }
            updateDashboard(data || {});
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            // updateDashboard({}); // Clear dashboard on error
        });
}

// Fetch data immediately on load and then periodically
fetchData();
const pollInterval = 10000; // Poll every 10 seconds
setInterval(fetchData, pollInterval);
