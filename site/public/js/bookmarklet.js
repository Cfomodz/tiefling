// Source for bookmarklet. Create actual bookmarklet with createBookmarklet in main.js or some online bookmarklet creator.
// Detect images from various websites, send them to https://tiefling.gerlach.dev?input={imageURL}
// Only works for sites that don't have a restrictive CORS policy
// ---URL_PREFIX--- is replaced with the actual URL in createBookmarlet in main.js
(function() {

    const domain = window.location.hostname;
    const urlPath = window.location.pathname;

    function getImageUrl() {
        let imageURL = '';

        // are we on https://www.imdb.com/title/{something}/mediaviewer?
        if (domain === 'www.imdb.com' &&
            urlPath.startsWith('/title/') &&
            urlPath.includes('/mediaviewer')) {
            return document.querySelector('div[data-testid="media-viewer"] div[style*="calc(50% + 0px)"] img').src;
        }

        // are we on https://civitai.com/images/{number}?
        if (domain === 'civitai.com' && urlPath.startsWith('/images/')) {
            return document.querySelector('.mantine-Carousel-slide img').src;
        }


        // Default: return first big image
        const images = Array.from(document.getElementsByTagName('img'));
        const largeImage = images.find(img => img.naturalWidth > 300);
        imageURL = largeImage ? largeImage.src : '';
        return imageURL;
    }

    // urlPrefix: "https://example.com"
    function processImage() {
        const imageURL = encodeURIComponent(getImageUrl());

        if (imageURL) {
            window.open(`---URL_PREFIX---?input=${imageURL}`, '_blank');
        } else {
            console.log('No suitable image found on this page.');
        }
    }

    // Execute the main function
    processImage();
})();