# &rarr; [tiefling.app](https://tiefling.app)

# 2D-to-3D parallax image converter and (VR-)viewer

Generates a depth map with DepthAnythingV2, then renders a 3D parallax view of the image to simulate depth. 

Runs locally and privately in your browser.  

Needs a beefy computer for higher depth map sizes (1024 takes about 20s on an M1 Pro, use ~600 on fast smartphones). 

https://github.com/user-attachments/assets/8df87945-a159-4fad-b566-82d7943b2991

## Loading images

- Drag &amp; Drop an image anywhere
- Load an image via the menu (enter URL, upload a file or drag&drop one on the field). Optionally load your own depth map. If none is provided, it is generated.
- Use URL parameters: 
  - `?input={urlencoded url of image}` - Load image, generate depth map. Supports all formats the browser supports. In addition to `input`:
    - `&depthmap={urlencoded url of depth map image}` - Bring your own depth map.
    - `&expandDepthmapRadius=5` - Set the Depth Map Expansion to tweak background separation during rendering
    - `&depthmapSize=1024` - Sets Max. Depth Map Size, only used for depth map generation.
    - `&displayMode={full|hsbs|fsbs} - Display one image in full, or two side-by-side for VR
- Use the bookmarklet to open images from civit.ai, unsplash.com and others in Tiefling

## Viewing images

Move your mouse to change perspective. If it feels choppy, adjust the **Render Quality** in the menu.

Press `Alt + h` to hide the controls and mouse cursor. 

## VR

To view images in neat 3D, mirror your computer screen to your VR headset. [Virtual Desktop](https://www.vrdesktop.net/) works well. Switch to `Half SBS` or `Full SBS` in the Tiefling menu, then do the same in Virtual Desktop. Works best in fullscreen. Switch back to normal view in Virtual Desktop to adjust settings.  

You can also drag the VR cursor from left to right on the whole image to adjust 3D Strength / IPD. 

## Options

- **Max. Depth Map Size** - Resolution of the depth map in its biggest dimension. Maximally as big as the image. Set to a lower value if it tales too long. 
- **Depth Map Expansion** - Since the depth map is not perfect at edges, there will be stretchy parts. To avoid those, we can expand the depth map at edges. This doesn't affect the displayed depth map and is just used internally for rendering. 
- **Camera Movement** - Strafe the camera on a plane, or rotate it around a point. 
- **Render Quality** - Pixel density of the canvas.
- **Display Mode** - Full, Half Side-by-Side or Full Side-by-Side for viewing in a VR headset
- **3D Strength / IPD** - How much the right image in SBS view is rotated. Adjust to increase 3D effect or if it looks weird. 

## Hosting

It's (mostly) a static website, all the 3D generation happens in your browser. So, host the contents of the `public` folder yourself however you like. But give it its own domain, it's not tested to work in subfolders yet.

Also there is an api.php that acts as a proxy for the catbox.moe API. Ignore it if you don't use this feature, otherwise install PHP 8+.

## Thanks to

- [akbartus DepthAnything-on-Browser](https://github.com/akbartus/DepthAnything-on-Browser) for Depth Anything V2 JS version
- Rafał Lindemanns [Depthy](https://depthy.stamina.pl/#/) for inspiration
- [immersity.ai](https://www.immersity.ai/) for inspiration.

## Licenses

- Tiefling: [MIT](https://github.com/combatwombat/tiefling/blob/main/LICENSE)
- DepthAnythingV2 small: [Apache-2.0](https://github.com/DepthAnything/Depth-Anything-V2/blob/main/LICENSE)
- DepthAnything-on-Browser: [MIT](https://github.com/akbartus/DepthAnything-on-Browser/blob/main/LICENSE)
- ONNX runtime: [MIT](https://github.com/microsoft/onnxruntime/blob/main/LICENSE)
- Three.js: [MIT](https://github.com/mrdoob/three.js/blob/dev/LICENSE)
- Alpine.js: [MIT](https://github.com/alpinejs/alpine/blob/main/LICENSE.md)
- simplebar: [MIT](https://github.com/Grsmto/simplebar/blob/master/LICENSE)
- Remix Icons: [Apache License](https://github.com/Remix-Design/remixicon/blob/master/License)
