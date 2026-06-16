let posizione = null;
let batteriaValore = "Non disponibile";
let ultimoCommandId = localStorage.getItem("ultimoCommandId") || "0";

let furtoAttivo = localStorage.getItem("furtoAttivo") === "true";
let furtoInizio = Number(localStorage.getItem("furtoInizio") || "0");
let ultimoInvioFurto = Number(localStorage.getItem("ultimoInvioFurto") || "0");
let numeroInviiFurto = Number(localStorage.getItem("numeroInviiFurto") || "0");

let ultimaLatSegnalata = Number(localStorage.getItem("ultimaLatSegnalata") || "0");
let ultimaLonSegnalata = Number(localStorage.getItem("ultimaLonSegnalata") || "0");

const WORKER_URL = "https://sos-telefono-ai-worker.vocidicassino.workers.dev";

const CONTROLLO_COMANDI_MS = 60000;        // Controllo admin ogni 60 secondi
const INTERVALLO_FURTO_MS = 15 * 60 * 1000; // Invio massimo ogni 15 minuti
const DURATA_FURTO_MS = 2 * 60 * 60 * 1000; // Durata massima 2 ore
const MAX_INVII_FURTO = 8;                  // Massimo 8 messaggi automatici
const DISTANZA_ALLARME_METRI = 300;         // Movimento sospetto oltre 300 metri

avvioApp();

async function avvioApp() {
  await aggiornaStato();
  await controllaComandi();

  setInterval(aggiornaStato, 30000);
  setInterval(controllaComandi, CONTROLLO_COMANDI_MS);
}

async function aggiornaStato() {
  await aggiornaBatteria();
  aggiornaConnessione();
  aggiornaDispositivo();
  await aggiornaGPS();
}

async function aggiornaBatteria() {
  if ("getBattery" in navigator) {
    try {
      const batteria = await navigator.getBattery();
      batteriaValore = `${Math.round(batteria.level * 100)}%`;

      const el = document.getElementById("battery");
      if (el) {
        el.innerHTML = `🔋 Batteria: ${batteriaValore}`;
      }

    } catch (e) {
      batteriaValore = "Non disponibile";

      const el = document.getElementById("battery");
      if (el) {
        el.innerHTML = "🔋 Batteria: non disponibile";
      }
    }
  }
}

function aggiornaConnessione() {
  const el = document.getElementById("online");

  if (el) {
    el.innerHTML = navigator.onLine
      ? "📶 Connessione: Online"
      : "📶 Connessione: Offline";
  }
}

function aggiornaDispositivo() {
  const el = document.getElementById("device");

  if (el) {
    el.innerHTML = "📱 Dispositivo: " + navigator.userAgent;
  }
}

