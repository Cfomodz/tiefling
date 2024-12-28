import { Tiefling } from '/js/tiefling.js';

ort.env.wasm.wasmPaths = {
    'ort-wasm-simd-threaded.wasm': '/js/onnx/ort-wasm-simd-threaded.wasm',
    'ort-wasm-simd.wasm': '/js/onnx/ort-wasm-simd.wasm',
    'ort-wasm-threaded.wasm': '/js/onnx/ort-wasm-threaded.wasm',
    'ort-wasm.wasm': '/js/onnx/ort-wasm.wasm'
};

/**
 * Preprocess an ImageData object to a Float32Array
 * thx to akbartus https://github.com/akbartus/DepthAnything-on-Browser
 * @param input_imageData
 * @param width
 * @param height
 * @returns {Float32Array}
 */
const preprocess = (input_imageData, width, height) => {
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
const postprocess = (tensor) => {
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
 * @param inputSize 518: pretty fast, good quality. 1024: slower, better quality. higher or lower might throw error
 * @returns {Promise<HTMLCanvasElement>}
 */
const generateDepthMap = async function(imageFile, inputSize = 518) {
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
        resizeCanvas.width = inputSize;
        resizeCanvas.height = inputSize;

        // resize image maintaining aspect ratio
        const scale = Math.min(inputSize / image.width, inputSize / image.height);
        const scaledWidth = Math.round(image.width * scale);
        const scaledHeight = Math.round(image.height * scale);

        // center the image
        const offsetX = (inputSize - scaledWidth) / 2;
        const offsetY = (inputSize - scaledHeight) / 2;

        // draw black background
        resizeCtx.fillStyle = '#000000';
        resizeCtx.fillRect(0, 0, inputSize, inputSize);

        // draw resized image
        resizeCtx.drawImage(image, offsetX, offsetY, scaledWidth, scaledHeight);

        // get image data from resized image
        const imageData = resizeCtx.getImageData(0, 0, inputSize, inputSize);

        // load the ONNX model
        const session = await ort.InferenceSession.create("/models/depthanythingv2-vits-dynamic-quant.onnx");

        // preprocess the image
        const preprocessed = preprocess(imageData, inputSize, inputSize);

        const input = new ort.Tensor(new Float32Array(preprocessed), [1, 3, inputSize, inputSize]);

        // run inference
        const result = await session.run({ image: input });

        // postprocess the result
        const processedImageData = postprocess(result.depth);

        // create output canvas at original size
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = image.width;
        outputCanvas.height = image.height;
        const outputCtx = outputCanvas.getContext('2d');

        // create temporary canvas for the depth map
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = inputSize;
        tempCanvas.height = inputSize;
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

const els = {
    status: document.querySelector('.controls .status'),
    toggleMenu: document.querySelector('.controls .toggle-menu'),
    inputFile: document.querySelector('#file'),
    inputSbs: document.querySelector('#toggle-sbs'),
    downloadDepthMap: document.querySelector('#download-depthmap')
}

let inputImage = null;
let depthMapImage = null;

let tiefling1, tiefling2;

function load3DImage(image, depthMap) {

    // put depthmap url in download link
    els.downloadDepthMap.href = depthMap;

    console.log("loading image " + image + " and depthmap " + depthMap);

    if (tiefling1) {
        tiefling1.destroy();
    }

    tiefling1 = Tiefling('.container-1', image, depthMap, {
        mouseXOffset: 0
    });

    if (document.body.classList.contains('sbs')) {
        if (tiefling2) {
            tiefling2.destroy();
        }
        tiefling2 = Tiefling('.container-2', image, depthMap, {
            mouseXOffset: -0.4
        });
    }
}


let lastMouseMovementTime = Date.now();
function onMouseMove(event, manual = true) {
    if (manual) {
        lastMouseMovementTime = Date.now();
    }

    if (tiefling1) {
        tiefling1.onMouseMove(event);
    }
    if (tiefling2) {
        tiefling2.onMouseMove(event);
    }
}

// check if the mouse hasn't been moved in 3 seconds. if so, move the mouse in a circle around the center of the screen
function checkMouseMovement() {
    if (Date.now() - lastMouseMovementTime > 3000) {
        let centerX = window.innerWidth / 2;
        let centerY = window.innerHeight / 2;

        // sbs mode? center is center of left image
        if (document.body.classList.contains('sbs')) {
            centerX = window.innerWidth / 4;
        }

        const radiusX = window.innerWidth / 4;
        const radiusY = window.innerHeight / 4;
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


// accept dragged image on body
document.body.addEventListener('dragover', (event) => {
    event.preventDefault();

    // check size and type of the file. over 20MB: too big. only jpg and png
    if (event.dataTransfer.items.length === 1 && event.dataTransfer.items[0].kind === 'file' && event.dataTransfer.items[0].type.match('^image/')) {
        event.dataTransfer.dropEffect = 'copy';
    } else {
        event.dataTransfer.dropEffect = 'none';
    }

});

/**
 * Load an image file and generate a depth map
 * @param file {File} Image file
 * @returns {Promise<*>} URL of the depth map
 */
async function loadFile(file) {
    try {
        const depthCanvas = await generateDepthMap(file, 518);

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
        console.error("error in loadFile:", error);
        throw error;
    }
}

document.body.addEventListener('drop', async (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    try {
        els.status.innerText = "Loading...";
        const depthMapURL = await loadFile(file);
        await load3DImage(URL.createObjectURL(file), depthMapURL);
        els.status.innerText = "";
    } catch (error) {
        console.error("loading image error: ", error);
        els.status.innerText = "error loading image";
    }

});


if (window.location.hash === '#sbs') {
    document.body.classList.add('sbs');
    els.inputSbs.checked = true;
} else {
    // check sbs cookie
    if (document.cookie.includes('sbs=1')) {
        document.body.classList.add('sbs');
        els.inputSbs.checked = true;
        window.location.hash = 'sbs';
    }
}

// open/close menu
els.toggleMenu.addEventListener('click', (event) => {
    event.preventDefault();
    document.body.classList.toggle('menu-open');
});

// click anywhere outside menu: close it
document.addEventListener('click', (event) => {
    if (!event.target.closest('.controls')) {
        document.body.classList.remove('menu-open');
    }
});

// upload image from menu
els.inputFile.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    document.body.classList.remove('menu-open');
    await loadFile(file);
});

// reload page with or without #sbs parameter
els.inputSbs.addEventListener('change', (event) => {
    if (event.target.checked) {
        window.location.hash = 'sbs';
        document.cookie = 'sbs=1';
    } else {
        window.location.hash = '';
        document.cookie = 'sbs=0';
    }
    window.location.reload();
});

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

// ?input parameter? load image from URL
const urlParams = new URLSearchParams(window.location.search);

if (urlParams.get('input')) {
    inputImage = urlParams.get('input');
    if (urlParams.get('depthmap')) {
        depthMapImage = urlParams.get('depthmap');
        load3DImage(inputImage, depthMapImage);
    } else {
        els.status.innerText = "Loading...";

        // load image file from url
        const imageBlob = await fetch(inputImage).then(response => response.blob());

        // generate depth map
        const depthMapURL = await loadFile(imageBlob);

        load3DImage(URL.createObjectURL(imageBlob), depthMapURL);

        els.status.innerText = "";
    }

} else {
    load3DImage('img/examples/forest.webp', 'img/examples/forest-depthmap.png');
}