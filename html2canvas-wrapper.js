// html2canvas-wrapper.js - Load html2canvas from CDN
(function() {
  const script = document.createElement('script');
  script.src = 'https://html2canvas.hertzen.com/dist/html2canvas.min.js';
  script.async = false; // Make sure it loads before we need it
  document.head.appendChild(script);
})();