import React, { useState, useRef } from 'react';
import { Send, MessageSquare, Bot, User, Plus, Settings, HelpCircle, Paperclip, Image, File, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';

const ChatSidebar = ({ onSubmit }) => {
  const [query, setQuery] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: 'Hello! I\'m your AI Customer Support Assistant. How can I help you today?',
      timestamp: new Date().toISOString()
    }
  ]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() || attachedFiles.length > 0) {
      // Add user message
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: query || 'Sent files',
        files: attachedFiles,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Call the analysis modal
      onSubmit(query || 'File upload analysis');
      
      // Add AI thinking message
      const thinkingMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Analyzing your query and files, generating response...',
        timestamp: new Date().toISOString(),
        isThinking: true
      };
      
      setMessages(prev => [...prev, thinkingMessage]);
      setQuery('');
      setAttachedFiles([]);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = files.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file
    }));
    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const startNewChat = () => {
    setMessages([
      {
        id: 1,
        type: 'assistant',
        content: 'Hello! I\'m your AI Customer Support Assistant. How can I help you today?',
        timestamp: new Date().toISOString()
      }
    ]);
    setAttachedFiles([]);
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <Bot className="h-6 w-6 text-blue-600" />
          <h2 className="font-semibold text-gray-800">AI Assistant</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={startNewChat}
            className="text-gray-600 hover:text-blue-600 transition-colors"
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-600 hover:text-blue-600 transition-colors"
            title="Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Chat Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className={`text-xs ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {message.type === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              
              <div
                className={`flex-1 max-w-xs ${
                  message.type === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : message.isThinking
                      ? 'bg-gray-100 text-gray-600 animate-pulse'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.content}
                  
                  {/* Display attached files */}
                  {message.files && message.files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.files.map((file) => (
                        <div key={file.id} className="flex items-center space-x-2 text-xs bg-black bg-opacity-10 rounded p-1">
                          {getFileIcon(file.type)}
                          <span className="truncate flex-1">{file.name}</span>
                          <span className="text-xs opacity-75">{formatFileSize(file.size)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* File Attachments Preview */}
      {attachedFiles.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
          <div className="text-xs text-gray-600 mb-2">Attached files:</div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {attachedFiles.map((file) => (
              <div key={file.id} className="flex items-center space-x-2 text-xs bg-white rounded p-2">
                {getFileIcon(file.type)}
                <span className="truncate flex-1">{file.name}</span>
                <span className="text-gray-500">{formatFileSize(file.size)}</span>
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-end space-x-2">
            <div className="flex-1 relative">
              <Input
                type="text"
                placeholder="Ask me anything about customer support..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pr-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
              />
              <div className="absolute right-1 top-1 flex items-center space-x-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 w-8 p-0 text-gray-500 hover:text-blue-600"
                  title="Attach files"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  disabled={!query.trim() && attachedFiles.length === 0}
                  size="sm"
                  className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <button
                type="button"
                className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
              >
                <MessageSquare className="h-3 w-3" />
                <span>Examples</span>
              </button>
              <button
                type="button"
                className="flex items-center space-x-1 hover:text-blue-600 transition-colors"
              >
                <HelpCircle className="h-3 w-3" />
                <span>Help</span>
              </button>
            </div>
            <span className="text-gray-400">
              AI powered
            </span>
          </div>
        </form>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx,.txt,.csv"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ChatSidebar;