// Variables to manage the session and camera stream
let sessionActive = false;
let cameraStream = null;

// Current session photos stored in memory
let sessionPhotos = [];

// IndexedDB setup
const DB_NAME = "PhotoCaptureApp";
const STORE_NAME = "photos";
const DB_VERSION = 1;

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

// IndexedDB functions
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
                objectStore.createIndex("timestamp", "timestamp", { unique: false });
            }
        };

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Function to save a photo in IndexedDB
async function savePhoto(photoBlob, metadata) {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const objectStore = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const request = objectStore.add({
            blob: photoBlob,
            metadata,
            timestamp: Date.now(),
        });

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Function to retrieve all stored photos from IndexedDB
async function getAllPhotos() {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, "readonly");
    const objectStore = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const request = objectStore.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Function to start the session
async function startSession() {
    clearError();

    const hasCameraPermission = await requestCameraPermission();
    if (!hasCameraPermission) {
        return;
    }

    try {
        await requestLocationPermission();

        sessionActive = true; // Set session active
        capturePhotoButton.disabled = false; // Enable capture button
        endSessionButton.disabled = false; // Enable end session button
        sharePhotosButton.disabled = true; // Disable sharing initially
        deletePhotosButton disabled = true; // Disable delete button initially

        sessionPhotos = []; // Clear the current session photos
        photoGallery.innerHTML = ""; // Reset the photo gallery

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

        // Add to session photos
        sessionPhotos.push({ blob: photoBlob, timestamp: currentDateTime, location: { latitude, longitude }, address });

        // Display the captured photo in the gallery
        const imgElement = document.createElement("img");
        imgElement.src = URL.createObjectURL(photoBlob);
        imgElement.className = "photo-thumbnail"; // Styled thumbnail
        photoGallery.appendChild(imgElement);

        sharePhotosButton.disabled = false; // Enable sharing
        deletePhotosButton.disabled = false; // Enable delete button

    } catch (error) {
        showError("Error capturing photo: " + error.message);
    }
}

// Function to delete session photos
function deleteSessionPhotos() {
    if (confirm("Are you sure you want to delete session photos?")) {
        sessionPhotos = []; // Clear session photos
        photoGallery.innerHTML = ""; // Clear the gallery
        deletePhotosButton.disabled = true; // Disable delete button after clearing
        sharePhotosButton.disabled = true; // Disable share button if no photos left
    }
}

// Function to end the session
async function endSession() {
    if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
    }

    sessionActive = false; // Set session inactive
    capturePhotoButton.disabled = true;
    endSessionButton.disabled = true;
    
    if (sessionPhotos.length > 0) {
        // If there are session photos, save them to IndexedDB
        const savePromises = sessionPhotos.map((photo) => savePhoto(photo.blob, photo));
        await Promise.all(savePromises);
    }

    sessionPhotos = []; // Reset session photos
}

// Function to share session photos
async function shareSessionPhotos() {
    if (sessionPhotos.length === 0) {
        showError("No photos to share.");
        return;
    }

    const photoFiles = sessionPhotos.map(
        (photo) => new File([photo.blob], `session_photo_${photo.timestamp}.png`, { type: "image/png" })
    );

    if (navigator.canShare && navigator.canShare({ files: photoFiles })) {
        try {
            await navigator.share({
                files: photoFiles,
                title: "Session Photos",
                text: "Here are the photos from this session.",
            });
        } catch (error) {
            showError("Error sharing session photos: " + error.message);
        }
    } else {
        showError("Web Share API does not support sharing files in this browser.");
    }
}

// Event listeners for the buttons
startSessionButton.addEventListener("click", startSession);
capturePhotoButton.addEventListener("click", capturePhoto);
endSessionButton.addEventListener("click", endSession);
sharePhotosButton.addEventListener("click", shareSessionPhotos); // Share session photos
deletePhotosButton.addEventListener("click", deleteSessionPhotos); // Delete session photos
