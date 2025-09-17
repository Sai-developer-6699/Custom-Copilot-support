import React from 'react';
import { X, Brain, MessageSquare } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { generateMockAnalysis } from '../../data/mockData';

const ResponseModal = ({ isOpen, onClose, query }) => {
  const analysis = query ? generateMockAnalysis(query) : null;

  if (!analysis) return null;

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
                        {analysis.topic}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Sentiment</label>
                      <Badge className={`${
                        analysis.sentiment === 'Positive' ? 'bg-green-100 text-green-800' :
                        analysis.sentiment === 'Negative' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {analysis.sentiment}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-600">Priority</label>
                      <Badge className={`${
                        analysis.priority === 'High' ? 'bg-red-100 text-red-800' :
                        analysis.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {analysis.priority}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <label className="text-sm font-medium text-gray-600 block mb-2">Analysis Details</label>
                    <p className="text-gray-700 text-sm leading-relaxed">{analysis.details}</p>
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
                      {analysis.response}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Confidence Score: {analysis.confidence}%</span>
                      <span>Generated in {analysis.processingTime}ms</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResponseModal;