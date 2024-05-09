// Store photos and manage session status
let photos = [];
let sessionActive = false;

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

// Function to show error messages to the user
function showError(message) {
    errorMessage.textContent = message; // Display the error message
}

// Function to start the session and request permissions
async function requestPermissions() {
    clearError(); // Clear previous error messages

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showError("Camera is not supported on this device or browser.");
        return;
    }

    try {
        // Request camera access to trigger permission
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        // If successful, start the session and release the camera
        startSession();
        stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
        showError("Camera access is required. Please grant permission."); // Handle permission errors
        return;
    }

    try {
        // Request location permissions
        await requestLocation();
    } catch (error) {
        showError("Location access is required. Please grant permission.");
    }
}

// Start the session and enable buttons
function startSession() {
    sessionActive = true; // Mark the session as active
    startSessionButton.style.display = 'none'; // Hide the "Start Session" button
    capturePhotoButton.disabled = false; // Enable the "Capture Photo" button
    endSessionButton.disabled = false; // Enable the "End Session" button
    sharePhotosButton.disabled = true; // Initially disable the "Share Photos" button
    deletePhotosButton.disabled = true; // Initially disable the "Delete Photos" button
    photos = []; // Reset the photos array
    photoGallery.innerHTML = ''; // Clear the photo gallery
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

// Function to capture a photo with overlay information
async function capturePhoto() {
    clearError(); // Clear existing error messages
    
    if (!sessionActive) return; // Ensure session is active

    try {
        // Capture the photo
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(track);
        const photoBlob = await imageCapture.takePhoto(); // Capture the photo

        const currentTime = new Date().toLocaleString(); // Get the current time and date

        // Get location data
        const position = await requestLocation();
        const { latitude, longitude } = position.coords;

        // Create a canvas to overlay information onto the photo
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width; // Set canvas width
            canvas.height = img.height; // Set canvas height

            ctx.drawImage(img, 0, 0); // Draw the photo onto the canvas

            // Add overlay information in the bottom-left corner
            ctx.fillStyle = 'white'; // White text for contrast
            ctx.font = '16px Arial'; // Font size and style
            const overlayText = `Date: ${currentTime}, Lat: ${latitude.toFixed(4)}, Long: ${longitude.toFixed(4)}`;

            // Position text in the bottom-left corner
            ctx.fillText(overlayText, 10, canvas.height - 10);

            // Convert the canvas to a data URL
            const overlayedPhoto = canvas.toDataURL();
            
            const displayImage = document.createElement('img');
            displayImage.src = overlayedPhoto; // Set the image source to the data URL
            displayImage.width = 100; // Display width
            photoGallery.appendChild(displayImage); // Display in the photo gallery

            // Store the photo with the overlay
            photos.push(overlayedPhoto);
        };

        // Load the original photo into the image object to draw onto the canvas
        img.src = URL.createObjectURL(photoBlob);

        // Stop the stream to release the camera
        stream.getTracks().forEach(track => track.stop());
    } catch (error) {
        showError("Error capturing photo or accessing location: " + error.message);
    }
}

// End the session and enable sharing and deletion options
function endSession() {
    capturePhotoButton.disabled = true; // Disable "Capture Photo" button
    endSessionButton.disabled = true; // Disable "End Session" button
    startSessionButton.style.display = 'block'; // Show the "Start Session" button again

    if (photos.length === 0) {
        alert("No photos to share or delete."); // If no photos, inform the user
        return;
    }

    // Enable the "Share Photos" and "Delete All Photos" buttons
    sharePhotosButton.disabled = false;
    deletePhotosButton.disabled = false;
}

// Share photos by opening them in new tabs
function sharePhotos() {
    photos.forEach((photo, index) => {
        window.open(photo, `_blank${index}`); // Open in new tabs for sharing
    });
}

// Delete all photos after sharing
function deletePhotos() {
    photoGallery.innerHTML = ''; // Clear the photo gallery
    photos = []; // Clear the photos array
}

// Add event listeners to the buttons
startSessionButton.addEventListener('click', requestPermissions); // Start session and request permissions
capturePhotoButton.addEventListener('click', capturePhoto); // Capture a photo with overlay information
endSessionButton.addEventListener('click', endSession); // End the session with sharing and deletion options
sharePhotosButton.addEventListener('click', sharePhotos); // Share photos
deletePhotosButton.addEventListener('click', deletePhotos); // Delete all photos after sharing
