# Nmap Network Scanner - Full Stack Web Application

A comprehensive web-based network scanning application powered by Nmap. This project provides a modern, user-friendly interface for conducting various types of network scans, from basic port scanning to comprehensive vulnerability assessments.

## 🌟 Features

### Scanning Capabilities
- **Basic Port Scanning** - Quick port discovery
- **Service Detection** - Identify services and versions
- **OS Detection** - Operating system fingerprinting
- **Vulnerability Scanning** - Detect known vulnerabilities
- **Comprehensive Scanning** - Full network analysis

### Application Features
- ✅ Real-time scan progress monitoring via WebSockets
- ✅ Detailed port and service information
- ✅ Scan history with database persistence
- ✅ Results export to JSON format
- ✅ Dark-themed responsive UI
- ✅ Multi-tab interface
- ✅ Modal-based detailed information views

## 🏗️ Project Structure

```
nmap scanning/
├── backend/
│   ├── app.py              # Flask application with API endpoints
│   ├── requirements.txt    # Python dependencies
│   ├── .env               # Environment configuration
│   ├── scans.db           # SQLite database (created on first run)
│   └── README.md          # Backend documentation
│
├── frontend/
│   ├── index.html         # Main HTML structure
│   ├── styles.css         # Styling and responsive design
│   ├── script.js          # Frontend logic and API integration
│   └── README.md          # Frontend documentation
│
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- Nmap installed on your system
- A modern web browser

### 1. Install Nmap

**Windows:**
- Download from https://nmap.org/download.html
- Run the installer

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install nmap
```

**macOS:**
```bash
brew install nmap
```

### 2. Setup Backend

Navigate to the backend directory:
```bash
cd backend
```

Create a virtual environment (recommended):
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/macOS
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Run the backend server:
```bash
python app.py
```

The backend will start on `http://localhost:5000`

### 3. Setup Frontend

Open another terminal/PowerShell and navigate to the frontend directory:
```bash
cd frontend
```

Start a local web server. Choose one of the following options:

**Option 1: Python (Recommended)**
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

**Option 2: Node.js**
```bash
npx http-server
```

**Option 3: VS Code Live Server Extension**
- Install Live Server extension in VS Code
- Right-click on index.html → Open with Live Server

Open your browser and navigate to:
- `http://localhost:8000` (if using Python's http.server)
- `http://localhost:8080` (if using npx http-server)
- Check the Live Server output for the URL (if using VS Code)

## 📖 Usage Guide

### Starting a Scan

1. Go to the **Scanner** tab
2. Enter the target IP address or hostname (e.g., `192.168.1.1` or `example.com`)
3. Select the scan type:
   - **Basic Port Scan** - Quick port discovery
   - **Service Detection** - Identify running services
   - **OS Detection** - Detect operating systems
   - **Vulnerability Scan** - Find known vulnerabilities
   - **Comprehensive Scan** - Full network analysis
4. Click **Start Scan**
5. Monitor real-time progress

### Viewing Results

1. Go to the **Scan History** tab to see all previous scans
2. Click **View** to see detailed results
3. Results include:
   - Host information and status
   - Open and closed ports
   - Service names and versions
   - OS detection information
4. Click on a port for detailed information

### Managing Scans

- **View Results** - Click View button in history
- **Export Results** - Click Export JSON in results view
- **Delete Scan** - Click Delete button in history

## 🔌 API Endpoints

### Start Scan
```
POST /api/scan/start
Content-Type: application/json

{
  "target": "192.168.1.1",
  "scan_type": "basic"
}

Response:
{
  "scan_id": "uuid",
  "status": "started"
}
```

### Get Scan History
```
GET /api/scan/history

Response: [
  {
    "id": "uuid",
    "target": "192.168.1.1",
    "scan_type": "basic",
    "status": "completed",
    "start_time": "2024-01-01T12:00:00",
    "end_time": "2024-01-01T12:05:00"
  }
]
```

### Get Scan Results
```
GET /api/scan/results/<scan_id>

Response:
{
  "hosts": [...],
  "total_hosts": 1,
  "scan_info": {...}
}
```

### Delete Scan
```
DELETE /api/scan/delete/<scan_id>

Response:
{
  "status": "deleted"
}
```

## 🔄 WebSocket Events

The application uses Socket.IO for real-time updates:

### Client → Server
- `connect` - Initial connection

### Server → Client
- `connect` - Connection established
- `scan_progress` - Scan is in progress
- `scan_complete` - Scan completed successfully
- `scan_error` - Error during scan

## 🎨 UI Features

### Dark Theme
The interface uses a modern dark theme optimized for security tools:
- Primary: Blue (#2563eb)
- Surface: Dark slate (#1e293b)
- Accent colors for status indicators

### Responsive Design
- Mobile-friendly interface
- Adapts to all screen sizes
- Touch-friendly buttons and controls

### Status Indicators
- 🟢 Open - Open ports/hosts
- 🔴 Closed - Closed ports
- 🟡 Scanning - Active scans
- ✅ Completed - Finished scans

## 🛡️ Security Considerations

1. **Input Validation** - All inputs are validated on the backend
2. **CORS Enabled** - Configured for development use
3. **HTML Escaping** - Prevents XSS attacks
4. **Database** - Results stored in local SQLite database

⚠️ **Note**: This application is designed for network administration and security testing. Only scan networks you have permission to scan.

## 🐛 Troubleshooting

### Backend won't start
- Ensure Python 3.8+ is installed
- Verify nmap is installed: `nmap -V`
- Check port 5000 is not in use
- Verify dependencies: `pip list`

### Frontend won't connect to backend
- Check backend is running on localhost:5000
- Verify CORS is enabled in app.py
- Check browser console for errors (F12)
- Update API_URL in script.js if needed

### Scans not running
- Ensure nmap is in system PATH
- Check firewall isn't blocking nmap
- Verify target IP/hostname is valid
- Check backend logs for errors

### Database issues
- Delete `scans.db` to reset
- Ensure write permissions in backend directory

## 📝 Configuration

Edit these files to customize:

**Backend (.env)**
```
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key
```

**Frontend (script.js)**
```javascript
const API_URL = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';
```

## 📦 Dependencies

### Backend
- Flask 3.0.0
- Flask-CORS 4.0.0
- python-socketio 5.10.0
- python-nmap 0.0.1
- requests 2.31.0

### Frontend
- Socket.IO JavaScript Client
- No other dependencies (vanilla JS)

## 🤝 Contributing

To improve this project:
1. Test thoroughly before making changes
2. Follow existing code style
3. Document new features
4. Test on multiple browsers

## 📄 License

This project is open source and available for educational and professional use.

## 🎯 Future Enhancements

- [ ] Authentication and user management
- [ ] Advanced filtering and search
- [ ] Report generation (PDF, HTML)
- [ ] Scheduled scans
- [ ] Multiple target scanning
- [ ] Custom scan scripts
- [ ] Email notifications
- [ ] Data visualization charts

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review backend and frontend logs
3. Ensure all dependencies are installed
4. Verify firewall settings

## ⚖️ Legal Notice

This tool is for authorized network security testing only. Unauthorized network scanning may be illegal in your jurisdiction. Always obtain proper authorization before conducting any network scans.

---

**Happy Scanning! 🔍**
