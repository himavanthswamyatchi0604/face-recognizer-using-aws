// Replace 'YOUR_ACCESS_KEY_ID' and 'YOUR_SECRET_ACCESS_KEY' with your 
// AWS IAM user credentials
AWS.config.update({
  accessKeyId: 'Your access key Id',
  secretAccessKey: 'Your secret access key',
  region: 'us-east-1', // Update with your preferred AWS region
});

const s3 = new AWS.S3();
const rekognition = new AWS.Rekognition();
const bucketName ='yourbucketname'; // Replace with your S3 bucket name

function openFileExplorer() {
  document.getElementById('fileInput').click();
}

document.getElementById('fileInput').addEventListener('change', handleImageUpload);

function handleImageUpload(event) {
  const file = event.target.files[0];

  if (file) {
    const imageNameInput = document.getElementById('imageName');
    const customImageName = imageNameInput.value.trim() || 'default-image-name';
    const fileName = `${customImageName}`;

    // Show loader while uploading
    document.getElementById('uploadLoader').style.display = 'block';

    // Upload the file to S3
    const params = {
      Bucket: 'your bucketname',
      Key: `path in aws s3/${fileName}`,
      Body: file,
      ACL: 'public-read',
    };

    s3.upload(params, (err, data) => {
      // Hide loader after upload
      document.getElementById('uploadLoader').style.display = 'none';

      if (err) {
        console.error('Error uploading image:', err);
      } else {
        console.log('Image uploaded successfully:', data.Location);
        // You can now handle the successful upload, e.g., update the UI with the image URL
        document.getElementById('successMessage').style.display = 'block';

        // Refresh the image list dropdown after successful upload
        populateImageList();
      }
    }).on('httpUploadProgress', function (progress) {
      console.log('Upload progress:', progress);
    });
  }
}

function populateImageList() {
  console.log('Fetching image list...');
  const imageListDropdown = document.getElementById('imageList');
  const params = {
    Bucket: 'your bucketname',
    Delimiter: '/',
    Prefix: 'images path in s3', // Adjust the prefix based on your S3 folder structure
  };

  s3.listObjectsV2(params, (err, data) => {
    if (err) {
      console.error('Error fetching image list:', err);
    } else {
      console.log('Received data:', data);

      // Clear existing options
      imageListDropdown.innerHTML = '<option value="">Select an image</option>';

      // Populate dropdown with image names
      data.Contents.forEach((object) => {
        const imageName = object.Key.replace('/path in s3 ', ''); // Adjust the prefix
        imageListDropdown.innerHTML += `<option value="${imageName}">${imageName}</option>`;
      });

      console.log('Dropdown populated successfully:', imageListDropdown.innerHTML);
    }
  });
}

// Handle image selection from the dropdown
document.getElementById('imageList').addEventListener('change', handleImageSelection);

function handleImageSelection() {
  const selectedImageName = document.getElementById('imageList').value;
  const selectedImageContainer = document.getElementById('selectedImage');
  const recognizedImageContainer = document.getElementById('recognizedImageContainer');
  const recognizeFaceHeading = document.getElementById('recognizeFaceHeading');

  // Display the selected image within the fixed-size container
  if (selectedImageName) {
    selectedImageContainer.innerHTML = `<img src="https://${bucketName}.s3.amazonaws.com/path in s3/${selectedImageName}" alt="${selectedImageName}" style="width: 100%; height: 100%; object-fit: contain;">`;
    recognizeFaceHeading.style.display = 'block'; // Show the heading for Recognize face
  } else {
    selectedImageContainer.innerHTML = ''; // Clear the selected image container
    recognizeFaceHeading.style.display = 'none'; // Hide the heading for Recognize face
  }

  // Clear the recognized image container and result
  recognizedImageContainer.innerHTML = '';
  document.getElementById('faceRecognitionResult').innerText = '';
}

// Call the function to populate the image list on page load
populateImageList();

