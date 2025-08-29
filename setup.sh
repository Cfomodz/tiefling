#!/bin/bash
# Setup script for the depth generation API

echo "Setting up Parallax Studio Pro..."

# Check if we're in a virtual environment
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    source venv/bin/activate
else
    echo "Using existing virtual environment: $VIRTUAL_ENV"
fi

# Install requirements
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Check CUDA availability
echo "Checking CUDA availability..."
python3 -c "
import torch
print(f'CUDA available: {torch.cuda.is_available()}')
if torch.cuda.is_available():
    print(f'CUDA device: {torch.cuda.get_device_name(0)}')
    print(f'CUDA version: {torch.version.cuda}')
"

echo ""
echo "Setup complete!"
echo ""
echo "To start the API server:"
echo "  python depth_api.py"
echo ""
echo "To test the API:"
echo "  python test_depth_api.py"
echo ""
echo "API endpoints will be available at:"
echo "  http://localhost:5000/health"
echo "  http://localhost:5000/generate-depth"
echo "  http://localhost:5000/generate-depth-json"