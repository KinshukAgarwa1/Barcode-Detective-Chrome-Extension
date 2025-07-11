class BarcodeDetector {
  constructor() {
    this.isActive = false;
    this.isDrawing = false;
    this.startX = 0;
    this.startY = 0;
    this.overlay = null;
    this.selectionBox = null;
    this.isQuaggaLoaded = false;
    this.isHtml2CanvasLoaded = false;
    
    this.loadDependencies();
    this.setupMessageListener();
  }

  async loadDependencies() {
    try {
      // Load Quagga.js
      const quaggaScript = document.createElement('script');
      quaggaScript.src = chrome.runtime.getURL('libs/quagga.min.js');
      
      // Load html2canvas
      const html2canvasScript = document.createElement('script');
      html2canvasScript.src = chrome.runtime.getURL('libs/html2canvas.min.js');
      
      // Wait for both scripts to load
      const loadQuagga = new Promise((resolve, reject) => {
        quaggaScript.onload = () => {
          this.isQuaggaLoaded = true;
          console.log('QuaggaJS loaded successfully');
          resolve();
        };
        quaggaScript.onerror = (error) => {
          console.error('Failed to load QuaggaJS:', error);
          reject(error);
        };
      });
      
      const loadHtml2Canvas = new Promise((resolve, reject) => {
        html2canvasScript.onload = () => {
          this.isHtml2CanvasLoaded = true;
          console.log('html2canvas loaded successfully');
          resolve();
        };
        html2canvasScript.onerror = (error) => {
          console.error('Failed to load html2canvas:', error);
          reject(error);
        };
      });
      
      // Add scripts to head
      document.head.appendChild(quaggaScript);
      document.head.appendChild(html2canvasScript);
      
      // Wait for both to load
      await Promise.all([loadQuagga, loadHtml2Canvas]);
      
      return true;
    } catch (error) {
      console.error('Error loading dependencies:', error);
      return false;
    }
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'startCrop') {
        this.startCrop();
        sendResponse({ success: true });
      } else if (message.action === 'detectBarcode') {
        this.detectBarcodeFromImage(message.imageData)
          .then(result => sendResponse({ success: true, result }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
      }
    });
  }

  async startCrop() {
    if (!this.isQuaggaLoaded || !this.isHtml2CanvasLoaded) {
      try {
        await this.loadDependencies();
      } catch (error) {
        console.error('Failed to load dependencies:', error);
        this.showError('Failed to load required libraries. Please try refreshing the page.');
        return;
      }
    }

    this.isActive = true;
    this.createOverlay();
    document.body.style.cursor = 'crosshair';
    
    this.addEventListeners();
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'barcode-detector-overlay';
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
      
      // Check if html2canvas is loaded
      if (typeof html2canvas === 'undefined') {
        throw new Error('html2canvas is not loaded. Please try refreshing the page.');
      }
      
      // Create a temporary container for the capture region
      const captureContainer = document.createElement('div');
      captureContainer.style.position = 'absolute';
      captureContainer.style.left = '0';
      captureContainer.style.top = '0';
      captureContainer.style.width = window.innerWidth + 'px';
      captureContainer.style.height = window.innerHeight + 'px';
      captureContainer.style.overflow = 'hidden';
      captureContainer.style.zIndex = '-1';
      captureContainer.style.opacity = '0';
      document.body.appendChild(captureContainer);
      
      // Clone the visible content into this container
      const elementsUnderSelection = document.elementsFromPoint(
        rect.left + (rect.width / 2),
        rect.top + (rect.height / 2)
      );
      
      // Get the deepest element that isn't our overlay or selection box
      const targetElement = elementsUnderSelection.find(el => 
        el.id !== 'barcode-detector-overlay' && 
        el !== this.selectionBox
      );
      
      if (!targetElement) {
        throw new Error('Could not find element to capture');
      }
      
      // Use html2canvas to capture the area
      const canvas = await html2canvas(targetElement, {
        backgroundColor: null,
        logging: false,
        ignoreElements: (element) => {
          return element === this.overlay || 
                 element === this.selectionBox || 
                 element.id === 'barcode-loading';
        },
        x: rect.left - targetElement.getBoundingClientRect().left,
        y: rect.top - targetElement.getBoundingClientRect().top,
        width: rect.width,
        height: rect.height
      });
      
      // Clean up
      document.body.removeChild(captureContainer);
      
      // Get the data URL from the canvas
      const dataUrl = canvas.toDataURL('image/png');
      
      // Hide loading indicator
      this.hideLoadingIndicator();
      
      // Detect barcode
      const result = await this.detectBarcodeFromImage(dataUrl);
      
      // Show result
      this.showResult(result);
      
    } catch (error) {
      console.error('Capture and detect failed:', error);
      this.hideLoadingIndicator();
      this.showError('Failed to capture or detect barcode: ' + error.message);
    } finally {
      this.cleanup();
    }
  }

  async detectBarcodeFromImage(imageData) {
    return new Promise((resolve, reject) => {
      if (typeof window.Quagga === 'undefined') {
        reject(new Error('Quagga library not loaded'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Configure Quagga for better detection
        window.Quagga.decodeSingle({
          decoder: {
            readers: [
              "code_128_reader",
              "ean_reader",
              "ean_8_reader",
              "code_39_reader",
              "code_39_vin_reader",
              "codabar_reader",
              "upc_reader",
              "upc_e_reader",
              "i2of5_reader",
              "2of5_reader",
              "code_93_reader"
            ]
          },
          locate: true,
          src: imageData
        }, (result) => {
          if (result && result.codeResult) {
            resolve({
              code: result.codeResult.code,
              format: result.codeResult.format,
              confidence: result.codeResult.start ? 
                Math.round((result.codeResult.start.x + result.codeResult.end.x) / 2) : 0
            });
          } else {
            reject(new Error('No barcode detected in the selected area'));
          }
        });
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load captured image'));
      };
      
      img.src = imageData;
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
    
    // Add event listeners for buttons
    document.getElementById('copy-barcode').addEventListener('click', () => {
      navigator.clipboard.writeText(result.code);
      alert('Barcode copied to clipboard!');
    });
    
    document.getElementById('close-result').addEventListener('click', () => {
      resultDiv.remove();
    });
    
    // Auto-close after 10 seconds
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
    
    // Auto-close after 5 seconds
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
    
    // Remove overlay
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
    
    // Remove selection box
    if (this.selectionBox) {
      this.selectionBox.remove();
      this.selectionBox = null;
    }
    
    // Remove event listeners
    this.removeEventListeners();
  }
}

// Initialize the barcode detector
const barcodeDetector = new BarcodeDetector();