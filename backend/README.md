# Nmap Scanning Backend

Python Flask backend for the Nmap network scanning web application.

## Features
- Port scanning
- Service detection
- OS detection  
- Vulnerability scanning
- Real-time scan progress via WebSockets
- Scan history and results storage

## Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Install nmap on your system:
   - **Windows**: Download from https://nmap.org/download.html
   - **Linux**: `sudo apt-get install nmap`
   - **macOS**: `brew install nmap`

3. Run the backend server:
```bash
python app.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### POST /api/scan/start
Start a new scan
```json
{
  "target": "192.168.1.1",
  "scan_type": "basic"
}
```

### GET /api/scan/history
Get all previous scans

### GET /api/scan/results/<scan_id>
Get detailed results of a specific scan

### DELETE /api/scan/delete/<scan_id>
Delete a scan record

## Scan Types
- `basic`: Basic port scanning (-sV)
- `service_detection`: Service and version detection (-sV -A)
- `os_detection`: OS detection (-O -sV)
- `vulnerability`: Vulnerability scanning (--script vuln)
- `comprehensive`: Comprehensive scan (-sV -A -O --script=all)
