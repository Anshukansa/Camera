// Variables for session management and camera stream
let sessionActive = false;
let cameraStream = null;

// IndexedDB setup
const DB_NAME = "PhotoCaptureApp";
const SESSION_STORE = "session_photos";
const ALL_PHOTOS_STORE = "all_photos";
const DB_VERSION = 1;

// Get references to UI elements
const startSessionButton = document.getElementById("startSession");
const capturePhotoButton = document.getElementById("capturePhoto");
const endSessionButton = document.getElementById("endSession");
const sharePhotosButton = document.getElementById("sharePhotos");
const deleteSessionPhotosButton = document.getElementById("deleteSessionPhotos");
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

// IndexedDB functions
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(SESSION_STORE)) {
                db.createObjectStore(SESSION_STORE, { keyPath: "id", autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(ALL_PHOTOS_STORE)) {
                db.createObjectStore(ALL_PHOTOS_STORE, { keyPath: "id", autoIncrement: true });
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

// Function to save a photo in the specified object store
async function savePhoto(storeName, photoBlob, metadata) {
    const db = await openDB();
    const transaction = db.transaction(storeName, "readwrite");
    const objectStore = transaction.objectStore(storeName);

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

// Function to retrieve all stored photos from the specified object store
async function getAllPhotos(storeName) {
    const db = await openDB();
    const transaction = db.transaction(storeName, "readonly");
    const objectStore = transaction.objectStore(storeName);

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
        deleteSessionPhotosButton.disabled = true; // Disable delete session photos initially

        // Reset the photo gallery
        photoGallery.innerHTML = ""; 

    } catch (error) {
        showError("Error starting session: " + error.message);
    }
}

// Function to capture a photo and save it in the session store
async function capturePhoto() {
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

        // Save the photo in the session store
        await savePhoto(SESSION_STORE, photoBlob, { timestamp: currentDateTime, location: { latitude, longitude }, address });

        // Display the captured photo in the gallery
        const imgElement = document.createElement("img");
        imgElement.src = URL.createObjectURL(photoBlob); // Thumbnail image
        imgElement.className = "photo-thumbnail"; // Styled thumbnail
        photoGallery.appendChild(imgElement);

        deleteSessionPhotosButton.disabled = false; // Enable delete session photos button
    } catch (error) {
        showError("Error capturing photo: " + error.message);
    }
}

// Function to end the session and move session photos to all_photos
async function endSession() {
    if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
    }

    sessionActive = false; // Set session inactive
    capturePhotoButton.disabled = true;
    endSessionButton.disabled = true;

    // Move session photos to all_photos
    const sessionPhotos = await getAllPhotos(SESSION_STORE);
    const db = await openDB();
    const transaction = db.transaction(ALL_PHOTOS_STORE, "readwrite");
    const objectStore = transaction.objectStore(ALL_PHOTOS_STORE);

    sessionPhotos.forEach(async (photo) => {
        await savePhoto(ALL_PHOTOS_STORE, photo.blob, photo.metadata);
    });

    // Clear the session photos after moving them
    const clearSession = db.transaction(SESSION_STORE, "readwrite");
    const clearStore = clearSession.objectStore(SESSION_STORE);
    clearStore.clear();

    deleteSessionPhotosButton.disabled = true; // Disable delete session photos button
}

// Function to delete all session photos
async function deleteSessionPhotos() {
    if (confirm("Are you sure you want to delete all session photos?")) {
        const db = await openDB();
        const transaction = db.transaction(SESSION_STORE, "readwrite");
        const objectStore = transaction.objectStore(SESSION_STORE);

        const request = objectStore.clear();

        request.onsuccess = () => {
            photoGallery.innerHTML = ""; // Clear the gallery
            deleteSessionPhotosButton.disabled = true; // Disable delete session photos button
        };

        request.onerror = (event) => {
            showError("Error deleting session photos: " + event.target.error.message);
        };
    }
}

// Function to share all photos
async function sharePhotos() {
    clearError();

    const allPhotos = await getAllPhotos(ALL_PHOTOS_STORE);

    if (allPhotos.length === 0) {
        showError("No photos to share.");
        return;
    }

    const photoFiles = allPhotos.map((photo) => new File([photo.blob], `photo_${photo.id}.png`, { type: "image/png" }));

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

// Function to load all photos from all_photos store
async function loadAllPhotos() {
    try {
        const allPhotos = await getAllPhotos(ALL_PHOTOS_STORE);

        photoGallery.innerHTML = ""; // Clear existing photos in the gallery

        allPhotos.forEach((photo) => {
            const imgElement = document.createElement("img");
            imgElement.src = URL.createObjectURL(photo.blob);
            imgElement.className = "photo-thumbnail"; // Styled thumbnail
            photoGallery.appendChild(imgElement);

            // Create a download link for each photo
            const downloadLink = document.createElement("a");
            downloadLink.href = URL.createObjectURL(photo.blob);
            downloadLink.download = `photo_${photo.id}.png`;
            downloadLink.textContent = "Download Photo"; // Text for download link
            photoGallery.appendChild(downloadLink); // Add download link to the gallery
        });
    } catch (error) {
        showError("Error loading photos: " + error.message);
    }
}

// Load all photos from the all_photos store when initializing the app
loadAllPhotos();

// Event listeners for the buttons
startSessionButton.addEventListener("click", startSession); // Start the session
capturePhotoButton.addEventListener("click", capturePhoto); // Capture a photo
endSessionButton.addEventListener("click", endSession); // End the session
sharePhotosButton.addEventListener("click", sharePhotos); // Share all photos
deleteSessionPhotosButton.addEventListener("click", deleteSessionPhotos); // Delete all session photos
