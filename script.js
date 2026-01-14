/*****************************************
 * BANQUE D'IMAGES (Icônes en Base64)    *
 *****************************************/
// Ces codes représentent des images png directement intégrées dans le script
const icons = {
  left: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABmJLR0QA/wD/AP+gvaeTAAAAZklEQVRoge3ZwQmDQBBE0bF/CpI20k4sRRsxG3sQwcBMFgwPf4F5uMc8mLWYM83+Qe316d6i55x011u35667F8AAAxwY4MAABwY4MMCBgQcDXL/zYICBBwMMMPBggAEGHgww8GCAgfsFfH8Pj/1fQlIAAAAASUVORK5CYII=",
  right: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABmJLR0QA/wD/AP+gvaeTAAAAZklEQVRoge3ZwQmDQBBE0bF/CpI20k4sRRsxG3sQwcBMFgwPf4F5uMc8mLWYM83+Qe316d6i55x011u35667F8AAAxwY4MAABwY4MMCBgQcDXL/zYICBBwMMMPBggAEGHgww8GCAgfsFfH8Pj/1fQlIAAAAASUVORK5CYII=", // (Note: Je vais utiliser une logique de rotation pour droite/gauche pour simplifier, voir code plus bas)
  straight: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABmJLR0QA/wD/AP+gvaeTAAAAfUlEQVRoge3ZwQmAMBAF0U0r0k4sRRsxG7sQwUAsJgsP/wXm4R7zYF5iLjT7B7XXp3uLnXPSXW/dnrnuXgADDTwYwEADDwYw0MCDAQw08GAAA41/Bjj1fTDAqceDAQYaeDDAwIMBBhh4MMDAgwEG/hfw/T089n8JSQEAAP//AwBDyw9Pq955WwAAAABJRU5ErkJggg==",
  flag: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABmJLR0QA/wD/AP+gvaeTAAAAdUlEQVRoge3ZsQmDQBCA4Y9/CpI20k4sRRsxG3sQwUAsJgsP38K8cI95MC8xF5r9g9rr073Fzjnp7qduz1x3L4CBBh4MYKCBBwMYaODBAAYaeDCAgQYeDGCg8c8Ap74PBjj1eDDAQAMPBhh4MMAAAw8GGHgwwMD9Ar6/h8f+LyEpAAAAAElFTkSuQmCC"
};

// Pour faire simple et joli, on va utiliser des flèches noires simples
// J'utilise ici des liens vers des icônes CDN fiables pour l'exemple, 
// ou on dessine des formes géométriques si on veut éviter les images externes.
// MAIS pour que ça marche hors ligne, voici la méthode "Formes Géométriques" intégrée à jsPDF
// C'est plus léger et plus net que des images floues.

/************************
 * INITIALISATION CARTE *
 ************************/
