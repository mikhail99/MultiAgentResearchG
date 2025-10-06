#!/bin/bash

# Multi-Agent Research Assistant - Backend Startup Script

echo "🚀 Starting Multi-Agent Research Assistant Backend..."
echo "=================================================="

# Check if we're in the right directory
if [ ! -f "backend/main.py" ]; then
    echo "❌ Error: backend/main.py not found. Please run this script from the project root."
    exit 1
fi

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 not found. Please install Python 3.8+"
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "❌ Error: pip3 not found. Please install pip"
    exit 1
fi

echo "📦 Installing backend dependencies..."
cd backend

# Install dependencies
if ! pip3 install -r requirements.txt; then
    echo "❌ Error: Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if ChromaDB data exists
if [ ! -d "../backend/data/chromadb" ]; then
    echo "⚠️  Warning: ChromaDB data not found. Running ChromaDB setup..."
    cd ..
    if ! python3 load_to_chromadb.py; then
        echo "❌ Error: Failed to set up ChromaDB"
        exit 1
    fi
    cd backend
fi

echo "🔧 Starting FastAPI server..."
echo "📍 Server will be available at: http://localhost:8000"
echo "📖 API Documentation: http://localhost:8000/docs"
echo "🏥 Health Check: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================================="

# Start the server
python3 start_server.py
