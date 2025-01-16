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
    this.focus = options.focus || 0.3;
    this.devicePixelRatio = options.devicePixelRatio || Math.min(window.devicePixelRatio, 2) || 1;
    this.mouseXOffset = options.mouseXOffset || 0.3;


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
            });

            if (view2) {
                view2.destroy();
            }
            view2 = TieflingView(container.querySelector('.inner .container-right'), image, depthMap, {
                mouseXOffset: -this.mouseXOffset,
                focus: this.focus,
                devicePixelRatio: this.devicePixelRatio,
            });
        } else {
            view1 = TieflingView(container.querySelector('.inner .container-left'), image, depthMap, {
                mouseXOffset: 0,
                focus: this.focus,
                devicePixelRatio: this.devicePixelRatio,
            });
        }
    }

    // check if the mouse hasn't been moved in 3 seconds. if so, move the mouse in a circle around the center of the container
    const checkMouseMovement = () => {
        if (this.idleMovementAfter >= 0 && Date.now() - lastMouseMovementTime > this.idleMovementAfter) {

            let rect = container.getBoundingClientRect();

            let centerX = rect.left + rect.width / 2;
            let centerY = rect.top + rect.height / 2;

            const radiusX = rect.width / 6;
            const radiusY = rect.height / 6;
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
    let focus = options.focus || 0.3; // 1: strafe camera, good for sbs view. 0.3: rotate around some middle point
    let baseMouseSensitivity = options.mouseSensitivity || 15;
    let mouseSensitivityX = baseMouseSensitivity;
    let mouseSensitivityY = baseMouseSensitivity;
    let devicePixelRatio = options.devicePixelRatio || Math.min(window.devicePixelRatio, 2) || 1;

    let scene, camera, renderer, quad;
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;

    const easing = 0.05;
    let animationFrameId;

    let containerWidth = container.offsetWidth;
    let containerHeight = container.offsetHeight;

    let material = new THREE.ShaderMaterial({
        uniforms: {
            colorTexture: { value: null },
            depthTexture: { value: null },
            offset: { value: new THREE.Vector2(0, 0) },
            resolution: { value: new THREE.Vector2(containerWidth, containerHeight) },
            textureResolution: { value: new THREE.Vector2(1, 1) },
            focus: { value: focus },
            scale: { value: 0.0125 },
            enlarge: { value: 1.06 }
        },
        vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position, 1.0);
                    }
                `,
        fragmentShader: `
                // TODO: handle edges better somehow. less shimmering, more performance
                precision mediump float;
            
                uniform sampler2D colorTexture;
                uniform sampler2D depthTexture;
                uniform vec2 offset;
                uniform vec2 resolution;
                uniform vec2 textureResolution;
                uniform float focus;
                uniform float scale;
                uniform float enlarge;                
                varying vec2 vUv;
            
                #define MAXSTEPS 128.0
                #define COMPRESSION 0.8
            
                vec2 coverUV(vec2 uv, vec2 resolution, vec2 textureResolution) {
                    // Calculate base ratios
                    float containerRatio = resolution.x / resolution.y;
                    float imageRatio = textureResolution.x / textureResolution.y;
                    
                    vec2 scale = vec2(1.0);
                    vec2 offset = vec2(0.0);
                    
                    // Contain behavior
                    if (containerRatio < imageRatio) {
                        // Container is relatively taller than image
                        scale.x = 1.0;
                        scale.y = (containerRatio / imageRatio);
                    } else {
                        // Container is relatively wider than image
                        scale.x = (imageRatio / containerRatio);
                        scale.y = 1.0;
                    }
                    
                    // Center the image
                    offset = (1.0 - scale) * 0.5;
                    
                    // Apply scaling and offset to UV
                    return (uv - 0.5) / scale + 0.5;
                }

                void main() {
                    vec2 uv = coverUV(vUv, resolution, textureResolution);
        
                    // Discard pixels outside the valid range
                    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
                        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
                        return;
                    }

                    float aspect = resolution.x / resolution.y;
                    vec2 scale2 = vec2(scale * min(1.0, 1.0/aspect), scale * min(1.0, aspect)) * vec2(1, -1);
                    
                    // calculate parallax vectors
                    vec2 vectorStart = (0.5 - focus) * offset - offset/2.0;
                    vec2 vectorEnd = (0.5 - focus) * offset + offset/2.0;
                    
                    float dstep = COMPRESSION / (MAXSTEPS - 1.0);
                    vec2 vstep = (vectorEnd - vectorStart) / (MAXSTEPS - 1.0);

                    vec4 bestColor = texture2D(colorTexture, uv);
                    float bestConfidence = 0.0;
                    float bestDepth = 0.0;

                    // first pass: find the best depth match
                    for(float i = 0.0; i < MAXSTEPS; i++) {
                        float t = i / (MAXSTEPS - 1.0);
                        vec2 currentVector = mix(vectorStart, vectorEnd, t);
                        vec2 samplePos = uv + currentVector * scale2;
                        
                        if (samplePos.x < 0.0 || samplePos.x > 1.0 || 
                            samplePos.y < 0.0 || samplePos.y > 1.0) continue;

                        float depth = 1.0 - texture2D(depthTexture, samplePos).r;
                        float targetDepth = mix(0.0, 1.0, t);
                        
                        // Sharp depth test
                        float confidence = step(abs(depth - targetDepth), dstep);
                        
                        if (confidence > bestConfidence) {
                            bestConfidence = confidence;
                            bestColor = texture2D(colorTexture, samplePos);
                            bestDepth = depth;
                        }
                    }

                    // if no good match found, do a second pass with interpolation
                    if (bestConfidence < 0.1) {
                        vec4 colorSum = vec4(0.0);
                        float weightSum = 0.0;

                        for(float i = 0.0; i < MAXSTEPS; i++) {
                            float t = i / (MAXSTEPS - 1.0);
                            vec2 currentVector = mix(vectorStart, vectorEnd, t);
                            vec2 samplePos = uv + currentVector * scale2;
                            
                            if (samplePos.x < 0.0 || samplePos.x > 1.0 || 
                                samplePos.y < 0.0 || samplePos.y > 1.0) continue;

                            float depth = 1.0 - texture2D(depthTexture, samplePos).r;
                            float targetDepth = mix(0.0, 1.0, t);
                            float weight = 1.0 - abs(depth - targetDepth);
                            weight = pow(weight, 8.0); // Very sharp falloff

                            colorSum += texture2D(colorTexture, samplePos) * weight;
                            weightSum += weight;
                        }

                        if (weightSum > 0.0) {
                            gl_FragColor = mix(bestColor, colorSum / weightSum, 0.5);
                        } else {
                            gl_FragColor = bestColor;
                        }
                    } else {
                        gl_FragColor = bestColor;
                    }
                }
            `
    });


    init();
    animate();

    function init() {
        scene = new THREE.Scene();
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setSize(containerWidth, containerHeight);
        container.appendChild(renderer.domElement);

        // create a quad that fills the container
        const geometry = new THREE.PlaneGeometry(2, 2);
        quad = new THREE.Mesh(geometry, material);
        scene.add(quad);

        // load textures
        const textureLoader = new THREE.TextureLoader();

        textureLoader.load(image, (texture) => {
            material.uniforms.colorTexture.value = texture;
            material.uniforms.textureResolution.value = new THREE.Vector2(
                texture.image.width,
                texture.image.height
            );
        });

        textureLoader.load(depthMap, (texture) => {
            material.uniforms.depthTexture.value = texture;
        });

        updateMouseSensitivity();

    }

    function onMouseMove(event) {
        const rect = container.getBoundingClientRect();
        mouseX = Math.min(1, Math.max(-1, (event.clientX - rect.left) / containerWidth * 2 - 1));
        mouseY = Math.min(1, Math.max(-1, (event.clientY - rect.top) / containerHeight * 2 - 1));

        mouseX += 2 * mouseXOffset;

        targetX = mouseX * mouseSensitivityX;
        targetY = mouseY * mouseSensitivityY;
    }

    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        // smooth interpolation of the offset
        const currentX = material.uniforms.offset.value.x;
        const currentY = material.uniforms.offset.value.y;

        material.uniforms.offset.value.x += (targetX - currentX) * easing;
        material.uniforms.offset.value.y += (targetY - currentY) * easing;

        renderer.render(scene, camera);
    }

    function updateMouseSensitivity() {
        const aspect = containerWidth / containerHeight;
        if (aspect > 1) {
            // Wide container - increase X sensitivity
            mouseSensitivityX = baseMouseSensitivity * aspect;
            mouseSensitivityY = baseMouseSensitivity * 1.5;
        } else {
            // Tall container - increase Y sensitivity
            mouseSensitivityX = baseMouseSensitivity;
            mouseSensitivityY = (baseMouseSensitivity / aspect) * 1.5;
        }
    }

    const onResize = () => {
        containerWidth = container.offsetWidth;
        containerHeight = container.offsetHeight;
        renderer.setSize(containerWidth, containerHeight);
        material.uniforms.resolution.value.set(containerWidth, containerHeight);
        updateMouseSensitivity();
    };

    window.addEventListener('resize', onResize);


    // public methods
    return {

        destroy: function () {
            window.removeEventListener('resize', onResize);

            // delete textures
            if (material.uniforms.colorTexture.value) {
                material.uniforms.colorTexture.value.dispose();
            }
            if (material.uniforms.depthTexture.value) {
                material.uniforms.depthTexture.value.dispose();
            }

            // delete materials and geometries
            if (quad) {
                quad.geometry.dispose();
                material.dispose();
            }

            // get rid of renderer
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
            quad = null;
            material = null;
        },

        onMouseMove: function(event) {
            onMouseMove(event);
        },

        setFocus: function(value) {
            focus = value;
            if (material) {
                material.uniforms.focus.value = focus;
            }
        },

        setDevicePixelRatio: function(value) {
            devicePixelRatio = value;
            if (renderer) {
                renderer.setPixelRatio(devicePixelRatio);
            }
        },

        setMouseXOffset: function(value) {
            mouseXOffset = value;
        }
    };

}