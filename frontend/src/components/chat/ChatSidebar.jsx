import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Bot, User, Plus, Settings, HelpCircle, Paperclip, Image, File, X, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { useBackend } from '../../contexts/BackendContext';

const ChatSidebar = ({ onSubmit, onClose }) => {
  const [query, setQuery] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const { processQuery, isProcessing } = useBackend();
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'assistant',
      content: 'Hello! I\'m your AI Customer Support Assistant. How can I help you today?',
      timestamp: new Date().toISOString()
    }
  ]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 128; // 8rem = 128px
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [query]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (query.trim() || attachedFiles.length > 0) {
      const userQuery = query || 'File upload analysis';
      
      // Add user message
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: userQuery,
        files: attachedFiles,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Add AI thinking message
      const thinkingMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Analyzing your query and files, generating response...',
        timestamp: new Date().toISOString(),
        isThinking: true
      };
      
      setMessages(prev => [...prev, thinkingMessage]);
      
      try {
        // Process query through backend
        const response = await processQuery(userQuery);
        
        // Update thinking message with actual response
        setMessages(prev => prev.map(msg => 
          msg.id === thinkingMessage.id 
            ? {
                ...msg,
                content: response.answer,
                isThinking: false,
                response: response
              }
            : msg
        ));
        
        // Call the analysis modal with the response
        onSubmit(userQuery, response);
        
      } catch (error) {
        // Update thinking message with error
        setMessages(prev => prev.map(msg => 
          msg.id === thinkingMessage.id 
            ? {
                ...msg,
                content: `Sorry, I encountered an error: ${error.message}`,
                isThinking: false,
                isError: true
              }
            : msg
        ));
      }
      
      setQuery('');
      setAttachedFiles([]);
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = '44px';
      }
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'text/plain',
      'text/csv',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json',
      'text/markdown',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];

    const validFiles = files.filter(file => {
      if (file.size > maxFileSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      if (!allowedTypes.includes(file.type)) {
        alert(`File ${file.name} has an unsupported format.`);
        return false;
      }
      return true;
    });

    const newFiles = validFiles.map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      file: file,
      status: 'pending', // pending, uploading, success, error
      uploadProgress: 0
    }));
    
    setAttachedFiles(prev => [...prev, ...newFiles]);
    
    // Auto-upload files
    newFiles.forEach(fileObj => uploadFile(fileObj));
  };

  const uploadFile = async (fileObj) => {
    const formData = new FormData();
    formData.append('file', fileObj.file);
    formData.append('filename', fileObj.name);

    try {
      // Update status to uploading
      setAttachedFiles(prev => prev.map(f => 
        f.id === fileObj.id 
          ? { ...f, status: 'uploading', uploadProgress: 0 }
          : f
      ));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Update status to success
      setAttachedFiles(prev => prev.map(f => 
        f.id === fileObj.id 
          ? { 
              ...f, 
              status: 'success', 
              uploadProgress: 100,
              fileId: result.fileId,
              processedContent: result.content
            }
          : f
      ));

    } catch (error) {
      console.error('File upload error:', error);
      
      // Update status to error
      setAttachedFiles(prev => prev.map(f => 
        f.id === fileObj.id 
          ? { ...f, status: 'error', error: error.message }
          : f
      ));
    }
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

  const getFileStatusIcon = (status) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
      case 'success':
        return <div className="h-3 w-3 bg-green-500 rounded-full" />;
      case 'error':
        return <div className="h-3 w-3 bg-red-500 rounded-full" />;
      default:
        return <div className="h-3 w-3 bg-gray-400 rounded-full" />;
    }
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
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col fixed top-[84px] right-0 h-[calc(100vh-84px)] flex-shrink-0 z-30">
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
          {/* Mobile Close Button */}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="lg:hidden text-gray-600 hover:text-blue-600 transition-colors"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
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
                <div className="flex items-center space-x-2">
                  {getFileStatusIcon(file.status)}
                  <span className="text-gray-500">{formatFileSize(file.size)}</span>
                  {file.status === 'uploading' && (
                    <span className="text-blue-500 text-xs">
                      {file.uploadProgress}%
                    </span>
                  )}
                  {file.status === 'error' && (
                    <span className="text-red-500 text-xs" title={file.error}>
                      Error
                    </span>
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 w-full border-t border-gray-200">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-end w-full space-x-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                placeholder="Type your message here... (Press Shift+Enter for new line, Enter to send)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                className="w-full pr-12 py-3 px-3 border border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg resize-none overflow-hidden min-h-[44px] max-h-32 text-sm leading-5"
                style={{
                  minHeight: '44px',
                  maxHeight: '128px'
                }}
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
                  disabled={(!query.trim() && attachedFiles.length === 0) || isProcessing}
                  size="sm"
                  className="h-8 w-8 p-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                >
                  {isProcessing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
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
              {query.length > 0 && (
                <span className="text-gray-400">
                  {query.length} characters
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-gray-400">
                Shift+Enter for new line
              </span>
              <span className="text-gray-400">
                AI powered
              </span>
            </div>
          </div>
        </form>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.csv,.pdf,.doc,.docx,.xls,.xlsx,.json,.md,.jpg,.jpeg,.png,.gif"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ChatSidebar;