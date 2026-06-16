let posizione = null;

const CHAT_ID = "8796088277";

aggiornaStato();

async function aggiornaStato() {

  if ("getBattery" in navigator) {

    try {

      const batteria = await navigator.getBattery();

      document.getElementById("battery").innerHTML =
        `🔋 Batteria: ${Math.round(batteria.level * 100)}%`;

    } catch (e) {}

  }

  document.getElementById("online").innerHTML =
    navigator.onLine ?

    "📶 Connessione: Online"

    :

    "📶 Connessione: Offline";

  document.getElementById("device").innerHTML =
    "📱 Dispositivo: " + navigator.userAgent;

  if (navigator.geolocation) {

    navigator.geolocation.getCurrentPosition(

      function(pos){

        posizione = pos;

        document.getElementById("gps").innerHTML =

        `📍 GPS: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;

      }

    );

  }

}

async function inviaTelegram() {

  if(!posizione){

    alert("GPS non disponibile");

    return;

  }

  const lat = posizione.coords.latitude;

  const lon = posizione.coords.longitude;

  const maps =

  `https://maps.google.com/?q=${lat},${lon}`;

  const testo =

`🚨 SOS TELEFONO AI

📍 Posizione:
${lat}, ${lon}

🗺️ ${maps}

🔋 Batteria:
${document.getElementById("battery").innerText}

📶 ${document.getElementById("online").innerText}

🕒 ${new Date().toLocaleString()}
`;

  alert(testo);

}
