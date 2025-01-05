import * as THREE from '/js/threejs/three.module.js';

/**
 * Tiefling - create depthmaps from images, render them in canvas in a 3D view.
 * @param containerSelector
 * @param image - path to the image
 * @param depthMap - path to the depthmap
 * @param options
 * @returns {{destroy: *, onMouseMove: *}}
 * @constructor
 */
export const Tiefling = function (containerSelector, image, depthMap, options) {

    let container = document.querySelector(containerSelector);
    let mouseXOffset = options.mouseXOffset || 0; // 0 (0vw) to 1 (100vw)
    let focus = options.focus || 0.3; // 1: strafe camera. 0.3: rotate around some middle point

    // stretch in x or y direction, for example stretch it vertically by 2x for hsbs mode
    let scaleX = options.scaleX || 1;
    let scaleY = options.scaleY || 1;

    let scene, camera, renderer, quad;
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;
    const mouseSensitivity = 10;
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
        // Normalize coordinates to -1 to 1 range, regardless of screen size
        mouseX = (2 * (event.clientX / window.innerWidth) - 1);
        mouseY = (2 * (event.clientY / window.innerHeight) - 1);

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
        }
    };

}