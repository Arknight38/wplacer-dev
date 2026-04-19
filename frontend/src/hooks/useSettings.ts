import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { Settings } from '../types';

type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // Form state
  const [formState, setFormState] = useState<Settings>({
    openBrowserOnStart: false,
    drawingDirection: 'ttb',
    drawingOrder: 'linear',
    pixelSkip: 1,
    accountCooldown: 20,
    purchaseCooldown: 5,
    accountCheckCooldown: 0,
    dropletReserve: 0,
    antiGriefStandby: 10,
    chargeThreshold: 50,
    proxyEnabled: false,
    proxyRotationMode: 'sequential',
    logProxyUsage: false,
  });

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get<Settings>('/settings');
      const data = response.data;
      setSettings(data);
      setFormState({
        openBrowserOnStart: data.openBrowserOnStart ?? false,
        drawingDirection: data.drawingDirection || 'ttb',
        drawingOrder: data.drawingOrder || 'linear',
        pixelSkip: data.pixelSkip ?? 1,
        accountCooldown: data.accountCooldown ?? 20,
        purchaseCooldown: data.purchaseCooldown ?? 5,
        accountCheckCooldown: data.accountCheckCooldown ?? 0,
        dropletReserve: data.dropletReserve ?? 0,
        antiGriefStandby: data.antiGriefStandby ?? 10,
        chargeThreshold: data.chargeThreshold ?? 50,
        proxyEnabled: data.proxyEnabled ?? false,
        proxyRotationMode: data.proxyRotationMode || 'sequential',
        logProxyUsage: data.logProxyUsage ?? false,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveSettings = useCallback(async () => {
    setSaveStatus('saving');
    try {
      await axios.post('/settings', formState);
      setSettings(formState);
      setSaveStatus('success');
      // Reset to idle after 3 seconds
      setTimeout(() => setSaveStatus('idle'), 3000);
      return true;
    } catch (err) {
      setSaveStatus('error');
      return false;
    }
  }, [formState]);

  const updateField = useCallback(<K extends keyof Settings>(field: K, value: Settings[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return {
    settings,
    formState,
    isLoading,
    error,
    saveStatus,
    fetchSettings,
    saveSettings,
    updateField,
  };
}
