import React, { useState, useEffect } from 'react';
import { Terminal, X, Minimize2, Maximize2, Activity, Trash2, Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { useBackend } from '../../contexts/BackendContext';

const BackendTerminal = ({ isVisible, onToggle }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [filter, setFilter] = useState('all'); // all, api, system, error, escalation
  const { logs, isProcessing, clearLogs, getLogsByType } = useBackend();

  const filteredLogs = filter === 'all' ? logs : getLogsByType(filter);

  const getLevelColor = (level) => {
    switch (level) {
      case 'ERROR': return 'text-red-400';
      case 'WARN': return 'text-yellow-400';
      case 'INFO': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'user': return 'text-blue-400';
      case 'system': return 'text-cyan-400';
      case 'api': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'escalation': return 'text-orange-400';
      case 'response': return 'text-purple-400';
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
            <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
            <span className="text-xs text-slate-400">{isProcessing ? 'Processing' : 'Live'}</span>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearLogs}
            className="h-6 w-6 p-0 text-slate-400 hover:text-red-400 hover:bg-slate-800"
            title="Clear logs"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
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
          {/* Filter Controls */}
          <div className="flex items-center space-x-2 mb-3">
            <Filter className="h-3 w-3 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-slate-800 text-slate-300 text-xs rounded px-2 py-1 border border-slate-700"
            >
              <option value="all">All</option>
              <option value="user">User</option>
              <option value="system">System</option>
              <option value="api">API</option>
              <option value="error">Errors</option>
              <option value="escalation">Escalations</option>
              <option value="response">Responses</option>
            </select>
            <span className="text-xs text-slate-500">
              {filteredLogs.length} logs
            </span>
          </div>

          <ScrollArea className="h-48">
            <div className="space-y-1 font-mono text-xs">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex items-start space-x-2">
                  <span className="text-slate-500 text-xs shrink-0">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span className={`text-xs shrink-0 font-semibold ${getLevelColor(log.level)}`}>
                    [{log.level}]
                  </span>
                  <span className={`text-xs shrink-0 font-semibold ${getTypeColor(log.type)}`}>
                    [{log.type?.toUpperCase()}]
                  </span>
                  <span className="text-slate-300 text-xs flex-1">
                    {log.message}
                  </span>
                </div>
              ))}
              {filteredLogs.length === 0 && (
                <div className="text-slate-500 text-xs text-center py-4">
                  No logs to display
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* Status bar */}
          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <Activity className="h-3 w-3" />
              <span>Backend: {isProcessing ? 'Processing' : 'Ready'}</span>
            </div>
            <span>{filteredLogs.length} logs</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackendTerminal;