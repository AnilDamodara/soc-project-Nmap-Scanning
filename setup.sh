#!/bin/bash

# Nmap Network Scanner - Linux/macOS Setup Script

echo ""
echo "========================================"
echo "Nmap Network Scanner - Setup"
echo "========================================"
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    echo "Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi

echo "[✓] Python detected"
python3 --version

# Check if Nmap is installed
if ! command -v nmap &> /dev/null; then
    echo "Error: Nmap is not installed"
    echo "Install with: sudo apt-get install nmap (Linux) or brew install nmap (macOS)"
    exit 1
fi

echo "[✓] Nmap detected"
nmap -V | head -n 1

echo ""
echo "Setting up Backend..."
echo "========================================"

cd backend

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

echo ""
echo "[✓] Backend setup complete!"
echo ""

cd ..

echo ""
echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "To start the application:"
echo ""
echo "1. Start Backend:"
echo "   cd backend"
echo "   source venv/bin/activate"
echo "   python app.py"
echo ""
echo "2. Start Frontend (in another terminal):"
echo "   cd frontend"
echo "   python3 -m http.server 8000"
echo ""
echo "3. Open browser to http://localhost:8000"
echo ""
