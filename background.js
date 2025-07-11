chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureScreenshot') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Screenshot failed:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        // Crop the screenshot to the specified rectangle
        cropImage(dataUrl, message.rect).then(croppedDataUrl => {
          sendResponse({ success: true, dataUrl: croppedDataUrl });
        }).catch(error => {
          console.error('Crop failed:', error);
          sendResponse({ success: false, error: error.message });
        });
      } 
    });
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'captureVisibleTab') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('Tab capture failed:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, dataUrl: dataUrl });
      } 
    });
    return true; // Keep message channel open for async response
  }
});

// Add this function to create an offscreen canvas for image processing
function cropImage(dataUrl, rect) {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary canvas in the background context
      const canvas = new OffscreenCanvas(rect.width, rect.height);
      const ctx = canvas.getContext('2d');
      
      // Create a bitmap from the dataUrl
      createImageBitmap(dataURLToBlob(dataUrl))
        .then(imageBitmap => {
          // Draw the portion of the image that we want to crop
          ctx.drawImage(
            imageBitmap,
            rect.left, rect.top, rect.width, rect.height,
            0, 0, rect.width, rect.height
          );
          
          // Convert the canvas to a data URL
          canvas.convertToBlob().then(blob => {
            const reader = new FileReader();
            reader.onloadend = () => {
              resolve(reader.result);
            };
            reader.onerror = (error) => {
              reject(new Error('Failed to convert cropped image to data URL'));
            };
            reader.readAsDataURL(blob);
          });
        })
        .catch(error => {
          console.error('Error processing image:', error);
          reject(new Error('Failed to process image'));
        });
    } catch (error) {
      console.error('Error cropping image:', error);
      reject(new Error('Failed to crop image: ' + error.message));
    }
  });
}

// Helper function to convert data URL to Blob
function dataURLToBlob(dataURL) {
  const parts = dataURL.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  
  return new Blob([uInt8Array], { type: contentType });
}