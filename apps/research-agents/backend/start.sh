#!/bin/bash
# Script to start the Research Agents backend server

echo "🚀 Starting Research Agents Backend Server..."
echo "========================================"

# Activate conda environment
echo "Activating conda environment: research-agents"
conda activate research-agents

# Start the server
echo "Starting server on http://0.0.0.0:8001"
python main.py