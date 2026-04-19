import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

interface ServerStatus {
  status: ConnectionStatus;
  lastChecked: Date | null;
  error: string | null;
}

export function useServerStatus(pollInterval = 5000) {
  const [serverStatus, setServerStatus] = useState<ServerStatus>({
    status: 'checking',
    lastChecked: null,
    error: null,
  });
  const mounted = useRef(true);

  const checkConnection = useCallback(async () => {
    if (!mounted.current) return;

    setServerStatus((prev) => ({ ...prev, status: 'checking' }));

    try {
      await axios.get('/settings', { timeout: 3000 });
      if (mounted.current) {
        setServerStatus({
          status: 'connected',
          lastChecked: new Date(),
          error: null,
        });
      }
    } catch (err) {
      if (mounted.current) {
        setServerStatus({
          status: 'disconnected',
          lastChecked: new Date(),
          error: err instanceof Error ? err.message : 'Server unreachable',
        });
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    checkConnection();

    const interval = setInterval(checkConnection, pollInterval);

    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [checkConnection, pollInterval]);

  return {
    ...serverStatus,
    isConnected: serverStatus.status === 'connected',
    isChecking: serverStatus.status === 'checking',
    checkConnection,
  };
}
