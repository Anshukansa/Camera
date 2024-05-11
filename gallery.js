// IndexedDB setup
const DB_NAME = "PhotoCaptureApp";
const ALL_PHOTOS_STORE_NAME = "all_photos";
const DB_VERSION = 1;

// Get reference to UI elements
const allphotoGallery = document.getElementById("all-photo-gallery");
const errorMessage = document.getElementById("error-message");

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

async function loadSessionPhotos() {
    try {
        const sessionPhotos = await getAllPhotos(SESSION_STORE_NAME);
        const sessionPhotoGallery = document.getElementById("session-photo-gallery");

        sessionPhotoGallery.innerHTML = ""; // Clear existing session photos in the gallery

        sessionPhotos.forEach((photo) => {
            const imgElement = document.createElement("img");
            imgElement.src = URL.createObjectURL(photo.blob); // Display the session photo
            imgElement.className = "photo-thumbnail"; // Styled thumbnail
            sessionPhotoGallery.appendChild(imgElement);
        });

        if (sessionPhotos.length > 0) {
            // Enable appropriate buttons or perform other actions specific to session photos
        }

    } catch (error) {
        showError("Error loading session photos: " + error.message);
    }
}


// Function to show error messages
function showError(message) {
    console.error(message);
    errorMessage.textContent = message;
}

// Function to open IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
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

// Load all stored photos when initializing the gallery
loadAllPhotos();
