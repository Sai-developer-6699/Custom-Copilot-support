import React, { useState, useEffect, useMemo } from 'react';
import { X, Brain, MessageSquare, Loader2, ExternalLink, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TypingLoader from './TypingLoader';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/shadcn/Dialog';
import { Badge } from '../ui/shadcn/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/shadcn/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/shadcn/Tabs';
import { apiService } from '../../services/api';
import SourceCard from './SourceCard';

const ATLAN_DOCS_URL = 'https://developer.atlan.com/';

const ResponseModal = ({ isOpen, onClose, query, response }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && query) {
      if (response) {
        // Use the response passed from parent
        setAnalysis(response);
        setLoading(false);
        setError(null);
      } else {
        // Fallback to API call if no response provided
        fetchAnalysis();
      }
    }
  }, [isOpen, query, response]);

  // Normalize different backend shapes into a single sources array
  const getNormalizedSources = (analysisObj) => {
    if (!analysisObj) return [];

    // If backend already returns normalized objects with `chunk` field, use as-is
    if (Array.isArray(analysisObj.sources) && analysisObj.sources.length > 0 && typeof analysisObj.sources[0] === 'object' && (analysisObj.sources[0].chunk || analysisObj.sources[0].doc_title)) {
      return analysisObj.sources;
    }

    // If older `sourceMetadata` exists (detailed docs), map to normalized shape
    if (Array.isArray(analysisObj.sourceMetadata) && analysisObj.sourceMetadata.length > 0) {
      return analysisObj.sourceMetadata.map((doc) => ({
        chunk: doc.text || doc.chunk || doc.content || '',
        score: doc.relevance_score ?? doc.rerank_score ?? doc.semantic_score ?? doc.score ?? null,
        doc_title: doc.title || doc.parent_source || doc.source || 'Source',
        doc_url: doc.url || (typeof doc.source === 'string' && doc.source.startsWith('http') ? doc.source : null),
      }));
    }

    // Legacy: `sources` may be an array of strings — map to minimal shape
    if (Array.isArray(analysisObj.sources) && analysisObj.sources.length > 0 && typeof analysisObj.sources[0] === 'string') {
      return analysisObj.sources.map((s) => ({ chunk: s, score: null, doc_title: s, doc_url: null }));
    }

    return [];
  };

  // Memoize normalized sources to avoid re-computing during render
  const normalizedSources = useMemo(() => getNormalizedSources(analysis), [analysis]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getRAGResponse(query);
      setAnalysis(response);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching analysis:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[82vh] overflow-y-auto border-gray-200 bg-gradient-to-b from-white to-slate-50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
              <Brain className="h-5 w-5" />
            </div>
            AI Analysis & Response
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-6">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                <Sparkles className="h-4 w-4" />
                Query under review
              </div>
              <button
                onClick={() => window.open(ATLAN_DOCS_URL, '_blank', 'noopener,noreferrer')}
                className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-50 hover:shadow-sm"
              >
                Open Atlan docs
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-blue-800">
              {query}
            </p>
          </div>

          {loading && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-10">
              <div className="mr-3"><TypingLoader /></div>
              <span className="ml-3 text-sm text-slate-600">Analyzing your request...</span>
            </motion.div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-medium text-red-800">Error:</h3>
              <p className="text-sm leading-6 text-red-700">{error}</p>
              <button
                onClick={fetchAnalysis}
                className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          {analysis && !loading && (
            <Tabs defaultValue="response" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1">
                <TabsTrigger value="analysis" className="flex items-center data-[state=active]:bg-white">
                  <Brain className="mr-2 h-4 w-4" />
                  Internal Analysis
                </TabsTrigger>
                <TabsTrigger value="response" className="flex items-center data-[state=active]:bg-white">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Final Response
                </TabsTrigger>
              </TabsList>
            
              <TabsContent value="analysis" className="mt-4">
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900">Classification Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">Topic</label>
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                          {analysis.analysis?.topic || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">Sentiment</label>
                        <Badge className={`${
                          analysis.analysis?.sentiment === 'Positive' ? 'bg-green-100 text-green-800' :
                          analysis.analysis?.sentiment === 'Negative' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {analysis.analysis?.sentiment || 'Neutral'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-600">Priority</label>
                        <Badge className={`${
                          analysis.analysis?.priority === 'P0' ? 'bg-red-100 text-red-800' :
                          analysis.analysis?.priority === 'P1' ? 'bg-orange-100 text-orange-800' :
                          analysis.analysis?.priority === 'P2' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {analysis.analysis?.priority || 'P3'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="border-t border-slate-200 pt-4">
                      <label className="mb-2 block text-sm font-medium text-slate-600">Analysis Details</label>
                      <div className="space-y-2 rounded-xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-700">
                          <strong>Query:</strong> {analysis.query}
                        </p>
                        {analysis.analysis && (
                          <div className="text-sm text-slate-700">
                            <strong>Classification:</strong> {JSON.stringify(analysis.analysis, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            
              <TabsContent value="response" className="mt-4">
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-900">AI Generated Response</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 shadow-sm">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-slate-800">
                        {analysis.answer}
                      </p>
                    </motion.div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">Structured response</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">Indexed Atlan docs</span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-600">Stream-ready UI</span>
                    </div>
                    
                    {normalizedSources.length > 0 && (
                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <h4 className="mb-3 text-sm font-medium text-slate-700">Sources</h4>
                        <div className="grid gap-3 md:grid-cols-2">
                          {normalizedSources.map((sourceObj, index) => (
                            <SourceCard key={index} source={sourceObj} />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResponseModal;