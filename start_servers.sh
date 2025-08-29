#!/bin/bash
# Start all API servers for development

echo "Starting Parallax Studio Pro API servers..."

# Check if we're in a virtual environment
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "Activating virtual environment..."
    source venv/bin/activate
fi

# Function to cleanup background processes
cleanup() {
    echo "Stopping servers..."
    jobs -p | xargs -r kill
    exit
}
trap cleanup SIGINT SIGTERM

# Start depth API in background
echo "Starting Depth API on port 5000..."
python depth_api.py &
DEPTH_PID=$!

# Wait a moment for depth API to start
sleep 3

# Start video API in background  
echo "Starting Video API on port 5001..."
python video_api.py &
VIDEO_PID=$!

# Wait a moment for video API to start
sleep 3

# Start composition API in background
echo "Starting Composition API on port 5002..."
python composition_api.py &
COMPOSITION_PID=$!

# Wait a moment for composition API to start
sleep 3

# Start audio API in background
echo "Starting Audio API on port 5003..."
python audio_api.py &
AUDIO_PID=$!

# Wait for all processes
echo ""
echo "✅ All servers are running!"
echo ""
echo "Available endpoints:"
echo "  Depth API:       http://localhost:5000"
echo "    - GET  /health"
echo "    - POST /generate-depth"
echo "    - POST /generate-depth-json"
echo ""
echo "  Video API:       http://localhost:5001" 
echo "    - GET  /health"
echo "    - POST /preview-depth"
echo "    - POST /generate-video"
echo "    - POST /generate-video-with-depth"
echo ""
echo "  Composition API: http://localhost:5002"
echo "    - GET  /health"
echo "    - GET  /example-config"
echo "    - POST /compose"
echo "    - POST /compose-from-config"
echo ""
echo "  Audio API:       http://localhost:5003"
echo "    - GET  /health"
echo "    - GET  /example-audio-config"
echo "    - POST /analyze-audio"
echo "    - POST /mix-audio"
echo "    - POST /add-audio-to-video"
echo "    - POST /complete-production"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for background processes
wait