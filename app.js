// Variables to manage the session and photo storage
let photos = [];
let sessionActive = false;

// Get references to UI elements
const startSessionButton = document.getElementById('start-session');
const capturePhotoButton = document.getElementById('capture-photo');
const endSessionButton = document.getElementById('end-session');
const photoGallery = document.getElementById('photo-gallery');
const errorMessage = document.getElementById('error-message');

// Check if the browser supports camera and geolocation
function isSupported() {
    return (
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia &&
        navigator.geolocation
    );
}

// Request camera permissions and location permissions
async function requestPermissions() {
    clearError(); // Clear any existing error messages
    
    if (!isSupported()) {
        showError("Camera and geolocation are not supported on this device or browser.");
        return;
    }

    try {
        // Request camera access
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });

        // If successful, start the session and stop the stream
        startSession();
        stream.getTracks().forEach(track => track.stop());
    } catch (error) {
        showError("Camera access is required. Please grant permission."); // Handle permission error
        return;
    }

    try {
        // Request location access
        await requestLocation();
    } catch (error) {
        showError("Location access is required. Please grant permission."); // Handle location error
    }
}

// Request location information
function requestLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => resolve(position), // On success, return the position
                (error) => reject(new Error("Location permission denied."))
            );
        } else {
            reject(new Error("Geolocation is not supported on this device or browser."));
        }
    });
}

// Start the session
function startSession() {
    sessionActive = true; // Mark the session as active
    startSessionButton.style.display = 'none'; // Hide the start session button
    capturePhotoButton.disabled = false; // Enable the capture photo button
    endSessionButton.disabled = false; // Enable the end session button
}

// Capture a photo and get location
async function capturePhoto() {
    clearError(); // Clear existing error messages
    
    if (!sessionActive) return; // Ensure session is active

    try {
        // Access the camera and capture a photo
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const track = stream.getVideoTracks()[0];
        const imageCapture = new ImageCapture(track);
        const photoBlob = await imageCapture.takePhoto();

        // Add the photo to the photos array
        photos.push(photoBlob);

        // Display the captured photo in the gallery
        const img = document.createElement('img');
        img.src = URL.createObjectURL(photoBlob);
        img.width = 100; // Set the width for gallery display
        photoGallery.appendChild(img);

        // Stop the stream to release the camera
        stream.getTracks().forEach(track => track.stop());

        // Get location information
        const position = await requestLocation();
        const { latitude, longitude } = position.coords;
        console.log("Captured photo at location:", { latitude, longitude });
    } catch (error) {
        showError("Error capturing photo or accessing location: " + error.message);
    }
}

// End the session, offering options to share and delete photos
function endSession() {
    capturePhotoButton.disabled = true; // Disable the capture photo button
    endSessionButton.disabled = true; // Disable the end session button
    startSessionButton.style.display = 'block'; // Show the start session button again

    if (photos.length === 0) {
        alert("No photos to share or delete.");
        return;
    }

    // Ask if the user wants to share the photos
    const shareOption = confirm("Do you want to share all photos?");
    if (shareOption) {
        sharePhotos(); // Share the photos
    }

    // Ask if the user wants to delete the photos after sharing
    const deleteOption = confirm("Do you want to delete all photos after sharing?");
    if (deleteOption) {
        deletePhotos(); // Delete all captured photos
    }
}

// Share the photos (using opening new tabs for sharing)
function sharePhotos() {
    alert("Sharing all captured photos. You may need to save or share them now.");

    photos.forEach((photo, index) => {
        const url = URL.createObjectURL(photo);
        window.open(url, `_blank${index}`); // Open each photo in a new tab for sharing
    });
}

// Delete all photos
function deletePhotos() {
    photoGallery.innerHTML = ''; // Clear the photo gallery
    photos = []; // Clear the photos array
    console.log("All photos have been deleted.");
}

// Function to show error messages to the user
function showError(message) {
    errorMessage.textContent = message; // Display the error message in the UI
}

// Function to clear error messages
function clearError() {
    errorMessage.textContent = ''; // Clear any existing error messages
}

// Add event listeners to the buttons
startSessionButton.addEventListener('click', requestPermissions); // Start session and request permissions
capturePhotoButton.addEventListener('click', capturePhoto); // Capture a photo
endSessionButton.addEventListener('click', endSession); // End the session with sharing and deletion options
