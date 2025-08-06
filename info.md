# Tiefling - 3D Image Converter

## Project Overview

**Tiefling** is a browser-based 3D image converter that creates compelling parallax effects from 2D images. The tool runs completely offline in the browser, using modern web technologies to generate depth maps and render 3D effects in real-time.

## Core Functionality

1. **2D to 3D Conversion**: Takes 2D images and generates depth maps using monocular depth estimation
2. **Offline Processing**: Uses ONNX.js with WebGL acceleration - no server required for depth generation
3. **3D Parallax Effects**: Objects closer in the depth map appear nearer in 3D space
4. **Interactive Camera**: Allows limited camera movement for parallax viewing (strafing/parallax, not full rotation)
5. **Multiple Display Modes**: Full, Half Side-by-Side, Full Side-by-Side, and Anaglyph (red/cyan)
6. **Color Depth Map Support**: Automatically detects and converts Apple Depth Pro color depth maps to optimized grayscale

## Architecture Components

### Frontend Layer
- **Entry Point**: `site/public/index.html`
- **Main Logic**: `site/public/js/main.js`
- **UI Framework**: Alpine.js for reactive state management
- **Interface**: Drag & drop for image loading, settings panel with controls
- **Features**: Example images, bookmarklet for importing from other sites

### 3D Rendering Engine
- **Core File**: `site/public/js/tiefling/tiefling.js`
- **Technology**: Three.js for WebGL rendering
- **Rendering**: Custom shader materials for depth-based vertex displacement
- **Views**: Dual-view rendering for stereoscopic modes
- **Interaction**: Touch and mouse handling, automatic idle camera movement
- **Color Depth Support**: Automatic detection and processing of color vs grayscale depth maps

### Depth Map Generation
- **Worker**: `site/public/js/worker.js`
- **Runtime**: ONNX Runtime Web for model inference
- **Model**: DepthAnything V2 (quantized) at `site/public/models/depthanythingv2-vits-dynamic-quant.onnx`
- **Processing**: Image preprocessing, scaling, padding in Web Worker for non-blocking operation

### Key Files Structure
```
site/public/
├── index.html                 # Main HTML entry point
├── js/
│   ├── main.js               # Alpine.js app logic & UI state
│   ├── worker.js             # ONNX depth map generation
│   └── tiefling/
│       └── tiefling.js       # Three.js 3D rendering engine + color depth map support
├── models/
│   └── depthanythingv2-vits-dynamic-quant.onnx  # Depth estimation model
├── css/
│   └── main.css              # Styling
└── img/examples/             # Pre-generated example images & depth maps
```

## Color Depth Map Support ✅ **COMPLETED**

### Implementation Status
- ✅ **Color Detection**: Automatically detects color vs grayscale depth maps by sampling pixels
- ✅ **Turbo-to-Grayscale Conversion**: Converts color depth maps to grayscale on load using exogen/turbo-colormap approach
- ✅ **Clean Architecture**: Single conversion step on load, then normal grayscale processing throughout
- ✅ **Debug Tools**: Added `debugColorToGrayscale()` and `debugTurboConversion()` console functions
- ✅ **Performance Optimized**: Conversion happens once on load, not per-pixel during rendering
- ✅ **Proven Algorithm**: Uses exact same conversion logic as working turbo-colormap library

### ✅ **RESOLVED ISSUES**
- ✅ **Smooth Rendering**: 3D mesh now renders cleanly without artifacts
- ✅ **Correct Depth Mapping**: Proper depth relationships (near objects lighter, far objects darker)
- ✅ **No Visual Artifacts**: Clean, smooth 3D effects matching grayscale depth map quality

### Technical Implementation
- **Conversion Strategy**: Convert entire turbo color depth map to grayscale immediately on load
- **Algorithm**: Uses exogen/turbo-colormap library approach with brute-force nearest-neighbor search
- **Color Format**: Apple Depth Pro matplotlib "turbo" colormap (Blue=far, Red=near)
- **Processing**: RGB values mapped to intensity indexes (0-255) via Euclidean distance matching
- **Integration**: Converted grayscale depth maps processed normally by existing Tiefling pipeline

### Architecture Flow
1. **Load**: Depth map loaded as ImageData
2. **Detect**: `isColorDepthMap()` samples pixels to detect color vs grayscale
3. **Convert**: If color detected, `snapColorToIntensity()` converts entire image to grayscale
4. **Process**: Converted grayscale depth map processed normally by mesh generation
5. **Render**: Standard Tiefling 3D rendering with clean results

### Debug Functions Available
```javascript
// Show current depth map in new tab (already converted if it was color)
debugColorToGrayscale();

// Test turbo color conversion with sample colors
debugTurboConversion();
```

### Key Benefits Achieved
- **Reliable Results**: Produces same quality output as proven turbo-colormap demo
- **Clean Code**: Simplified mesh generation without complex color/grayscale branching  
- **Performance**: No runtime overhead - conversion only happens once on load
- **Compatibility**: Works seamlessly with existing Tiefling features and controls

## Key Features

### Core Capabilities
- **Offline-first**: Complete functionality without server dependency
- **Real-time rendering**: Smooth 3D effects with camera movement
- **Depth map expansion**: Artifact reduction through dilation
- **Multiple quality settings**: Depth map resolution, render quality controls
- **Responsive design**: Works on desktop and mobile with fullscreen support
- **Universal depth map support**: Handles grayscale depth maps and automatically converts color depth maps

### Display Modes
- **Full**: Standard single view
- **Half Side-by-Side (HSBS)**: Stereoscopic half-width views
- **Full Side-by-Side (FSBS)**: Stereoscopic full-width views  
- **Anaglyph**: Red/cyan 3D glasses compatible

### User Experience
- **Drag & drop**: Direct image loading onto canvas or via file inputs
- **URL loading**: Load images from web URLs
- **Custom depth maps**: Option to provide pre-made depth maps (grayscale or color)
- **Sharing**: Upload to catbox.moe for sharing generated 3D images
- **Examples**: Built-in gallery of sample images

## Technical Implementation

### Depth Generation Pipeline
1. Image loaded and preprocessed (scaling, padding to square)
2. Fed to DepthAnything V2 ONNX model via Web Worker
3. Depth map post-processed and optionally expanded
4. Result used for 3D mesh displacement

### 3D Rendering Pipeline
1. Image and depth map loaded as textures
2. **Color depth conversion**: Automatic detection and conversion of color depth maps to grayscale
3. **Depth extraction**: Grayscale intensity values converted to depth for vertex displacement  
4. Plane geometry created with depth-based vertex attributes
5. Custom vertex shader displaces vertices based on depth values
6. Camera movement creates parallax effect through shader uniforms
7. Multiple views rendered for stereoscopic modes

### Performance Optimizations
- **Web Workers**: Non-blocking depth map generation
- **WebGL acceleration**: GPU-accelerated model inference and rendering
- **Adaptive quality**: User-controllable resolution settings
- **Efficient mesh**: Optimized geometry generation with smoothing
- **Conversion caching**: RGB-to-intensity lookups cached for performance

## Dependencies

- **Three.js**: 3D rendering engine
- **ONNX Runtime Web**: Machine learning model inference
- **Alpine.js**: Reactive UI framework
- **DepthAnything V2**: Monocular depth estimation model

The project demonstrates excellent engineering with modern web technologies, creating an impressive offline-capable tool for 3D image effects. Successfully supports both traditional grayscale depth maps and advanced color depth maps from Apple Depth Pro through automatic detection and conversion.