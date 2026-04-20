// --- Core Functions ---
import { autoReloadEnabled, autoClearEnabled, setAutoReloadEnabled, setAutoClearEnabled } from './constants.js';

export const getSettings = async () => {
    const result = await chrome.storage.local.get(['wplacerPort', 'autoReload', 'autoClear']);
    setAutoReloadEnabled(result.autoReload !== undefined ? result.autoReload : true);
    setAutoClearEnabled(result.autoClear !== undefined ? result.autoClear : true);
    
    console.log("wplacer: Settings loaded - Auto-reload:", autoReloadEnabled, "Auto-clear:", autoClearEnabled);
    
    return {
        port: result.wplacerPort || 3000,
        host: '127.0.0.1',
        autoReload: autoReloadEnabled,
        autoClear: autoClearEnabled
    };
};

export const getServerUrl = async (path = '') => {
    const { host, port } = await getSettings();
    return `http://${host}:${port}${path}`;
};
