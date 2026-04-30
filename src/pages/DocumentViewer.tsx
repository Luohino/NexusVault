import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Shield, Scale, Zap } from 'lucide-react';
import { MarkdownViewer } from '../components/ui/MarkdownViewer';

export const DocumentViewer: React.FC = () => {
  const { filename: paramFilename } = useParams<{ filename: string }>();
  const filename = paramFilename || (window.location.pathname === '/license' ? 'LICENSE' : null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        setLoading(true);
        if (!filename) throw new Error('No document specified');
        const res = await fetch(`/api/docs/${filename}`);
        if (!res.ok) throw new Error('Failed to load document');
        const data = await res.json();
        setContent(data.content);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDoc();
    window.scrollTo(0, 0);
  }, [filename]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-black border-t-red-600 animate-spin" />
          <span className="font-mono text-sm font-bold uppercase tracking-widest">Accessing Archive...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] pt-24 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        {/* BACK BUTTON */}
        <button
          onClick={() => navigate('/vault')}
          className="group flex items-center gap-2 mb-8 px-4 py-2 bg-white border-2 border-black hover:bg-black hover:text-white transition-all duration-200 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
        >
          <ArrowLeft className="size-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-mono text-sm font-bold uppercase tracking-tight">Return to Vault</span>
        </button>

        {/* DOCUMENT CONTAINER */}
        <div className="bg-white border-4 border-black p-8 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex items-center gap-4 mb-10 pb-6 border-b-2 border-zinc-100">
            <div className="p-3 bg-red-600 text-white border-2 border-black">
              {filename?.toLowerCase().includes('security') ? <Shield className="size-8" /> : 
               filename?.toLowerCase().includes('license') ? <Scale className="size-8" /> :
               filename?.toLowerCase().includes('performance') ? <Zap className="size-8" /> :
               <FileText className="size-8" />}
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter leading-none mb-1">
                {filename?.replace('.md', '').replaceAll('_', ' ')}
              </h1>
              <p className="font-mono text-xs text-zinc-500 font-bold uppercase tracking-widest">
                NexusVault Official Protocol / {filename}
              </p>
            </div>
          </div>

          {error ? (
            <div className="p-6 bg-red-50 border-2 border-red-600 text-red-600 font-mono text-sm font-bold">
              ERROR: {error}
            </div>
          ) : (
            <div className="prose prose-zinc max-w-none prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tighter prose-p:font-medium prose-p:text-zinc-800 prose-p:leading-relaxed">
              <MarkdownViewer content={content || ''} theme="light" />
            </div>
          )}
        </div>

        {/* FOOTER ACTION */}
        <div className="mt-12 flex justify-center">
          <p className="font-mono text-[10px] text-zinc-400 font-bold uppercase text-center max-w-xs leading-relaxed">
            This document is a legally binding component of the NexusVault Sovereign Identity Charter. Unauthorized modification is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
};
