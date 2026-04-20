import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from './ui';

export default function LogsViewer() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<string[]>([]);
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState('');
  const [logsMode, setLogsMode] = useState<'logs' | 'errors'>('logs');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let isActive = true;

    const connect = () => {
      if (!isActive) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = '3000';

      // Close any existing connection first
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      const ws = new WebSocket(`${protocol}//${host}:${port}`);
      wsRef.current = ws;
      setConnectionError(null);

      ws.onopen = () => {
        if (!isActive) {
          ws.close();
          return;
        }
        setIsConnected(true);
        ws.send(JSON.stringify({ type: logsMode }));
      };

      ws.onmessage = (event) => {
        if (!isActive) return;
        setLogs((prev) => {
          const newLogs = [...prev, event.data];
          return newLogs.slice(-2000);
        });
      };

      ws.onerror = () => {
        if (!isActive) return;
        setIsConnected(false);
        setConnectionError('Connection error');
      };

      ws.onclose = () => {
        if (!isActive) return;
        setIsConnected(false);
        // Auto-reconnect after 2 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isActive) connect();
        }, 2000);
      };
    };

    connect();

    return () => {
      isActive = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [logsMode]);

  const handleClearLogs = () => {
    setLogs([]);
  };

  const handleExportLogs = () => {
    const filteredLogs = logs.filter((log) => {
      if (filterText && !log.toLowerCase().includes(filterText.toLowerCase())) {
        return false;
      }
      if (filterType && !log.toLowerCase().includes(filterType.toLowerCase())) {
        return false;
      }
      return true;
    });

    const blob = new Blob([filteredLogs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wplacer-${logsMode}-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLogs = logs.filter((log) => {
    if (filterText && !log.toLowerCase().includes(filterText.toLowerCase())) {
      return false;
    }
    if (filterType && !log.toLowerCase().includes(filterType.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div id="logsViewer" className="space-y-6">
      <h2 className="text-3xl font-bold">Realtime Logs Viewer</h2>
      
      <Card>
        <CardHeader>
          <CardTitle>Logs Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <input
              className="flex-1 min-w-64 p-2 border rounded-md"
              type="text"
              placeholder="Search text..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            <select
              className="p-2 border rounded-md"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="success">Success</option>
              <option value="info">Info</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-4 py-2 rounded-md ${logsMode === 'logs' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'} hover:opacity-80`}
              onClick={() => setLogsMode('logs')}
            >
              Logs
            </button>
            <button
              className={`px-4 py-2 rounded-md ${logsMode === 'errors' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'} hover:opacity-80`}
              onClick={() => setLogsMode('errors')}
            >
              Errors
            </button>
            <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80" onClick={handleClearLogs}>
              Clear
            </button>
            <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80" onClick={handleExportLogs}>
              Export
            </button>
            <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80" onClick={() => navigate('/')}>
              Return
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`inline-block w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : connectionError ? 'bg-red-500' : 'bg-yellow-500'
              }`}
            />
            <span className="text-muted-foreground">
              {isConnected ? 'Connected' : connectionError ? connectionError : 'Connecting...'}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="logs-container bg-muted p-4 rounded-lg min-h-96 max-h-96 overflow-y-auto font-mono text-sm">
            {filteredLogs.length === 0 ? (
              <span className="text-muted-foreground">
                {isConnected ? 'Waiting for logs...' : connectionError ? 'Connection error - retrying...' : 'Connecting to server...'}
              </span>
            ) : (
              filteredLogs.map((log, index) => (
                <div key={index} className="py-1 border-b border-border last:border-0">{log}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
