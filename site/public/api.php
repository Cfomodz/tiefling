<?php

// get image, upload to catbox.moe, return url

$allowedOrigin = 'https://tiefling.loc'; // change to your domain

ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.cookie_samesite', 'Strict');

session_start();

// make (pretty) sure the request comes from the app
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

// if no session is active
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_lifetime', 60 * 60 * 24 * 7); // 1 week
}


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

    // image uploaded?
    if (!isset($_FILES['file'])) {
        echo json_encode(['state' => 'error', 'data' => 'No file uploaded']);
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

    // send to catbox 😺
    $file = $_FILES['file'];
    $extensions = [
        'image/jpeg' => '.jpg',
        'image/png' => '.png',
        'image/gif' => '.gif',
        'image/webp' => '.webp',
        'image/avif' => '.avif'
    ];
    $extension = $extensions[$file['type']] ?? '.jpg';
    $filename = 'image' . $extension;

    $ch = curl_init('https://catbox.moe/user/api.php');

    $postFields = [
        'reqtype' => 'fileupload',
        'userhash' => '',
        'fileToUpload' => new CURLFile(
            $file['tmp_name'],
            $file['type'],
            $filename
        )
    ];

    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FAILONERROR => true,
        CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
        CURLOPT_POSTFIELDS => $postFields,
        CURLOPT_HTTPHEADER => [
            'Content-Type: multipart/form-data',
            'User-Agent: Mozilla/5.0 (compatible; Tiefling/1.0)' // very necessary for catbox api
        ]
    ]);

    // debug stuff
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