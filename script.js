// IMPORTANT: Replace with your actual API Gateway Invoke URL + /data endpoint
const apiUrl = 'https://56zrov84h2.execute-api.ap-southeast-1.amazonaws.com/prod/data'; // Make sure this is still correct

function updateDashboard(data) {
    // --- Sensor Data ---
    document.getElementById('temp-value').textContent = data.temperature !== undefined ? data.temperature.toFixed(1) : '--';
    document.getElementById('humidity-value').textContent = data.humidity !== undefined ? data.humidity.toFixed(1) : '--';
    document.getElementById('lux-value').textContent = data.lux !== undefined ? data.lux : '--';

    // Display sensor data timestamp (from 'timestamp' key, which came from sensor_table)
    if (data.timestamp) {
        const sensorDate = new Date(data.timestamp * 1000); // Assuming timestamp is in seconds
        document.getElementById('timestamp-value').textContent = sensorDate.toLocaleString();
    } else {
        document.getElementById('timestamp-value').textContent = '--';
    }

    // --- Actuator Command Status ---
    // These keys match what the GetDashboardData Lambda constructs from DeviceActuatorCommandsLog
    document.getElementById('dc-motor-status').textContent = data.dc_motor_command !== undefined ? data.dc_motor_command : '--';
    document.getElementById('stepper-status').textContent = data.stepper_command !== undefined ? data.stepper_command : '--';

    // You could also display the last_command_timestamp if you have an HTML element for it
    // if (data.last_command_timestamp) {
    //     const commandDate = new Date(data.last_command_timestamp * 1000);
    //     // For example, if you add: <span id="command-timestamp-value">--</span>
    //     // document.getElementById('command-timestamp-value').textContent = commandDate.toLocaleString();
    // }
}

function fetchData() {
    console.log("Fetching data from API...");
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                // Log the response text for more details on errors
                response.text().then(text => console.error('API Error Response:', text));
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Data received:", data);
            if (Object.keys(data).length === 0 && data.constructor === Object) {
                console.warn("Received empty data object. This might be expected if no data found in DynamoDB.");
                // You might want to explicitly clear the dashboard or show "No data"
                // For now, updateDashboard will show '--' for missing fields
            }
            updateDashboard(data);
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            // Optionally update UI to show an error message
            // document.getElementById('temp-value').textContent = 'Error'; // etc.
            // Or clear fields:
            // updateDashboard({});
        });
}

// Fetch data immediately on load
fetchData();

// Set interval to fetch data periodically
const pollInterval = 2000; // Poll every 2 seconds
setInterval(fetchData, pollInterval);
