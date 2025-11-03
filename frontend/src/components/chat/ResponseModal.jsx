import React, { useState, useEffect } from 'react';
import { X, Brain, MessageSquare, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { apiService } from '../../services/api';

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
      <DialogContent className="bg-gray-50 max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-blue-600 flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            AI Analysis & Response
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Query:</h3>
            <p className="text-blue-700">{query}</p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Analyzing your request...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-red-800 mb-2">Error:</h3>
              <p className="text-red-700">{error}</p>
              <button
                onClick={fetchAnalysis}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {analysis && !loading && (
            <Tabs defaultValue="analysis" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="analysis" className="flex items-center">
                  <Brain className="h-4 w-4 mr-2" />
                  Internal Analysis
                </TabsTrigger>
                <TabsTrigger value="response" className="flex items-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Final Response
                </TabsTrigger>
              </TabsList>
            
              <TabsContent value="analysis" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-800">Classification Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600">Topic</label>
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                          {analysis.analysis?.topic || 'Unknown'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600">Sentiment</label>
                        <Badge className={`${
                          analysis.analysis?.sentiment === 'Positive' ? 'bg-green-100 text-green-800' :
                          analysis.analysis?.sentiment === 'Negative' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {analysis.analysis?.sentiment || 'Neutral'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-600">Priority</label>
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
                    
                    <div className="pt-4 border-t">
                      <label className="text-sm font-medium text-gray-600 block mb-2">Analysis Details</label>
                      <div className="space-y-2">
                        <p className="text-gray-700 text-sm">
                          <strong>Query:</strong> {analysis.query}
                        </p>
                        {analysis.analysis && (
                          <div className="text-gray-700 text-sm">
                            <strong>Classification:</strong> {JSON.stringify(analysis.analysis, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            
              <TabsContent value="response" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg text-gray-800">AI Generated Response</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
                      <p className="text-gray-800 leading-relaxed whitespace-pre-line">
                        {analysis.answer}
                      </p>
                    </div>
                    
                    {analysis.sources && analysis.sources.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-600 mb-2">Sources:</h4>
                        <div className="space-y-2">
                          {analysis.sources.map((source, index) => (
                            <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                              {source}
                            </div>
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