function aggiornaGPS() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      const el = document.getElementById("gps");
      if (el) {
        el.innerHTML = "📍 GPS: non supportato";
      }
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function(pos) {
        posizione = pos;

        const el = document.getElementById("gps");
        if (el) {
          el.innerHTML =
            `📍 GPS: ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
        }

        resolve(pos);
      },
      function() {
        const el = document.getElementById("gps");
        if (el) {
          el.innerHTML = "📍 GPS: permesso negato o non disponibile";
        }

        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
      }
    );
  });
}

function testSirena() {
  const audio = new Audio("https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg");
  audio.play();
}

function attivaEmergenza() {
  testSirena();
  inviaTelegram("🚨 Emergenza attivata manualmente dall'app");
}

async function inviaPosizione() {
  await inviaTelegram("📍 Posizione richiesta manualmente dall'app");
}

async function inviaTelegram(motivo) {
  await aggiornaStato();

  if (!posizione) {
    alert("GPS non disponibile. Controlla di aver dato il permesso alla posizione.");
    return false;
  }

  const lat = posizione.coords.latitude;
  const lon = posizione.coords.longitude;

  const dati = {
    reason: motivo,
    lat: lat,
    lon: lon,
    battery: batteriaValore,
    online: navigator.onLine ? "Online" : "Offline",
    device: navigator.userAgent
  };

  try {
    const risposta = await fetch(WORKER_URL + "/report", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(dati)
    });

    const testo = await risposta.text();

    if (risposta.ok) {
      console.log("✅ Messaggio Telegram inviato:", testo);
      return true;
    } else {
      console.error("❌ Errore Telegram:", testo);
      alert("❌ Errore invio Telegram: " + testo);
      return false;
    }

  } catch (errore) {
    console.error("❌ Errore Worker:", errore);
    alert("❌ Errore collegamento Worker: " + errore.message);
    return false;
  }
}

async function controllaComandi() {
  try {
    const risposta = await fetch(WORKER_URL + "/state");
    const dati = await risposta.json();

    if (!dati.ok || !dati.state) {
      console.warn("Stato non valido dal Worker");
      return;
    }

    const stato = dati.state;

    console.log("Stato ricevuto:", stato);

    if (stato.commandId !== ultimoCommandId) {
      ultimoCommandId = stato.commandId;
      localStorage.setItem("ultimoCommandId", ultimoCommandId);

      if (stato.command === "request_location") {
        await inviaTelegram("📍 Posizione richiesta dal pannello admin");
      }

      if (stato.command === "theft_on") {
        await avviaModalitaFurto();
      }

      if (stato.command === "theft_off") {
        disattivaModalitaFurtoLocale();
      }
    }

    if (stato.mode === "theft") {
      furtoAttivo = true;
      localStorage.setItem("furtoAttivo", "true");
      await controllaModalitaFurto();
    }

    if (stato.mode === "normal" && furtoAttivo) {
      disattivaModalitaFurtoLocale();
    }

  } catch (errore) {
    console.error("Errore controllo comandi:", errore);
  }
}

async function avviaModalitaFurto() {
  furtoAttivo = true;
  furtoInizio = Date.now();
  ultimoInvioFurto = 0;
  numeroInviiFurto = 0;

  localStorage.setItem("furtoAttivo", "true");
  localStorage.setItem("furtoInizio", String(furtoInizio));
  localStorage.setItem("ultimoInvioFurto", "0");
  localStorage.setItem("numeroInviiFurto", "0");

  await aggiornaStato();

  if (posizione) {
    ultimaLatSegnalata = posizione.coords.latitude;
    ultimaLonSegnalata = posizione.coords.longitude;

    localStorage.setItem("ultimaLatSegnalata", String(ultimaLatSegnalata));
    localStorage.setItem("ultimaLonSegnalata", String(ultimaLonSegnalata));
  }

  await inviaReportFurto("🚨 Modalità Furto attivata dal pannello admin");
}

function disattivaModalitaFurtoLocale() {
  furtoAttivo = false;
  furtoInizio = 0;
  ultimoInvioFurto = 0;
  numeroInviiFurto = 0;

  localStorage.setItem("furtoAttivo", "false");
  localStorage.setItem("furtoInizio", "0");
  localStorage.setItem("ultimoInvioFurto", "0");
  localStorage.setItem("numeroInviiFurto", "0");

  console.log("🛑 Modalità Furto disattivata localmente");
}

async function controllaModalitaFurto() {
  if (!furtoAttivo) {
    return;
  }

  const ora = Date.now();

  if (furtoInizio && ora - furtoInizio > DURATA_FURTO_MS) {
    await inviaTelegram("🛑 Modalità Furto terminata automaticamente dopo 2 ore");
    disattivaModalitaFurtoLocale();
    return;
  }

  if (numeroInviiFurto >= MAX_INVII_FURTO) {
    console.log("Limite massimo invii furto raggiunto");
    return;
  }

  await aggiornaStato();

  if (!posizione) {
    return;
  }

  const lat = posizione.coords.latitude;
  const lon = posizione.coords.longitude;

  let distanza = 0;

  if (ultimaLatSegnalata !== 0 && ultimaLonSegnalata !== 0) {
    distanza = calcolaDistanzaMetri(
      ultimaLatSegnalata,
      ultimaLonSegnalata,
      lat,
      lon
    );
  }

  const tempoPassato = ora - ultimoInvioFurto;

  if (distanza >= DISTANZA_ALLARME_METRI) {
    await inviaReportFurto(
      `🚨 Movimento sospetto rilevato: circa ${Math.round(distanza)} metri`
    );

    ultimaLatSegnalata = lat;
    ultimaLonSegnalata = lon;

    localStorage.setItem("ultimaLatSegnalata", String(ultimaLatSegnalata));
    localStorage.setItem("ultimaLonSegnalata", String(ultimaLonSegnalata));

    return;
  }

  if (tempoPassato >= INTERVALLO_FURTO_MS) {
    await inviaReportFurto("🔴 Modalità Furto attiva - aggiornamento programmato");
  }
}

async function inviaReportFurto(motivo) {
  const inviato = await inviaTelegram(
    `${motivo}\n\nAggiornamento furto: ${numeroInviiFurto + 1}/${MAX_INVII_FURTO}`
  );

  if (inviato) {
    ultimoInvioFurto = Date.now();
    numeroInviiFurto++;

    localStorage.setItem("ultimoInvioFurto", String(ultimoInvioFurto));
    localStorage.setItem("numeroInviiFurto", String(numeroInviiFurto));
  }
}

function calcolaDistanzaMetri(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const radLat1 = gradiARadianti(lat1);
  const radLat2 = gradiARadianti(lat2);
  const deltaLat = gradiARadianti(lat2 - lat1);
  const deltaLon = gradiARadianti(lon2 - lon1);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) *
    Math.cos(radLat2) *
    Math.sin(deltaLon / 2) *
    Math.sin(deltaLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function gradiARadianti(gradi) {
  return gradi * Math.PI / 180;
}
