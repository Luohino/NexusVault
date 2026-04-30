import React from 'react';
import { Link } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { Mail, Github, Twitter, Linkedin, Youtube, Instagram } from 'lucide-react';

const SOCIAL_LINKS = [
  { icon: <Twitter className="size-5" />, href: "https://x.com/Luohinoo", label: "Twitter" },
  { icon: <Github className="size-5" />, href: "https://github.com/Luohino/", label: "GitHub" },
  { icon: <Linkedin className="size-5" />, href: "https://www.linkedin.com/in/luohino-o-43620931b", label: "LinkedIn" },
  { icon: <Youtube className="size-5" />, href: "https://youtube.com/@luohino", label: "YouTube" },
  { icon: <Instagram className="size-5" />, href: "https://www.instagram.com/luohinoo", label: "Instagram" },
];

export const Contact = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-white text-black flex flex-col font-['Inter']">
      <header className="flex justify-between items-center px-4 md:px-8 pt-8 md:pt-6 relative z-20">
        <Link to="/" className="flex items-center gap-2 md:gap-3">
          <div className="text-xl md:text-2xl font-bold italic tracking-tighter text-black">NexusVault</div>
        </Link>

        <div className="flex items-center gap-4 md:gap-8">
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <Link to="/vault" className="text-gray-400 hover:text-black transition-colors">Explore</Link>
            <Link to="/about" className="text-gray-400 hover:text-black transition-colors">About</Link>
            <Link to="/vault" className="text-gray-400 hover:text-black transition-colors">Docs</Link>
            <Link to="/community" className="text-gray-400 hover:text-black transition-colors">Community</Link>
            <Link to="/contact" className="text-black font-black">Contact</Link>
          </nav>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-red-600"
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            )}
          </button>

          <SignedOut>
            <div className="flex items-center gap-2 md:gap-4 text-sm font-medium">
              <Link to="/login" className="hidden sm:block px-4 py-2 border border-black hover:bg-gray-50 transition-all">Sign in</Link>
              <Link to="/signup" className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-all">Sign up</Link>
            </div>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white pt-24 px-8 md:hidden">
          <button onClick={() => setIsMenuOpen(false)} className="absolute top-8 right-6 text-red-600 p-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <nav className="flex flex-col gap-8 text-3xl font-bold italic text-black">
            <Link to="/vault" onClick={() => setIsMenuOpen(false)}>Explore</Link>
            <Link to="/about" onClick={() => setIsMenuOpen(false)}>About</Link>
            <Link to="/vault" onClick={() => setIsMenuOpen(false)}>Docs</Link>
            <Link to="/community" onClick={() => setIsMenuOpen(false)}>Community</Link>
            <Link to="/contact" onClick={() => setIsMenuOpen(false)} className="text-red-600">Contact</Link>
          </nav>
        </div>
      )}

      <main className="flex-1 w-full flex flex-col items-center justify-center p-6 text-center pt-20">
        <div className="max-w-3xl w-full">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase tracking-tighter leading-none mb-10 md:mb-12">
            Institutional <span className="text-red-600">Gateway</span>
          </h1>

          <div className="bg-white border-2 border-zinc-100 shadow-2xl rounded-3xl p-8 md:p-16 relative overflow-hidden group">
            {/* Background Accent */}
            <div className="absolute -right-20 -bottom-20 size-64 bg-red-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-700"></div>

            <div className="relative z-10 flex flex-col items-center">
              <img
                src="https://github.com/Luohino.png"
                alt="Luohino"
                className="size-24 md:size-32 rounded-full border-4 border-white shadow-xl mb-6 md:mb-8 group-hover:scale-105 transition-transform"
              />

              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-black mb-2">Luohino</h2>
              <p className="text-sm md:text-base text-zinc-500 font-medium mb-8">Lead Architect & Sovereign Engineer</p>

              {/* Overlapping Social Icons */}
              <div className="flex justify-center items-center -space-x-3 mb-10">
                {SOCIAL_LINKS.map((social, idx) => (
                  <a
                    key={idx}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/icon relative flex items-center justify-center transition-all duration-300 hover:z-50 hover:-translate-y-1"
                  >
                    <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm opacity-0 group-hover/icon:opacity-100 transition-all duration-200 pointer-events-none z-50">
                      {social.label}
                    </span>
                    <div className="size-12 rounded-full border-2 border-white bg-white flex items-center justify-center text-zinc-400 group-hover/icon:text-black group-hover/icon:border-black transition-all shadow-md">
                      {social.icon}
                    </div>
                  </a>
                ))}
              </div>

              <div className="flex flex-col gap-4 w-full max-w-sm">
                <a
                  href="mailto:contact@luohino.com"
                  className="flex items-center justify-center gap-3 px-8 py-4 bg-black text-white font-black uppercase tracking-widest text-sm hover:bg-red-600 transition-all rounded-xl shadow-lg"
                >
                  <Mail className="size-5" />
                  Direct Inquiry
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
