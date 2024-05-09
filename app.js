// Variables for session and webcam access
let videoStream = null;
let sessionActive = false;

// UI elements
const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const context = canvasElement.getContext("2d");
const takePictureButton = document.getElementById("takePicture");
const errorMessage = document.getElementById("error-message");

// Function to clear error messages
function clearError() {
    errorMessage.textContent = ''; // Clear any existing error messages
}

// Function to show error messages
function showError(message) {
    errorMessage.textContent = message; // Display the error message to the user
}

// Function to request camera access
async function requestCameraAccess() {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement.srcObject = videoStream; // Display the video stream
        return true; // Camera access granted
    } catch (error) {
        showError("Error accessing webcam: " + error.message); // Handle camera access error
        return false; // Camera access denied
    }
}

// Function to request location
function requestLocation(callback) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                callback(position); // Pass the position data
            },
            (error) => {
                showError("Error getting geolocation: " + error.message); // Handle error
                callback(null); // No location data
            }
        );
    } else {
        showError("Geolocation not supported.");
        callback(null); // Geolocation not supported
    }
}

// Function to get address from coordinates using OpenStreetMap Nominatim
function getAddressFromCoordinates(lat, lon, callback) {
    if (lat && lon) {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;

        fetch(url)
            .then((response) => response.json())
            .then((data) => {
                const address = data.display_name || "Location not found.";
                callback(address);
            })
            .catch((error) => {
                showError("Error fetching address: " + error.message); // Handle error
                callback("Error fetching address.");
            });
    } else {
        callback("Location not found.");
    }
}

// Function to get the current date and time
function getCurrentDateTime() {
    const now = new Date();
    return now.toLocaleString(); // Returns current date and time in a readable format
}

// Event listener to capture a photo
takePictureButton.addEventListener("click", () => {
    if (!videoStream) {
        requestCameraAccess(); // Ensure camera access
    }

    canvasElement.width = videoElement.videoWidth;
    canvasElement.height = videoElement.videoHeight;

    // Draw the current video frame onto the canvas
    context.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);

    // Get the current date/time
    const currentDateTime = getCurrentDateTime();

    // Request location information and add it to the photo
    requestLocation((position) => {
        if (position) {
            const { latitude, longitude } = position.coords;
            getAddressFromCoordinates(latitude, longitude, (address) => {
                context.font = "20px Arial";
                context.fillStyle = "white"; // White text for visibility
                context.fillText(currentDateTime, 10, 30); // Display date/time
                context.fillText(address, 10, 60); // Display location address

                canvasElement.style.display = "block"; // Display the canvas
            });
        } else {
            context.fillText(currentDateTime, 10, 30); // Display date/time
            context.fillText("Location not found.", 10, 60); // No location data
        }
    });
});
