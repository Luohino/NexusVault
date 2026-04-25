import React from 'react';
import { Link } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { Github, Twitter, Linkedin, Youtube, Instagram } from 'lucide-react';

const SOCIAL_LINKS = [
  { icon: <Twitter className="w-5 h-5" />, href: "https://x.com/Luohinoo", label: "Twitter" },
  { icon: <Github className="w-5 h-5" />, href: "https://github.com/Luohino/", label: "GitHub" },
  { icon: <Linkedin className="w-5 h-5" />, href: "https://www.linkedin.com/in/luohino-o-43620931b", label: "LinkedIn" },
  { icon: <Youtube className="w-5 h-5" />, href: "https://youtube.com/@luohino", label: "YouTube" },
  { icon: <Instagram className="w-5 h-5" />, href: "https://www.instagram.com/luohinoo", label: "Instagram" },
];

export const Community = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <header className="flex justify-between items-center px-4 md:px-8 pt-8 md:pt-6 relative z-20">
        <Link to="/" className="flex items-center gap-2 md:gap-3">
          <div className="text-xl md:text-2xl font-bold italic tracking-tighter text-black">NexusVault</div>
        </Link>

        <div className="flex items-center gap-4 md:gap-8">
          <nav className="hidden md:flex gap-6 text-sm">
            <Link to="/vault" className="text-gray-400 hover:opacity-60 transition-opacity">Explore</Link>
            <Link to="/about" className="text-gray-400 hover:opacity-60 transition-opacity">About</Link>
            <Link to="/vault" className="text-gray-400 hover:opacity-60 transition-opacity">Docs</Link>
            <Link to="/community" className="font-semibold text-black hover:opacity-60 transition-opacity">Community</Link>
            <Link to="/contact" className="text-gray-400 hover:opacity-60 transition-opacity">Contact</Link>
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
              <Link
                to="/login"
                className="hidden sm:block px-4 py-2 text-black hover:bg-gray-100 transition-colors rounded-none border-l-2 border-b-2 border-black focus:outline-none"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="px-3 py-1.5 md:px-4 md:py-2 bg-red-600 hover:bg-red-700 text-white rounded-none border-l-2 border-b-2 border-black transition-all focus:outline-none"
              >
                Sign up
              </Link>
            </div>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-white pt-24 px-8 md:hidden">
          <button
            onClick={() => setIsMenuOpen(false)}
            className="absolute top-8 right-6 text-red-600 p-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <nav className="flex flex-col gap-8 text-3xl font-bold italic text-black">
            <Link to="/vault" className="text-gray-400 hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Explore</Link>
            <Link to="/about" className="text-gray-400 hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>About</Link>
            <Link to="/vault" className="text-gray-400 hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Docs</Link>
            <Link to="/community" className="text-black hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Community</Link>
            <Link to="/contact" className="text-gray-400 hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Contact</Link>
            <SignedOut><Link to="/login" className="text-red-600 border-t border-gray-100 pt-8" onClick={() => setIsMenuOpen(false)}>Sign in</Link></SignedOut>
          </nav>
        </div>
      )}

      <main className="flex-1 w-full flex flex-col items-center justify-center p-6 text-center pt-24">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.9] mb-6">
            Join the <span className="text-red-600">Community</span>
          </h1>
          <p className="text-base sm:text-xl font-medium text-zinc-500 mb-12 md:mb-16 max-w-2xl mx-auto">
            Connect with Luohino for future updates, sovereign engineering discussions, and platform insights.
          </p>

          <div className="flex justify-center items-center -space-x-3 mb-16 px-4">
            {SOCIAL_LINKS.map((social, idx) => (
              <a
                key={idx}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-center transition-all duration-300 hover:z-50 hover:-translate-y-1"
              >
                {/* Popping Tooltip */}
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                  {social.label}
                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-black"></span>
                </span>

                {/* Round Circle Icon */}
                <div className="w-14 h-14 rounded-full border-2 border-white bg-white flex items-center justify-center text-gray-400 group-hover:text-black group-hover:border-black transition-all duration-300 shadow-md">
                  {social.icon}
                </div>
              </a>
            ))}
          </div>

          <div className="mt-8">
            <a
              href="https://github.com/Luohino/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-black text-white px-10 py-4 rounded-full font-bold hover:bg-gray-800 transition-all hover:scale-105 shadow-lg shadow-black/10 active:scale-95"
            >
              Join on GitHub
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};
