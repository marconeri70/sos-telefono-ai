let posizione = null;

aggiornaStato();

async function aggiornaStato() {

  // Batteria

  if ("getBattery" in navigator) {

    try {

      const batteria = await navigator.getBattery();

      document.getElementById("battery").innerHTML =
        `🔋 Batteria: ${Math.round(batteria.level * 100)}%`;

    } catch (e) {

      document.getElementById("battery").innerHTML =
        "🔋 Batteria: non disponibile";

    }

  }

  // Connessione

  document.getElementById("online").innerHTML =
    navigator.onLine ?

    "📶 Connessione: Online" :

    "📶 Connessione: Offline";

  // Dispositivo

  document.getElementById("device").innerHTML =
    "📱 Dispositivo: " + navigator.userAgent;

  // GPS

  if (navigator.geolocation) {

    navigator.geolocation.getCurrentPosition(

      function(pos){

        posizione = pos;

        document.getElementById("gps").innerHTML =

        `📍 GPS: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;

      },

      function(){

        document.getElementById("gps").innerHTML =

        "📍 GPS: permesso negato";

      }

    );

  }

}

function attivaEmergenza(){

  alert("🚨 Modalità emergenza attivata");

}

function testSirena(){

  const audio = new Audio(

  "https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg"

  );

  audio.play();

}

function inviaPosizione(){

  if(!posizione){

    alert("GPS non disponibile");

    return;

  }

  const lat = posizione.coords.latitude;

  const lon = posizione.coords.longitude;

  const maps =

  `https://maps.google.com/?q=${lat},${lon}`;

  alert(

`📍 Posizione rilevata

${maps}`

  );

}

setInterval(

aggiornaStato,

30000

);
