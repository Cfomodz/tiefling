<?php

// get image, upload to catbox.moe, return url

$allowedOrigin = 'https://tiefling.loc'; // change to your domain

// make pretty sure the request comes from the app
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.cookie_samesite', 'Strict');

session_start();

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== $allowedOrigin) {
    http_response_code(403);
    ?>
    <html lang="en">
    <head>
        <style>
            @keyframes rotate {
                from { transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
                to { transform: rotateX(360deg) rotateY(360deg) rotateZ(360deg); }
            }
            body {
                display: grid;
                place-items: center;
                height: 100vh;
                margin: 0;
                background: #000;
                color: #111;
                font-family: sans-serif;
            }
            body span {
                font-size: 3rem;
                animation: rotate 10s linear infinite;
                perspective: 10000px;
            }
        </style>
    </head>
    <body>
        <span>ಠ_ಠ</span>
    </body>
    </html>
<?php
    die();
}

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: $allowedOrigin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");


$actions = ['getShareNonce', 'uploadImage'];
if (isset($_POST['action']) && in_array($_POST['action'], $actions)) {
    switch ($_POST['action']) {
        case 'getShareNonce':
            getShareNonce();
            break;
        case 'uploadImage':
            uploadImage();
            break;
    }
}

// generate nonce, set session
function getShareNonce() {
    $nonce = bin2hex(random_bytes(32));
    $_SESSION['shareNonce'] = $nonce;
    echo json_encode(['state' => 'success', 'data' => $nonce]);
}

function uploadImage() {
    // check nonce
    if (!isset($_SESSION['shareNonce']) || $_SESSION['shareNonce'] !== $_POST['shareNonce']) {
        echo json_encode(['state' => 'error', 'data' => 'Invalid nonce']);
        return;
    }

    // max. 200 mb
    if ($_FILES['file']['size'] > 200 * 1024 * 1024) {
        echo json_encode(['state' => 'error', 'data' => 'File too large']);
        return;
    }

    // only images
    $allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
    if (!in_array($_FILES['file']['type'], $allowedTypes)) {
        echo json_encode(['state' => 'error', 'data' => 'Invalid file type']);
        return;
    }

    // upload image
    if (!isset($_FILES['file'])) {
        echo json_encode(['state' => 'error', 'data' => 'No file uploaded']);
        return;
    }

    // send to catbox 😺
    $file = $_FILES['file'];
    $data = ['reqtype' => 'fileupload', 'fileToUpload' => new CURLFile($file['tmp_name'], $file['type'], $file['name'])];

    $ch = curl_init('https://catbox.moe/user/api.php');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTP_VERSION, CURL_HTTP_VERSION_1_1);

    // ssl options
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
    curl_setopt($ch, CURLOPT_SSLVERSION, CURL_SSLVERSION_TLSv1_2);

    // timeout and retry
    curl_setopt($ch, CURLOPT_TIMEOUT, 120); // Increase timeout to 2 minutes
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 30);
    curl_setopt($ch, CURLOPT_TCP_KEEPALIVE, 1);
    curl_setopt($ch, CURLOPT_TCP_KEEPIDLE, 120);
    curl_setopt($ch, CURLOPT_TCP_KEEPINTVL, 60);

    // buffer size
    curl_setopt($ch, CURLOPT_BUFFERSIZE, 128000); // Increase buffer size
    curl_setopt($ch, CURLOPT_UPLOAD_BUFFERSIZE, 128000);

    // try to prevent compression
    curl_setopt($ch, CURLOPT_ENCODING, '');

    // headers
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Expect:',
        'Content-Type: multipart/form-data',
        'Connection: keep-alive'
    ]);

    // for debugging
    curl_setopt($ch, CURLOPT_VERBOSE, true);
    $verbose = fopen('php://temp', 'w+');
    curl_setopt($ch, CURLOPT_STDERR, $verbose);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($response === false) {
        rewind($verbose);
        $verboseLog = stream_get_contents($verbose);

        echo json_encode([
            'state' => 'error',
            'data' => sprintf(
                "Error uploading file to catbox.\nHTTP Code: %s\ncURL Error: %s (%d)\nVerbose log: %s",
                $httpCode,
                curl_error($ch),
                curl_errno($ch),
                $verboseLog
            )
        ]);
        return;
    }

    echo json_encode(['state' => 'success', 'data' => $response]);
}