// Get references to UI elements
const startSessionButton = document.getElementById("start-session");
const capturePhotoButton = document.getElementById("capture-photo");
const endSessionButton = document.getElementById("end-session");
const errorMessage = document.getElementById("error-message"); // For displaying error messages

// Function to clear error messages
function clearError() {
    errorMessage.textContent = ''; // Clear any existing error messages
}

// Function to show error messages to the user
function showError(message) {
    errorMessage.textContent = message; // Display the error message
}

// Function to request camera permission
async function requestCameraAccess() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        return stream; // Return the camera stream
    } catch (error) {
        throw new Error("Camera permission denied.");
    }
}

// Function to request location permission
function requestLocationPermission() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => resolve(position), // Permission granted
                (error) => reject(new Error("Location permission denied.")) // Permission denied
            );
        } else {
            reject(new Error("Geolocation not supported."));
        }
    });
}

// Function to start the session
async function startSession() {
    clearError(); // Clear any previous error messages

    try {
        const cameraStream = await requestCameraAccess(); // Request camera permission
        videoElement.srcObject = cameraStream; // Display the video stream

        await requestLocationPermission(); // Request location permission

        capturePhotoButton.disabled = false; // Enable "Capture Photo"
        endSessionButton.disabled = false; // Enable "End Session"
    } catch (error) {
        showError("Permission required to start the session: " + error.message); // Handle errors
    }
}

// Attach event listener to the "Start Session" button
startSessionButton.addEventListener("click", startSession); // Start the session when clicked
