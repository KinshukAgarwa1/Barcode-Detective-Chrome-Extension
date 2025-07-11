const imageInput = document.getElementById('imageInput');
const imagePreview = document.getElementById('imagePreview');
const canvasOutput = document.getElementById('canvasOutput');
const resultBox = document.getElementById('result');

let codeReader = null;
let imageLoaded = false;
let zxingReady = false;

// Initialize ZXing when available
function initializeZXing() {
  try {
    if (typeof ZXing !== 'undefined') {
      codeReader = new ZXing.BrowserMultiFormatReader();
      zxingReady = true;
      console.log('ZXing initialized successfully');
      tryRunDetection();
    } else {
      console.error('ZXing library not loaded');
      resultBox.innerText = "Error: ZXing library not available";
    }
  } catch (error) {
    console.error('Failed to initialize ZXing:', error);
    resultBox.innerText = "Error: Failed to initialize barcode reader";
  }
}

// Handle image selection and loading
imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  resultBox.innerText = "Loading image...";
  
  const reader = new FileReader();
  reader.onload = function () {
    imagePreview.src = reader.result;
    imagePreview.style.display = 'block';
  };
  reader.readAsDataURL(file);
});

// When image is loaded in the preview
imagePreview.onload = () => {
  imageLoaded = true;
  
  // Draw image to canvas
  const ctx = canvasOutput.getContext('2d');
  canvasOutput.width = imagePreview.naturalWidth;
  canvasOutput.height = imagePreview.naturalHeight;
  ctx.drawImage(imagePreview, 0, 0);
  
  tryRunDetection();
};

// Run detection if both ZXing and image are ready
function tryRunDetection() {
  if (!zxingReady || !imageLoaded) return;

  resultBox.innerText = "Detecting barcode...";
  
  // Use the image src directly with ZXing
  codeReader.decodeFromImageUrl(imagePreview.src)
    .then(result => {
      if (result) {
        const text = result.getText();
        const format = result.getBarcodeFormat();
        resultBox.innerText = `Result: ${text} (Format: ${format})`;
      } else {
        resultBox.innerText = "Result: No barcode found";
      }
    })
    .catch(err => {
      resultBox.innerText = "Result: No barcode found";
      console.warn('Detection error:', err);
    });

  // Reset imageLoaded for next image
  imageLoaded = false;
}

// Initialize when page loads
window.addEventListener('load', initializeZXing);