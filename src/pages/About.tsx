import React from 'react';
import { Link } from 'react-router-dom';
import { UserButton, useUser, SignedOut } from "@clerk/clerk-react";
import AboutSection2 from '../components/ui/about-section-2';

export const About = () => {
  const { isSignedIn, isLoaded } = useUser();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-gray-50 text-black flex flex-col">
      {/* Header copied from HeroSection for consistent guest navigation */}
      <header className="flex justify-between items-center px-4 md:px-8 pt-8 md:pt-6 relative z-20">
        <Link to="/" className="flex items-center gap-2 md:gap-3">
          <div className="text-xl md:text-2xl font-bold italic tracking-tighter text-black">NexusVault</div>
        </Link>

        <div className="flex items-center gap-4 md:gap-8">
          <nav className="hidden md:flex gap-6 text-sm">
            <Link to="/" className="text-gray-400 hover:opacity-60 transition-opacity">Explore</Link>
            <Link to="/about" className="font-semibold text-black hover:opacity-60 transition-opacity">About</Link>
            <Link to="/docs" className="text-gray-400 hover:opacity-60 transition-opacity">Docs</Link>
            <Link to="/community" className="text-gray-400 hover:opacity-60 transition-opacity">Community</Link>
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

          {isLoaded && isSignedIn ? (
            <UserButton afterSignOutUrl="/" />
          ) : (
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
          )}
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
            <Link to="/" className="text-gray-400 hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Explore</Link>
            <Link to="/about" className="text-black hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>About</Link>
            <Link to="/docs" className="text-gray-400 hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Docs</Link>
            <Link to="/community" className="text-gray-400 hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Community</Link>
            <Link to="/contact" className="text-gray-400 hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Contact</Link>
            <SignedOut><Link to="/login" className="text-red-600 border-t border-gray-100 pt-8" onClick={() => setIsMenuOpen(false)}>Sign in</Link></SignedOut>
          </nav>
        </div>
      )}

      <main className="flex-1 bg-gray-50">
        <AboutSection2 />
      </main>
    </div>
  );
};
