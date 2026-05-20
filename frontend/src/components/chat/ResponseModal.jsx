import React, { useState, useEffect, useMemo } from 'react';
import { X, Brain, MessageSquare, Loader2, ExternalLink, Sparkles } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
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

  // Respect user's reduced-motion preference
  const reduceMotion = useReducedMotion();
  const motionInProps = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };
  const motionAnswerProps = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.18 } };

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
      <DialogContent className="max-w-4xl max-h-[82vh] overflow-y-auto border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 shadow-2xl shadow-black/40 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-zinc-50">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
              <Brain className="h-5 w-5" />
            </div>
            AI Analysis & Response
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-6">
          <div className="rounded-2xl border border-blue-900/40 bg-blue-950/30 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-300">
                <Sparkles className="h-4 w-4 animate-pulse" />
                Query under review
              </div>
              <button
                onClick={() => window.open(ATLAN_DOCS_URL, '_blank', 'noopener,noreferrer')}
                className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-all duration-200 hover:-translate-y-0.5 hover:bg-zinc-800 hover:shadow-md"
              >
                Open Atlan docs
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-blue-200">
              {query}
            </p>
          </div>

          {loading && (
            <motion.div {...motionInProps} className="flex items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/60 py-10">
              <div className="mr-3"><TypingLoader /></div>
              <span className="ml-3 text-sm text-zinc-400">Analyzing your request...</span>
            </motion.div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-800/40 bg-rose-950/30 p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-medium text-rose-300">Error:</h3>
              <p className="text-sm leading-6 text-rose-200">{error}</p>
              <button
                onClick={fetchAnalysis}
                className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-sm text-white transition-colors hover:bg-rose-700"
              >
                Retry
              </button>
            </div>
          )}

          {analysis && !loading && (
            <Tabs defaultValue="response" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-zinc-900/80 border border-zinc-800 p-1 rounded-xl">
                <TabsTrigger value="analysis" className="flex items-center data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-50 text-zinc-400 rounded-lg transition-all">
                  <Brain className="mr-2 h-4 w-4" />
                  Internal Analysis
                </TabsTrigger>
                <TabsTrigger value="response" className="flex items-center data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-50 text-zinc-400 rounded-lg transition-all">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Final Response
                </TabsTrigger>
              </TabsList>
            
              <TabsContent value="analysis" className="mt-4">
                <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg text-zinc-100">Classification Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Topic</label>
                        <Badge className="bg-blue-950/40 text-blue-300 border border-blue-800/40">
                          {analysis.analysis?.topic || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Sentiment</label>
                        <Badge className={`${
                          analysis.analysis?.sentiment === 'Positive' ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40' :
                          analysis.analysis?.sentiment === 'Negative' ? 'bg-rose-950/50 text-rose-300 border border-rose-800/40' :
                          'bg-zinc-800 text-zinc-300 border border-zinc-700'
                        }`}>
                          {analysis.analysis?.sentiment || 'Neutral'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-400">Priority</label>
                        <Badge className={`${
                          analysis.analysis?.priority === 'P0' ? 'bg-rose-950/50 text-rose-300 border border-rose-800/40 font-bold' :
                          analysis.analysis?.priority === 'P1' ? 'bg-amber-950/50 text-amber-300 border border-amber-800/40' :
                          analysis.analysis?.priority === 'P2' ? 'bg-yellow-950/50 text-yellow-300 border border-yellow-800/40' :
                          'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40'
                        }`}>
                          {analysis.analysis?.priority || 'P3'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="border-t border-zinc-800 pt-4">
                      <label className="mb-2 block text-sm font-medium text-zinc-400">Analysis Details</label>
                      <div className="space-y-2 rounded-xl bg-zinc-950/60 border border-zinc-800 p-4">
                        <p className="text-sm text-zinc-300">
                          <strong className="text-zinc-100">Query:</strong> {analysis.query}
                        </p>
                        {analysis.analysis && (
                          <div className="text-sm text-zinc-300">
                            <strong className="text-zinc-100">Classification:</strong> {JSON.stringify(analysis.analysis, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            
              <TabsContent value="response" className="mt-4">
                <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg text-zinc-100">AI Generated Response</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <motion.div {...motionAnswerProps} className="rounded-2xl border border-blue-900/30 bg-gradient-to-br from-blue-950/30 via-zinc-900/60 to-indigo-950/30 p-6 shadow-inner">
                      <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-200">
                        {analysis.answer}
                      </p>
                    </motion.div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span className="rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1 font-medium text-zinc-300">Structured response</span>
                      <span className="rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1 font-medium text-zinc-300">Indexed Atlan docs</span>
                      <span className="rounded-full bg-zinc-800 border border-zinc-700 px-3 py-1 font-medium text-zinc-300">Stream-ready UI</span>
                    </div>
                    
                    {normalizedSources.length > 0 && (
                      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
                        <h4 className="mb-3 text-sm font-medium text-zinc-300">Sources</h4>
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