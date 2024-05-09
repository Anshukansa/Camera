// UI elements and global variables
const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const context = canvasElement.getContext("2d");
const startSessionButton = document.getElementById("start-session");
const capturePhotoButton = document.getElementById("capture-photo");
const endSessionButton = document.getElementById("end-session");
const errorMessage = document.getElementById("error-message"); // For displaying errors
let cameraStream = null; // Holds the camera stream

// Function to clear error messages
function clearError() {
    errorMessage.textContent = ''; // Clear previous error messages
}

// Function to show error messages to the user
function showError(message) {
    errorMessage.textContent = message; // Display an error message
}

// Function to request camera permission and set up the video stream
async function requestCameraAccess() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        return stream; // Return the camera stream if permission is granted
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
            reject(new Error("Geolocation not supported.")); // If unsupported
        }
    });
}

// Function to start the session and request permissions
async function startSession() {
    clearError(); // Clear existing errors

    try {
        // Request camera permission
        cameraStream = await requestCameraAccess();
        videoElement.srcObject = cameraStream; // Display the camera stream

        // Request location permission
        await requestLocationPermission();

        // Enable the "Capture Photo" and "End Session" buttons
        capturePhotoButton.disabled = false; // Enable "Capture Photo"
        endSessionButton.disabled = false; // Enable "End Session"

    } catch (error) {
        showError("Error starting session: " + error.message); // Handle errors
    }
}

// Function to capture a photo and add date/time/location information
async function capturePhoto() {
    clearError(); // Clear existing errors

    if (!cameraStream) {
        showError("Camera stream not available.");
        return;
    }

    try {
        const stream = cameraStream; // Use the camera stream
        const track = stream.getVideoTracks()[0]; // Get the video track
        const imageCapture = new ImageCapture(track); // Initialize ImageCapture
        const photoBlob = await imageCapture.takePhoto(); // Capture the photo

        // Get the current date/time
        const currentDateTime = new Date().toLocaleString();

        // Request location permission and get position data
        const position = await requestLocationPermission();
        const { latitude, longitude } = position.coords;

        // Draw the captured photo onto a canvas
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);

        // Overlay date/time/location information
        context.font = "20px Arial"; // Font style and size
        context.fillStyle = "white"; // White text for visibility
        context.fillText(`Date: ${currentDateTime}`, 10, 30); // Display date/time
        context.fillText(`Lat: ${latitude.toFixed(4)}`, 10, 60); // Display latitude
        context.fillText(`Long: ${longitude.toFixed(4)}`, 10, 90); // Display longitude

        canvasElement.style.display = "block"; // Display the canvas

    } catch (error) {
        showError("Error capturing photo: " + error.message); // Handle capture errors
    }
}

// Function to end the session and clean up
function endSession() {
    if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop()); // Stop the camera stream
    }

    capturePhotoButton.disabled = true; // Disable the "Capture Photo" button
    endSessionButton.disabled = true; // Disable the "End Session" button
}

// Attach event listeners for buttons
startSessionButton.addEventListener("click", startSession); // Start the session
capturePhotoButton.addEventListener("click", capturePhoto); // Capture a photo
endSessionButton.addEventListener("click", endSession); // End the session
