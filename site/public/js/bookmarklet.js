// Source for bookmarklet. Create actual bookmarklet with createBookmarklet in main.js or some online bookmarklet creator.
// Detect images from various websites, send them to https://tiefling.gerlach.dev?input={imageURL}
// Only works for sites that don't have a restrictive CORS policy
// ---URL_PREFIX--- is replaced with the actual URL
(function() {

    const urlPath = window.location.pathname;

    function getImageUrl() {
        let imageURL = '';

        // are we on https://www.imdb.com/title/{something}/mediaviewer?
        if (urlPath.startsWith('/title/') && urlPath.includes('/mediaviewer')) {
            imageURL = document.querySelector('[data-testid="media-viewer"] img').src;
            return imageURL;
        }

        // Default: return first big image
        const images = Array.from(document.getElementsByTagName('img'));
        const largeImage = images.find(img => img.naturalWidth > 300);
        imageURL = largeImage ? largeImage.src : '';
        return imageURL;
    }

    // urlPrefix: "https://example.com"
    function processImage() {
        const imageURL = getImageUrl();

        if (imageURL) {
            window.open(`---URL_PREFIX---?input=${imageURL}`, '_blank');
        } else {
            console.log('No suitable image found on this page.');
        }
    }

    // Execute the main function
    processImage();
})();