// Variables to manage the session and camera stream
let sessionActive = false;
let cameraStream = null;
let photos = []; // Store captured photos

// Get references to UI elements
const startSessionButton = ~document.getElementById("startSession");
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

// Function to get address from coordinates
async function getAddressFromCoordinates(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.display_name) {
            return data.display_name;
        } else {
            return "No address found.";
        }
    } catch (error) {
        return "Error getting address.";
    }
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
        await requestLocationPermission(); // Ensure this does not throw errors

        sessionActive = true;
        capturePhotoButton.disabled = false;
        endSessionButton.disabled = false;
        sharePhotosButton.disabled = true; // No photos initially
        deletePhotosButton.disabled = true; // No photos initially
        photos = []; // Reset photos array
        photoGallery.innerHTML = ""; // Clear the full gallery
        lastCapturedPhoto.innerHTML = ""; // Clear last photo container

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

        const position = await requestLocationPermission(); // Ensure location permission is handled
        const { latitude, longitude } = position.coords;

        const address = await getAddressFromCoordinates(latitude, longitude); // Ensure this function is defined

        context.fillStyle = "white";
        context.font = "15px Arial";
        context.fillText(`${currentDateTime}`, 10, 30);
        context.fillText(`${address}`, 10, 60);

        const photoBlob = await new Promise((resolve) => canvasElement.toBlob(resolve, "image/png"));
        const file = new File([photoBlob], "snapshot.png", { type: "image/png" });

        photos.push(file);

        // Show the last captured photo on the main page
        lastCapturedPhoto.innerHTML = ""; // Clear previous content
        const lastPhotoImg = document.createElement("img");
        lastPhotoImg.src = URL.createObjectURL(photoBlob);
        lastPhotoImg.className = "photo-thumbnail"; // Styled last photo
        lastCapturedPhoto.appendChild(lastPhotoImg);

        photoGallery.innerHTML = ""; // Clear existing content in full gallery

        // Add all photos to the gallery (stored in `photos` array)
        photos.forEach((photo) => {
            const img = document.createElement("img");
            img.src = URL.createObjectURL(photo);
            img.className = "photo-thumbnail"; // Styled photo
            photoGallery.appendChild(img);
        });

        sharePhotosButton.disabled = false; // Enable share button when there is at least one photo
        deletePhotosButton.disabled = false; // Enable delete button

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

// Function to share all photos
async function sharePhotos() {
    clearError();

    if (photos.length === 0) {
        showError("No photos to share.");
        return;
    }

    if (navigator.canShare && navigator.canShare({ files: photos })) {
        try {
            await navigator.share({
                files: photos,
                title: "Captured Photos",
                text: "Here are the photos I took!",
            });
        } catch (error) {
            showError("Error sharing photos: " + error.message);
        }
    } else {
        showError("Web Share API does not support sharing files in this browser.");
    }
}

// Function to delete all photos
function deletePhotos() {
    if (confirm("Are you sure you want to delete all photos?")) {
        photos = [];
        photoGallery.innerHTML = "";
        lastCapturedPhoto.innerHTML = ""; // Clear last photo display
        sharePhotosButton.disabled = true; // Disable share button after deleting
        deletePhotosButton.disabled = true; // Disable delete button
    }
}

// Event listeners for the buttons
startSessionButton.addEventListener("click", startSession);
capturePhotoButton.addEventListener("click", capturePhoto);
endSessionButton.addEventListener("click", endSession);
sharePhotosButton.addEventListener("click", sharePhotos);
deletePhotosButton.addEventListener("click", deletePhotos);
