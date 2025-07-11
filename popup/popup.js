class BarcodeDetectivePopup {
  constructor() {
    this.initializeElements();
    this.setupEventListeners();
    this.checkLibraryStatus();
  }

  initializeElements() {
    // Buttons
    this.startCropBtn = document.getElementById('startCrop');
    this.uploadBtn = document.getElementById('uploadBtn');
    this.copyBtn = document.getElementById('copyBtn');
    this.fileInput = document.getElementById('fileInput');

    // Display elements
    this.imagePreviewContainer = document.getElementById('imagePreviewContainer');
    this.imagePreview = document.getElementById('imagePreview');
    this.status = document.getElementById('status');
    this.statusText = document.getElementById('statusText');
    this.debugInfo = document.getElementById('debugInfo');
    this.debugText = document.getElementById('debugText');

    // Result containers
    this.results = document.getElementById('results');
    this.noResult = document.getElementById('noResult');
    this.error = document.getElementById('error');
    this.barcodeValue = document.getElementById('barcodeValue');
    this.barcodeFormat = document.getElementById('barcodeFormat');
    this.errorText = document.getElementById('errorText');
    this.libraryStatus = document.getElementById('libraryStatus');
    this.libraryStatusText = document.getElementById('libraryStatusText');

    this.isLibraryReady = false;
  }

  setupEventListeners() {
    this.startCropBtn.addEventListener('click', () => this.initiateCrop());
    this.uploadBtn.addEventListener('click', () => this.fileInput.click());
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    this.copyBtn.addEventListener('click', () => this.copyToClipboard());
  }

  // Check if QuaggaJS library is available
  checkLibraryStatus() {
    setTimeout(() => {
      if (typeof Quagga !== 'undefined') {
        this.isLibraryReady = true;
        this.libraryStatusText.textContent = '✅ Barcode detection ready';
        this.libraryStatus.style.color = '#4CAF50';
        this.debugText.textContent = 'Ready for barcode detection...';
        this.showDebugInfo();
        console.log('QuaggaJS library loaded successfully');
      } else {
        this.isLibraryReady = false;
        this.libraryStatusText.textContent = '❌ QuaggaJS library failed to load';
        this.libraryStatus.style.color = '#f44336';
        this.debugText.textContent = 'Error: Barcode detection library not available';
        this.showDebugInfo();
        console.error('QuaggaJS library not available');
      }
    }, 100);
  }

  // Handle file selection
  handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!this.isLibraryReady) {
      this.showError('Barcode detection library not loaded. Please refresh and try again.');
      return;
    }

    this.hideAllResults();
    this.showStatus('Loading image...');
    this.updateDebug('📤 Processing uploaded image...');

    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagePreview.src = e.target.result;
      this.imagePreviewContainer.classList.remove('hidden');
      
      this.imagePreview.onload = () => {
        this.detectBarcode(e.target.result);
      };
    };
    reader.readAsDataURL(file);
  }

  // Main barcode detection function (integrated from index.html)
  detectBarcode(imageSrc) {
    this.showStatus('Detecting barcode...');
    this.updateDebug('🔍 Scanning image for barcodes...');

    // List of barcode formats to try (same as index.html)
    const formats = [
      'code_128_reader',
      'ean_reader',
      'ean_8_reader',
      'code_39_reader',
      'code_39_vin_reader',
      'codabar_reader',
      'upc_reader',
      'upc_e_reader',
      'i2of5_reader',
      'code_93_reader'
    ];

    // Try detection with QuaggaJS (same configuration as index.html)
    Quagga.decodeSingle({
      decoder: {
        readers: formats
      },
      locate: true,
      src: imageSrc,
      inputStream: {
        size: 800
      },
      locator: {
        patchSize: 'medium',
        halfSample: true
      }
    }, (result) => {
      if (result && result.codeResult) {
        // Success!
        const text = result.codeResult.code;
        const format = result.codeResult.format || 'Unknown';
        
        this.showResults(text, format.toUpperCase());
        this.updateDebug('✅ Barcode successfully detected!');
      } else {
        // Try with alternative settings
        this.tryAlternativeDetection(imageSrc);
      }
    });
  }

  // Alternative detection with different settings (from index.html)
  tryAlternativeDetection(imageSrc) {
    this.updateDebug('🔄 Trying alternative detection settings...');
    
    Quagga.decodeSingle({
      decoder: {
        readers: [
          'code_128_reader',
          'ean_reader',
          'code_39_reader'
        ]
      },
      locate: true,
      src: imageSrc,
      inputStream: {
        size: 1200
      },
      locator: {
        patchSize: 'large',
        halfSample: false
      }
    }, (result) => {
      if (result && result.codeResult) {
        const text = result.codeResult.code;
        const format = result.codeResult.format || 'Unknown';
        
        this.showResults(text, format.toUpperCase());
        this.updateDebug('✅ Barcode detected with alternative settings!');
      } else {
        this.finalDetectionAttempt(imageSrc);
      }
    });
  }

  // Final detection attempt with most permissive settings
  finalDetectionAttempt(imageSrc) {
    this.updateDebug('🎯 Final detection attempt...');
    
    Quagga.decodeSingle({
      decoder: {
        readers: ['code_128_reader', 'ean_reader']
      },
      locate: false,
      src: imageSrc,
      inputStream: {
        size: 1600
      },
      locator: {
        patchSize: 'x-large',
        halfSample: false
      }
    }, (result) => {
      if (result && result.codeResult) {
        const text = result.codeResult.code;
        const format = result.codeResult.format || 'Unknown';
        
        this.showResults(text, format.toUpperCase());
        this.updateDebug('✅ Barcode detected on final attempt!');
      } else {
        this.showNoResult();
        this.updateDebug('❌ No barcode found after all attempts');
      }
    });
  }

  // Initiate screen cropping
  initiateCrop() {
    this.updateDebug('📸 Initiating screen crop...');
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'startCrop' }, (response) => {
          if (chrome.runtime.lastError) {
            this.showError('Unable to start crop mode. Please refresh the page and try again.');
            this.updateDebug('❌ Failed to communicate with page');
          } else {
            this.updateDebug('🖱️ Click and drag to select area');
            window.close(); // Close popup to allow cropping
          }
        });
      }
    });
  }

  // Copy barcode value to clipboard
  copyToClipboard() {
    const text = this.barcodeValue.textContent;
    navigator.clipboard.writeText(text).then(() => {
      this.copyBtn.textContent = '✅ Copied!';
      setTimeout(() => {
        this.copyBtn.textContent = '📋 Copy';
      }, 2000);
    }).catch(() => {
      this.copyBtn.textContent = '❌ Failed';
      setTimeout(() => {
        this.copyBtn.textContent = '📋 Copy';
      }, 2000);
    });
  }

  // UI Helper Methods
  hideAllResults() {
    this.status.classList.add('hidden');
    this.results.classList.add('hidden');
    this.noResult.classList.add('hidden');
    this.error.classList.add('hidden');
    this.imagePreviewContainer.classList.add('hidden');
  }

  showStatus(message) {
    this.hideAllResults();
    this.statusText.textContent = message;
    this.status.classList.remove('hidden');
  }

  showResults(value, format) {
    this.hideAllResults();
    this.barcodeValue.textContent = value;
    this.barcodeFormat.textContent = `Format: ${format}`;
    this.results.classList.remove('hidden');
  }

  showNoResult() {
    this.hideAllResults();
    this.noResult.classList.remove('hidden');
  }

  showError(message) {
    this.hideAllResults();
    this.errorText.textContent = message;
    this.error.classList.remove('hidden');
  }

  updateDebug(message) {
    this.debugText.textContent = message;
    this.showDebugInfo();
  }

  showDebugInfo() {
    this.debugInfo.classList.remove('hidden');
  }

  // Listen for messages from content script
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'cropResult') {
        if (message.success) {
          this.showResults(message.result, message.format || 'UNKNOWN');
          this.updateDebug('✅ Screen crop detection complete!');
        } else {
          this.showNoResult();
          this.updateDebug('❌ No barcode detected in selection');
        }
      }
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const popup = new BarcodeDetectivePopup();
  popup.setupMessageListener();
});