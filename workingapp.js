// Variables to manage the session and camera stream
let sessionActive = false;
let cameraStream = null;
let photos = []; // Store captured photos

// Get references to UI elements
const startSessionButton = document.getElementById("startSession"); // Reference to the "Start Session" button
const capturePhotoButton = document.getElementById("capturePhoto"); // "Capture Photo" button
const endSessionButton = document.getElementById("endSession"); // "End Session" button
const sharePhotosButton = document.getElementById("sharePhotos"); // "Share Photos" button
const deletePhotosButton = document.getElementById("deletePhotos"); // "Delete All Photos" button
const videoElement = document.getElementById("video"); // Video element for camera stream
const canvasElement = document.getElementById("canvas"); // Canvas for drawing photos
const context = canvasElement.getContext("2d"); // Canvas context
const photoGallery = document.getElementById("photo-gallery"); // Gallery to display photos
const errorMessage = document.getElementById("error-message"); // For error messages

// Function to clear error messages
function clearError() {
    errorMessage.textContent = ''; // Clear existing error messages
}

// Function to show error messages to the user
function showError(message) {
    console.error(message); // Log error to console for debugging
    errorMessage.textContent = message; // Display error message to the user
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
                (position) => resolve(position), // Permission granted
                (error) => {
                    let errorMessage;
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = "Permission denied.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = "Position unavailable.";
                            break;
                        case error.TIMEOUT:
                            errorMessage = "Request timed out.";
                            break;
                        default:
                            errorMessage = "An unknown error occurred.";
                            break;
                    }
                    reject(new Error(errorMessage)); // Handle permission rejection
                }
            );
        } else {
            reject(new Error("Geolocation not supported.")); // If unsupported
        }
    });
}

// Function to get address from latitude and longitude
async function getAddressFromCoordinates(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.display_name) {
            return data.display_name; // Return the address
        } else {
            return "No address found."; // Handle missing address
        }
    } catch (error) {
        return "Error getting address."; // Handle fetch errors
    }
}

// Function to start the session and request permissions
async function startSession() {
    clearError(); // Clear previous error messages

    const hasCameraPermission = await requestCameraPermission(); // Request camera permission
    if (!hasCameraPermission) {
        return; // If camera permission is denied, stop here
    }

    try {
        await requestLocationPermission(); // Request location permission

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

        const currentDateTime = new Date().toLocaleString(); // Get current date/time

        const position = await requestLocationPermission(); 
        const { latitude, longitude } = position.coords;

        // Get the address from the coordinates
        const address = await getAddressFromCoordinates(latitude, longitude);

        // Draw the captured photo onto the canvas
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;
        context.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);

        // Overlay date/time/location information
        context.fillStyle = 'white'; // White text for visibility
        context.font = "15px Arial"; // Font style
        context.fillText(`${currentDateTime}`, 10, 30); // Display date/time
        context.fillText(`${address}`, 10, 60); // Display the address

        canvasElement.style.display = "block"; // Display the canvas

        // Store the photo in the photo gallery
        const photoURL = canvasElement.toDataURL("image/png"); // Convert to data URL
        photos.push(photoURL); // Store in photos array

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

    capturePhotoButton.disabled = true; // Disable "Capture Photo"
    endSessionButton.disabled = true; // Disable "End Session"
    sharePhotosButton.disabled = false; // Enable "Share Photos"
    deletePhotosButton.disabled = true; // Enable "Delete All Photos"

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
capturePhotoButton.addEventListener("click", capturePhoto); // Capture a photo
endSessionButton.addEventListener("click", endSession); // End the session
sharePhotosButton.addEventListener("click", sharePhotos); // Share all photos
deletePhotosButton.addEventListener("click", deletePhotos); // Delete all photos after sharing
