import * as THREE from '/js/tiefling/node_modules/three/build/three.module.js';
import * as ort from '/js/tiefling/node_modules/onnxruntime-web/dist/ort.mjs';



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
            view2.onMouseMove(event);
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

        if (this.displayMode === 'hsbs') {

            view1 = TieflingView(container.querySelector('.inner .container-1'), image, depthMap, {
                mouseXOffset: 0.3,
                scaleY: 2,
                focus: this.focus
            });

            if (view2) {
                view2.destroy();
            }
            view2 = TieflingView(container.querySelector('.inner .container-2'), image, depthMap, {
                scaleY: 2,
                focus: this.focus
            });
        } else {
            view1 = TieflingView(container.querySelector('.inner .container-1'), image, depthMap, {
                mouseXOffset: 0,

            });
        }
    }

    // check if the mouse hasn't been moved in 3 seconds. if so, move the mouse in a circle around the center of the container
    const checkMouseMovement = () => {
        if (this.idleMovementAfter >= 0 && Date.now() - lastMouseMovementTime > this.idleMovementAfter) {

            let rect = container.getBoundingClientRect();

            let centerX = rect.left + rect.width / 2;
            let centerY = rect.top + rect.height / 2;

            const radiusX = rect.width / 4;
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
     * @returns {Promise<*>} URL of the depth map
     */
    const getDepthmapURL = async (file) => {
        try {
            const depthCanvas = await generateDepthmap(file, {depthmapSize: this.depthmapSize});

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


    // create elements. container > div.inner > div.container.container-1|.container-2
    let inner = document.createElement('div');
    inner.classList.add('inner');
    container.appendChild(inner);

    let container1 = document.createElement('div');
    container1.classList.add('container');
    container1.classList.add('container-1');
    inner.appendChild(container1);

    let container2 = document.createElement('div');
    container2.classList.add('container');
    container2.classList.add('container-2');
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
        
        .${containerClass}.hsbs {
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .${containerClass}.hsbs .inner {
            aspect-ratio: 16 / 9;
            width: auto;
            height: auto;
            max-width: 100vw;
            max-height: 100vh;
            min-width: min(100vw, calc(100vh * 16/9));
            min-height: min(100vh, calc(100vw * 9/16));
            grid-template-columns: 1fr 1fr;
        }
        .${containerClass}.hsbs .inner .container {
            width: 100%;
            height: 100%;
            aspect-ratio: 8 / 9;
        }
        .${containerClass} .inner .container-2 {
            display: none; // for now
        }
    `;
    document.head.appendChild(style);

    return {

        onMouseMove: onMouseMove,

        load3DImage: load3DImage,

        getDepthmapURL: getDepthmapURL,

        setDepthmapSize: (size) => {
            this.depthmapSize = size;
        },

        getDepthmapSize: () => {
            return this.depthmapSize
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

        getFocus: () => {
            return this.focus;
        },

        getPossibleDisplayModes: () => {
            return possibleDisplayModes;
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

    ort.env.wasm.wasmPaths = options.wasmPaths || {
        'ort-wasm-simd-threaded.wasm': '/js/tiefling/onnx-wasm/ort-wasm-simd-threaded.wasm',
        'ort-wasm-simd.wasm': '/js/tiefling/onnx-wasm/ort-wasm-simd.wasm',
        'ort-wasm-threaded.wasm': '/js/tiefling/onnx-wasm/ort-wasm-threaded.wasm',
        'ort-wasm.wasm': '/js/tiefling/onnx-wasm/ort-wasm.wasm'
    };

    const onnxModel = options.onnxModel || '/models/depthanythingv2-vits-dynamic-quant.onnx';

    const depthmapSize = options.depthmapSize || 518;

    /**
     * Preprocess an ImageData object to a Float32Array
     * thx to akbartus https://github.com/akbartus/DepthAnything-on-Browser
     * @param input_imageData
     * @param width
     * @param height
     * @returns {Float32Array}
     */
    function preprocessImage(input_imageData, width, height) {
        var floatArr = new Float32Array(width * height * 3);
        var floatArr1 = new Float32Array(width * height * 3);
        var floatArr2 = new Float32Array(width * height * 3);

        var j = 0;
        for (let i = 1; i < input_imageData.data.length + 1; i++) {
            if (i % 4 !== 0) {
                floatArr[j] = input_imageData.data[i - 1] / 255; // red
                j = j + 1;
            }
        }
        for (let i = 1; i < floatArr.length + 1; i += 3) {
            floatArr1[i - 1] = floatArr[i - 1]; // red
            floatArr1[i] = floatArr[i]; // green
            floatArr1[i + 1] = floatArr[i + 1]; // blue
        }
        var k = 0;
        for (let i = 0; i < floatArr.length; i += 3) {
            floatArr2[k] = floatArr[i]; // red
            k = k + 1;
        }
        var l = k;
        for (let i = 1; i < floatArr.length; i += 3) {
            floatArr2[l] = floatArr[i]; // green
            l = l + 1;
        }
        var m = l;
        for (let i = 2; i < floatArr.length; i += 3) {
            floatArr2[m] = floatArr[i]; // blue
            m = m + 1;
        }
        return floatArr2;
    };

    /**
     * Postprocess the depth map tensor to an ImageData object
     * thx to akbartus https://github.com/akbartus/DepthAnything-on-Browser
     * @param tensor
     * @returns {ImageData}
     */
    function postprocessImage(tensor) {
        const height = tensor.dims[1];
        const width = tensor.dims[2];

        const imageData = new ImageData(width, height);
        const data = imageData.data;

        const tensorData = new Float32Array(tensor.data.buffer);
        let max_depth = 0;
        let min_depth = Infinity;

        // Find the min and max depth values
        for (let h = 0; h < height; h++) {
            for (let w = 0; w < width; w++) {
                const tensorIndex = h * width + w;
                const value = tensorData[tensorIndex];
                if (value > max_depth) max_depth = value;
                if (value < min_depth) min_depth = value;
            }
        }

        // Normalize and fill ImageData
        for (let h = 0; h < height; h++) {
            for (let w = 0; w < width; w++) {
                const tensorIndex = h * width + w;
                const value = tensorData[tensorIndex];
                const depth = ((value - min_depth) / (max_depth - min_depth)) * 255;

                data[(h * width + w) * 4] = Math.round(depth);
                data[(h * width + w) * 4 + 1] = Math.round(depth);
                data[(h * width + w) * 4 + 2] = Math.round(depth);
                data[(h * width + w) * 4 + 3] = 255;
            }
        }

        return imageData;
    };


    /**
     * Generate a depth map from an image file using depth-anything-v2
     * @param imageFile {File} Image file
     * @param size 518: pretty fast, good quality. 1024: slower, better quality. higher or lower might throw error
     * @returns {Promise<HTMLCanvasElement>}
     */
    async function generate(imageFile, size = 518) {
        try {
            const imageUrl = URL.createObjectURL(imageFile);

            // load image
            const image = new Image();
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = () => reject(new Error('Failed to load image'));
                image.src = imageUrl;
            });

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

            // load the ONNX model
            const session = await ort.InferenceSession.create(onnxModel);

            // preprocess the image
            const preprocessed = preprocessImage(imageData, size, size);

            const input = new ort.Tensor(new Float32Array(preprocessed), [1, 3, size, size]);

            // run inference
            const result = await session.run({ image: input });

            // postprocess the result
            const processedImageData = postprocessImage(result.depth);

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
 * @returns {{destroy: *, onMouseMove: *}}
 * @constructor
 */
export const TieflingView = function (container, image, depthMap, options) {

    let mouseXOffset = options.mouseXOffset || 0; // 0 (0vw) to 1 (100vw)
    let focus = options.focus || 0.3; // 1: strafe camera, good for sbs view. 0.3: rotate around some middle point
    let mouseSensitivity = options.mouseSensitivity || 10;

    // stretch in x or y direction, for example stretch it vertically by 2x for hsbs mode
    let scaleX = options.scaleX || 1;
    let scaleY = options.scaleY || 1;

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
            enlarge: { value: 1.06 },
            scaleX: { value: scaleX },
            scaleY: { value: scaleY }
        },
        vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position, 1.0);
                    }
                `,
        fragmentShader: `
                precision mediump float;
            
                uniform sampler2D colorTexture;
                uniform sampler2D depthTexture;
                uniform vec2 offset;
                uniform vec2 resolution;
                uniform vec2 textureResolution;
                uniform float focus;
                uniform float scale;
                uniform float enlarge;
                uniform float scaleX;
                uniform float scaleY;
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
                    
                    // Apply vertical stretch for SBS mode
                    scale.y *= scaleY;
                    
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
        renderer.setPixelRatio(window.devicePixelRatio);
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

    }

    function onMouseMove(event) {
        // Normalize coordinates to -1 to 1 range. -1 = container left, 1 = container right. clamp to -1 to 1
        const rect = container.getBoundingClientRect();
        mouseX = Math.min(1, Math.max(-1, (event.clientX - rect.left) / containerWidth * 2 - 1));
        mouseY = Math.min(1, Math.max(-1, (event.clientY - rect.top) / containerHeight * 2 - 1));

        mouseX += 2 * mouseXOffset; // Adjust offset to normalized range

        // Adjust sensitivity if needed
        targetX = mouseX * mouseSensitivity;
        targetY = mouseY * mouseSensitivity;
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

    const onResize = () => {
        containerWidth = container.offsetWidth;
        containerHeight = container.offsetHeight;
        renderer.setSize(containerWidth, containerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        material.uniforms.resolution.value.set(containerWidth, containerHeight);
        material.uniforms.scaleX.value = scaleX;
        material.uniforms.scaleY.value = scaleY;
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
        }
    };

}