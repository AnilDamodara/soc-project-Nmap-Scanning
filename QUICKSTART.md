# Quick Start Guide

Get your Nmap Network Scanner running in 5 minutes!

## Step 1: Install Nmap (if not already installed)

### Windows
1. Go to https://nmap.org/download.html
2. Download the Windows installer
3. Run the installer and follow prompts
4. Make sure to add Nmap to your PATH

### macOS
```bash
brew install nmap
```

### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install nmap
```

## Step 2: Setup Backend

### Windows
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### macOS/Linux
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

✅ Backend ready at http://localhost:5000

## Step 3: Setup Frontend

Open a new terminal/PowerShell window:

### Windows
```bash
cd frontend
python -m http.server 8000
```

### macOS/Linux
```bash
cd frontend
python3 -m http.server 8000
```

✅ Frontend ready at http://localhost:8000

## Step 4: Open in Browser

Visit: **http://localhost:8000**

## Step 5: Run Your First Scan

1. Go to the **Scanner** tab
2. Enter target: `localhost` or `127.0.0.1`
3. Select scan type: **Basic Port Scan**
4. Click **Start Scan**
5. View results in the **Results** tab

## Common Issues & Solutions

### Backend won't start
```
Error: ModuleNotFoundError: No module named 'flask'
```
**Solution**: Make sure virtual environment is activated and dependencies are installed
```bash
pip install -r requirements.txt
```

### Can't connect to backend
**Solution**: Check if port 5000 is available
```bash
# Windows
netstat -ano | findstr :5000

# macOS/Linux
lsof -i :5000
```

### Nmap not found
**Solution**: Ensure nmap is in your system PATH
```bash
nmap -V
```

### Permission denied on Linux
**Solution**: Some scans require root privileges
```bash
sudo python app.py
```

## Troubleshooting Checklist

- [ ] Python 3.8+ installed
- [ ] Nmap installed and in PATH
- [ ] Virtual environment activated
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Backend running on port 5000
- [ ] Frontend running on port 8000
- [ ] No firewall blocking ports 5000/8000
- [ ] Using a modern browser (Chrome/Firefox/Edge)

## Next Steps

1. **Explore Different Scans**
   - Try Service Detection scan
   - Try OS Detection scan
   - Try Comprehensive scan

2. **View Scan History**
   - Go to Scan History tab
   - Click View on any scan
   - Export results as JSON

3. **Customize**
   - Edit `frontend/script.js` for API URL changes
   - Modify `backend/app.py` for custom scan types
   - Change colors in `frontend/styles.css`

## Safety Reminders

⚠️ **Important**: Only scan networks you own or have explicit permission to scan. Unauthorized network scanning may be illegal.

---

Need help? Check the main README.md for detailed documentation.
