#!/bin/bash

echo "Starting InkDraw Application..."
echo "================================"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Set development environment
export NODE_ENV=development

echo "Launching InkDraw in development mode..."
echo "Press Ctrl+C to stop the application"

npm run dev