class SimpleBarcodeDetector {
  constructor() {
    this.isActive = false;
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.overlay = null;
    this.selectionBox = null;
    
    this.setupMessageListener();
    
    // Load Quagga from local file only - no CDN fallbacks
    this.loadQuaggaLocal();
  }

  loadQuaggaLocal() {
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('libs/quagga.min.js');
    script.onload = () => {
      console.log('Quagga loaded from local file');
    };
    script.onerror = () => {
      console.error('Failed to load Quagga from local file');
    };
    document.head.appendChild(script);
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'startCrop') {
        this.startCrop();
        sendResponse({ success: true });
      }
    });
  }

  startCrop() {
    console.log('Starting simple crop mode...');
    this.isActive = true;
    this.createOverlay();
    document.body.style.cursor = 'crosshair';
    this.addEventListeners();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.3);
      z-index: 999999;
      cursor: crosshair;
    `;
    document.body.appendChild(this.overlay);
  }

  addEventListeners() {
    this.mouseDownHandler = this.handleMouseDown.bind(this);
    this.mouseMoveHandler = this.handleMouseMove.bind(this);
    this.mouseUpHandler = this.handleMouseUp.bind(this);
    this.keyDownHandler = this.handleKeyDown.bind(this);
    
    document.addEventListener('mousedown', this.mouseDownHandler);
    document.addEventListener('mousemove', this.mouseMoveHandler);
    document.addEventListener('mouseup', this.mouseUpHandler);
    document.addEventListener('keydown', this.keyDownHandler);
  }

  removeEventListeners() {
    if (this.mouseDownHandler) {
      document.removeEventListener('mousedown', this.mouseDownHandler);
      document.removeEventListener('mousemove', this.mouseMoveHandler);
      document.removeEventListener('mouseup', this.mouseUpHandler);
      document.removeEventListener('keydown', this.keyDownHandler);
    }
  }

  handleMouseDown(e) {
    if (!this.isActive) return;
    
    this.isDrawing = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    
    this.createSelectionBox();
  }

  handleMouseMove(e) {
    if (!this.isActive || !this.isDrawing) return;
    
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    const left = Math.min(this.startX, currentX);
    const top = Math.min(this.startY, currentY);
    const width = Math.abs(currentX - this.startX);
    const height = Math.abs(currentY - this.startY);
    
    this.updateSelectionBox(left, top, width, height);
  }

  handleMouseUp(e) {
    if (!this.isActive || !this.isDrawing) return;
    
    this.isDrawing = false;
    
    const rect = this.selectionBox.getBoundingClientRect();
    if (rect.width > 10 && rect.height > 10) {
      this.captureAndDetect({
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height
      });
    }
  }

  handleKeyDown(e) {
    if (e.key === 'Escape') {
      this.cleanup();
    }
  }

  createSelectionBox() {
    this.selectionBox = document.createElement('div');
    this.selectionBox.style.cssText = `
      position: fixed;
      border: 2px dashed #ff0000;
      background: rgba(255, 0, 0, 0.1);
      z-index: 1000000;
      pointer-events: none;
    `;
    document.body.appendChild(this.selectionBox);
  }

  updateSelectionBox(left, top, width, height) {
    if (this.selectionBox) {
      this.selectionBox.style.left = left + 'px';
      this.selectionBox.style.top = top + 'px';
      this.selectionBox.style.width = width + 'px';
      this.selectionBox.style.height = height + 'px';
    }
  }

  async captureAndDetect(rect) {
    try {
      console.log('Capturing area:', rect);
      
      // Show loading indicator
      this.showLoadingIndicator();
      
      // Hide overlay temporarily
      if (this.overlay) this.overlay.style.display = 'none';
      if (this.selectionBox) this.selectionBox.style.display = 'none';
      
      // Wait a moment for UI to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use only extension API for screenshot
      const dataUrl = await this.captureWithExtensionAPI(rect);
      
      console.log('Screenshot captured, detecting barcode...');
      
      // Check if Quagga is loaded
      if (typeof Quagga === 'undefined') {
        throw new Error('Barcode detection library not loaded. Please refresh the page and try again.');
      }
      
      const result = await this.detectBarcodeFromImage(dataUrl);
      
      this.hideLoadingIndicator();
      this.showResult(result);
      
    } catch (error) {
      console.error('Capture and detect failed:', error);
      this.hideLoadingIndicator();
      this.showError('Failed to capture or detect barcode: ' + error.message);
    } finally {
      this.cleanup();
    }
  }

  async captureWithExtensionAPI(rect) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({
        action: 'captureVisibleTab'
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error('Extension API error: ' + chrome.runtime.lastError.message));
          return;
        }
        
        if (!response || !response.success || !response.dataUrl) {
          reject(new Error('Failed to capture screenshot: ' + (response?.error || 'Unknown error')));
          return;
        }
        
        try {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              canvas.width = rect.width;
              canvas.height = rect.height;
              
              // Calculate scaling factor
              const scaleX = img.width / window.innerWidth;
              const scaleY = img.height / window.innerHeight;
              
              const scaledX = rect.left * scaleX;
              const scaledY = rect.top * scaleY;
              const scaledWidth = rect.width * scaleX;
              const scaledHeight = rect.height * scaleY;
              
              // Draw the cropped portion
              ctx.drawImage(
                img,
                scaledX, scaledY, scaledWidth, scaledHeight,
                0, 0, rect.width, rect.height
              );
              
              resolve(canvas.toDataURL('image/png'));
            } catch (cropError) {
              reject(new Error('Failed to crop image: ' + cropError.message));
            }
          };
          
          img.onerror = () => reject(new Error('Failed to load screenshot'));
          img.src = response.dataUrl;
        } catch (error) {
          reject(new Error('Error processing screenshot: ' + error.message));
        }
      });
    });
  }

  async detectBarcodeFromImage(imageData) {
    return new Promise((resolve, reject) => {
      try {
        if (typeof Quagga === 'undefined') {
          reject(new Error('Barcode detection library not loaded'));
          return;
        }

        const img = new Image();
        img.onload = () => {
          try {
            console.log('Starting barcode detection...');
            
            Quagga.decodeSingle({
              decoder: {
                readers: [
                  "code_128_reader",
                  "ean_reader",
                  "ean_8_reader",
                  "code_39_reader",
                  "upc_reader",
                  "upc_e_reader"
                ]
              },
              locate: true,
              src: imageData
            }, (result) => {
              if (result && result.codeResult && result.codeResult.code) {
                resolve({
                  code: result.codeResult.code,
                  format: result.codeResult.format || 'Unknown'
                });
              } else {
                reject(new Error('No barcode detected in the selected area'));
              }
            });
          } catch (error) {
            reject(new Error('Error processing image: ' + error.message));
          }
        };
        
        img.onerror = () => reject(new Error('Failed to load captured image'));
        img.src = imageData;
      } catch (error) {
        reject(new Error('Failed to process image: ' + error.message));
      }
    });
  }

  showLoadingIndicator() {
    const loading = document.createElement('div');
    loading.id = 'barcode-loading';
    loading.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px;
      border-radius: 10px;
      z-index: 1000001;
      font-family: Arial, sans-serif;
    `;
    loading.innerHTML = `
      <div style="text-align: center;">
        <div style="border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; margin: 0 auto 10px;"></div>
        <div>Detecting barcode...</div>
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(loading);
  }

  hideLoadingIndicator() {
    const loading = document.getElementById('barcode-loading');
    if (loading) {
      loading.remove();
    }
  }

  showResult(result) {
    const resultDiv = document.createElement('div');
    resultDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 1000001;
      font-family: Arial, sans-serif;
      max-width: 400px;
      word-wrap: break-word;
    `;
    
    resultDiv.innerHTML = `
      <h3 style="margin: 0 0 15px 0; color: #2c3e50;">Barcode Detected!</h3>
      <p><strong>Code:</strong> ${result.code}</p>
      <p><strong>Format:</strong> ${result.format}</p>
      <div style="margin-top: 15px;">
        <button id="copy-barcode" style="background: #3498db; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; margin-right: 10px;">Copy Code</button>
        <button id="close-result" style="background: #95a5a6; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer;">Close</button>
      </div>
    `;
    
    document.body.appendChild(resultDiv);
    
    document.getElementById('copy-barcode').addEventListener('click', () => {
      navigator.clipboard.writeText(result.code);
      alert('Barcode copied to clipboard!');
    });
    
    document.getElementById('close-result').addEventListener('click', () => {
      resultDiv.remove();
    });
    
    setTimeout(() => {
      if (resultDiv.parentNode) {
        resultDiv.remove();
      }
    }, 10000);
  }

  showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #e74c3c;
      color: white;
      padding: 20px;
      border-radius: 10px;
      z-index: 1000001;
      font-family: Arial, sans-serif;
      max-width: 400px;
    `;
    
    errorDiv.innerHTML = `
      <h3 style="margin: 0 0 10px 0;">Error</h3>
      <p>${message}</p>
      <button onclick="this.parentElement.remove()" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px 12px; border-radius: 5px; cursor: pointer; margin-top: 10px;">Close</button>
    `;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.remove();
      }
    }, 5000);
  }

  cleanup() {
    this.isActive = false;
    this.isDrawing = false;
    document.body.style.cursor = 'default';
    
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    
    if (this.selectionBox) {
      this.selectionBox.remove();
      this.selectionBox = null;
    }
    
    this.removeEventListeners();
  }
}

// Initialize the simple barcode detector
const simpleBarcodeDetector = new SimpleBarcodeDetector();
