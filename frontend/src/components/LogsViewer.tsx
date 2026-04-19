import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from './ui';

export default function LogsViewer() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<string[]>([]);
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState('');
  const [logsMode, setLogsMode] = useState<'logs' | 'errors'>('logs');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = window.location.port || (window.location.protocol === 'https:' ? '443' : '80');
    
    const ws = new WebSocket(`${protocol}//${host}:${port}`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: logsMode }));
    };

    ws.onmessage = (event) => {
      setLogs((prev) => {
        const newLogs = [...prev, event.data];
        return newLogs.slice(-2000); // Keep last 2000 lines
      });
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
    };

    return () => {
      ws.close();
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="logs-container bg-muted p-4 rounded-lg min-h-96 max-h-96 overflow-y-auto font-mono text-sm">
            {filteredLogs.length === 0 ? (
              <span className="text-muted-foreground">Loading logs...</span>
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
