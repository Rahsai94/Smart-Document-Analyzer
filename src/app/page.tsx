import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Search, Zap } from 'lucide-react';
import { FileUpload } from '@/components/documents/FileUpload';

export default function Home() {
  return (
    <div className="flex flex-col items-center py-12 text-center gap-12 px-4">
      <section className="space-y-6 max-w-3xl">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900">
          Unlock the Power of Your Documents
        </h1>
        <p className="text-xl text-gray-600">
          Smart Document Analyzer helps you upload, summarize, and intelligently query your private files. Get instant insights and evidence-based answers.
        </p>
      </section>

      <section className="w-full max-w-4xl bg-white shadow-sm border border-gray-100 rounded-xl p-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Upload Documents</h2>
          <p className="text-gray-500">Securely ingest your files for processing and analysis.</p>
        </div>
        <FileUpload />
      </section>

      <section className="grid sm:grid-cols-3 gap-6 w-full max-w-5xl mt-8">
        <Card className="text-left">
          <CardHeader>
            <Zap className="h-8 w-8 text-blue-500 mb-2" />
            <CardTitle>Instant Summaries</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">
              Generate comprehensive summaries of lengthy documents in seconds using advanced AI.
            </CardDescription>
          </CardContent>
        </Card>
        <Card className="text-left">
          <CardHeader>
            <Search className="h-8 w-8 text-green-500 mb-2" />
            <CardTitle>Semantic Search</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">
              Ask natural language questions and receive accurate answers with exact citations from your texts.
            </CardDescription>
          </CardContent>
        </Card>
        <Card className="text-left">
          <CardHeader>
            <FileText className="h-8 w-8 text-purple-500 mb-2" />
            <CardTitle>Structured Extraction</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">
              Automatically extract and organize key entities, dates, and terms into structured data.
            </CardDescription>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
