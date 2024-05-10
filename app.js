// Variables to manage the session and camera stream
let sessionActive = false;
let cameraStream = null;
let photos = []; // Store captured photos in IndexedDB

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

// IndexedDB setup
const DB_NAME = "PhotoCaptureApp";
const STORE_NAME = "photos";
const DB_VERSION = 1;

// Function to open IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = db.createObjectStore(STORE_NAME, {
                    keyPath: "id",
                    autoIncrement: true,
                });
                objectStore.createIndex("timestamp", "timestamp", {
                    unique: false,
                });
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
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: true,
        });
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
        return;
    }

    try {
        await requestLocationPermission();

        sessionActive = true;
        capturePhotoButton.disabled = false;
        endSessionButton.disabled = false;
        sharePhotosButton.disabled = true;
        deletePhotosButton.disabled = true;
        photos = []; // Clear the photos array
        photoGallery.innerHTML = ""; // Clear the photo gallery

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

        // Save the photo in IndexedDB with metadata
        await savePhoto(photoBlob, { timestamp: currentDateTime, location: { latitude, longitude }, address });

        // Display the captured photo in the gallery
        const imgElement = document.createElement("img");
        imgElement.src = URL.createObjectURL(photoBlob);
        imgElement.className = "photo-thumbnail"; // Styled thumbnail
        photoGallery.appendChild(imgElement);

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
    endSessionButton.disabled = photos.length === 0;
    sharePhotosButton.disabled = photos.length === 0;
}

// Function to share all photos
async function sharePhotos() {
    clearError();

    const storedPhotos = await getAllPhotos();

    if (storedPhotos.length === 0) {
        showError("No photos to share.");
        return;
    }

    const photoFiles = storedPhotos.map((photo) => new File([photo.blob], "snapshot.png", { type: "image/png" }));

    if (navigator.canShare && navigator.canShare({ files: photoFiles })) {
        try {
            await navigator.share({
                files: photoFiles,
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

// Function to delete all photos in IndexedDB
async function deletePhotos() {
    if (confirm("Are you sure you want to delete all photos?")) {
        const db = await openDB();
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const objectStore = transaction.objectStore(STORE_NAME);
        const request = objectStore.clear();

        request.onsuccess = () => {
            photos = [];
            photoGallery.innerHTML = ""; // Clear the photo gallery
            sharePhotosButton.disabled = true; // Disable share button after deleting
        };

        request.onerror = (event) => {
            showError("Error deleting photos: " + event.target.error.message);
        };
    }
}

// Function to load all photos from IndexedDB
async function loadPhotos() {
    try {
        const storedPhotos = await getAllPhotos();

        photoGallery.innerHTML = ""; // Clear existing content in the photo gallery

        // Display all stored photos
        storedPhotos.forEach((photo) => {
            const imgElement = document.createElement("img");
            imgElement.src = URL.createObjectURL(photo.blob);
            imgElement.className = "photo-thumbnail"; // Styled thumbnail
            photoGallery.appendChild(imgElement);
        });
    } catch (error) {
        showError("Error loading photos: " + error.message);
    }
}

// Load all stored photos when initializing the app
loadPhotos();

// Navigation to the gallery page
const viewGalleryButton = document.getElementById("viewGallery");
viewGalleryButton.addEventListener("click", () => {
    window.location.href = "gallery.html"; // Redirect to the gallery page
});

// Event listeners for the buttons
startSessionButton.addEventListener("click", startSession);
capturePhotoButton.addEventListener("click", capturePhoto);
endSessionButton.addEventListener("click", endSession);
sharePhotosButton.addEventListener("click", sharePhotos);
deletePhotosButton.addEventListener("click", deletePhotos);