const map = L.map("map").setView([46.6, 2.5], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

let routeLayer = null;
let currentSteps = []; 

/************************
 * AUTOCOMPLETE *
 ************************/
function setupAutocomplete(inputId, resultsId) {
  const input = document.getElementById(inputId);
  const results = document.getElementById(resultsId);

  input.addEventListener("input", async () => {
    const query = input.value.trim();
    if (query.length < 3) {
      results.innerHTML = "";
      return;
    }

    try {
      const response = await fetch(`api.php?type=geocode&q=${query}`);
      const places = await response.json();
      results.innerHTML = "";

      places.forEach(place => {
        const li = document.createElement("li");
        li.textContent = place.display_name;
        li.addEventListener("click", () => {
          input.value = place.display_name;
          input.dataset.lat = place.lat;
          input.dataset.lon = place.lon;
          results.innerHTML = "";
        });
        results.appendChild(li);
      });
    } catch (error) {
      console.error("Erreur autocomplete:", error);
    }
  });

  document.addEventListener("click", (e) => {
    if (!input.contains(e.target)) results.innerHTML = "";
  });
}

setupAutocomplete("start", "start-results");
setupAutocomplete("end", "end-results");

/************************
 * CALCUL ITINÉRAIRE *
 ************************/
async function calculateRoute() {
  const start = document.getElementById("start");
  const end = document.getElementById("end");
  const btnPdf = document.getElementById("btn-pdf");

  btnPdf.style.display = "none";
  currentSteps = [];

  if (!start.dataset.lat || !end.dataset.lat) {
    alert("Veuillez sélectionner une ville dans la liste !");
    return;
  }

  const lat1 = parseFloat(start.dataset.lat);
  const lon1 = parseFloat(start.dataset.lon);
  const lat2 = parseFloat(end.dataset.lat);
  const lon2 = parseFloat(end.dataset.lon);

  try {
    const response = await fetch("api.php?type=route", {
      method: "POST",
      body: JSON.stringify({
        coordinates: [[lon1, lat1], [lon2, lat2]],
        language: "fr" // Important pour la détection des mots clés (droite/gauche)
      })
    });

    const text = await response.text();
    let geojson;
    try { geojson = JSON.parse(text); } catch (e) { return; }

    if (geojson.error) {
      alert("Erreur API : " + (geojson.error.message || "Inconnue"));
      return;
    }

    if (routeLayer) map.removeLayer(routeLayer);
    routeLayer = L.geoJSON(geojson, { style: { weight: 5 } }).addTo(map);
    map.fitBounds(routeLayer.getBounds());

    if (geojson.features && geojson.features[0].properties.segments) {
      currentSteps = geojson.features[0].properties.segments[0].steps;
      btnPdf.style.display = "block";
    }
    
  } catch (error) {
    console.error("Erreur:", error);
  }
}

/************************
 * GÉNÉRATION ROADBOOK  *
 ************************/
function downloadRoadbook() {
  if (currentSteps.length === 0) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // --- EN-TÊTE ---
  doc.setFillColor(52, 152, 219); // Bleu Header
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text("ROADBOOK", 20, 20);

  doc.setFontSize(12);
  doc.text(`Trajet généré le ${new Date().toLocaleDateString('fr-FR')}`, 20, 32);

  // --- LISTE DES ÉTAPES ---
  doc.setTextColor(0, 0, 0);
  
  let y = 55; // Position de départ verticale
  let stepNumber = 1;

  currentSteps.forEach(step => {
    // Gestion saut de page
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    // 1. ANALYSE DU TEXTE POUR CHOISIR L'ICÔNE
    // On convertit en minuscule pour chercher facilement
    const textLower = (step.instruction || "").toLowerCase();
    let direction = "straight"; // Par défaut tout droit

    if (textLower.includes("gauche")) direction = "left";
    else if (textLower.includes("droite")) direction = "right";
    else if (textLower.includes("rond-point")) direction = "roundabout";
    else if (textLower.includes("arrivée") || textLower.includes("destination")) direction = "finish";
    
    // 2. DESSIN DES ICÔNES (FORMES GÉOMÉTRIQUES)
    // C'est plus net que des images et ça ne demande pas de téléchargement externe
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(1);

    const iconX = 20; // Position X de l'icone
    const iconY = y - 5; // Position Y de l'icone
    
    // DESSIN DU CADRE DE L'ICÔNE (Carré gris clair)
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(iconX - 5, iconY - 5, 20, 20, 2, 2, 'F');

    // LOGIQUE DE DESSIN SELON LA DIRECTION
    doc.setLineWidth(2);
    
    if (direction === "left") {
        // Flèche Gauche
        doc.line(iconX + 10, iconY + 10, iconX + 10, iconY + 5); // Bas vers Haut
        doc.line(iconX + 10, iconY + 5, iconX, iconY + 5); // Droite vers Gauche
        doc.line(iconX, iconY + 5, iconX + 3, iconY + 2); // Pointe haut
        doc.line(iconX, iconY + 5, iconX + 3, iconY + 8); // Pointe bas
    } 
    else if (direction === "right") {
        // Flèche Droite
        doc.line(iconX, iconY + 10, iconX, iconY + 5); // Bas vers Haut
        doc.line(iconX, iconY + 5, iconX + 10, iconY + 5); // Gauche vers Droite
        doc.line(iconX + 10, iconY + 5, iconX + 7, iconY + 2); // Pointe haut
        doc.line(iconX + 10, iconY + 5, iconX + 7, iconY + 8); // Pointe bas
    } 
    else if (direction === "roundabout") {
        // Rond Point (Cercle + Flèches)
        doc.circle(iconX + 5, iconY + 5, 4);
        doc.text("RP", iconX + 2, iconY + 7); // Petit texte RP au milieu
    } 
    else if (direction === "finish") {
        // Drapeau Damier / Fin
        doc.rect(iconX, iconY, 10, 8); // Drapeau
        doc.line(iconX, iconY, iconX, iconY + 12); // Poteau
        doc.setFontSize(8);
        doc.text("FIN", iconX + 2, iconY + 5);
    } 
    else {
        // Tout droit (Flèche vers le haut)
        doc.line(iconX + 5, iconY + 10, iconX + 5, iconY); // Bas vers Haut
        doc.line(iconX + 5, iconY, iconX + 2, iconY + 3); // Pointe gauche
        doc.line(iconX + 5, iconY, iconX + 8, iconY + 3); // Pointe droite
    }

    // 3. TEXTE DE L'INSTRUCTION
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    
    const distance = step.distance < 1000 
      ? Math.round(step.distance) + " m" 
      : (step.distance / 1000).toFixed(1) + " km";

    // Colonne Distance
    doc.setTextColor(52, 152, 219);
    doc.text(distance, 50, y);

    // Colonne Instruction
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    
    // Nettoyage et découpage du texte long
    const instruction = step.instruction || "Continuer";
    const splitText = doc.splitTextToSize(instruction, 130);
    doc.text(splitText, 70, y);

    // Ligne de séparation grise
    const height = Math.max(20, splitText.length * 7); // Hauteur minimale de la ligne
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.5);
    doc.line(20, y + height - 5, 190, y + height - 5);

    // Incrémenter Y pour la prochaine étape
    y += height + 5;
    stepNumber++;
  });

  doc.save("mon-roadbook-visuel.pdf");
}