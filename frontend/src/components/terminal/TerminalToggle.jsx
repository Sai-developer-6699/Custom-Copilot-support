import React from 'react';
import { Monitor, Code } from 'lucide-react';
import { Button } from '../ui/button';

const TerminalToggle = ({ isVisible, onToggle }) => {
  return (
    <Button
      onClick={onToggle}
      className={`fixed bottom-4 left-4 z-40 rounded-full w-12 h-12 p-0 shadow-lg transition-all duration-300 ${
        isVisible 
          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
          : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
      }`}
      title={isVisible ? 'Hide Backend Terminal' : 'Show Backend Terminal'}
    >
      {isVisible ? <Code className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
    </Button>
  );
};

export default TerminalToggle;