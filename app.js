// Variables to manage the session and camera stream
let sessionActive = false;
let cameraStream = null;
let photos = []; // Store captured photos

// Get references to UI elements
const startSessionButton = document.getElementById("startSession"); // Fixed ID
const capturePhotoButton = document.getElementById("capturePhoto"); // Fixed ID
const endSessionButton = document.getElementById("endSession"); // Fixed ID
const sharePhotosButton = document.getElementById("sharePhotos"); // Fixed ID
const deletePhotosButton = document.getElementById("deletePhotos"); // Fixed ID
const videoElement = document.getElementById("video"); // Added to HTML
const canvasElement = document.getElementById("canvas"); // Added to HTML
const context = canvasElement.getContext("2d"); // Canvas context
const photoGallery = document.getElementById("photo-gallery"); // Display area for photos
const errorMessage = document.getElementById("error-message"); // For error messages

// Function to clear error messages
function clearError() {
    errorMessage.textContent = ''; // Clear any existing error messages
}

// Function to show error messages to the user
function showError(message) {
    console.error(message); // Log to console
    errorMessage.textContent = message; // Display to user
}

// Function to request camera permissions
async function requestCameraPermission() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement.srcObject = cameraStream; // Display the camera stream
        return true; // Camera access granted
    } catch (error) {
        showError("Camera permission denied."); // Handle permission error
        return false; // Camera access denied
    }
}

// Function to request location permissions
function requestLocationPermission() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => resolve(position), // Permission granted, resolve with position data
                (error) => reject(new Error("Location permission denied.")) // Permission denied
            );
        } else {
            reject(new Error("Geolocation is not supported.")); // Unsupported
        }
    });
}

// Function to start the session and request permissions
async function startSession() {
    clearError(); // Clear previous error messages

    const hasCameraPermission = await requestCameraPermission(); // Request camera permission
    if (!hasCameraPermission) {
        return; // Don't proceed if camera permission is denied
    }

    try {
        await requestLocationPermission(); // Request location permission

        // Start the session
        sessionActive = true; // Mark the session as active
        capturePhotoButton.disabled = false; // Enable the "Capture Photo" button
        endSessionButton.disabled = false; // Enable the "End Session" button
        sharePhotosButton.disabled = true; // Disable "Share Photos"
        deletePhotosButton.disabled = true; // Disable "Delete All Photos"
        photos = []; // Reset the photos array
        photoGallery.innerHTML = ''; // Clear the photo gallery

    } catch (error) {
        showError("Error starting session: " + error.message); // Handle permission errors
    }
}

// Function to capture a photo and overlay date/time/location
async function capturePhoto() {
    clearError(); // Clear existing error messages

    if (!sessionActive) {
        showError("Session not active. Start the session first."); // Ensure the session is active
        return;
    }

    try {
        const track = cameraStream.getVideoTracks()[0]; // Get the video track
        const imageCapture = new ImageCapture(track); // Initialize ImageCapture
        const photoBlob = await imageCapture.takePhoto(); // Capture the photo

        // Get current date/time for the overlay
        const currentDateTime = new Date().toLocaleString(); 

        // Get current position
        const position = await requestLocationPermission(); 
        const { latitude, longitude } = position.coords;

        // Draw the captured photo onto the canvas
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);

        // Overlay date/time/location information
        context.fillStyle = 'white'; // White text for visibility
        context.font = "20px Arial"; // Font style
        context.fillText(`Date: ${currentDateTime}`, 10, 30); // Display date/time
        context.fillText(`Lat: ${latitude.toFixed(4)}`, 10, 60); // Display latitude
        context.fillText(`Long: ${longitude.toFixed(4)}`, 10, 90); // Display longitude

        canvasElement.style.display = "block"; // Display the canvas

        // Store the photo in the photo gallery
        const photoURL = canvasElement.toDataURL("image/png"); 
        photos.push(photoURL); // Store in array

        // Add to the photo gallery
        const imgElement = document.createElement("img");
        imgElement.src = photoURL; // Set the photo source
        imgElement.style.margin = "10px"; // Add some margin
        photoGallery.appendChild(imgElement); // Add to gallery

    } catch (error) {
        showError("Error capturing photo: " + error.message); // Handle errors
    }
}

// Function to end the session
function endSession() {
    sessionActive = false; // Mark the session as inactive

    if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop()); // Stop the camera stream
    }

    capturePhotoButton.disabled = true; // Disable the "Capture Photo" button
    endSessionButton.disabled = true; // Disable the "End Session" button
    sharePhotosButton.disabled = false; // Enable the "Share Photos" button
    deletePhotosButton.disabled = false; // Enable the "Delete All Photos" button

    if (photos.length === 0) {
        showError("No photos to share or delete."); // If there are no photos, inform the user
        return;
    }
}

// Function to share photos
function sharePhotos() {
    clearError(); // Clear existing error messages

    if (photos.length === 0) {
        showError("No photos to share."); // Ensure there are photos to share
        return;
    }

    // Open each photo in a new tab for sharing
    photos.forEach((photo, index) => {
        window.open(photo, `_blank${index}`); // Open in a new tab for sharing
    });
}

// Function to delete all photos
function deletePhotos() {
    photoGallery.innerHTML = ''; // Clear the photo gallery
    photos = []; // Clear the photos array
}

// Attach event listeners to the buttons
startSessionButton.addEventListener("click", startSession); // Start the session
capturePhotoButton.addEventListener("click", capturePhoto); // Capture a photo with overlay
endSessionButton.addEventListener("click", endSession); // End the session
sharePhotosButton.addEventListener("click", sharePhotos); // Share all photos
deletePhotosButton.addEventListener("click", deletePhotos); // Delete all photos after sharing
