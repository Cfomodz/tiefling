import * as THREE from '/js/tiefling/node_modules/three/build/three.module.js';



export const Tiefling = function(container, options = {}) {

    const possibleDisplayModes = ['full', 'hsbs', 'fsbs', 'anaglyph'];
    this.displayMode = options.displayMode || 'full';
    if (!possibleDisplayModes.includes(this.displayMode)) {
        this.displayMode = 'full';
    }

    // simulate mouse movement after a while for auto rotation
    this.idleMovementAfter = options.idleMovementAfter || 3000; // -1 to disable

    this.depthmapSize = options.depthmapSize || 518;
    this.focus = options.focus || 0.25;
    this.devicePixelRatio = options.devicePixelRatio || Math.min(window.devicePixelRatio, 2) || 1;
    this.expandDepthmapRadius = options.expandDepthmapRadius || 7;
    this.mouseXOffset = options.mouseXOffset || 0.2;


    let view1, view2;
    let lastMouseMovementTime = Date.now();

    const onMouseMove = (event, manual = true) => {

        if (manual) {
            lastMouseMovementTime = Date.now();
        }

        if (view1) {
            view1.onMouseMove(event);
        }
        if (view2) {
            let view2Event = new MouseEvent(event.type, {
                clientX: event.clientX + (container.offsetWidth / 2),
                clientY: event.clientY
            });
            view2.onMouseMove(view2Event);
        }
    }

    /**
     *
     * @param image - path to image
     * @param depthMap - path to depth map
     */
    const load3DImage = (image, depthMap) => {

        if (view1) {
            view1.destroy();
        }

        if (this.displayMode === 'hsbs' || this.displayMode === 'fsbs' || this.displayMode === 'anaglyph') {

            view1 = TieflingView(container.querySelector('.inner .container-left'), image, depthMap, {
                focus: this.focus,
                devicePixelRatio: this.devicePixelRatio,
                expandDepthmapRadius: this.expandDepthmapRadius,
            });

            if (view2) {
                view2.destroy();
            }
            view2 = TieflingView(container.querySelector('.inner .container-right'), image, depthMap, {
                mouseXOffset: -this.mouseXOffset,
                focus: this.focus,
                devicePixelRatio: this.devicePixelRatio,
                expandDepthmapRadius: this.expandDepthmapRadius,
            });
        } else {
            view1 = TieflingView(container.querySelector('.inner .container-left'), image, depthMap, {
                mouseXOffset: 0,
                focus: this.focus,
                devicePixelRatio: this.devicePixelRatio,
                expandDepthmapRadius: this.expandDepthmapRadius,
            });
        }
    }

    // check if the mouse hasn't been moved in 3 seconds. if so, move the mouse in a circle around the center of the container
    const checkMouseMovement = () => {
        if (this.idleMovementAfter >= 0 && Date.now() - lastMouseMovementTime > this.idleMovementAfter) {

            let rect = container.getBoundingClientRect();

            let centerX = rect.left + rect.width / 2;
            let centerY = rect.top + rect.height / 2;

            let radiusX = rect.width / 4;
            let radiusY = rect.height / 4;

            // account for aspect ratio of container
            if (rect.width > rect.height) {
                radiusY = radiusX * (rect.height / rect.width);
            } else {
                radiusX = radiusY * (rect.width / rect.height);
            }

            const speed = 0.001;
            const time = Date.now() * speed;

            const x = centerX + Math.cos(time) * radiusX;
            const y = centerY + Math.sin(time) * radiusY;

            // hide cursor
            document.body.style.cursor = 'none';

            onMouseMove({
                clientX: x,
                clientY: y
            }, false);
        } else {
            // show cursor
            document.body.style.cursor = 'default';
        }

        requestAnimationFrame(checkMouseMovement);
    }
    checkMouseMovement();


    /**
     * Load an image file and generate a depth map
     * @param file {File} Image file
     * @param depthmapSize {number} Size of the depth map. 518: pretty fast, good quality. 1024: slower, better quality. higher or lower might throw error
     * @returns {Promise<*>} URL of the depth map
     */
    const getDepthmapURL = async (file, depthmapSize = null) => {

        try {
            const depthCanvas = await generateDepthmap(file, {depthmapSize: depthmapSize || this.depthmapSize});

            // convert depth map canvas to blob URL
            return await new Promise((resolve, reject) => {
                depthCanvas.toBlob(blob => {
                    if (blob) {
                        resolve(URL.createObjectURL(blob));
                    } else {
                        reject(new Error('failed to create blob from canvas'));
                    }
                });
            });

        } catch (error) {
            console.error("error in getDepthmapURL:", error);
            throw error;
        }
    }


    document.addEventListener('mousemove', onMouseMove);

    let lastTouchX = null;
    let lastTouchY = null;

    document.addEventListener('touchstart', (event) => {
        lastTouchX = event.touches[0].clientX;
        lastTouchY = event.touches[0].clientY;
    });

    document.addEventListener('touchmove', (event) => {
        const touchX = event.touches[0].clientX;
        const touchY = event.touches[0].clientY;

        // Map touch position directly to screen coordinates
        onMouseMove({
            clientX: touchX,
            clientY: touchY
        });

        lastTouchX = touchX;
        lastTouchY = touchY;
    });

    document.addEventListener('touchend', () => {
        lastTouchX = null;
        lastTouchY = null;
    });


    // create elements. tiefling-container > div.inner > div.container.container-left|.container-right
    let inner = document.createElement('div');
    inner.classList.add('inner');
    container.appendChild(inner);

    let container1 = document.createElement('div');
    container1.classList.add('container');
    container1.classList.add('container-left');
    inner.appendChild(container1);

    let container2 = document.createElement('div');
    container2.classList.add('container');
    container2.classList.add('container-right');
    inner.appendChild(container2);

    // add unique class to container
    let containerClass = "tiefling-" + Math.random().toString(36).substring(7);
    container.classList.add(containerClass);


    // add css
    let style = document.createElement('style');
    style.textContent = `
        .${containerClass} .inner {
            display: grid;
            width: 100vw;
            height: 100vh;
            grid-template-columns: 1fr;
        }
        
        .${containerClass} .inner .container {
            overflow: hidden;
        }
        .${containerClass} .inner .container-right {
            display: none;
        }
                
         /* Full/Half Side-by-Side: Stretch container by 2x, put two containers side by side, scale container down again */       
        .${containerClass}.hsbs .inner,
        .${containerClass}.fsbs .inner {
            width: 200vw;
            height: 100vh;
            grid-template-columns: 1fr 1fr;
        }
        .${containerClass}.hsbs .inner .container,
        .${containerClass}.fsbs .inner .container {
            width: 100vw;
            height: 100vh;            
        }
        .${containerClass}.hsbs .inner .container-right,
        .${containerClass}.fsbs .inner .container-right {
            display: block;
        }
        .${containerClass}.hsbs .inner {
            transform: scaleX(0.5);
        }
        .${containerClass}.fsbs .inner {
            transform: scale(0.5);
        }
        
        /* Anaglyph mode: Render containers on top of each other, with red/blue filters */
        .${containerClass}.anaglyph .inner {
            display: block;
            position: relative;
            width: 100vw;
            height: 100vh;
            filter: saturate(0.75);
        }
        .${containerClass}.anaglyph .inner .container {
            display: block;
            position: absolute;
            width: 100vw;
            height: 100vh;
        }
        .${containerClass}.anaglyph .inner .container.container-left {     
            background: red;
            background-blend-mode: lighten;
        }
        .${containerClass}.anaglyph .inner .container.container-right {         
            background: cyan;
            background-blend-mode: lighten;
            mix-blend-mode: darken;            
        }
        .${containerClass}.anaglyph .inner .container canvas {         
            mix-blend-mode: lighten;
        }
    `;
    document.head.appendChild(style);

    return {

        onMouseMove: onMouseMove,

        load3DImage: load3DImage,

        getDepthmapURL: getDepthmapURL,


        getDepthmapSize: () => {
            return this.depthmapSize
        },
        setDepthmapSize: (size) => {
            this.depthmapSize = size;
        },


        getFocus: () => {
            return this.focus;
        },
        setFocus: (value) => {
            this.focus = value;
            if (view1) {
                view1.setFocus(this.focus);
            }
            if (view2) {
                view2.setFocus(this.focus);
            }
        },

        getDevicePixelRatio: () => {
            return this.devicePixelRatio
        },
        setDevicePixelRatio: (size) => {
            this.devicePixelRatio = size;

            if (view1) {
                view1.setDevicePixelRatio(this.devicePixelRatio);
            }
            if (view2) {
                view2.setDevicePixelRatio(this.devicePixelRatio);
            }
        },

        getExpandDepthmapRadius: () => {
            return this.expandDepthmapRadius;
        },

        setExpandDepthmapRadius: (radius) => {
            this.expandDepthmapRadius = radius;
        },

        getPossibleDisplayModes: () => {
            return possibleDisplayModes;
        },

        setDisplayMode: (mode) => {
            this.displayMode = mode;
            container.classList.remove('hsbs');
            container.classList.remove('fsbs');
            container.classList.remove('anaglyph');
            container.classList.add(this.displayMode);
        },

        setMouseXOffset: (value) => {
            this.mouseXOffset = value;
            if (view2) {
                view2.setMouseXOffset(-this.mouseXOffset);
            }
        }

    }

}


