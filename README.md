# 2D-to-3D image generator and viewer

Runs locally and privately in your browser.  

Needs a beefy computer and works fastest in Chrome.

## Loading images

- Drag &amp; Drop an image anywhere
- Load image via the menu. Optionally load your own depth map. If none is provided, it is generated.
- Use URL parameters: 
  - `?input=https://domain.com/your-image.jpeg` - Load image, generate depth map. Supports JPG, PNG, WEBP, GIF (first frame). In addition to `input`:
    - `&depthmap=https://domain.com/your-depthmap.png` - Bring your own depth map.
    - `&expandDepthmapRadius=5` - Set the Depth Map Expansion to tweak background separation during rendering
    - `&depthmapSize=1024` - Sets Max. Depth Map Size, only used for depth map generation.
  
If you have a non-beefy computer, it might take a while. Adjust `Max. Depth Map Size` in the menu accordingly.

## Viewing images

Move your mouse to change perspective. If it feels choppy, adjust the `Render Quality` in the menu.

To view images in real 3D, mirror your computer screen to your VR headset. [Virtual Desktop](https://www.vrdesktop.net/) works well. Switch to `Half SBS` or `Full SBS` in the Tiefling menu, then do the same in Virtual Desktop. Works best in fullscreen. Switch back to normal view in Virtual Desktop to adjust settings.  

## Hosting

It's a static website, all the 3D generation happens in your browser. So, host the contents of the `public` folder yourself however you like. But give it its own domain, it's not tested to work in subfolders yet.

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
