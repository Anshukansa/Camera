// Variables to manage the photo session
let sessionActive = false;
let photos = []; // Store the captured photos

// Get references to UI elements
const startSessionButton = document.getElementById('start-session');
const capturePhotoButton = document.getElementById('capture-photo');
const endSessionButton = document.getElementById('end-session');
const sharePhotosButton = document.getElementById('share-photos');
const deletePhotosButton = document.getElementById('delete-photos');
const photoGallery = document.getElementById('photo-gallery');
const errorMessage = document.getElementById('error-message'); // For error messages

// Function to clear error messages
function clearError() {
    errorMessage.textContent = ''; // Clear any existing error messages
}

// Function to show error messages
function showError(message) {
    errorMessage.textContent = message; // Display the error message
}

// Function to start the session
async function startSession() {
    clearError(); // Clear any existing error messages
    
    // Ensure the browser supports camera and location
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError("Camera is not supported on this device or browser.");
        return;
    }

    try {
        // Request camera permissions
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });

        // Start the session and release the camera
        sessionActive = true;
        capturePhotoButton.disabled = false; // Enable "Capture Photo"
        endSessionButton.disabled = false; // Enable "End Session"
        sharePhotosButton.disabled = true; // Keep "Share Photos" disabled initially
        deletePhotosButton.disabled = true; // Keep "Delete Photos" disabled
        stream.getTracks().forEach(track => track.stop()); // Release the camera

        // Reset photo storage and gallery
        photos = [];
        photoGallery.innerHTML = '';
    } catch (error) {
        showError("Camera access is required. Please grant permission."); // Handle camera access error
        return;
    }
}

// Function to capture a photo and add overlay information
async function capturePhoto() {
    clearError(); // Clear existing error messages

    if (!sessionActive) return; // Ensure session is active

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(track);
        const photoBlob = await imageCapture.takePhoto();

        // Get the current date/time
        const currentTime = new Date().toLocaleString();

        // Get location information
        const position = await requestLocation();
        const { latitude, longitude } = position.coords;

        // Create a canvas to overlay information on the photo
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;

            // Draw the captured photo onto the canvas
            ctx.drawImage(img, 0, 0);

            // Add overlay information in the bottom-left corner
            ctx.fillStyle = 'white'; // White text for visibility
            ctx.font = '16px Arial'; // Font style
            const overlayText = `Date: ${currentTime}, Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`;

            ctx.fillText(overlayText, 10, canvas.height - 10); // Position the text

            // Convert the canvas to a data URL
            const overlayedPhoto = canvas.toDataURL();

            // Add the photo to the photo gallery
            const displayImage = document.createElement('img');
            displayImage.src = overlayedPhoto;
            displayImage.width = 100; // Display width
            photoGallery.appendChild(displayImage);

            // Store the photo in the photos array
            photos.push(overlayedPhoto);
        };

        img.src = URL.createObjectURL(photoBlob); // Load the original photo
        stream.getTracks().forEach(track => track.stop()); // Stop the stream
    } catch (error) {
        showError("Error capturing photo or accessing location: " + error.message); // Handle capture error
    }
}

// Function to request location information
function requestLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => resolve(position), // Resolve with location data
                (error) => reject(new Error("Location permission denied."))
            );
        } else {
            reject(new Error("Geolocation is not supported on this device or browser."));
        }
    });
}

// Function to end the session and enable share and delete options
function endSession() {
    sessionActive = false; // Mark the session as inactive
    capturePhotoButton.disabled = true; // Disable "Capture Photo"
    endSessionButton.disabled = true; // Disable "End Session"
    startSessionButton.style.display = 'block'; // Show "Start Session" again

    if (photos.length === 0) {
        showError("No photos to share or delete."); // If there are no photos, inform the user
        return;
    }

    // Enable the "Share Photos" and "Delete All Photos" buttons
    sharePhotosButton.disabled = false;
    deletePhotosButton.disabled = false;
}

// Function to share photos
function sharePhotos() {
    clearError();

    if (photos.length === 0) {
        showError("No photos to share."); // If there are no photos, return
        return;
    }

    // Open each photo in a new tab for sharing
    photos.forEach((photo, index) => {
        window.open(photo, `_blank${index}`); // Open the photo in a new tab
    });
}

// Function to delete all photos after sharing
function deletePhotos() {
    photoGallery.innerHTML = ''; // Clear the photo gallery
    photos = []; // Clear the photos array
}

// Event listeners for buttons
startSessionButton.addEventListener('click', startSession); // Start the session
capturePhotoButton.addEventListener('click', capturePhoto); // Capture a photo with overlay
endSessionButton.addEventListener('click', endSession); // End the session
sharePhotosButton.addEventListener('click', sharePhotos); // Share all photos
deletePhotosButton.addEventListener('click', deletePhotos); // Delete all photos
