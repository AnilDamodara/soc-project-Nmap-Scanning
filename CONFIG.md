# Project Configuration

## Application Settings

### Backend Configuration
- **Server Host**: 0.0.0.0
- **Server Port**: 5000
- **Database**: SQLite (scans.db)
- **Socket.IO**: Enabled for real-time updates
- **CORS**: Enabled for development

### Frontend Configuration
- **Server Port**: 8000 (or as configured by http.server)
- **API Base URL**: http://localhost:5000/api
- **Socket.IO URL**: http://localhost:5000
- **Theme**: Dark mode
- **Language**: English

## Scan Types

| Type | Command | Use Case |
|------|---------|----------|
| Basic | -sV | Quick port enumeration |
| Service Detection | -sV -A | Service versions and system info |
| OS Detection | -O -sV | Operating system identification |
| Vulnerability | --script vuln | Known vulnerabilities |
| Comprehensive | -sV -A -O --script=all | Full network analysis |

## Database Schema

### Scans Table
```sql
CREATE TABLE scans (
    id TEXT PRIMARY KEY,
    target TEXT,
    scan_type TEXT,
    status TEXT,
    start_time TEXT,
    end_time TEXT,
    results TEXT
)
```

## File Structure

### Backend
- `app.py` - Main Flask application
- `requirements.txt` - Python dependencies
- `.env` - Environment variables
- `scans.db` - SQLite database (auto-created)

### Frontend
- `index.html` - HTML structure
- `styles.css` - Styling (dark theme)
- `script.js` - JavaScript logic and API calls

## Network Requirements

- Backend requires port 5000
- Frontend requires port 8000 (or any available port)
- Ensure firewall allows these ports
- CORS enabled for localhost development

## Performance Considerations

- Large scans (many hosts/ports) may take time
- Database queries optimized for history retrieval
- Real-time updates via WebSocket for responsiveness
- Frontend handles up to 1000+ ports per host

## Security Notes

- Only scan networks you own or have permission to scan
- Backend includes input validation
- HTML output escaped to prevent XSS
- No authentication in basic setup (add for production)
- Scan results stored locally in SQLite

## Typical Scan Times

- **Basic Port Scan**: 5-30 seconds
- **Service Detection**: 30-120 seconds
- **OS Detection**: 60-180 seconds
- **Vulnerability Scan**: 120-600 seconds
- **Comprehensive**: 300+ seconds

(Times vary based on network conditions and target availability)