/**
 * Generate depth map from an image
 * @param options
 * @returns Promise of a canvas element
 * @constructor
 */
export const generateDepthmap = function(imageFile, options = {}) {

    const wasmPaths = options.wasmPaths || {
        'ort-wasm-simd-threaded.wasm': '/js/tiefling/onnx-wasm/ort-wasm-simd-threaded.wasm',
        'ort-wasm-simd.wasm': '/js/tiefling/onnx-wasm/ort-wasm-simd.wasm',
        'ort-wasm-threaded.wasm': '/js/tiefling/onnx-wasm/ort-wasm-threaded.wasm',
        'ort-wasm.wasm': '/js/tiefling/onnx-wasm/ort-wasm.wasm'
    };

    const onnxModel = options.onnxModel || '/models/depthanythingv2-vits-dynamic-quant.onnx';

    const depthmapSize = options.depthmapSize || 518;


    /**
     * Generate a depth map from an image file using depth-anything-v2. calls a worker for the heavy lifting
     * @param imageFile {File} Image file
     * @param size 518: pretty fast, good quality. 1024: slower, better quality. higher or lower might throw error
     * @returns {Promise<HTMLCanvasElement>}
     */
    async function generate(imageFile, maxSize = 518) {
        try {
            const imageUrl = URL.createObjectURL(imageFile);

            // load image
            const image = new Image();
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = () => reject(new Error('Failed to load image'));
                image.src = imageUrl;
            });

            // determine the actual processing size
            const size = Math.min(
                maxSize,
                Math.max(image.width, image.height)
            );

            // create a canvas for the resized input
            const resizeCanvas = document.createElement('canvas');
            const resizeCtx = resizeCanvas.getContext('2d');
            resizeCanvas.width = size;
            resizeCanvas.height = size;

            // resize image maintaining aspect ratio
            const scale = Math.min(size / image.width, size / image.height);
            const scaledWidth = Math.round(image.width * scale);
            const scaledHeight = Math.round(image.height * scale);

            // center the image
            const offsetX = (size - scaledWidth) / 2;
            const offsetY = (size - scaledHeight) / 2;

            // draw black background
            resizeCtx.fillStyle = '#000000';
            resizeCtx.fillRect(0, 0, size, size);

            // draw resized image
            resizeCtx.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight);

            // get image data from resized image
            const imageData = resizeCtx.getImageData(0, 0, size, size);

            // Create worker
            const worker = new Worker('/js/worker.js', {
                type: 'module'
            });

            // Use worker to process the image
            const processedImageData = await new Promise((resolve, reject) => {
                worker.onmessage = function(e) {
                    if (e.data.error) {
                        reject(new Error(e.data.error));
                    } else {
                        resolve(e.data.processedImageData);
                    }
                };

                worker.postMessage({
                    type: 'init',
                    wasmPaths: wasmPaths
                });

                worker.postMessage({
                    imageData,
                    size,
                    onnxModel,
                    wasmPaths
                });
            });



            // create output canvas at original size
            const outputCanvas = document.createElement('canvas');
            outputCanvas.width = image.width;
            outputCanvas.height = image.height;
            const outputCtx = outputCanvas.getContext('2d');

            // create temporary canvas for the depth map
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = size;
            tempCanvas.height = size;
            const tempCtx = tempCanvas.getContext('2d');

            if (!(processedImageData instanceof ImageData)) {
                throw new Error('Invalid processed image data');
            }
            tempCtx.putImageData(processedImageData, 0, 0);

            // extract relevant portion of the depth map
            outputCtx.drawImage(
                tempCanvas,
                offsetX, offsetY, scaledWidth, scaledHeight,
                0, 0, image.width, image.height
            );

            // clean up
            worker.terminate();
            URL.revokeObjectURL(imageUrl);

            return outputCanvas;

        } catch (error) {
            console.error("error in generateDepthMap:", error);
            throw error;
        }
    }

    return generate(imageFile, depthmapSize);
}


