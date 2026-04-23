import React from 'react';

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-[#080808] z-[9999] flex flex-col items-center justify-center">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle,_rgba(220,38,38,0.1)_1px,_transparent_1px)] opacity-[0.2] [background-size:32px_32px]" />
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Pulsing Logo placeholder */}
        <div className="relative mb-8">
          <div className="w-20 h-20 bg-[#0d0d0d] border-4 border-black shadow-[8px_8px_0px_0px_rgba(220,38,38,1)] animate-pulse flex items-center justify-center">
             <div className="text-2xl font-bold text-white">NV</div>
          </div>
          <div className="absolute -top-3 -right-3 w-6 h-6 bg-red-600 border-2 border-black animate-bounce shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
        </div>
        
        {/* Text Animation */}
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-3xl font-bold tracking-tight animate-pulse text-white">
            NexusVault
          </h2>
          <div className="flex gap-2">
            <div className="w-2 h-2 bg-red-600 animate-[bounce_1s_infinite_100ms] border border-black shadow-[1px_1px_0px_0px_rgba(255,255,255,0.1)]" />
            <div className="w-2 h-2 bg-red-600 animate-[bounce_1s_infinite_200ms] border border-black shadow-[1px_1px_0px_0px_rgba(255,255,255,0.1)]" />
            <div className="w-2 h-2 bg-red-600 animate-[bounce_1s_infinite_300ms] border border-black shadow-[1px_1px_0px_0px_rgba(255,255,255,0.1)]" />
          </div>
        </div>
      </div>

      {/* Branded Footer for Loading */}
      <div className="absolute bottom-12 left-0 w-full flex justify-center">
        <span className="text-[10px] font-bold text-zinc-700 animate-pulse">
          Establishing Secure Local Environment
        </span>
      </div>
    </div>
  );
};

export const DashboardSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-[1400px] mx-auto w-full px-4 md:px-8 py-8 animate-pulse">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Skeleton */}
          <div className="w-full md:w-1/4 space-y-10">
            <div>
              <div className="h-4 bg-zinc-900 w-1/2 mb-6 border-l-2 border-red-600" />
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-zinc-900 border border-black" />
                    <div className="h-2.5 bg-zinc-900 w-full" />
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="h-4 bg-zinc-900 w-1/2 mb-6 border-l-2 border-red-600 opacity-50" />
              <div className="h-2 bg-zinc-900 w-3/4" />
            </div>
          </div>

          {/* Main Content Skeleton */}
          <div className="flex-1 space-y-8">
            <div className="neo-brutal-card p-16 bg-[#0d0d0d] border-zinc-900">
              <div className="w-16 h-16 bg-zinc-900 mx-auto mb-8 border-2 border-zinc-800" />
              <div className="h-10 bg-zinc-900 w-2/3 mx-auto mb-4" />
              <div className="h-4 bg-zinc-900 w-1/2 mx-auto mb-10" />
              <div className="h-12 bg-zinc-900 w-48 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-32 bg-zinc-900 border-2 border-zinc-950" />
              <div className="h-32 bg-zinc-900 border-2 border-zinc-950" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
