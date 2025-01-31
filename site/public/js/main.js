import Alpine from '/js/alpine.esm.js';
window.Alpine = Alpine;

import { Tiefling } from '/js/tiefling/tiefling.js';

let tiefling = new Tiefling(document.querySelector(".tiefling"));

URLSearchParams.prototype.getRaw = function(param) {
    const regex = new RegExp(`[?&]${param}=([^&]+)`, 'i');
    const match = window.location.search.match(regex);
    return match ? match[1] : null;
};


Alpine.data('app', () => ({

    state: 'idle',
    menuVisible: false,
    displayMode: 'full',
    possibleDisplayModes: tiefling.getPossibleDisplayModes(), // full, hsbs, fsbs, anaglyph (red cyan)

    tieflingDragActive: false, // dragging image onto canvas?

    inputImageURL: '',
    inputImageFile: null,
    inputImageDragActive: false,
    inputImage: null,
    inputDataURL: '',

    depthmapImageURL: '', // loaded depthmap via url?
    depthmapImageFile: null, // or via file
    depthmapImageDragActive: false,
    depthmapImage: null,
    depthmapURL: '', // URL of depthmap (generated or loaded externally)
    depthmapDataURL: '', // URL to loaded image
    depthmapSize: tiefling.getDepthmapSize(),

    focus: tiefling.getFocus(),
    devicePixelRatio: tiefling.getDevicePixelRatio(),
    expandDepthmapRadius: tiefling.getExpandDepthmapRadius(),
    mouseXOffset: 0.04, // for hsbs, fsbs and anaglyph modes. 0 = no 3d, 0.04 is a good default
    mouseXOffsetMin: 0,
    mouseXOffsetMax: 0.4,

    idleMovementEnabled: true,

    // optionally rotate image by rotating device
    deviceOrientationPossible: window.DeviceOrientationEvent && 'ontouchstart' in window ? true : false,
    deviceOrientationEnabled: false,

    fullscreen: false, // fullscreen selected?

    bookmarkletCode: '',

    mousePosition: { x: 0, y: 0 },
    mouseDown: false,

    exampleImages: [
        {
            'key': 'jungle',
            'image': 'img/examples/jungle.jpg',
            'thumb': 'img/examples/jungle_thumb.jpg',
            'depthmap': 'img/examples/jungle_depthmap.png',
            'expandDepthmapRadius': 7
        },
        {
            'key': 'portrait',
            'image': 'img/examples/portrait.jpg',
            'thumb': 'img/examples/portrait_thumb.jpg',
            'depthmap': 'img/examples/portrait_depthmap.png',
            'expandDepthmapRadius': 5
        },
        {
            'key': 'robot',
            'image': 'img/examples/robot.jpg',
            'thumb': 'img/examples/robot_thumb.jpg',
            'depthmap': 'img/examples/robot_depthmap.png',
            'expandDepthmapRadius': 8
        },
        {
            'key': 'hoernchen',
            'image': 'img/examples/hoernchen.jpg',
            'thumb': 'img/examples/hoernchen_thumb.jpg',
            'depthmap': 'img/examples/hoernchen_depthmap.png',
            'expandDepthmapRadius': 6
        },
        {
            'key': 'wombat-on-a-lawnmower',
            'image': 'img/examples/wombat-on-a-lawnmower.jpg',
            'thumb': 'img/examples/wombat-on-a-lawnmower_thumb.jpg',
            'depthmap': 'img/examples/wombat-on-a-lawnmower_depthmap.png',
            'expandDepthmapRadius': 7
        },
        {
            'key': 'hotdog',
            'image': 'img/examples/hotdog.jpg',
            'thumb': 'img/examples/hotdog_thumb.jpg',
            'depthmap': 'img/examples/hotdog_depthmap.png',
            'expandDepthmapRadius': 5
        },
        {
            'key': 'bernd',
            'image': 'img/examples/bernd.jpg',
            'thumb': 'img/examples/bernd_thumb.jpg',
            'depthmap': 'img/examples/bernd_depthmap.png',
            'expandDepthmapRadius': 4
        },
        {
            'key': 'cafetattoos',
            'image': 'img/examples/cafetattoos.jpg',
            'thumb': 'img/examples/cafetattoos_thumb.jpg',
            'depthmap': 'img/examples/cafetattoos_depthmap.png',
            'expandDepthmapRadius': 7
        },
        {
            'key': 'beachpeace',
            'image': 'img/examples/beachpeace.jpg',
            'thumb': 'img/examples/beachpeace_thumb.jpg',
            'depthmap': 'img/examples/beachpeace_depthmap.png',
            'expandDepthmapRadius': 7
        },
        {
            'key': 'boardbear',
            'image': 'img/examples/boardbear.jpg',
            'thumb': 'img/examples/boardbear_thumb.jpg',
            'depthmap': 'img/examples/boardbear_depthmap.png',
            'expandDepthmapRadius': 10
        },
        {
            'key': 'crystalmountain',
            'image': 'img/examples/crystalmountain.jpg',
            'thumb': 'img/examples/crystalmountain_thumb.jpg',
            'depthmap': 'img/examples/crystalmountain_depthmap.png',
            'expandDepthmapRadius': 8
        },
        {
            'key': 'desertrace',
            'image': 'img/examples/desertrace.jpg',
            'thumb': 'img/examples/desertrace_thumb.jpg',
            'depthmap': 'img/examples/desertrace_depthmap.png',
            'expandDepthmapRadius': 7
        },
        {
            'key': 'spikypizza',
            'image': 'img/examples/spikypizza.jpg',
            'thumb': 'img/examples/spikypizza_thumb.jpg',
            'depthmap': 'img/examples/spikypizza_depthmap.png',
            'expandDepthmapRadius': 5
        },
        {
            'key': 'bestpizza',
            'image': 'img/examples/bestpizza.jpg',
            'thumb': 'img/examples/bestpizza_thumb.jpg',
            'depthmap': 'img/examples/bestpizza_depthmap.png',
            'expandDepthmapRadius': 12
        },
        {
            'key': 'mrfrog',
            'image': 'img/examples/mrfrog.jpg',
            'thumb': 'img/examples/mrfrog_thumb.jpg',
            'depthmap': 'img/examples/mrfrog_depthmap.png',
            'expandDepthmapRadius': 7
        },
        {
            'key': 'seagulls',
            'image': 'img/examples/seagulls.jpg',
            'thumb': 'img/examples/seagulls_thumb.jpg',
            'depthmap': 'img/examples/seagulls_depthmap.png',
            'expandDepthmapRadius': 7
        },
        {
            'key': 'snack',
            'image': 'img/examples/snack.jpg',
            'thumb': 'img/examples/snack_thumb.jpg',
            'depthmap': 'img/examples/snack_depthmap.png',
            'expandDepthmapRadius': 7
        },
        {
            'key': 'rat',
            'image': 'img/examples/rat.jpg',
            'thumb': 'img/examples/rat_thumb.jpg',
            'depthmap': 'img/examples/rat_depthmap.png',
            'expandDepthmapRadius': 7
        }
    ],


    async init() {

        this.initOrientationSensors();
        this.loadSettings();
        this.handleURLParams();

        this.generateBookmarkletLink();

        await this.initialLoadImage();

        this.updateDepthmapSize();
        this.updateFocus();
        this.updateDevicePixelRatio();
        this.updateExpandDepthmapRadius();
        this.updateIdleMovementEnabled();


        // click anywhere outside .menu or.toggle-menu: set menuVisible to false
        document.addEventListener('click', (event) => {
            if (this.menuVisible && !event.target.closest('.menu') && !event.target.closest('.toggle-menu')) {
                this.menuVisible = false;
            }
        });

        // hide interface and mouse cursor when pressing alt+h
        document.addEventListener('keydown', (event) => {
            if (event.altKey && event.code === 'KeyH') {
                document.body.classList.toggle('hide-interface');
            }
        });

    },

    initOrientationSensors() {
        if (this.deviceOrientationPossible) {
            window.addEventListener('deviceorientation', (event) => {

                if (!this.deviceOrientationEnabled || event.alpha === null || event.beta === null) return;

                let x = event.alpha; // In degree in the range [0,360)
                let y = event.beta; // In degree in the range [-180,180)

                // Because we don't want to have the device upside down
                // We constrain the x value to the range [0, 180]
                if (x > 180) { x = 360 - x; }

                // normalize to -1 to 1
                x = x / 180;
                y = y / 180;

            });
        }
    },

    // load various settings from local storage
    loadSettings() {
        this.depthmapSize = parseInt(localStorage.getItem('depthmapSize')) || this.depthmapSize;
        this.focus = localStorage.getItem('focus') ? parseFloat(localStorage.getItem('focus')) : this.focus;
        this.devicePixelRatio = parseFloat(localStorage.getItem('devicePixelRatio')) || this.devicePixelRatio;
        this.expandDepthmapRadius = localStorage.getItem('expandDepthmapRadius') ? parseInt(localStorage.getItem('expandDepthmapRadius')) : this.expandDepthmapRadius;
        this.idleMovementEnabled = localStorage.getItem('idleMovementEnabled') !== 'false';
        this.deviceOrientationEnabled = localStorage.getItem('deviceOrientationEnabled') === 'true' ?? true;
        this.displayMode = localStorage.getItem('displayMode') || this.displayMode;
        this.mouseXOffset = localStorage.getItem('mouseXOffset') ? parseFloat(localStorage.getItem('mouseXOffset')) : this.mouseXOffset;
    },


    async generateBookmarkletLink() {
        try {
            const response = await fetch('/js/bookmarklet.js');
            this.bookmarkletCode = this.createBookmarklet(await response.text());
        } catch (error) {
            console.error('Error generating bookmarklet:', error);
        }
    },

    // add or change parameter in url
    setURLParam(name, value, replaceState = true) {
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.set(name, value);

        if (replaceState) {
            history.replaceState({}, '', window.location.pathname + '?' + urlParams.toString());
        } else {
            history.pushState({}, '', window.location.pathname + '?' + urlParams.toString());
        }
    },

    // create bookmarklet for current domain
    createBookmarklet(sourceCode) {
        // replace ---URL_PREFIX--- with current protocol, domain, port and path
        const urlPrefix = window.location.origin;

        let code = sourceCode
            .replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '') // Remove comments
            .replace(/\s+/g, ' ')                    // Collapse whitespace
            .replace('---URL_PREFIX---', urlPrefix)
            .trim();

        return 'javascript:' + encodeURIComponent(code);
    },


    // handle optional URL parameters
    // ?input={url} - load image from URL, generate depthmap if none given
    // ?depthmap={url} - load depthmap from URL
    // ?displayMode={full, hsbs, fsbs, anaglyph} - set display mode
    handleURLParams() {
        // ?input parameter? load image from URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('input')) {
            this.inputImageURL = urlParams.get('input');
        }

        if (urlParams.get('depthmap')) {
            this.depthmapImageURL = urlParams.get('depthmap');
        }

        if (urlParams.get('expandDepthmapRadius')) {
            this.expandDepthmapRadius = parseInt(urlParams.get('expandDepthmapRadius'));
        }

        if (urlParams.get('depthmapSize')) {
            this.depthmapSize = parseInt(urlParams.get('depthmapSize'));
        }

        // set display mode from url param
        if (urlParams.get("displayMode")) {
            this.displayMode = this.possibleDisplayModes.contains(urlParams.get("displayMode")) ? urlParams.get("displayMode") : 'full';
        }

    },


    async initialLoadImage() {

        tiefling.setDisplayMode(this.displayMode);

        if (this.inputImageURL) {

            this.loadImage();

        } else {

            // select a random example image
            const exampleImage = this.exampleImages[Math.floor(Math.random() * this.exampleImages.length)];

            this.depthmapImageURL = this.depthmapURL = this.depthmapDataURL = exampleImage.depthmap;
            this.inputImageURL = exampleImage.image;
            this.loadImage();
        }

    },

    async loadImage() {
        this.state = "loading";
        try {

            let inputURL = '';
            this.depthmapURL = '';

            // get input image from url or uploaded or dragged file
            if (this.inputImageFile) {
                this.inputImage = this.inputImageFile;
            } else if (this.inputImageURL) {
                this.inputImage = await fetch(this.inputImageURL).then(response => response.blob());
            }

            // get depthmap image from url, uploaded or dragged file
            if (this.depthmapImageFile) {
                this.depthmapImage = this.depthmapImageFile;
                this.depthmapURL = URL.createObjectURL(this.depthmapImage);

            } else if (this.depthmapImageURL) {
                this.depthmapURL = this.depthmapImageURL;
                this.depthmapImage = await fetch(this.depthmapImageURL).then(response => response.blob());
            }

            if (this.depthmapImage) {
                tiefling.load3DImage(URL.createObjectURL(this.inputImage), URL.createObjectURL(this.depthmapImage));

            } else {
                this.depthmapURL = await tiefling.getDepthmapURL(this.inputImage);

                this.depthmapImage = await fetch(this.depthmapURL).then(response => response.blob());

                tiefling.load3DImage(URL.createObjectURL(this.inputImage), this.depthmapURL);

            }

            this.depthmapDataURL = URL.createObjectURL(this.depthmapImage);
            this.inputDataURL = URL.createObjectURL(this.inputImage);


            // add ?input (and optional &depthmap) parameter to history, if the urls start with https
            if (this.inputImageURL.match(/^https?:\/\//)) {
                this.setURLParam('input', this.inputImageURL);
                if (this.depthmapURL.match(/^https?:\/\//)) {
                    this.setURLParam('depthmap', this.depthmapURL);
                }
            }

            this.state = "idle";
        } catch (error) {
            console.error("Error while loading image:", error);
            this.state = "error";
        }


    },



    // Handle file drop on whole canvas
    async tieflingImageFileDrop(event) {

        const file = event.dataTransfer.files[0];
        if (!file || !file.type.match('^image/')) {
            console.error("Dropped file is not an image");
            this.tieflingDragActive = false;
            return;
        }

        try {
            this.tieflingDragActive = false;

            this.inputImageFile = file;

            this.depthmapImageURL = '';
            this.depthmapDataURL = '';
            this.depthmapImage = null;

            this.loadImage();

        } catch (error) {
            console.error("Error while handling dropped file:", error);
            this.state = "error";
        }
    },


    // on input image file upload
    async handleInputImageFile(event) {
        const file = event.target.files[0];
        if (!file) return;

        this.inputImageURL = "";
        this.inputImageFile = file;

        this.inputDataURL = URL.createObjectURL(file);

        // clear depthmap
        this.depthmapImage = this.depthmapImageFile = this.depthmapImageURL = this.depthmapURL = this.depthmapDataURL = null;

    },

    // Handle file drop on input field
    async handleInputImageFileDrop(event) {

        const file = event.dataTransfer.files[0];
        if (!file || !file.type.match('^image/')) {
            console.error("Dropped file is not an image");
            this.inputImageDragActive = false;
            return;
        }

        try {
            // Reset drag state and update status
            this.inputImageDragActive = false;
            this.inputImageURL = "";

            this.inputImageFile = file;
            this.inputDataURL = URL.createObjectURL(file);

            // clear depthmap
            this.depthmapImage = this.depthmapImageFile = this.depthmapImageURL = this.depthmapURL = this.depthmapDataURL = null;

        } catch (error) {
            console.error("Error while handling dropped file:", error);
            this.state = "error";
        }
    },

    // on depthmap file upload
    async handleDepthmapImageFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        this.depthmapImageURL = "";
        this.depthmapImageFile = file;

        this.depthmapDataURL = URL.createObjectURL(file);
    },


    // Handle file drop on depthmap field
    async handleDepthmapImageFileDrop(event) {

        const file = event.dataTransfer.files[0];
        if (!file || !file.type.match('^image/')) {
            console.error("Dropped file is not an image");
            this.depthmapImageDragActive = false;
            return;
        }

        try {
            // Reset drag state and update status
            this.depthmapImageDragActive = false;
            this.depthmapImageURL = "";
            this.depthmapImageFile = file;
            this.depthmapDataURL = URL.createObjectURL(file);

        } catch (error) {
            console.error("Error while handling dropped file:", error);
            this.state = "error";
        }
    },

    removeDepthmap() {
        this.depthmapImage = this.depthmapImageFile = this.depthmapImageURL = this.depthmapURL = this.depthmapDataURL = null;
    },

    removeInputImage() {
        this.inputImage = this.inputImageFile = this.inputImageURL = this.inputDataURL = null;
    },


    updateIdleMovementEnabled() {
        tiefling.setIdleMovementEnabled(this.idleMovementEnabled);
        localStorage.setItem('idleMovementEnabled', this.idleMovementEnabled);
    },

    updateDeviceOrientationEnabled() {
        localStorage.setItem('deviceOrientationEnabled', this.deviceOrientationEnabled);
    },

    updateFocus() {
        tiefling.setFocus(this.focus);
        localStorage.setItem('focus', this.focus);
    },

    updateDepthmapSize() {
        tiefling.setDepthmapSize(parseInt(this.depthmapSize));
        localStorage.setItem('depthmapSize', this.depthmapSize);
    },

    updateDevicePixelRatio() {
        tiefling.setDevicePixelRatio(parseFloat(this.devicePixelRatio));
        localStorage.setItem('devicePixelRatio', this.devicePixelRatio);
    },

    updateExpandDepthmapRadius() {
        tiefling.setExpandDepthmapRadius(parseInt(this.expandDepthmapRadius));
        localStorage.setItem('expandDepthmapRadius', this.expandDepthmapRadius);
    },

    updateDisplayMode() {
        localStorage.setItem('displayMode', this.displayMode);

        // re-init 3d view
        tiefling.setDisplayMode(this.displayMode);
        tiefling.load3DImage(this.inputDataURL, this.depthmapDataURL);
    },

    updateMouseXOffset() {
        localStorage.setItem('mouseXOffset', this.mouseXOffset);
        tiefling.setMouseXOffset(this.mouseXOffset);
    },


    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.body.requestFullscreen();
        }

        // if user presses esc or something and exits fullscreen:
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) {
                this.fullscreen = false;
            }
        });

    },

    adjustMouseXOffset() {
        // in vr mode, only consider the left side
        if (this.displayMode === 'hsbs' || this.displayMode === 'fsbs') {
            const xPos = this.mousePosition.x/2;
            const xPosMax = window.innerWidth / 2;

            // adjust 3d strength / mouseXOffset
            this.mouseXOffset = (xPos / xPosMax) * this.mouseXOffsetMax;

            tiefling.setMouseXOffset(this.mouseXOffset);

        }
    },

    onMouseDown(event) {
        this.mouseDown = true;
        this.mousePosition.x = event.clientX;
        this.mousePosition.y = event.clientY;
        this.adjustMouseXOffset()
    },
    onMouseUp(event) {
        this.mouseDown = false;
    },

    onMouseMove(event) {
        this.mousePosition.x = event.clientX;
        this.mousePosition.y = event.clientY;

        if (this.mouseDown) {
            this.adjustMouseXOffset();
        }
    }




}));

Alpine.start()


