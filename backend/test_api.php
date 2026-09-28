<?php
// Test API endpoint for employees
$ch = curl_init('http://127.0.0.1:8000/api/master/employees');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ', // no auth for testing, or use sanctum cookie
    'Accept: application/json'
]);
$response = curl_exec($ch);
curl_close($ch);
echo "Status: " . curl_getinfo($ch, CURLINFO_HTTP_CODE) . PHP_EOL;
echo "Response: " . substr($response, 0, 500) . PHP_EOL;