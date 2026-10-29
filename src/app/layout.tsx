import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Smart Document Analyzer',
  description: 'Upload, summarize, and extract information from documents seamlessly.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={`${inter.className} min-h-screen bg-gray-50 flex flex-col`}>
        <header className="bg-white border-b sticky top-0 z-10 p-4">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">
              Smart Document Analyzer
            </Link>
            <nav className="flex gap-4">
              <Link href="#" className="text-gray-600 hover:text-black">Features</Link>
              <Link href="#" className="text-gray-600 hover:text-black">Pricing</Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        <footer className="bg-white border-t p-6 text-center text-gray-500 text-sm mt-auto">
          &copy; {new Date().getFullYear()} Smart Document Analyzer. All rights reserved.
        </footer>
      </body>
    </html>
  );
}
