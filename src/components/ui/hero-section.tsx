import { Separator } from "@/components/ui/separator";
import { Github, Mail, Linkedin } from "lucide-react";
import React from "react";
import { Link } from "react-router-dom";
import { UserButton, useUser } from "@clerk/clerk-react";

export function HeroSection() {
  const { isSignedIn, isLoaded } = useUser();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  return (
    <div className="md:min-h-screen relative bg-white text-black pb-12 md:pb-0">
      <div className="w-full absolute h-full z-0 bg-[radial-gradient(circle,_black_1px,_transparent_1px)] dark:bg-[radial-gradient(circle,_white_1px,_transparent_1px)] opacity-15 [background-size:20px_20px]" />
      <header className="flex justify-between items-center px-4 md:px-8 pt-8 md:pt-6 relative z-20">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="text-xl md:text-2xl font-bold italic tracking-tighter">NexusVault</div>
        </div>

        <div className="flex items-center gap-4 md:gap-8">
          <nav className="hidden md:flex gap-6 text-sm">
            <a href="#" className="font-semibold hover:opacity-60 transition-opacity">Explore</a>
            <Link to="/about" className="text-gray-400 hover:opacity-60 transition-opacity">About</Link>
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
            <a href="#" className="hover:text-red-600 transition-colors" onClick={() => setIsMenuOpen(false)}>Explore</a>
            <Link to="/about" className="hover:text-red-600 transition-colors" onClick={() => setIsMenuOpen(false)}>About</Link>
            <Link to="/docs" className="hover:text-red-600 transition-colors" onClick={() => setIsMenuOpen(false)}>Docs</Link>
            <Link to="/community" className="hover:text-red-600 transition-colors" onClick={() => setIsMenuOpen(false)}>Community</Link>
            <Link to="/contact" className="hover:text-red-600 transition-colors" onClick={() => setIsMenuOpen(false)}>Contact</Link>
            <SignedOut>
              <Link to="/login" className="text-red-600 border-t border-gray-100 pt-8" onClick={() => setIsMenuOpen(false)}>Sign in</Link>
            </SignedOut>
          </nav>
        </div>
      )}

      <main className="relative pt-8 md:pt-4 pb-12 z-10 min-h-[calc(100vh-80px)] md:min-h-0 flex flex-col justify-center">
        <div className="flex relative px-6 md:items-center w-full flex-col justify-center gap-2">

          {/* Mobile Summary */}
          <p className="md:hidden text-[10px] text-gray-500 mb-2 leading-relaxed max-w-[240px]">
            A modern developer platform for hosting repositories, browsing code, and collaborating locally.
          </p>

          <div className="flex flex-col md:flex-row gap-0 md:gap-6 items-center">
            <p className="hidden md:block text-xs text-gray-500 md:text-sm text-right leading-5 max-w-[180px]">
              A modern developer platform for hosting repositories, browsing code, and collaborating locally.
            </p>
            <h1 className="text-[20vw] md:text-6xl xl:text-[8rem] font-bold leading-none tracking-wider">
              BUILD
            </h1>
          </div>

          <div className="flex flex-col md:flex-row gap-0 md:gap-6 items-center">
            <h1 className="text-[20vw] md:text-6xl xl:text-[8rem] flex font-bold leading-none tracking-wider">
              <span>SC</span>
              <div className="lg:size-32 size-16 md:size-20 flex items-center justify-center mx-1">
                <img src="/nexusvault_red_logo.png" alt="NexusVault Logo" className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-screen" />
              </div>
              <span>PE</span>
            </h1>
            <p className="hidden md:block text-xs text-gray-500 md:text-sm pt-4 leading-5 max-w-[180px]">
              Create repositories, collaborate with developers, and scale your projects effortlessly.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-0 md:gap-6 items-center">
            <h1 className="text-[20vw] md:text-6xl xl:text-[8rem] md:flex font-bold leading-none tracking-wider">
              <span>DEPLOY</span>
              <div className="hidden lg:flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-600 to-blue-600 opacity-80" />
              </div>
              <div className="flex lg:hidden items-center justify-center ml-2">
                <div className="w-10 h-10 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-red-600 to-blue-600 opacity-80" />
              </div>
            </h1>
          </div>
        </div>
        <div className="mx-auto max-w-7xl w-full px-6 mt-8 md:mt-0">
          <div className="md:flex md:mx-8 grid justify-items-end md:justify-end items-center gap-2 md:gap-3">
            <Separator className="w-full my-4 md:my-6 mx-auto max-w-3xl" />
            <div className="text-[10px] md:text-sm text-gray-400 text-right md:text-left w-full md:w-auto">
              DEVELOPED WITH TYPESCRIPT & REACT
            </div>
            <div className="flex w-full justify-end md:justify-start items-end gap-3">
              <span className="text-lg md:text-3xl font-thin">PLATFORM</span>
              <span className="text-xl md:text-4xl font-bold italic text-red-600">
                Nexus
              </span>
            </div>
          </div>
        </div>



      </main>
    </div>
  );
}
