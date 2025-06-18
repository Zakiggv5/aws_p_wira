// script.js

// API Endpoints - CRITICAL: Update setCommandApiUrl if it's different
const getDataApiUrl = 'https://56zrov84h2.execute-api.ap-southeast-1.amazonaws.com/prod/data';
const setCommandApiUrl = 'https://56zrov84h2.execute-api.ap-southeast-1.amazonaws.com/prod/manual-command'; // Make sure this is correct for your POST endpoint

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

let uiLocked = false; // Simple flag to prevent rapid/overlapping command submissions

// This function updates the entire UI based on data fetched from the backend
function updateUIDisplay(data) {
    console.log("Updating UI with data:", data);

    // --- Sensor Data ---
    tempValueEl.textContent = data.temperature !== undefined ? data.temperature.toFixed(1) : '--';
    humidityValueEl.textContent = data.humidity !== undefined ? data.humidity.toFixed(1) : '--';
    luxValueEl.textContent = data.lux !== undefined ? data.lux : '--';

    if (data.timestamp) { // Assumes this is sensor data timestamp
        const sensorDate = new Date(data.timestamp * 1000);
        timestampValueEl.textContent = sensorDate.toLocaleString();
    } else {
        timestampValueEl.textContent = '--';
    }

    // --- Last Logged Actuator Status ---
    // These keys come from GetDashboardData Lambda's combined output
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
    const currentApiMode = data.mode || "AUTO"; // Default to AUTO if mode isn't in data
    modeStatusTextEl.textContent = currentApiMode;
    modeToggleEl.checked = (currentApiMode === "MANUAL"); // Set toggle based on API response

    if (currentApiMode === "MANUAL") {
        manualControlsContainerEl.style.display = 'block';
        // Pre-fill sliders with last known manual values from API, or their HTML default
        dcMotorSliderEl.value = data.manual_dc_motor !== undefined ? data.manual_dc_motor : dcMotorSliderEl.defaultValue;
        stepperSliderEl.value = data.manual_stepper !== undefined ? data.manual_stepper : stepperSliderEl.defaultValue;
        // Update text displays for sliders
        if(dcMotorValueTextEl) dcMotorValueTextEl.textContent = dcMotorSliderEl.value;
        if(stepperValueTextEl) stepperValueTextEl.textContent = stepperSliderEl.value;
    } else { // AUTO mode
        manualControlsContainerEl.style.display = 'none';
    }
}

// Asynchronous function to send commands (mode changes or manual actuator values)
async function sendControlCommand(payload) {
    if (uiLocked) {
        console.warn("UI is locked, previous command still processing. Ignoring new command.");
        return; // Prevent sending another command while one is in progress
    }
    uiLocked = true;
    console.log("Sending control command to API:", JSON.stringify(payload), "URL:", setCommandApiUrl);

    try {
        const response = await fetch(setCommandApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        let resultText = await response.text(); // Get text first for better error details
        let resultJson = null;
        try {
            resultJson = JSON.parse(resultText);
        } catch (e) {
            // Not a JSON response, which might be okay for some success or expected for some errors
            console.warn("Response from setCommandApiUrl was not valid JSON:", resultText);
        }

        if (!response.ok) {
            console.error('Set command API Error Response:', resultText, 'Status:', response.status);
            throw new Error(`API Error: ${response.status} - ${resultText || 'Failed to set command'}`);
        }

        console.log('Set command API success response:', resultJson || resultText);
        // CRITICAL: Fetch fresh data immediately after a successful command
        // to update the UI with the actual state from the backend.
        fetchData();
    } catch (error) {
        console.error('Error sending control command:', error);
        alert(`Error sending command: ${error.message}`);
        // Fetch data even on error to try and resync UI with backend state
        fetchData();
    } finally {
        uiLocked = false; // Unlock UI for next action
    }
}

// Event Listeners
if (modeToggleEl) {
    modeToggleEl.addEventListener('change', async function() {
        const newMode = this.checked ? "MANUAL" : "AUTO";
        // Send the mode change to the backend.
        // The UI update (showing/hiding sliders, setting toggle accurately)
        // will happen when fetchData() is called by sendControlCommand's success/finally block.
        // We can optimistically update the mode text for immediate feedback.
        modeStatusTextEl.textContent = newMode;
        await sendControlCommand({ mode: newMode });
    });
}

if (dcMotorSliderEl && dcMotorValueTextEl) {
    dcMotorSliderEl.addEventListener('input', function() {
        dcMotorValueTextEl.textContent = this.value;
    });
}

if (stepperSliderEl && stepperValueTextEl) {
    stepperSliderEl.addEventListener('input', function() {
        stepperValueTextEl.textContent = this.value;
    });
}

if (sendManualCommandButtonEl) {
    sendManualCommandButtonEl.addEventListener('click', async function() {
        // Check against the toggle's visual state, but the actual mode authority is backend
        if (modeToggleEl.checked) {
            await sendControlCommand({
                mode: "MANUAL", // Explicitly state mode for this command
                dc_motor: parseInt(dcMotorSliderEl.value),
                stepper: parseInt(stepperSliderEl.value)
            });
        } else {
            alert("System is in AUTO mode. Switch to MANUAL to send actuator commands.");
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
                console.warn("Received empty data object from get API. Displaying defaults.");
            }
            updateUIDisplay(data || {}); // Use the UI update function
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            // Optionally clear the dashboard or show persistent error messages
            // updateUIDisplay({}); // Example: clear fields to default '--'
        });
}

// Fetch data immediately on load and then periodically
fetchData();
const pollInterval = 5000; // Poll every 10 seconds
setInterval(fetchData, pollInterval);
