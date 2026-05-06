# Nmap Network Scanner - Frontend

Modern web interface for network scanning using Nmap.

## Features
- Real-time scan progress monitoring
- Multiple scan types (Basic, Service Detection, OS Detection, Vulnerability, Comprehensive)
- Scan history management
- Detailed port and service information
- Export results as JSON
- Responsive dark-themed UI
- Modal view for detailed port information

## Files
- `index.html` - Main HTML structure
- `styles.css` - Styling and responsive design
- `script.js` - Frontend logic and API integration

## Setup

Simply serve the frontend files with a web server:

```bash
# Using Python 3
python -m http.server 8000

# Or using Node.js
npx http-server

# Or using VS Code Live Server extension
```

Then open `http://localhost:8000` in your browser.

## Configuration

Update the API URL in `script.js` if your backend is hosted on a different address:

```javascript
const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';
```

## Browser Compatibility
- Chrome/Edge (recommended)
- Firefox
- Safari
- Modern mobile browsers
