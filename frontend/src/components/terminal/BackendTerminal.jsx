import React, { useState, useEffect } from 'react';
import { Terminal, X, Minimize2, Maximize2, Activity } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';

const BackendTerminal = ({ isVisible, onToggle }) => {
  const [logs, setLogs] = useState([]);
  const [isMinimized, setIsMinimized] = useState(false);

  // Mock backend logs
  useEffect(() => {
    const mockLogs = [
      { id: 1, timestamp: new Date().toISOString(), level: 'INFO', message: 'FastAPI server started on port 8001' },
      { id: 2, timestamp: new Date().toISOString(), level: 'INFO', message: 'MongoDB connection established' },
      { id: 3, timestamp: new Date().toISOString(), level: 'INFO', message: 'AI analysis service initialized' },
    ];
    setLogs(mockLogs);

    // Simulate real-time logs
    const interval = setInterval(() => {
      const newLog = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        level: Math.random() > 0.8 ? 'WARN' : 'INFO',
        message: generateRandomLog()
      };
      setLogs(prev => [...prev.slice(-20), newLog]); // Keep last 20 logs
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const generateRandomLog = () => {
    const messages = [
      'Processing customer query analysis...',
      'NLP model inference completed in 150ms',
      'Sentiment analysis: Neutral (confidence: 87%)',
      'Priority classification: Medium',
      'Response generated successfully',
      'Database query executed',
      'Cache hit for ticket classification',
      'API response sent to client',
      'Memory usage: 45% of allocated',
      'Health check passed',
      'Background task completed',
      'Model pipeline executed'
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR': return 'text-red-400';
      case 'WARN': return 'text-yellow-400';
      case 'INFO': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (!isVisible) return null;

  return (
    <div className={`fixed bottom-4 right-4 bg-slate-950 text-green-400 rounded-lg shadow-xl border border-slate-800 z-50 transition-all duration-300 ${
      isMinimized ? 'w-80 h-12' : 'w-96 h-80'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Terminal className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium">Backend Terminal</span>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-slate-400">Live</span>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0 text-slate-400 hover:text-green-400 hover:bg-slate-800"
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-6 w-6 p-0 text-slate-400 hover:text-green-400 hover:bg-slate-800"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      {!isMinimized && (
        <div className="p-3 h-full">
          <ScrollArea className="h-64">
            <div className="space-y-1 font-mono text-xs">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start space-x-2">
                  <span className="text-slate-500 text-xs shrink-0">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span className={`text-xs shrink-0 font-semibold ${getLevelColor(log.level)}`}>
                    [{log.level}]
                  </span>
                  <span className="text-slate-300 text-xs flex-1">
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          {/* Status bar */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800 pt-2">
            <div className="flex items-center space-x-2">
              <Activity className="h-3 w-3" />
              <span>CPU: 12% | RAM: 256MB</span>
            </div>
            <span>{logs.length} events</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackendTerminal;