import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import Prism from 'prismjs';
import { Check, Copy, Link as LinkIcon } from 'lucide-react';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/themes/prism-twilight.css'; // Fits brutalist dark mode perfectly

interface MarkdownViewerProps {
  content: string;
}

const CodeBlock = ({ lang, codeString }: { lang: string, codeString: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let highlightedCode = codeString;
  try {
    if (lang && Prism.languages[lang]) {
      highlightedCode = Prism.highlight(codeString, Prism.languages[lang], lang);
    }
  } catch (e) {
    console.error('Prism highlight error', e);
  }

  return (
    <div className="relative group my-6 rounded-sm bg-[#0d0d0d] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-black border-b border-zinc-800">
        <span className="text-xs font-mono text-zinc-500 font-bold uppercase">{lang || 'text'}</span>
        <button
          onClick={handleCopy}
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 hover:bg-zinc-800 rounded-sm text-zinc-500 hover:text-white"
          title="Copy code"
        >
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <div className="overflow-x-auto p-4">
        <pre className={`language-${lang} !bg-transparent !p-0 !m-0`}>
          <code 
            className={`language-${lang} font-mono text-xs leading-relaxed text-zinc-300`}
            dangerouslySetInnerHTML={{ __html: highlightedCode === codeString ? codeString : highlightedCode }} 
          />
        </pre>
      </div>
    </div>
  );
};

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  if (!content) {
    return <div className="text-zinc-600 italic text-xs font-bold">No content provided.</div>;
  }

  return (
    <div className="markdown-body w-full max-w-none text-zinc-300 bg-transparent rounded-none overflow-hidden">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[
          rehypeRaw, 
          rehypeSlug, 
          [rehypeAutolinkHeadings, { 
            behavior: 'wrap',
            properties: { 
              className: ['heading-anchor', 'group', 'flex', 'items-center', 'gap-2', 'no-underline'] 
            } 
          }]
        ]}
        components={{
          // HEADINGS
          h1(props) { return <h1 className="text-3xl font-bold border-b border-zinc-800 pb-2 mb-4 mt-8 first:mt-0 text-white group-hover:text-red-500 transition-colors" {...props} />; },
          h2(props) { return <h2 className="text-2xl font-bold border-b border-zinc-800 pb-2 mb-4 mt-8 first:mt-0 text-white" {...props} />; },
          h3(props) { return <h3 className="text-xl font-bold mb-4 mt-6 first:mt-0 text-white" {...props} />; },
          h4(props) { return <h4 className="text-lg font-bold mb-4 mt-6 first:mt-0 text-white" {...props} />; },
          h5(props) { return <h5 className="text-base font-bold mb-4 mt-6 first:mt-0 text-white" {...props} />; },
          h6(props) { return <h6 className="text-sm font-bold mb-4 mt-6 first:mt-0 text-zinc-500 uppercase tracking-widest" {...props} />; },
          
          // PARAGRAPHS & LISTS
          p(props) { return <p className="mb-4 leading-relaxed text-sm first:mt-0" {...props} />; },
          ul(props) { return <ul className="list-disc pl-8 mb-4 space-y-1 text-sm marker:text-red-600" {...props} />; },
          ol(props) { return <ol className="list-decimal pl-8 mb-4 space-y-1 text-sm marker:text-red-600 font-bold" {...props} />; },
          li(props) { return <li className="leading-relaxed" {...props} />; },
          
          // CODE BLOCKS
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            const lang = match ? match[1] : '';
            const isInline = !match && !className;
            
            if (isInline) {
              return <code className="bg-zinc-900 text-red-500 px-1.5 py-0.5 rounded-none font-mono text-[11px] font-bold border border-zinc-800" {...props}>{children}</code>;
            }

            const codeString = String(children).replace(/\n$/, '');
            return <CodeBlock lang={lang} codeString={codeString} />;
          },
          
          // TABLES
          table(props) {
            return (
              <div className="w-full max-w-full overflow-x-auto my-6 border-2 border-zinc-800 bg-[#0d0d0d] shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <table className="w-full text-left border-collapse text-sm" {...props} />
              </div>
            );
          },
          th(props) {
            return <th className="border-b-2 border-zinc-800 bg-black px-4 py-3 font-bold text-white uppercase text-[10px] tracking-wider" {...props} />;
          },
          td(props) {
            return <td className="border-b border-zinc-800/50 bg-transparent hover:bg-zinc-900/50 px-4 py-3 transition-colors duration-150" {...props} />;
          },
          tr(props) {
            return <tr className="group hover:bg-zinc-900/50 transition-colors duration-150" {...props} />;
          },
          
          // MEDIA & LINKS
          img({ node, ...props }: any) {
            return <img className="max-w-full h-auto rounded-none inline-block my-1" loading="lazy" {...props} />;
          },
          a({ node, ...props }: any) {
            if (props.className?.includes('heading-anchor')) {
              return (
                <a {...props} className="text-inherit hover:underline decoration-transparent hover:decoration-inherit transition-all">
                  <LinkIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 inline-block -ml-6 mr-2 transition-opacity text-red-500" />
                  {props.children}
                </a>
              );
            }
            return (
              <a 
                className="text-[#58a6ff] hover:text-red-400 hover:underline decoration-[#58a6ff] hover:decoration-red-400 transition-all duration-200 cursor-pointer break-words font-medium" 
                target="_blank" 
                rel="noopener noreferrer" 
                {...props} 
              />
            );
          },
          
          // QUOTES & RULES
          blockquote(props) {
            return <blockquote className="border-l-4 border-red-600 bg-red-600/5 pl-6 py-2 pr-4 text-zinc-400 italic my-6 rounded-r-sm" {...props} />;
          },
          hr(props) {
            return <hr className="border-zinc-800 my-8 border-t-2 border-dashed" {...props} />;
          }
        }}
      >
        {content}
      </ReactMarkdown>
      
      <style>{`
        .markdown-body input[type="checkbox"] {
          margin-right: 0.5em;
          accent-color: #dc2626;
        }
        .markdown-body pre {
          background-color: transparent !important;
        }
      `}</style>
    </div>
  );
};
