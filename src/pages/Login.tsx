import { SignIn } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';

export const Login = () => {
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#0d1117] overflow-hidden">
      {/* Left Side: Impact Visuals */}
      <div className="hidden md:flex flex-1 relative items-center justify-center border-r border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="absolute w-[500px] h-[500px] bg-red-600/20 blur-[150px] rounded-full animate-pulse" />
        
        <div className="relative z-10 p-12">
          <h1 className="text-[120px] font-black italic tracking-tighter leading-none text-white opacity-10 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-10deg] select-none whitespace-nowrap">
            NEXUS VAULT
          </h1>
          <div className="flex flex-col gap-4">
            <div className="text-red-600 font-black italic tracking-tighter text-6xl">N_V</div>
            <h2 className="text-4xl font-bold text-white max-w-md tracking-tight">
              The elite platform for <span className="text-red-600">secure</span> repository management.
            </h2>
            <p className="text-gray-500 max-w-sm text-lg">
              Experience the next generation of developer collaboration. High speed, high security, high impact.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {/* Background elements for mobile or added depth */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full md:hidden" />
        
        <div className="relative z-10 w-full max-w-[420px]">
          <SignIn 
            routing="path" 
            path="/login" 
            signUpUrl="/signup" 
            forceRedirectUrl="/"
            appearance={{
              baseTheme: dark,
              elements: {
                formButtonPrimary: 'bg-[#dc2626] hover:bg-red-500 border-none text-white font-black rounded-none py-4 px-4 transition-all uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(220,38,38,0.4)]',
                card: 'bg-black/40 backdrop-blur-3xl border-2 border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.5)] w-full rounded-none p-4',
                headerTitle: 'text-3xl font-[1000] italic tracking-[calc(-0.05em)] text-white uppercase mb-2',
                headerSubtitle: 'text-gray-400 font-medium text-xs uppercase',
                socialButtonsBlockButton: 'bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-none transition-all h-12',
                socialButtonsBlockButtonText: 'text-white font-bold uppercase text-[10px] tracking-widest',
                formFieldInput: 'bg-white/5 border border-white/10 focus:border-red-600 focus:ring-0 text-white rounded-none h-14 px-4 font-mono text-sm',
                footerActionLink: 'text-red-600 hover:text-red-400 font-black uppercase tracking-tighter transition-colors text-sm',
                formFieldLabel: 'text-white/40 font-black uppercase text-[9px] tracking-[0.2em] mb-2',
                dividerRow: 'hidden',
                dividerText: 'text-gray-600 uppercase text-[9px] font-black tracking-[0.3em]',
              },
              variables: {
                colorPrimary: '#dc2626',
                colorBackground: 'transparent',
                colorText: '#ffffff',
                colorInputBackground: 'rgba(255,255,255,0.05)',
                colorInputText: '#ffffff',
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};
