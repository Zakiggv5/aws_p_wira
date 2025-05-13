// IMPORTANT: Replace with your actual API Gateway Invoke URL + /data endpoint
const apiUrl = 'https://56zrov84h2.execute-api.ap-southeast-1.amazonaws.com/prod/data';

function updateDashboard(data) {
    // Use default '--' if data or specific field is missing
    document.getElementById('temp-value').textContent = data.temperature !== undefined ? data.temperature.toFixed(1) : '--';
    document.getElementById('humidity-value').textContent = data.humidity !== undefined ? data.humidity.toFixed(1) : '--';
    document.getElementById('lux-value').textContent = data.lux !== undefined ? data.lux : '--';

    // Format timestamp if available
    if (data.timestamp) {
        const date = new Date(data.timestamp * 1000); // Assuming timestamp is in seconds
        document.getElementById('timestamp-value').textContent = date.toLocaleString();
    } else {
        document.getElementById('timestamp-value').textContent = '--';
    }

    // --- Update Actuator Status (Requires modification of GetDashboardData Lambda) ---
    // The GetDashboardData Lambda currently only fetches the latest sensor data.
    // To show actuator state, you'd need a way to store/retrieve it. Options:
    // 1. Store latest command in DynamoDB along with sensors (complex update logic).
    // 2. Store latest command in a separate DynamoDB item/table.
    // 3. Have ESP32 publish its *current* state periodically (adds traffic).

    // Placeholder - Assuming data object might contain these IF backend is updated
    document.getElementById('dc-motor-status').textContent = data.dc_motor_state !== undefined ? data.dc_motor_state : '--';
    document.getElementById('stepper-status').textContent = data.stepper_state !== undefined ? data.stepper_state : '--';
    // --- End Placeholder ---

}

function fetchData() {
    console.log("Fetching data from API...");
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Data received:", data);
            updateDashboard(data);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            // Optionally update UI to show error state
            // updateDashboard({}); // Clear fields on error
        });
}

// Fetch data immediately on load
fetchData();

// Set interval to fetch data periodically (e.g., every 15 seconds)
// Be mindful of API Gateway/Lambda free tier limits if polling very frequently
const pollInterval = 2000; // 2 seconds
setInterval(fetchData, pollInterval);
