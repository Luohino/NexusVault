import React from 'react';
import { Link } from 'react-router-dom';
import { SignedIn, SignedOut, UserButton } from "@clerk/clerk-react";
import { Mail, Phone } from 'lucide-react';

export const Contact = () => {
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
            <Link to="/community" className="text-gray-400 hover:opacity-60 transition-opacity">Community</Link>
            <Link to="/contact" className="font-semibold text-black hover:opacity-60 transition-opacity">Contact</Link>
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
            <Link to="/community" className="text-gray-400 hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Community</Link>
            <Link to="/contact" className="text-black hover:text-black transition-colors" onClick={() => setIsMenuOpen(false)}>Contact</Link>
            <SignedOut><Link to="/login" className="text-red-600 border-t border-gray-100 pt-8" onClick={() => setIsMenuOpen(false)}>Sign in</Link></SignedOut>
          </nav>
        </div>
      )}

      <main className="flex-1 w-full flex flex-col items-center py-12 px-4 gap-16">
        <div className="w-full max-w-5xl">
            <h2 className="text-2xl font-bold mb-8 text-center text-gray-900 tracking-tight">Directly reach our team</h2>
            <div className="flex flex-wrap items-center justify-center gap-6">
                <div className="text-sm text-gray-500 w-80 divide-y divide-gray-200 border border-gray-200 shadow-sm rounded-xl bg-white overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between p-5 bg-gray-50/50">
                        <div>
                            <div className="flex items-center space-x-2">
                                <h2 className="text-lg font-bold text-gray-900 tracking-tight">James Washington</h2>
                                <p className="bg-green-100 px-2 py-0.5 rounded-full text-xs font-semibold text-green-700 border border-green-200">Support</p>
                            </div>
                            <p className="mt-1 font-medium text-gray-400">Technical Lead</p>
                        </div>
                        <img className="h-12 w-12 rounded-full border-2 border-white shadow-sm object-cover" src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=100" alt="James Washington" />
                    </div>
                    <div className="flex items-center divide-x divide-gray-200 bg-white">
                        <button type="button" className="flex items-center justify-center gap-2 w-1/2 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-semibold hover:text-black">
                            <Mail size={16} />
                            Email
                        </button>
                        <button type="button" className="flex items-center justify-center gap-2 w-1/2 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-semibold hover:text-black">
                            <Phone size={16} />
                            Call
                        </button>
                    </div>
                </div>
            
                <div className="text-sm text-gray-500 w-80 divide-y divide-gray-200 border border-gray-200 shadow-sm rounded-xl bg-white overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between p-5 bg-gray-50/50">
                        <div>
                            <div className="flex items-center space-x-2">
                                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Richard Nelson</h2>
                                <p className="bg-blue-100 px-2 py-0.5 rounded-full text-xs font-semibold text-blue-700 border border-blue-200">Sales</p>
                            </div>
                            <p className="mt-1 font-medium text-gray-400">Enterprise Executive</p>
                        </div>
                        <img className="h-12 w-12 rounded-full border-2 border-white shadow-sm object-cover" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100" alt="Richard Nelson" />
                    </div>
                    <div className="flex items-center divide-x divide-gray-200 bg-white">
                        <button type="button" className="flex items-center justify-center gap-2 w-1/2 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-semibold hover:text-black">
                            <Mail size={16} />
                            Email
                        </button>
                        <button type="button" className="flex items-center justify-center gap-2 w-1/2 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-semibold hover:text-black">
                            <Phone size={16} />
                            Call
                        </button>
                    </div>
                </div>
            
                <div className="text-sm text-gray-500 w-80 divide-y divide-gray-200 border border-gray-200 shadow-sm rounded-xl bg-white overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between p-5 bg-gray-50/50">
                        <div>
                            <div className="flex items-center space-x-2">
                                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Donald Jackman</h2>
                                <p className="bg-purple-100 px-2 py-0.5 rounded-full text-xs font-semibold text-purple-700 border border-purple-200">Admin</p>
                            </div>
                            <p className="mt-1 font-medium text-gray-400">Account Manager</p>
                        </div>
                        <img className="h-12 w-12 rounded-full border-2 border-white shadow-sm object-cover" src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=100&h=100&auto=format&fit=crop" alt="Donald Jackman" />
                    </div>
                    <div className="flex items-center divide-x divide-gray-200 bg-white">
                        <button type="button" className="flex items-center justify-center gap-2 w-1/2 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-semibold hover:text-black">
                            <Mail size={16} />
                            Email
                        </button>
                        <button type="button" className="flex items-center justify-center gap-2 w-1/2 py-3 hover:bg-gray-50 transition-colors text-gray-700 font-semibold hover:text-black">
                            <Phone size={16} />
                            Call
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};
