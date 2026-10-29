'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GeneratedInsights } from '@/lib/ai/types';
import { Loader2, RefreshCcw, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import DOMPurify from 'dompurify';

interface InsightsViewProps {
  documentId: string;
}

export function InsightsView({ documentId }: InsightsViewProps) {
  const [insights, setInsights] = useState<GeneratedInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/insights`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate insights.');
      }
      setInsights(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-gray-500">Generating intelligent insights using Gemini AI...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4 bg-red-50 rounded-lg border border-red-200">
        <AlertTriangle className="h-8 w-8 text-red-500" />
        <p className="text-red-700 text-center max-w-md">{error}</p>
        <Button variant="outline" onClick={fetchInsights} className="bg-white">
          <RefreshCcw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="flex justify-center p-4">
        <Button onClick={fetchInsights}>
          Generate AI Insights
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4 animate-in fade-in zoom-in duration-300">
      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{insights.executiveSummary}</p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
             <CardTitle>Detailed Summary</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="prose prose-sm max-w-none text-gray-700">
                <div dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    insights.detailedSummary
                      .replace(/## (.*)/g, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-900">$1</h3>')
                      .replace(/\n/g, '<br/>')
                  )
                }} />
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle>Key Extraction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ExtractionSection title="Key Takeaways" items={insights.insights.keyTakeaways} />
            <ExtractionSection title="Important Dates" items={insights.insights.importantDates} badge />
            <ExtractionSection title="Action Items" items={insights.insights.actionItems} />

            <div className="grid grid-cols-2 gap-4">
              <ExtractionSection title="Organizations" items={insights.insights.organizations} badge />
              <ExtractionSection title="Names" items={insights.insights.names} badge />
            </div>
            <ExtractionSection title="Numerical Figures" items={insights.insights.numericalFigures} badge />
          </CardContent>
        </Card>
      </div>

      <div className="text-xs text-gray-400 text-center flex justify-center space-x-4">
         <span>Model: {insights.metadata.modelIdentifier}</span>
         <span>Hash: {insights.metadata.contentHash.substring(0, 8)}...</span>
         <span>Generated: {new Date(insights.metadata.generatedAt).toLocaleString()}</span>
      </div>
    </div>
  );
}

function ExtractionSection({ title, items, badge = false }: { title: string, items: string[], badge?: boolean }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-2">{title}</h4>
      {badge ? (
         <div className="flex flex-wrap gap-2">
            {items.map((item, i) => <Badge key={i} variant="secondary">{item}</Badge>)}
         </div>
      ) : (
        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-700">
           {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      )}
    </div>
  );
}
