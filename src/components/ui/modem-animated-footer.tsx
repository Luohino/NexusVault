import React from "react";
import { cn } from "../../lib/utils";

interface FooterLink {
  label: string;
  href: string;
}

interface SocialLink {
  icon: React.ReactNode;
  href: string;
  label: string;
}

interface FooterProps {
  brandName?: string;
  brandDescription?: string;
  socialLinks?: SocialLink[];
  navLinks?: FooterLink[];
  creatorName?: string;
  creatorUrl?: string;
  className?: string;
}

export const Footer = ({
  brandName = "YourBrand",
  brandDescription = "Your description here",
  socialLinks = [],
  navLinks = [],
  creatorName,
  creatorUrl,
  className,
}: FooterProps) => {
  return (
    <section className={cn("relative w-full mt-0 overflow-hidden", className)}>
      <footer className="border-t bg-[#FEFCE8] relative border-yellow-200">
        <div className="max-w-7xl flex flex-col justify-between mx-auto min-h-88 sm:min-h-100 relative p-4 py-10">
          <div className="flex flex-col w-full">
            <div className="w-full flex flex-col items-center">
              <div className="space-y-2 flex flex-col items-center flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-black text-3xl font-bold">
                    {brandName}
                  </span>
                </div>
                <p className="text-zinc-600 font-semibold text-center w-full max-w-sm sm:w-96 px-4 sm:px-0">
                  {brandDescription}
                </p>
              </div>

              {socialLinks.length > 0 && (
                <div className="flex mt-6 gap-4">
                  {socialLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.href}
                      className="text-zinc-600 hover:text-black transition-colors"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="w-6 h-6 hover:scale-110 duration-300">
                        {link.icon}
                      </div>
                      <span className="sr-only">{link.label}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-2 md:gap-1 items-center justify-center md:flex-row md:items-center md:justify-between px-4 md:px-0 z-20 relative">
            <p className="text-base text-zinc-600 text-center md:text-left">
              ©{new Date().getFullYear()} {brandName}. All rights reserved.
            </p>
            {creatorName && creatorUrl && (
              <nav className="flex gap-4">
                <a
                  href={creatorUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base text-zinc-600 hover:text-black transition-colors duration-300 hover:font-medium"
                >
                  Powered by {creatorName}
                </a>
              </nav>
            )}
          </div>
        </div>

        {/* Large background text - FIXED */}
        <div 
          className="bg-linear-to-b from-black/10 via-black/5 to-transparent bg-clip-text text-transparent leading-none absolute left-1/2 -translate-x-1/2 bottom-12 md:bottom-8 font-extrabold tracking-tighter pointer-events-none select-none text-center px-4"
          style={{
            fontSize: 'clamp(3rem, 12vw, 10rem)',
            maxWidth: '95vw'
          }}
        >
          {brandName.toUpperCase()}
        </div>

        {/* Bottom shadow - Removed lines to keep it clean */}
        <div className="bg-linear-to-t from-[#FEFCE8] via-[#FEFCE8]/80 blur-[1em] to-transparent absolute bottom-0 w-full h-24 pointer-events-none"></div>
      </footer>
    </section>
  );
};
