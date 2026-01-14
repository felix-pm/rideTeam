/************************
 * INITIALISATION CARTE *
 ************************/
const map = L.map("map").setView([46.6, 2.5], 6);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

let routeLayer = null;

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
 * CALCUL ITINÉRAIRE (Sécurisé) *
 ************************/
async function calculateRoute() {
  const start = document.getElementById("start");
  const end = document.getElementById("end");

  if (!start.dataset.lat || !end.dataset.lat) {
    alert("Veuillez sélectionner une ville dans la liste déroulante !");
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
        coordinates: [[lon1, lat1], [lon2, lat2]]
      })
    });

    const text = await response.text();
    let geojson;
    
    try {
      geojson = JSON.parse(text);
    } catch (e) {
      alert("Erreur: Le serveur n'a pas renvoyé du JSON (voir console).");
      console.error("Réponse brute:", text);
      return;
    }

    // SI L'API RENVOIE UNE ERREUR, ON L'AFFICHE ICI
    if (geojson.error) {
      console.error("Erreur API ORS:", geojson);
      // Affiche le message précis de l'API dans une alerte
      alert("Erreur API : " + (geojson.error.message || JSON.stringify(geojson.error)));
      return;
    }

    if (routeLayer) map.removeLayer(routeLayer);

    routeLayer = L.geoJSON(geojson, {
      style: { weight: 5 }
    }).addTo(map);

    map.fitBounds(routeLayer.getBounds());
    
  } catch (error) {
    console.error("Erreur script:", error);
    alert("Erreur inattendue : " + error.message);
  }
}