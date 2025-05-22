// IMPORTANT: Replace with your actual API Gateway Invoke URL + /data endpoint
const apiUrl = 'https://56zrov84h2.execute-api.ap-southeast-1.amazonaws.com/prod/data'; // Make sure this is still correct

function updateDashboard(data) {
    // --- Sensor Data ---
    document.getElementById('temp-value').textContent = data.temperature !== undefined ? data.temperature.toFixed(1) : '--';
    document.getElementById('humidity-value').textContent = data.humidity !== undefined ? data.humidity.toFixed(1) : '--';
    document.getElementById('lux-value').textContent = data.lux !== undefined ? data.lux : '--';

    // Display sensor data timestamp (from 'timestamp' key, which came from sensor_table)
    // Ensure your GetDashboardData Lambda includes 'timestamp' in the combined_data from sensor readings
    if (data.timestamp) { // This assumes the sensor data has a 'timestamp' field
        const sensorDate = new Date(data.timestamp * 1000); // Assuming sensor timestamp is in seconds
        document.getElementById('timestamp-value').textContent = sensorDate.toLocaleString();
    } else {
        document.getElementById('timestamp-value').textContent = '--';
    }

    // --- Actuator Command Status ---
    // These keys match what the GetDashboardData Lambda constructs
    document.getElementById('dc-motor-status').textContent = data.dc_motor_command !== undefined ? data.dc_motor_command : '--';
    document.getElementById('stepper-status').textContent = data.stepper_command !== undefined ? data.stepper_command : '--';

    // Optional: Display the last_command_timestamp if you have an HTML element for it
    // For example, if you added: <p>Last Command Sent: <span id="command-timestamp-value">--</span></p>
    // if (data.last_command_timestamp) {
    //     const commandDate = new Date(data.last_command_timestamp * 1000); // Assuming command timestamp is in seconds
    //     document.getElementById('command-timestamp-value').textContent = commandDate.toLocaleString();
    // }
}

function fetchData() {
    console.log("Fetching data from API...");
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                // Log the response text for more details on errors
                response.text().then(text => console.error('API Error Response:', text, 'Status:', response.status));
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Data received:", data);
            if (data && Object.keys(data).length === 0 && data.constructor === Object) { // Check if data is not null/undefined before Object.keys
                console.warn("Received empty data object. This might be expected if no data found in DynamoDB.");
            }
            updateDashboard(data || {}); // Pass an empty object if data is null/undefined to prevent errors
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            // Clear dashboard or show error messages
            // Example of clearing:
            // updateDashboard({
            //     temperature: '--', humidity: '--', lux: '--', timestamp: '--',
            //     dc_motor_command: '--', stepper_command: '--'
            // });
        });
}

// Fetch data immediately on load
fetchData();

// Set interval to fetch data periodically
const pollInterval = 10000; // Changed to poll every 10 seconds (10000 ms)
setInterval(fetchData, pollInterval);
