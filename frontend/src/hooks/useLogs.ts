import { useState, useEffect, useRef, useCallback } from 'react';

export type LogsMode = 'logs' | 'errors';

export function useLogs() {
  const [logs, setLogs] = useState<string[]>([]);
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState('');
  const [logsMode, setLogsMode] = useState<LogsMode>('logs');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');

    const ws = new WebSocket(`${protocol}//${host}:${port}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      ws.send(JSON.stringify({ type: logsMode }));
    };

    ws.onmessage = (event) => {
      setLogs((prev) => {
        const newLogs = [...prev, event.data];
        return newLogs.slice(-2000); // Keep last 2000 lines
      });
    };

    ws.onerror = () => {
      setError('WebSocket connection error');
      setIsConnected(false);
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, [logsMode]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const exportLogs = useCallback(() => {
    const filtered = filteredLogs.join('\n');
    const blob = new Blob([filtered], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wplacer-${logsMode}-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs, filterText, filterType, logsMode]);

  const filteredLogs = logs.filter((log) => {
    if (filterText && !log.toLowerCase().includes(filterText.toLowerCase())) {
      return false;
    }
    if (filterType && !log.toLowerCase().includes(filterType.toLowerCase())) {
      return false;
    }
    return true;
  });

  return {
    logs,
    filteredLogs,
    filterText,
    setFilterText,
    filterType,
    setFilterType,
    logsMode,
    setLogsMode,
    isConnected,
    error,
    clearLogs,
    exportLogs,
  };
}
