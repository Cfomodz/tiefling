# 2D to 3D image viewer

Generates a depth map from an image, then shows it in an interactive 3D (or 2.5D parallax) view. Runs completely in your browser.

## Loading images

- Drag an image in and wait a bit.
- Or "Load Image" from the hamburger menu.
- Or use ?input parameter to load an external image: https://tiefling.gerlach.dev/?input=https://sc.robsite.net/files/1735145972-F6Q67B7WUAAT9w_.jpg (server needs to allow cross-origin requests)
- Use optional &depthmap parameter to provide a URL to your own depth map

## SBS

Enable side-by-side view with the #sbs URL hash or via the hamburger menu. This shows twi 3d views, slightly offset. View in your VR headset for a nice 3D effect.

## Show depth map

Click "Show Depth Map" in the hamburger menu to see and export the depth map.

## Hosting

It's just a static site, host the contents of `public/` however you like. I use my server with Capistrano. The depth map model is loaded from HuggingFace.


## Thanks to

- [akbartus DepthAnything-on-Browser](https://github.com/akbartus/DepthAnything-on-Browser) for Depth Anything V2 JS version
- Icon by [Remix Icon](https://remixicon.com/), [Apache License](https://github.com/Remix-Design/remixicon/blob/master/License)
- Rafał Lindemanns [Depthy](https://depthy.stamina.pl/#/) for inspiration and some code
- [immersity.ai](https://www.immersity.ai/) for inspiration.