function recognizeFace() {
  const selectedImageName = document.getElementById('imageList').value;
  const recognizedImageContainer = document.getElementById('recognizedImageContainer');
  const faceRecognitionResult = document.getElementById('faceRecognitionResult');

  if (!selectedImageName) {
    // No image selected for recognizing face
    faceRecognitionResult.innerText = 'No image to recognize face.';
    return;
  }

  // Show loader while recognizing
  document.getElementById('recognizeLoader').style.display = 'block';

  const imageSrc = `https://${bucketName}.s3.amazonaws.com/path in s3/${selectedImageName}`;

  // Create an image element to get the original dimensions
  const img = new Image();
  img.src = imageSrc;
  img.onload = function () {
    const originalWidth = img.width;
    const originalHeight = img.height;

    const params = {
      Image: {
        S3Object: {
          Bucket: 'your bucket name',
          Name: `path in s3/${selectedImageName}`,
        },
      },
    };

    rekognition.detectFaces(params, (err, data) => {
      // Hide loader after recognition
      document.getElementById('recognizeLoader').style.display = 'none';

      if (err) {
        console.error('Error detecting faces:', err);
        faceRecognitionResult.innerText = 'Error detecting faces.';
      } else {
        console.log('Faces detected:', data.FaceDetails);

        // Create a message element for face recognition result
        const resultMessage = document.createElement('div');
        resultMessage.style.textAlign = 'center';
        resultMessage.style.marginTop = '10px';

        if (data.FaceDetails.length > 0) {
          // Face recognized, set the success message
          resultMessage.innerText = 'Face recognized!';

          // Clear the recognized image container
          recognizedImageContainer.innerHTML = '';

          // Append the resultMessage element to recognizedImageContainer
          recognizedImageContainer.appendChild(resultMessage);

          // Clear the result message and display recognized image after 3 seconds
          setTimeout(() => {
            resultMessage.innerText = ''; // Clear the result message
            faceRecognitionResult.innerText = ''; // Clear the face recognition result

            // Proceed to display the recognized image
            displayRecognizedImage(selectedImageName, originalWidth, originalHeight);
          }, 3000);
        } else {
          // No face detected, set the appropriate message
          resultMessage.innerText = 'No face detected.';

          // Clear the recognized image container
          recognizedImageContainer.innerHTML = '';

          // Append the resultMessage element to recognizedImageContainer
          recognizedImageContainer.appendChild(resultMessage);

          // Clear the result message after 3 seconds
          
        }
      }
    });
  };
}

function displayRecognizedImage(selectedImageName, originalWidth, originalHeight) {
  const recognizedImageContainer = document.getElementById('recognizedImageContainer');

  // Calculate the fixed dimensions for the displayed image
  const containerWidth = recognizedImageContainer.clientWidth;
  const containerHeight = recognizedImageContainer.clientHeight;
  const scaleFactor = Math.min(containerWidth / originalWidth, containerHeight / originalHeight);
  const fixedWidth = originalWidth * scaleFactor;
  const fixedHeight = originalHeight * scaleFactor;

  // Create a canvas with fixed dimensions
  const canvas = document.createElement('canvas');
  canvas.width = fixedWidth;
  canvas.height = fixedHeight;
  const ctx = canvas.getContext('2d');

  // Draw the original image on the canvas with fixed dimensions
  const img = new Image();
  img.src = `https://${bucketName}.s3.amazonaws.com/path in s3/${selectedImageName}`;
  img.onload = function () {
    ctx.drawImage(img, 0, 0, fixedWidth, fixedHeight);

    const params = {
      Image: {
        S3Object: {
          Bucket: 'your bucket name',
          Name: `path in s3/${selectedImageName}`,
        },
      },
    };

    rekognition.detectFaces(params, (err, data) => {
      if (err) {
        console.error('Error detecting faces:', err);
      } else {
        console.log('Faces detected:', data.FaceDetails);

        // Now, you can loop through all recognized faces and draw green boxes
        getFaceDetails(ctx, fixedWidth, fixedHeight, data.FaceDetails);

        // Replace the recognized image container with the canvas
        recognizedImageContainer.innerHTML = '';
        recognizedImageContainer.appendChild(canvas);
      }
    });
  };
}



