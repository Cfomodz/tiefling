# Scrollsequence V2: 2D to 3D Parallax Implementation TODO

Converting 2D images to interactive 3D parallax effects for WordPress plugin. Goal: Create Facebook 3D Photo-like experience with mouse/device tilt interaction at 60fps.

## Phase 1: Research & Backend Setup
- [ ] **Evaluate AI Depth Estimation Pipeline**
  - Test MiDaS/DPT, DepthAnything V2, or 3D Photo Inpainting models
  - Compare quality vs processing time for self-hosted GPU setup
  - Alternative: Research Immersity AI / Luma AI APIs

- [ ] **Implement Depth Map Generation**
  - Set up server-side processing for uploaded images
  - Generate grayscale depth maps (stored as PNG)
  - Process resolution: 720p mobile, 1080p-4K desktop

- [ ] **Add Occlusion Handling (Optional)**
  - Implement background inpainting behind foreground objects
  - Use layered depth approach or simple edge dilation
  - Store inpainted backgrounds separately

## Phase 2: WordPress Integration
- [ ] **Admin Interface Development**
  - Add "Generate 3D Parallax" option to Scrollsequence admin
  - Create processing queue with progress indicators
  - Store processed assets (depth maps, meshes) in media library

- [ ] **Asset Management System**
  - Implement data storage for depth maps and 3D assets
  - Handle file compression and optimization
  - Create fallback system for processing failures

## Phase 3: Frontend Rendering
- [ ] **Three.js Scene Setup**
  - Choose approach: mesh-based or shader-based warping
  - Load and texture depth-enhanced geometry
  - Implement proper occlusion and depth sorting

- [ ] **Interactive Controls**
  - Mouse movement mapping to camera rotation (desktop)
  - Device orientation API integration (mobile)
  - Limit parallax range to prevent artifacts (±10° rotation)

## Phase 4: Performance & Quality
- [ ] **Optimize Rendering Performance**
  - Target 60fps across devices
  - Implement dynamic resolution scaling
  - Add WebGL compatibility checks and fallbacks

- [ ] **Artifact Reduction**
  - Implement depth edge dilation techniques
  - Handle stretching in high-depth-change areas
  - Add smooth camera movement with easing

## Phase 5: Integration & Testing
- [ ] **Scrollsequence Integration**
  - Coordinate with existing scroll-based frame animation
  - Decide: single-image mode vs multi-frame sequences
  - Test canvas overlay positioning

- [ ] **Cross-platform Testing**
  - Test various devices, browsers, GPU capabilities
  - Implement graceful degradation for unsupported devices
  - Performance benchmarking across resolution targets

## Phase 6: Core API Infrastructure
- [ ] **Basic Image-to-MP4 Endpoint**
  - Create local API endpoint accepting image files
  - Return MP4 animation with default settings:
    - Camera movement: 0.1
    - Movement range: 0.17
    - Other parameters use existing defaults
  - Handle single image input/output efficiently

- [ ] **Multi-Image Composition Driver**
  - Accept array of images with individual parameters
  - Process each image through basic endpoint
  - Concatenate MP4s using ffmpeg
  - Optimize to avoid redundant data read/write operations

## Phase 7: Audio Integration & Final Composition
- [ ] **Audio Mixing System**
  - Add voiceover support (100% original volume)
  - Background music integration (20% of voiceover peak volume)
  - Implement volume analysis for relative scaling

- [ ] **Sound Effects Engine**
  - Accept array of sound effect files with timestamps
  - Synchronize SFX placement with video timeline
  - Mix all audio sources into final composition
  - Return complete MP4 with video + mixed audio

## Technical Notes
**Key Libraries**: Three.js, MiDaS/DepthAnything V2, PyTorch/ONNX, ffmpeg
**Reference Projects**: Tiefling (browser 3D viewer), DepthFlow, 3D Photo Inpainting
**Architecture**: 
- Server-side AI processing → Client-side WebGL rendering (WordPress integration)
- Local API: Image → MP4 → Composition pipeline (standalone service)
**Quality Target**: Artifact-free parallax with generative background fill
**API Defaults**: Camera movement 0.1, Movement range 0.17