/**
 * TieflingView - renders a single 3D view of an image and a depth map in a canvas.
 * @param container - container for the single canvas.
 * @param image - path to image
 * @param depthMap - path to depthmap
 * @param options
 * @returns {{destroy: *, onMouseMove: *, setFocus: *, setDevicePixelRatio: *, setMouseXOffset: * }}
 * @constructor
 */
export const TieflingView = function (container, image, depthMap, options) {

    let mouseXOffset = options.mouseXOffset || 0;
    let focus = options.focus || 0.3;
    let baseMouseSensitivity = options.mouseSensitivity || 0.8;
    let mouseSensitivityX = baseMouseSensitivity;
    let mouseSensitivityY = baseMouseSensitivity;
    let devicePixelRatio = options.devicePixelRatio || Math.min(window.devicePixelRatio, 2) || 1;
    let meshResolution = options.meshResolution || 1024;
    let meshDepth = options.meshDepth || 0.8;
    let expandDepthmapRadius = options.expandDepthmapRadius || 7;

    let scene, camera, renderer, mesh;
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    const easing = 0.05;
    let animationFrameId;

    let containerWidth = container.offsetWidth;
    let containerHeight = container.offsetHeight;

    let material;
    let uniforms = {
        map: { value: null },
        mouseDelta: { value: new THREE.Vector2(0, 0) },
        focus: { value: focus },
        meshDepth: { value: meshDepth },
        sensitivity: { value: baseMouseSensitivity }
    };

    init();
    animate();

    function expandDepthMap(imageData, radius) {
        const width = imageData.width;
        const height = imageData.height;
        const src = imageData.data;
        const dst = new Uint8ClampedArray(src);

        for (let r = 0; r < radius; r++) {
            for (let y = 1; y < height-1; y++) {
                for (let x = 1; x < width-1; x++) {
                    const idx = (y * width + x) * 4;
                    const currentDepth = src[idx];

                    if (currentDepth < 10) continue;

                    // Simple dilation: spread to adjacent pixels
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nIdx = ((y + dy) * width + (x + dx)) * 4;
                            if (src[nIdx] < currentDepth) {
                                dst[nIdx] = currentDepth;
                                dst[nIdx + 1] = currentDepth;
                                dst[nIdx + 2] = currentDepth;
                            }
                        }
                    }
                }
            }
            // Update source for next iteration
            src.set(dst);
        }
        return new ImageData(dst, width, height);
    }

    function createGeometry(width, height, depthData) {
        const imageAspect = depthData.width / depthData.height;
        const geometry = new THREE.PlaneGeometry(
            imageAspect,
            1,
            width - 1,
            height - 1
        );

        const vertices = geometry.attributes.position.array;
        const uvs = geometry.attributes.uv.array;
        const depths = new Float32Array(vertices.length / 3);
        let depthValue;

        // First pass: compute initial depths and positions
        for (let i = 0; i < vertices.length; i += 3) {
            const uvIndex = (i / 3) * 2;
            const u = Math.min(1, Math.max(0, uvs[uvIndex])); // Clamp UV coordinates
            const v = Math.min(1, Math.max(0, uvs[uvIndex + 1]));

            // Safely calculate pixel coordinates
            const x = Math.floor(u * (depthData.width - 1));
            const y = Math.floor((1 - v) * (depthData.height - 1));

            // Validate array index
            const pixelIndex = (y * depthData.width + x) * 4;
            if (pixelIndex + 3 >= depthData.data.length) {
                console.error('Invalid depthmap access at:', x, y);
                depthValue = 0;
            } else {
                depthValue = depthData.data[pixelIndex] / 255;
            }

            const z = depthValue * meshDepth;
            const scaleFactor = (4 - z) / 4;

            vertices[i] *= scaleFactor;
            vertices[i + 1] *= scaleFactor;
            vertices[i + 2] = z;

            depths[i/3] = depthValue;
        }

        // Create depth grid and calculate gradients
        const gridWidth = width;
        const gridHeight = height;
        const depthGrid = new Array(gridWidth).fill().map(() => new Array(gridHeight));
        const gradientGrid = new Array(gridWidth).fill().map(() => new Array(gridHeight));

        for (let i = 0; i < depths.length; i++) {
            const x = i % gridWidth;
            const y = Math.floor(i / gridWidth);
            depthGrid[x][y] = depths[i];
        }

        // Pre-calculate gradients
        for (let x = 0; x < gridWidth; x++) {
            for (let y = 0; y < gridHeight; y++) {
                const dx = (x < gridWidth-1 ? depthGrid[x+1][y] : depthGrid[x][y]) -
                    (x > 0 ? depthGrid[x-1][y] : depthGrid[x][y]);
                const dy = (y < gridHeight-1 ? depthGrid[x][y+1] : depthGrid[x][y]) -
                    (y > 0 ? depthGrid[x][y-1] : depthGrid[x][y]);
                gradientGrid[x][y] = { dx, dy, mag: Math.sqrt(dx*dx + dy*dy) };
            }
        }

        // Smoothing pass for jagged edges
        const smoothIterations = 2;
        for (let iter = 0; iter < smoothIterations; iter++) {
            for (let i = 0; i < vertices.length; i += 3) {
                const vertexIndex = i / 3;
                const x = vertexIndex % gridWidth;
                const y = Math.floor(vertexIndex / gridWidth);

                if (gradientGrid[x][y].mag > 0.08) {
                    let avgX = 0, avgY = 0, avgZ = 0, count = 0;

                    // Average with neighbors
                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            const nx = x + dx;
                            const ny = y + dy;
                            if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
                                const idx = (ny * gridWidth + nx) * 3;
                                // Add validation for vertex indices
                                if (idx >= 0 && idx + 2 < vertices.length) {
                                    avgX += vertices[idx];
                                    avgY += vertices[idx + 1];
                                    avgZ += vertices[idx + 2];
                                    count++;
                                }
                            }
                        }
                    }

                    // Only update if we have valid samples
                    if (count > 0) {
                        vertices[i] = avgX / count;
                        vertices[i + 1] = avgY / count;
                        vertices[i + 2] = avgZ / count;
                    }
                }
            }
        }

        geometry.setAttribute('depth', new THREE.BufferAttribute(depths, 1));
        geometry.computeVertexNormals();
        return geometry;
    }

    function init() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);

        const fov = 45;
        camera = new THREE.PerspectiveCamera(fov, containerWidth / containerHeight, 0.1, 1000);
        camera.position.z = 4;
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.setPixelRatio(devicePixelRatio);
        renderer.setSize(containerWidth, containerHeight);
        container.appendChild(renderer.domElement);

        const textureLoader = new THREE.TextureLoader();
        const imagePromise = new Promise(resolve => {
            textureLoader.load(image, texture => {
                texture.encoding = THREE.sRGBEncoding;
                uniforms.map.value = texture;
                resolve();
            });
        });

        const depthPromise = new Promise(resolve => {
            const img = new Image();
            img.src = depthMap;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                let depthData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                // Expand depth map to fill in gaps
                if (expandDepthmapRadius > 0) {
                    depthData = expandDepthMap(depthData, expandDepthmapRadius);
                }

                const geometry = createGeometry(
                    Math.min(meshResolution, img.width),
                    Math.min(meshResolution, img.height),
                    depthData
                );

                material = new THREE.ShaderMaterial({
                    vertexShader: `
                        uniform vec2 mouseDelta;
                        uniform float focus;
                        uniform float meshDepth;
                        uniform float sensitivity;

                        attribute float depth;

                        varying vec2 vUv;

                        void main() {
                            vUv = uv;
                            vec3 pos = position;

                            float actualDepth = depth * meshDepth;
                            float focusDepth = focus * meshDepth;
                            float cameraZ = 4.0;

                            // Strafe displacement (inversely proportional to camera distance)
                            vec2 strafe = mouseDelta * sensitivity * focus * 
                                (1.0 / (cameraZ - actualDepth)) * 
                                vec2(-1.0, 1.0);

                            // Rotational displacement (relative to focus depth)
                            vec2 rotate = mouseDelta * sensitivity * 
                                (1.0 - focus) * 
                                (actualDepth - focusDepth) * 
                                vec2(-1.0, 1.0);

                            pos.xy += strafe + rotate;

                            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                        }
                    `,
                    fragmentShader: `
                        uniform sampler2D map;
                        varying vec2 vUv;

                        void main() {
                            gl_FragColor = texture2D(map, vUv);
                        }
                    `,
                    uniforms: uniforms,
                    side: THREE.DoubleSide
                });

                mesh = new THREE.Mesh(geometry, material);

                const containerAspect = containerWidth / containerHeight;
                const imageAspect = depthData.width / depthData.height;
                const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(fov/2)) * camera.position.z;
                const visibleWidth = visibleHeight * camera.aspect;

                let scale;
                if (containerAspect > imageAspect) {
                    scale = visibleHeight / geometry.parameters.height;
                } else {
                    scale = visibleWidth / geometry.parameters.width;
                }

                mesh.scale.set(scale, scale, 1);
                scene.add(mesh);
                resolve();
            };
        });

        Promise.all([imagePromise, depthPromise]).then(() => {
            updateMouseSensitivity();
        });
    }

    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        targetX += (mouseX * mouseSensitivityX - targetX) * easing;
        targetY += (mouseY * mouseSensitivityY - targetY) * easing;

        if (mesh) {
            uniforms.mouseDelta.value.set(targetX, -targetY);
            uniforms.focus.value = focus;
            uniforms.sensitivity.value = baseMouseSensitivity;
        }

        renderer.render(scene, camera);
    }

    function onMouseMove(event) {
        const rect = container.getBoundingClientRect();
        mouseX = Math.min(1, Math.max(-1, (event.clientX - rect.left) / containerWidth * 2 - 1));
        mouseY = Math.min(1, Math.max(-1, (event.clientY - rect.top) / containerHeight * 2 - 1));

        mouseX += 2 * mouseXOffset;
        mouseX = -mouseX;
    }

    function updateMouseSensitivity() {
        mouseSensitivityX = baseMouseSensitivity;
        mouseSensitivityY = baseMouseSensitivity;
    }

    const onResize = () => {
        containerWidth = container.offsetWidth;
        containerHeight = container.offsetHeight;

        // Update renderer and camera
        renderer.setSize(containerWidth, containerHeight);
        camera.aspect = containerWidth / containerHeight;
        camera.updateProjectionMatrix();

        // Update mesh scaling
        if (mesh) {
            const imageAspect = mesh.geometry.parameters.width / mesh.geometry.parameters.height;
            const containerAspect = containerWidth / containerHeight;

            const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov/2)) * camera.position.z;
            const visibleWidth = visibleHeight * camera.aspect;

            let scale;
            if (containerAspect > imageAspect) {
                // Container is wider - scale to match height
                scale = visibleHeight / mesh.geometry.parameters.height;
            } else {
                // Container is taller - scale to match width
                scale = visibleWidth / mesh.geometry.parameters.width;
            }

            mesh.scale.set(scale, scale, 1);
        }

        updateMouseSensitivity();
    };

    window.addEventListener('resize', onResize);


    // public methods
    return {

        destroy: function() {
            window.removeEventListener('resize', onResize);

            if (material.map) {
                material.map.dispose();
            }

            if (mesh) {
                mesh.geometry.dispose();
                material.dispose();
            }

            if (renderer) {
                renderer.dispose();
                container.removeChild(renderer.domElement);
            }

            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }

            scene = null;
            camera = null;
            renderer = null;
            mesh = null;
            material = null;
        },

        onMouseMove: onMouseMove,

        setFocus: function(value) {
            focus = value;
        },
        setDevicePixelRatio: function(value) {
            devicePixelRatio = value;
            if (renderer) {
                renderer.setPixelRatio(devicePixelRatio);
            }
        },
        setMouseXOffset: function(value) {
            mouseXOffset = value;
        },

        setExpandDepthmapRadius: function(value) {
            expandDepthmapRadius = value;
        }
    };

}