function getFaceDetails(ctx, originalWidth, originalHeight, faceDetails) {
  // Loop through all recognized faces and draw green boxes
  faceDetails.forEach((faceDetail) => {
    const boundingBox = faceDetail.BoundingBox;

    // Calculate dimensions for the green box in the fixed canvas
    const boxLeft = boundingBox.Left * originalWidth;
    const boxTop = boundingBox.Top * originalHeight;
    const boxWidth = boundingBox.Width * originalWidth;
    const boxHeight = boundingBox.Height * originalHeight;

    // Draw the green box
    ctx.beginPath();
    ctx.rect(boxLeft, boxTop, boxWidth, boxHeight);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'green';
    ctx.stroke();
  });
}


// Add this variable to store the live video element
let liveVideoElement;

function recognizeLive() {
  // Check if there is an existing live video element, remove it if exists
  if (liveVideoElement) {
    liveVideoElement.srcObject.getTracks().forEach(track => track.stop());
    liveVideoElement.remove();
  }

  // Create a new video element for live video
  liveVideoElement = document.createElement('video');
  document.getElementById('liveVideoContainer').appendChild(liveVideoElement);

  // Add styling to the live video element
  liveVideoElement.style.width = '100%';
  liveVideoElement.style.height = '100%';

  // Access the user's camera
  navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
      liveVideoElement.srcObject = stream;
      liveVideoElement.play();

      // Continuously send frames to Rekognition
      setInterval(() => {
        const canvas = document.createElement('canvas');
        canvas.width = liveVideoElement.videoWidth;
        canvas.height = liveVideoElement.videoHeight;
        const context = canvas.getContext('2d');
        context.drawImage(liveVideoElement, 0, 0, canvas.width, canvas.height);

        // Convert canvas data to base64-encoded image
        const imageData = canvas.toDataURL('image/jpeg').replace(/^data:image\/(png|jpeg);base64,/, '');

        // Call Rekognition API to detect faces
        rekognition.detectFaces({
          Image: { Bytes: new Uint8Array(atob(imageData).split('').map(char => char.charCodeAt(0))) },
        }, (err, data) => {
          if (err) {
            console.error(err);
          } else {
            // Handle the result (e.g., draw green boxes on the canvas)
            handleLiveRecognitionResult(liveVideoElement, data.FaceDetails);
          }
        });

      }, 1000); // Send frames every second
    })
    .catch((err) => {
      console.error(err);
    });
}

// Function to draw green boxes on the live video feed
function handleLiveRecognitionResult(video, faceDetails) {
  const context = video.getContext('2d');
  faceDetails.forEach((face) => {
    const { BoundingBox } = face;
    const { Width, Height, Left, Top } = BoundingBox;

    // Draw the green box on the video element
    context.beginPath();
    context.rect(Left * video.videoWidth, Top * video.videoHeight, Width * video.videoWidth, Height * video.videoHeight);
    context.lineWidth = 2;
    context.strokeStyle = 'green';
    context.stroke();
  });
}

// Function to draw green boxes on the live video feed
function handleLiveRecognitionResult(video, faceDetails) {
  const container = document.getElementById('liveVideoContainer');
  const canvas = document.createElement('canvas');
  container.innerHTML = '';
  container.appendChild(canvas);

  const context = canvas.getContext('2d');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Draw the current video frame on the canvas
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  faceDetails.forEach((face) => {
    const { BoundingBox } = face;
    const { Width, Height, Left, Top } = BoundingBox;

    // Draw the green box
    context.beginPath();
    context.rect(Left * canvas.width, Top * canvas.height, Width * canvas.width, Height * canvas.height);
    context.lineWidth = 2;
    context.strokeStyle = 'green';
    context.stroke();
  });
}
