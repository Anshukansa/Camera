// Variables for session management and camera stream
let sessionActive = false;
let cameraStream = null;

// IndexedDB setup
const DB_NAME = "PhotoCaptureApp";
const SESSION_STORE_NAME = "session_photos";
const ALL_PHOTOS_STORE_NAME = "all_photos";
const DB_VERSION = 1;

// Get references to UI elements
const startSessionButton = document.getElementById("startSession");
const capturePhotoButton = document.getElementById("capturePhoto");
const endSessionButton = document.getElementById("endSession");
const sharePhotosButton = document.getElementById("sharePhotos");
const deleteSessionPhotosButton = document.getElementById("deleteSessionPhotos");
const deleteAllPhotosButton = document.getElementById("deleteAllPhotos");
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
            if (!db.objectStoreNames.contains(SESSION_STORE_NAME)) {
                db.createObjectStore(SESSION_STORE_NAME, { keyPath: "id", autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(ALL_PHOTOS_STORE_NAME)) {
                db.createObjectStore(ALL_PHOTOS_STORE_NAME, { keyPath: "id", autoIncrement: true });
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
async function savePhoto(storeName, photoBlob, metadata) {
    const db = await openDB();
    const transaction = db.transaction([storeName], "readwrite");
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

// Function to retrieve all stored photos from a specific store in IndexedDB
async function getAllPhotos(storeName) {
    const db = await openDB();
    const transaction = db.transaction([storeName], "readonly");
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
        startSessionButton.style.display = "none"; // Hide the "Start Session" button
        
        endSessionButton.disabled = false; // Enable end session button
        endSessionButton.style.display = "block";  // Show the "End Session" button
        
        capturePhotoButton.disabled = false; 
        capturePhotoButton.style.display = "block"; 
        
        deleteAllPhotosButton.disabled =  "none"; 
        deleteSessionPhotosButton.disabled =  "none"; 
        

        // Reset the session photo gallery
        photoGallery.innerHTML = "";

    } catch (error) {
        showError("Error starting session: " + error.message);
    }
}

// Function to capture a photo during a session
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
        await savePhoto(SESSION_STORE_NAME, photoBlob, { timestamp: currentDateTime, location: { latitude, longitude }, address });

        // Display the captured photo in the gallery
        const imgElement = document.createElement("img");
        imgElement.src = URL.createObjectURL(photoBlob); // Thumbnail image
        imgElement.className = "photo-thumbnail"; // Styled thumbnail
        photoGallery.appendChild(imgElement);

        deleteSessionPhotosButton.disabled =  "block"; 
        deleteSessionPhotosButton.disabled = false; // Enable delete button after capturing a photo
        deleteAllPhotosButton.disabled =  "block"; 
        deleteAllPhotosButton.disabled = false; // Enable delete button after capturing a photo

    } catch (error) {
        showError("Error capturing photo: " + error.message);
    }
}

// Function to end the session and move session photos to all photos store
async function endSession() {
    if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
    }

        startSessionButton.style.display = "block";
        endSessionButton.style.display = "none";
        capturePhotoButton.style.display = "none"; 
        sharePhotosButton.style.display =  "block"; 
        deleteSessionPhotosButton.style.display =  "block"; 
        deleteAllPhotosButton.style.display =  "block";


    try {
        // Get all session photos
        const sessionPhotos = await getAllPhotos(SESSION_STORE_NAME);

        // Move session photos to the all_photos store
        for (const sessionPhoto of sessionPhotos) {
            await savePhoto(ALL_PHOTOS_STORE_NAME, sessionPhoto.blob, sessionPhoto.metadata);
        }

        // Clear session photos from IndexedDB
        await clearStore(SESSION_STORE_NAME);

    } catch (error) {
        showError("Error ending session: " + error.message);
    }
}

// Function to clear an IndexedDB store
async function clearStore(storeName) {
    const db = await openDB();
    const transaction = db.transaction([storeName], "readwrite");
    const objectStore = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
        const request = objectStore.clear();

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

// Function to delete session photos
async function deleteSessionPhotos() {
    if (confirm("Are you sure you want to delete all session photos?")) {
        try {
            await clearStore(SESSION_STORE_NAME);
            photoGallery.innerHTML = ""; // Clear the gallery
            deleteSessionPhotosButton.disabled = true; // Disable delete button
        } catch (error) {
            showError("Error deleting session photos: " + error.message);
        }
    }
}

// Function to delete session photos
async function deleteAllPhotos() {
    if (confirm("Are you sure you want to delete all photos?")) {
        try {
            await clearStore(ALL_PHOTOS_STORE_NAME);
            photoGallery.innerHTML = ""; // Clear the gallery
            deleteSessionPhotosButton.disabled = true; // Disable delete button
        } catch (error) {
            showError("Error deleting session photos: " + error.message);
        }
    }
}

// Function to load all photos from the all_photos store
async function loadAllPhotos() {
    try {
        const allPhotos = await getAllPhotos(ALL_PHOTOS_STORE_NAME);

        photoGallery.innerHTML = ""; // Clear existing photos in the gallery

        allPhotos.forEach((photo) => {
            const imgElement = document.createElement("img");
            imgElement.src = URL.createObjectURL(photo.blob); // Display the photo
            imgElement.className = "photo-thumbnail"; // Styled thumbnail
            photoGallery.appendChild(imgElement);
        });

        if (allPhotos.length > 0) {
            sharePhotosButton.style.display =  "block"; 
            sharePhotosButton.disabled = false; // Enable share button if there are photos to share
            deleteSessionPhotosButton.style.display =  "block"; 
            deleteSessionPhotosButton.disabled = false; // Enable delete button after capturing a photo
            deleteAllPhotosButton.style.display =  "block"; 
            deleteAllPhotosButton.disabled = false; // Enable delete button after capturing a photo
            
        }

    } catch (error) {
        showError("Error loading all photos: " + error.message);
    }
}

// Event listeners for the buttons
startSessionButton.addEventListener("click", startSession); // Start the session
capturePhotoButton.addEventListener("click", capturePhoto); // Capture a photo
endSessionButton.addEventListener("click", endSession); // End the session
deleteSessionPhotosButton.addEventListener("click", deleteSessionPhotos); // Delete session photos
deleteAllPhotosButton.addEventListener("click", deleteAllPhotos); // Delete all photos
sharePhotosButton.addEventListener("click", async () => {
    const allPhotos = await getAllPhotos(ALL_PHOTOS_STORE_NAME);

    if (allPhotos.length === 0) {
        showError("No photos to share.");
        return;
    }

    const photoFiles = allPhotos.map((photo) => new File([photo.blob], "snapshot.png", { type: "image/png" }));

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
});

// Load all stored photos when initializing the app
loadAllPhotos();
