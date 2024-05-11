// IndexedDB setup
const DB_NAME = "PhotoCaptureApp";
const ALL_PHOTOS_STORE_NAME = "all_photos";
const DB_VERSION = 1;

// Get reference to UI elements
const allPhotoGallery = document.getElementById("all-photo-gallery");
const errorMessage = document.getElementById("error-message");
const sharePhotosButton = document.getElementById("sharePhotos");
const deleteSessionPhotosButton = document.getElementById("deleteSessionPhotos");
const deleteAllPhotosButton = document.getElementById("deleteAllPhotos");

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

async function loadAllPhotos() {
    try {
        const allPhotos = await getAllPhotos(ALL_PHOTOS_STORE_NAME);

        allPhotoGallery.innerHTML = ""; // Clear existing all photos in the gallery

        allPhotos.forEach((photo) => {
            const imgElement = document.createElement("img");
            imgElement.src = URL.createObjectURL(photo.blob); // Display the all photo
            imgElement.className = "photo-thumbnail"; // Styled thumbnail
            allPhotoGallery.appendChild(imgElement);
        });

        if (allPhotos.length > 0) {
            sharePhotosButton.style.display = "block";
            sharePhotosButton.disabled = false; // Enable share button if there are photos to share
            deleteSessionPhotosButton.style.display = "block";
            deleteSessionPhotosButton.disabled = false; // Enable delete button after capturing a photo
            deleteAllPhotosButton.style.display = "block";
            deleteAllPhotosButton.disabled = false; // Enable delete button after capturing a photo
        }

    } catch (error) {
        showError("Error loading all photos: " + error.message);
    }
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

// Function to delete all photos from the all_photos store
async function deleteAllPhotos() {
    if (confirm("Are you sure you want to delete all photos?")) {
        try {
            const db = await openDB();
            const transaction = db.transaction([ALL_PHOTOS_STORE_NAME], "readwrite");
            const objectStore = transaction.objectStore(ALL_PHOTOS_STORE_NAME);
            const request = objectStore.clear();

            request.onsuccess = () => {
                allPhotoGallery.innerHTML = ""; // Clear the gallery
                deleteAllPhotosButton.disabled = true; // Disable delete button
            };

            request.onerror = (event) => {
                showError("Error deleting photos: " + event.target.error);
            };
        } catch (error) {
            showError("Error deleting photos: " + error.message);
        }
    }
}

// Function to share all photos
async function shareAllPhotos() {
    try {
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
    } catch (error) {
        showError("Error sharing photos: " + error.message);
    }
}

// Load all stored photos when initializing the gallery
loadAllPhotos();

// Event listener for deleting all photos
deleteAllPhotosButton.addEventListener("click", deleteAllPhotos);

// Event listener for sharing all photos
sharePhotosButton.addEventListener("click", shareAllPhotos);
