# Barcode Detective Chrome Extension

A Chrome extension that allows users to detect and decode barcodes from web pages through image upload functionality. Originally designed to support screen cropping, currently functional with file upload only.

## Purpose

This Chrome extension provides a seamless way for users to extract barcode data from images with minimal effort. Users can upload images containing barcodes, and the extension will automatically detect, decode, and display the barcode values in a user-friendly format.

## Features

### Currently Working
- **Image Upload**: Upload images containing barcodes for processing
- **Barcode Detection & Decoding**: Automatically detects and decodes various 1D barcode formats
- **Copy to Clipboard**: Easily copy decoded barcode values
- **User-friendly Interface**: Clean popup UI with clear status indicators
- **Error Handling**: Graceful handling of images without barcodes

### Known Issues
- **Screen Crop Feature**: Currently not functional - crop selection tool doesn't work
- **QR Code Support**: QR codes are not being detected/decoded properly
- **Limited to Upload**: Only file upload works, screen capture doesn't function

## Technologies Used

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Chrome Extension**: Manifest V3
- **Barcode Detection**: QuaggaJS library
- **Screen Capture**: html2canvas library (for future crop feature)
- **File Processing**: HTML5 File API
- **UI Framework**: Vanilla JavaScript with modern CSS

## Barcode Formats Supported

### Currently Working
- Code 128
- Code 39
- EAN-13
- EAN-8
- UPC-A
- UPC-E
- Codabar
- ITF (Interleaved 2 of 5)

### Not Working
- QR Codes
- Data Matrix
- PDF417
- Other 2D barcodes

## Setup Instructions

### Prerequisites
- Google Chrome browser
- Developer mode enabled in Chrome Extensions

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/barcode-detective-extension.git
   cd barcode-detective-extension
   ```

2. **Load Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the project folder

3. **Verify Installation**
   - Look for the "Barcode Detective" extension icon in the Chrome toolbar
   - Click the icon to open the popup interface

## How to Use

1. **Click Extension Icon**: Click the barcode detective icon in your Chrome toolbar
2. **Upload Image**: Click "Choose File" or "Upload Image" button
3. **Select Image**: Choose an image file containing a barcode from your device
4. **Wait for Processing**: The extension will automatically detect and decode barcodes
5. **View Results**: Decoded barcode values will appear in the results area
6. **Copy Values**: Click the copy button to copy barcode values to clipboard

## Project Structure

```
barcode-detective-extension/
├── manifest.json                # Extension manifest (v3)
├── background.js               # Background service worker
├── index.html                  # Main HTML file
├── script.js                   # Main JavaScript logic
├── html2canvas-wrapper.js      # Canvas wrapper for screen capture
├── popup/
│   ├── popup.html             # Popup interface
│   ├── popup.css              # Popup styling
│   └── popup.js               # Popup logic and barcode processing
├── content/
│   ├── content.js             # Content script for page interaction
│   ├── content-simple.js      # Simplified content script
│   └── content.css            # Content script styling
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
├── libs/                      # Third-party libraries
│   ├── quagga.min.js          # Barcode detection library
│   └── html2canvas.min.js     # Screen capture library
└── README.md                  # This file
```

## Configuration

### Permissions Required
- `activeTab`: For accessing current tab content
- `scripting`: For injecting scripts (future crop feature)

### Manifest V3 Configuration
```json
{
  "manifest_version": 3,
  "name": "Barcode Detective",
  "version": "1.0.0",
  "description": "Crop any region of your browser screen and detect barcodes instantly",
  "permissions": ["activeTab", "scripting"],
  "web_accessible_resources": [
    {
      "resources": ["libs/quagga.min.js", "libs/html2canvas.min.js"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

## Known Limitations & Issues

### Current Issues
1. **Screen Crop Not Working**: The crop selection tool for capturing screen regions is not functional
2. **QR Code Detection Failing**: QR codes are not being properly detected or decoded
3. **Limited to File Upload**: Cannot capture/process content directly from web pages
4. **html2canvas Integration**: Screen capture functionality not properly integrated

### Planned Fixes
- Fix screen crop functionality for direct webpage barcode detection
- Implement proper QR code detection library
- Add support for additional 2D barcode formats
- Improve error handling and user feedback
- Integrate html2canvas for screen capture
