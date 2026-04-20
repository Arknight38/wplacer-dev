// --- Periodic Token Generation ---

let periodicTimer = null;
let periodicBusy = false;

const periodicTick = async () => {
    if (!location.hostname.endsWith('wplace.live')) return;
    if (document.visibilityState !== 'visible') return;
    if (periodicBusy) return;
    periodicBusy = true;
    try {
        window.requestInPageTokenWithTimeout(15000, true);
    } finally {
        setTimeout(() => { periodicBusy = false; }, 2000);
    }
};

const startPeriodicGeneration = () => {
    if (periodicTimer) return;
    periodicTimer = setInterval(periodicTick, 20000); // PERIODIC_GEN_MS = 20000
    console.log('wplacer: Periodic token generation started');
};

const stopPeriodicGeneration = () => {
    if (!periodicTimer) return;
    try { clearInterval(periodicTimer); } catch {}
    periodicTimer = null;
};

function setupPeriodicGeneration() {
    if (location.hostname.endsWith('wplace.live')) {
        window.addEventListener('beforeunload', () => stopPeriodicGeneration(), { once: true });
    }
}
