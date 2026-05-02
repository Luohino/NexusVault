import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import rehypeRaw from 'rehype-raw';
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
  theme?: 'dark' | 'light';
  baseUrl?: string;
  imageBaseUrl?: string;
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const CodeBlock = ({ lang, codeString, theme = 'dark' }: { lang: string, codeString: string, theme?: 'dark' | 'light' }) => {
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
    } else {
      highlightedCode = escapeHtml(codeString);
    }
  } catch (e) {
    console.error('Prism highlight error', e);
    highlightedCode = escapeHtml(codeString);
  }

  return (
    <div className={`relative group my-6 rounded-sm overflow-hidden ${theme === 'light' ? 'bg-zinc-100 border border-zinc-200' : 'bg-[#0d0d0d]'}`}>
      <div className={`flex items-center justify-between px-4 py-2 border-b ${theme === 'light' ? 'bg-white border-zinc-200' : 'bg-black border-zinc-800'}`}>
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
            className={`language-${lang} font-mono text-xs leading-relaxed ${theme === 'light' ? 'text-zinc-800' : 'text-zinc-300'}`}
            dangerouslySetInnerHTML={{ __html: highlightedCode === codeString ? codeString : highlightedCode }} 
          />
        </pre>
      </div>
    </div>
  );
};

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content, theme = 'dark' }) => {
  if (!content) {
    return <div className="text-zinc-600 italic text-xs font-bold">No content provided.</div>;
  }

  const textColor = theme === 'light' ? 'text-zinc-800' : 'text-zinc-300';
  const headingColor = theme === 'light' ? 'text-black' : 'text-white';
  const borderColor = theme === 'light' ? 'border-zinc-200' : 'border-zinc-800';

  return (
    <div className={`w-full max-w-none bg-transparent rounded-none overflow-hidden ${textColor}`}>
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
          h1(props) { return <h1 className={`text-3xl font-bold border-b pb-2 mb-4 mt-8 first:mt-0 group-hover:text-red-500 transition-colors ${headingColor} ${borderColor}`} {...props} />; },
          h2(props) { return <h2 className={`text-2xl font-bold border-b pb-2 mb-4 mt-8 first:mt-0 ${headingColor} ${borderColor}`} {...props} />; },
          h3(props) { return <h3 className={`text-xl font-bold mb-4 mt-6 first:mt-0 ${headingColor}`} {...props} />; },
          h4(props) { return <h4 className={`text-lg font-bold mb-4 mt-6 first:mt-0 ${headingColor}`} {...props} />; },
          h5(props) { return <h5 className={`text-base font-bold mb-4 mt-6 first:mt-0 ${headingColor}`} {...props} />; },
          h6(props) { return <h6 className={`text-sm font-bold mb-4 mt-6 first:mt-0 uppercase tracking-widest text-zinc-500`} {...props} />; },
          
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
              return <code className={`px-1.5 py-0.5 rounded-none font-mono text-[11px] font-semibold border ${theme === 'light' ? 'bg-zinc-100 text-red-600 border-zinc-200' : 'bg-zinc-900 text-red-500 border-zinc-800'}`} {...props}>{children}</code>;
            }

            const codeString = String(children).replace(/\n$/, '');
            return <CodeBlock lang={lang} codeString={codeString} theme={theme} />;
          },
          
          // TABLES
          table(props) {
            return (
              <div className={`w-full max-w-full overflow-x-auto my-6 border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${theme === 'light' ? 'bg-white border-zinc-300' : 'bg-[#0d0d0d] border-zinc-800'}`}>
                <table className="w-full text-left border-collapse text-sm" {...props} />
              </div>
            );
          },
          th(props) {
            return <th className={`border-b-2 px-4 py-3 font-bold uppercase text-[10px] tracking-wider ${theme === 'light' ? 'bg-zinc-50 border-zinc-200 text-black' : 'bg-black border-zinc-800 text-white'}`} {...props} />;
          },
          td(props) {
            return <td className={`border-b px-4 py-3 transition-colors duration-150 ${theme === 'light' ? 'border-zinc-100 hover:bg-zinc-50' : 'border-zinc-800/50 hover:bg-zinc-900/50'}`} {...props} />;
          },
          tr(props) {
            return <tr className="group hover:bg-zinc-900/50 transition-colors duration-150" {...props} />;
          },
          
          // MEDIA & LINKS
          img({ node, ...props }: any) {
            let src = props.src;
            if (src && !src.startsWith('http') && !src.startsWith('data:') && imageBaseUrl) {
              src = `${imageBaseUrl}/${src.replace(/^\.\//, '')}`;
            }
            return <img className="max-w-full h-auto rounded-none inline-block my-1" loading="lazy" {...props} src={src} />;
          },
          a({ node, ...props }: any) {
            let href = props.href;
            if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith('mailto:') && baseUrl) {
              href = `${baseUrl}/${href.replace(/^\.\//, '')}`;
            }
            if (props.className?.includes('heading-anchor')) {
              return (
                <a {...props} href={href} className="text-inherit hover:underline decoration-transparent hover:decoration-inherit transition-all">
                  <LinkIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 inline-block -ml-6 mr-2 transition-opacity text-red-500" />
                  {props.children}
                </a>
              );
            }
            return (
              <a 
                className="text-[#0969da] hover:text-red-600 hover:underline transition-all duration-200 cursor-pointer break-words font-medium" 
                target="_blank" 
                rel="noopener noreferrer" 
                {...props} 
                href={href}
              />
            );
          },
          
          // QUOTES & RULES
          blockquote(props) {
            return <blockquote className={`border-l-4 border-red-600 pl-6 py-2 pr-4 italic my-6 rounded-r-sm ${theme === 'light' ? 'bg-red-50 text-zinc-600' : 'bg-red-600/5 text-zinc-400'}`} {...props} />;
          },
          hr(props) {
            return <hr className={`my-8 border-t-2 border-dashed ${theme === 'light' ? 'border-zinc-200' : 'border-zinc-800'}`} {...props} />;
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
