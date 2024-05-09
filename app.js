// Check if getUserMedia is supported by the browser
function isCameraSupported() {
    return !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;
}

// Function to request camera permissions
async function requestPermissions() {
    clearError(); // Clear any previous error messages
    
    if (!isCameraSupported()) {
        showError("Camera is not supported on this device or browser."); // If the browser or device doesn't support it
        return;
    }

    try {
        // Request camera access, which triggers the browser's permission prompt
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });

        // If successful, start the session
        startSession();

        // Stop the stream immediately to release the camera
        stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
        // If permission is denied or there's another error, inform the user
        showError("Camera access is required. Please grant permission.");
    }
}

// Function to start the session
function startSession() {
    const startSessionButton = document.getElementById('start-session');
    const capturePhotoButton = document.getElementById('capture-photo');
    const endSessionButton = document.getElementById('end-session');
    
    startSessionButton.style.display = 'none'; // Hide the start session button
    capturePhotoButton.disabled = false; // Enable the "Capture Photo" button
    endSessionButton.disabled = false; // Enable the "End Session" button
    
    // You can initialize other session-related logic here if needed
}

// Capture photo with error handling
async function capturePhoto() {
    clearError(); // Clear any previous error messages

    try {
        // Access the camera to capture a photo
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(track);
        const photoBlob = await imageCapture.takePhoto();

        const photoGallery = document.getElementById('photo-gallery');

        // Display the photo in the gallery
        const img = document.createElement('img');
        img.src = URL.createObjectURL(photoBlob); // Create a URL for the photo
        img.width = 100; // Set the width for display
        photoGallery.appendChild(img);

        // Stop the stream to release the camera
        stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
        // Handle errors during photo capture
        showError("Error capturing photo: " + error.message);
    }
}

// Function to end the session
function endSession() {
    const startSessionButton = document.getElementById('start-session');
    const capturePhotoButton = document.getElementById('capture-photo');
    const endSessionButton = document.getElementById('end-session');

    capturePhotoButton.disabled = true; // Disable photo capture
    endSessionButton.disabled = true; // Disable ending the session
    startSessionButton.style.display = 'block'; // Show the start session button again

    // You can add logic here for sharing photos, and optionally deleting them

    // Optionally, clear the photo gallery and other session-related data
}

// Function to show error messages to the user
function showError(message) {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = message; // Display the error message
}

// Function to clear error messages
function clearError() {
    const errorMessage = document.getElementById('error-message');
    errorMessage.textContent = ''; // Clear any existing error messages
}

// Add event listeners to buttons
const startSessionButton = document.getElementById('start-session');
const capturePhotoButton = document.getElementById('capture-photo');
const endSessionButton = document.getElementById('end-session');

startSessionButton.addEventListener('click', requestPermissions); // Request permissions and start the session
capturePhotoButton.addEventListener('click', capturePhoto); // Capture a photo
endSessionButton.addEventListener('click', endSession); // End the session
