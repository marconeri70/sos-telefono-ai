let posizione = null;
let batteriaValore = "Non disponibile";

const WORKER_URL = "https://sos-telefono-ai-worker.vocidicassino.workers.dev";

aggiornaStato();

async function aggiornaStato() {
  if ("getBattery" in navigator) {
    try {
      const batteria = await navigator.getBattery();
      batteriaValore = `${Math.round(batteria.level * 100)}%`;
      document.getElementById("battery").innerHTML = `🔋 Batteria: ${batteriaValore}`;
    } catch (e) {
      document.getElementById("battery").innerHTML = "🔋 Batteria: non disponibile";
    }
  }

  document.getElementById("online").innerHTML =
    navigator.onLine ? "📶 Connessione: Online" : "📶 Connessione: Offline";

  document.getElementById("device").innerHTML =
    "📱 Dispositivo: " + navigator.userAgent;

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      function(pos) {
        posizione = pos;
        document.getElementById("gps").innerHTML =
          `📍 GPS: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
      },
      function() {
        document.getElementById("gps").innerHTML = "📍 GPS: permesso negato";
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }
}

function testSirena() {
  const audio = new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");
  audio.play();
}

function attivaEmergenza() {
  testSirena();
  inviaTelegram();
}

async function inviaPosizione() {
  await inviaTelegram();
}

async function inviaTelegram() {
  await aggiornaStato();

  if (!posizione) {
    alert("GPS non disponibile. Controlla di aver dato il permesso alla posizione.");
    return;
  }

  const lat = posizione.coords.latitude;
  const lon = posizione.coords.longitude;

  const dati = {
    lat: lat,
    lon: lon,
    battery: batteriaValore,
    online: navigator.onLine ? "Online" : "Offline",
    device: navigator.userAgent
  };

  try {
    const risposta = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dati)
    });

    const testo = await risposta.text();

    if (risposta.ok) {
      alert("✅ Messaggio inviato su Telegram");
    } else {
      alert("❌ Errore invio Telegram: " + testo);
    }

  } catch (errore) {
    alert("❌ Errore di connessione al Worker: " + errore.message);
  }
}

setInterval(aggiornaStato, 30000);
