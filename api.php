<?php
// api.php - Version corrigée et robuste (cURL partout)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

// Sécurité : Vérifier si 'type' existe
if (!isset($_GET["type"])) {
    echo json_encode(["error" => "Paramètre 'type' manquant"]);
    exit;
}

$type = $_GET["type"];

// --- PARTIE 1 : RECHERCHE DE VILLE (Geocoding) ---
if ($type === "geocode") {
    if (!isset($_GET["q"])) { echo "[]"; exit; }
    
    $q = urlencode($_GET["q"]);
    // On utilise Nominatim (OpenStreetMap)
    $url = "https://nominatim.openstreetmap.org/search?format=json&q=$q&limit=5&countrycodes=fr";

    // Initialisation cURL (plus fiable que file_get_contents)
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_USERAGENT => "MyRoutingApp/1.0", // Obligatoire pour Nominatim
        CURLOPT_SSL_VERIFYPEER => false // Optionnel : évite les erreurs SSL en local
    ]);

    $result = curl_exec($ch);
    
    if(curl_errno($ch)){
        echo json_encode(["error" => curl_error($ch)]);
    } else {
        echo $result;
    }
    curl_close($ch);
}

// --- PARTIE 2 : CALCUL D'ITINÉRAIRE (Route) ---
if ($type === "route") {
    $data = file_get_contents("php://input");

    $ch = curl_init("https://api.openrouteservice.org/v2/directions/driving-car/geojson");
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => [
            "Authorization: eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImMzYTk3Yjg2OWFlNTQ3MzNiODJlNDkzOTIyMDQ3MDY3IiwiaCI6Im11cm11cjY0In0=", // <--- METTEZ VOTRE CLÉ ICI
            "Content-Type: application/json"
        ],
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $data,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => false // Aide en local
    ]);

    $result = curl_exec($ch);
    
    // Si l'API renvoie une erreur vide ou fausse, on l'affiche
    if ($result === false) {
        echo json_encode(["error" => "Erreur cURL : " . curl_error($ch)]);
    } else {
        echo $result;
    }
    curl_close($ch);
}
?>