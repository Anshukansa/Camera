// Variables to manage the session and camera stream
let sessionActive = false;
let cameraStream = null;
let photos = []; // Store captured photos

// Get references to UI elements
const startSessionButton = document.getElementById("startSession");
const capturePhotoButton = document.getElementById("capturePhoto");
const endSessionButton = document.getElementById("endSession");
const sharePhotosButton = document.getElementById("sharePhotos");
const deletePhotosButton = document.getElementById("deletePhotos");
const videoElement = document.getElementById("video");
const canvasElement = document.getElementById("canvas");
const context = canvasElement.getContext("2d");
const photoGallery = document.getElementById("photo-gallery");
const lastCapturedPhoto = document.getElementById("last-captured-photo");
const errorMessage = document.getElementById("error-message");

// Function to clear error messages
function clearError() {
    errorMessage.textContent = "";
}

// Function to show error messages
function showError(message) {
    console.error(message);
    errorMessage.textContent = message;
}

// Function to request camera permissions
async function requestCameraPermission() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement.srcObject = cameraStream;
        return true;
    } catch (error) {
        showError("Camera permission denied.");
        return false;
    }
}

// Function to request location permissions
function requestLocationPermission() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => resolve(position),
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
                    reject(new Error(errorMessage));
                }
            );
        } else {
            reject(new Error("Geolocation not supported."));
        }
    });
}

// Function to start the session
async function startSession() {
    clearError();

    const hasCameraPermission = await requestCameraPermission();
    if (!hasCameraPermission) {
        showError("Error starting session: Camera permission denied.");
        return;
    }

    try {
        await requestLocationPermission(); // This line should not throw any errors

        sessionActive = true;
        capturePhotoButton.disabled = false;
        endSessionButton.disabled = false;
        sharePhotosButton.disabled = true; // No photos initially
        deletePhotosButton.disabled = true; // No photos initially
        photos = []; // Reset photos array
        photoGallery.innerHTML = ""; // Clear gallery
        lastCapturedPhoto.innerHTML = ""; // Clear last photo display

    } catch (error) {
        showError("Error starting session: " + error.message);
    }
}

// Function to capture a photo
async function capturePhoto() {
    clearError();

    if (!sessionActive) {
        showError("Session not active. Start the session first.");
        return;
    }

    try {
        canvasElement.width = videoElement.videoWidth;
        canvasElement.height = videoElement.videoHeight;

        context.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight);

        const currentDateTime = new Date().toLocaleString();

        const position = await requestLocationPermission();
        const { latitude, longitude } = position.coords;

        const address = await getAddressFromCoordinates(latitude, longitude);

        context.fillStyle = "white";
        context.font = "15px Arial";
        context.fillText(`${currentDateTime}`, 10, 30);
        context.fillText(`${address}`, 10, 60);

        const photoBlob = await new Promise((resolve) => canvasElement.toBlob(resolve, "image/png"));
        const file = new File([photoBlob], "snapshot.png", { type: "image/png" });

        photos.push(file);

        // Show the last captured photo separately
        lastCapturedPhoto.innerHTML = ""; // Clear previous content
        const lastPhotoImg = document.createElement("img");
        lastPhotoImg.src = URL.createObjectURL(photoBlob);
        lastPhotoImg.className = "photo-thumbnail"; // Styled last photo
        lastCapturedPhoto.appendChild(lastPhotoImg);

        photoGallery.appendChild(lastPhotoImg); // Add to gallery
        sharePhotosButton.disabled = false; // Enable share button when there's at least one photo

    } catch (error) {
        showError("Error capturing photo: " + error.message);
    }
}

// Function to end the session
function endSession() {
    if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
    }

    sessionActive = false;
    capturePhotoButton.disabled = true;
    endSessionButton.disabled = true;
    sharePhotosButton.disabled = photos.length === 0;
    deletePhotosButton.disabled = photos.length === 0;
}

// Function to delete all photos
function deletePhotos() {
    if (confirm("Are you sure you want to delete all photos?")) {
        photos = [];
        photoGallery.innerHTML = "";
        lastCapturedPhoto.innerHTML = ""; // Clear last photo display
        sharePhotosButton.disabled = true; // Disable share button after deleting
    }
}

// Event listeners for the buttons
startSessionButton.addEventListener("click", startSession); // Ensure this is correctly attached
capturePhotoButton.addEventListener("click", capturePhoto);
endSessionButton.addEventListener("click", endSession);
sharePhotosButton.addEventListener("click", sharePhotos);
deletePhotosButton.addEventListener("click", deletePhotos);
