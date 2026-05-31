import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Bot, User, Plus, Settings, HelpCircle, Paperclip, Image, File, X, Loader2, BookOpen, ExternalLink, Sparkles, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TypingLoader from './TypingLoader';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { useBackend } from '../../contexts/BackendContext';

const ATLAN_DOCS_URL = 'https://developer.atlan.com/';

const suggestedPrompts = [
  'How do I create and test a custom package in Atlan?',
  'What are the best practices for searching assets in Atlan?',
  'How can I validate integration or UX flows using Atlan documentation?',
];

const ChatSidebar = ({ onSubmit, onClose, isOpen = true }) => {
  const [query, setQuery] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const { processQuery, isProcessing } = useBackend();
  const [showUploadDisclaimer, setShowUploadDisclaimer] = useState(false);
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

  // Theme: initialize from localStorage or system preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark') document.documentElement.classList.add('dark');
      else if (stored === 'light') document.documentElement.classList.remove('dark');
      else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const toggleDark = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch (e) {}
  };

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
      const hasScreenshots = attachedFiles.some(
        f => f.status === 'success' && f.type?.startsWith('image/')
      );
      const hasDocs = attachedFiles.some(
        f => f.status === 'success' && !f.type?.startsWith('image/')
      );
      
      let thinkingText = 'Analyzing your query, generating response...';
      if (hasScreenshots && hasDocs) {
        thinkingText = 'Processing image content via OCR and reading document text, generating response...';
      } else if (hasScreenshots) {
        thinkingText = 'Reading screenshot content via OCR, generating response...';
      } else if (hasDocs) {
        thinkingText = 'Reading uploaded document text, generating response...';
      }

      const thinkingMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: thinkingText,
        timestamp: new Date().toISOString(),
        isThinking: true
      };

      setMessages(prev => [...prev, thinkingMessage]);

      try {
        // Collect successfully uploaded fileIds (both images and text documents)
        const uploadedFileIds = attachedFiles
          .filter(f => f.status === 'success' && f.fileId)
          .map(f => f.fileId);

        let streamedAnswer = '';

        // Process query through backend (with uploaded fileIds)
        const response = await processQuery(userQuery, uploadedFileIds, {
          onChunk: (chunk) => {
            streamedAnswer += chunk;
            setMessages(prev => prev.map(msg =>
              msg.id === thinkingMessage.id
                ? {
                    ...msg,
                    content: streamedAnswer,
                    isThinking: true,
                  }
                : msg
            ));
          }
        });

        // Update thinking message with actual response
        setMessages(prev => prev.map(msg => 
          msg.id === thinkingMessage.id 
            ? {
                ...msg,
                content: response.answer || streamedAnswer,
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
      'text/markdown'
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

  const openAtlanDocs = () => {
    window.open(ATLAN_DOCS_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`glass-card w-[420px] flex flex-col fixed top-[96px] right-4 h-[calc(100vh-120px)] rounded-2xl flex-shrink-0 z-30 shadow-2xl shadow-black/80 transform transition-all duration-300 ease-out will-change-transform ${
      isOpen
        ? 'translate-x-0 opacity-100 pointer-events-auto'
        : 'translate-x-full opacity-0 pointer-events-none lg:translate-x-0 lg:opacity-100 lg:pointer-events-auto'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950/20 rounded-t-2xl">
        <div className="flex items-center space-x-2">
          <Bot className="h-5 w-5 text-indigo-400 animate-pulse" />
          <h2 className="font-semibold text-zinc-100 tracking-tight text-sm">Atlas Copilot</h2>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={startNewChat}
            className="h-8 w-8 p-0 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-900 transition-colors"
            title="New Chat"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-900 transition-colors"
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
              className="lg:hidden h-8 w-8 p-0 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-900 transition-colors"
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
          <Card className="overflow-hidden border border-zinc-900 bg-gradient-to-br from-zinc-950/85 via-zinc-950/50 to-zinc-950 text-zinc-100 shadow-lg">
            <CardHeader className="pb-3 px-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 animate-pulse">
                    <BookOpen className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <CardTitle className="text-xs text-zinc-200 font-bold">Explore Atlan Docs</CardTitle>
                    <CardDescription className="text-[10px] text-zinc-400">
                      Query indexed developer docs.
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-indigo-950/40 text-indigo-400 border border-indigo-900/40 hover:bg-indigo-950/60 text-[10px] px-2 py-0.5">Live RAG</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 px-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openAtlanDocs}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-900 bg-zinc-950/80 px-2.5 py-1.5 text-[10px] font-semibold text-zinc-300 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-800 hover:bg-zinc-900 hover:shadow-md"
                >
                  Open developer docs
                  <ExternalLink className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setQuery('Show me the best Atlan docs for testing search and integration flows.')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-indigo-950/40 bg-indigo-950/40 px-2.5 py-1.5 text-[10px] font-semibold text-indigo-300 transition-all duration-200 hover:-translate-y-0.5 hover:bg-indigo-900/30 hover:shadow-md"
                >
                  Try a prompt
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  <Sparkles className="h-3 w-3 text-indigo-400 animate-pulse" />
                  Suggested prompts
                </div>
                <div className="grid gap-1.5">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setQuery(prompt)}
                      className="rounded-xl border border-zinc-900 bg-zinc-950/40 px-3 py-2.5 text-left text-[11px] text-zinc-400 transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-800 hover:bg-zinc-900 hover:text-zinc-200 hover:shadow-md"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <AnimatePresence initial={false} mode="popLayout">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.18 }}
                className={`flex items-start space-x-2.5 ${
                  message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
              <Avatar className="h-7 w-7 border border-zinc-900 shadow-md flex-shrink-0">
                <AvatarFallback className={`text-[10px] ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-tr from-indigo-600 to-blue-600 text-white' 
                    : 'bg-zinc-900 text-zinc-400'
                }`}>
                  {message.type === 'user' ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </AvatarFallback>
              </Avatar>
              
              <div
                className={`flex-1 max-w-[20rem] ${
                  message.type === 'user' ? 'text-right' : 'text-left'
                }`}
              >
                <div
                  className={`rounded-2xl px-3.5 py-2.5 text-xs leading-5 shadow-sm transition-all duration-300 ${
                    message.type === 'user'
                      ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white text-left shadow-indigo-500/10'
                      : message.isThinking
                      ? 'bg-zinc-900/60 text-zinc-400 border border-zinc-900/80'
                      : 'bg-zinc-900/20 text-zinc-200 border border-zinc-900/85 shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    {message.isThinking ? (
                      <>
                        <TypingLoader />
                        <div className="text-[10px] text-zinc-500 ml-2 truncate max-w-xs">{message.content}</div>
                      </>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{message.content}</p>
                    )}
                  </div>
                  
                  {/* Display attached files */}
                  {message.files && message.files.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {message.files.map((file) => (
                        <div key={file.id} className="flex items-center space-x-2 rounded-lg bg-black/20 p-2 text-[10px] border border-zinc-900">
                          {getFileIcon(file.type)}
                          <span className="truncate flex-1">{file.name}</span>
                          <span className="text-[9px] opacity-75">{formatFileSize(file.size)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-[9px] text-zinc-600 mt-1 px-1">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* File Attachments Preview */}
      {attachedFiles.length > 0 && (
        <div className="px-4 py-2 border-t border-zinc-900 bg-zinc-950/40">
          <div className="text-[10px] font-semibold text-zinc-500 mb-1.5">Attached files:</div>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {attachedFiles.map((file) => (
              <div key={file.id} className="flex items-center space-x-2 text-[10px] bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-300">
                {getFileIcon(file.type)}
                <span className="truncate flex-1">{file.name}</span>
                <div className="flex items-center space-x-2">
                  {getFileStatusIcon(file.status)}
                  <span className="text-zinc-500">{formatFileSize(file.size)}</span>
                  {file.status === 'uploading' && (
                    <span className="text-indigo-400 text-xs">
                      {file.uploadProgress}%
                    </span>
                  )}
                  {file.status === 'error' && (
                    <span className="text-red-400 text-[9px]" title={file.error}>
                      Error
                    </span>
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-red-400 hover:text-red-500 p-1"
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
      <div className="p-4 w-full border-t border-zinc-900">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-end w-full space-x-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                placeholder="Ask Atlas something... (Shift+Enter for new line)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                className="w-full pr-16 py-3 pl-4 border border-zinc-900 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl resize-none overflow-hidden min-h-[46px] max-h-32 text-xs leading-5 transition-all duration-200 bg-zinc-950 text-zinc-100 placeholder-zinc-600 focus:outline-none"
                style={{
                  minHeight: '46px',
                  maxHeight: '128px'
                }}
              />
              <div className="absolute right-2.5 bottom-2 flex items-center space-x-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowUploadDisclaimer(true)}
                  className="h-8 w-8 p-0 text-zinc-500 hover:text-indigo-400 hover:bg-zinc-900 transition-colors"
                  title="Attach files"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button
                  type="submit"
                  disabled={(!query.trim() && attachedFiles.length === 0) || isProcessing}
                  size="sm"
                  className="h-8 w-8 rounded-lg bg-indigo-600 hover:bg-indigo-500 p-0 text-white transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
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
          
          <div className="flex items-center justify-between text-[10px] text-zinc-500">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                className="flex items-center space-x-1 hover:text-indigo-400 transition-colors"
              >
                <MessageSquare className="h-3 w-3" />
                <span>Examples</span>
              </button>
              <button
                type="button"
                className="flex items-center space-x-1 hover:text-indigo-400 transition-colors"
              >
                <HelpCircle className="h-3 w-3" />
                <span>Help</span>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <span>Enter to send</span>
              <span>•</span>
              <span>AI copilot active</span>
            </div>
          </div>
        </form>
        <Dialog open={showUploadDisclaimer} onOpenChange={setShowUploadDisclaimer}>
          <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-zinc-100">
            <DialogHeader>
              <DialogTitle className="text-zinc-100 font-bold flex items-center gap-2">
                ⚠️ File Ingestion Notice
              </DialogTitle>
              <DialogDescription className="text-zinc-400 text-sm mt-2 leading-relaxed">
                OCR-based image ingestion is temporarily disabled in deployment due to Python runtime environment compatibility constraints.
                <br /><br />
                PDFs, CSVs, support tickets, Markdown files, and web documentation continue to be fully indexed, processed, and searchable.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setShowUploadDisclaimer(false)}
                className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={() => {
                  setShowUploadDisclaimer(false);
                  fileInputRef.current?.click();
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Select Files
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.csv,.pdf,.doc,.docx,.xls,.xlsx,.json,.md"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ChatSidebar;