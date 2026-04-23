import React from 'react';
import { Link } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { AvatarGroup } from '../components/ui/avatar-group';

export const Community = () => {
  // Auth handled by Clerk
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      <header className="flex justify-between items-center px-4 md:px-8 pt-8 md:pt-6 relative z-20">
        <Link to="/" className="flex items-center gap-2 md:gap-3">
          <div className="text-xl md:text-2xl font-bold italic tracking-tighter text-black">NexusVault</div>
        </Link>
        
        <div className="flex items-center gap-4 md:gap-8">
          <nav className="hidden md:flex gap-6 text-sm">
            <Link to="/" className="text-gray-400 hover:opacity-60 transition-opacity">Explore</Link>
            <Link to="/about" className="text-gray-400 hover:opacity-60 transition-opacity">About</Link>
            <Link to="/docs" className="text-gray-400 hover:opacity-60 transition-opacity">Docs</Link>
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
            <Link to="/" className="text-gray-400 hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Explore</Link>
            <Link to="/about" className="text-gray-400 hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>About</Link>
            <Link to="/docs" className="text-gray-400 hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Docs</Link>
            <Link to="/community" className="text-black hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Community</Link>
            <Link to="/contact" className="text-gray-400 hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Contact</Link>
            <SignedOut><Link to="/login" className="text-red-600 border-t border-gray-100 pt-8" onClick={() => setIsMenuOpen(false)}>Sign in</Link></SignedOut>
          </nav>
        </div>
      )}

      <main className="flex-1 w-full flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-black mb-6">Join the Community</h1>
          <p className="text-lg text-gray-500 mb-8">Connect with thousands of developers building the future of software on NexusVault.</p>
          
          <div className="flex justify-center items-center gap-6">
            <AvatarGroup
                avatars={[
                { src: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80", label: "Elena R." },
                { src: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80", label: "Marcus T." },
                { src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80", label: "Sarah J." },
                { src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80", label: "David K." },
                { src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=400&q=80", label: "Anna W." },
                { src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80", label: "James B." },
                { src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80", label: "Lisa M." },
                ]}
                maxVisible={5}
                size={56}
                overlap={16}
            />
            <div className="text-sm text-gray-500 font-medium text-left">
              <span className="text-black font-bold">+2,400</span> <br/>developers online
            </div>
          </div>
          
          <div className="mt-12">
            <button className="bg-black text-white px-8 py-3 rounded-full font-semibold hover:bg-gray-800 transition-colors shadow-lg shadow-black/10">
              Join Discord Server
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
