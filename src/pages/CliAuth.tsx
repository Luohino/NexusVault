import React, { useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function CliAuth() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const { isSignedIn } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();

  const handleAuthorize = async () => {
    if (!code) return;
    setStatus('authorizing');
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        setError('No active login session found.');
        setStatus('error');
        return;
      }

      const res = await fetch('/api/auth/cli/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code, token })
      });
      if (res.ok) {
        setStatus('success');
      } else {
        const data = await res.json();
        setError(data.error || 'Authorization failed');
        setStatus('error');
      }
    } catch (err) {
      setError('Network error');
      setStatus('error');
    }
  };

  if (!code) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <XCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Invalid Request</h1>
        <p className="text-gray-600">No authorization code provided.</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
        <h1 className="text-2xl font-bold mb-2">Login Required</h1>
        <p className="text-gray-600 mb-6">Please log in to authorize your CLI session.</p>
        <button 
          onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
            <Loader2 className={`w-10 h-10 text-blue-600 ${status === 'authorizing' ? 'animate-spin' : ''}`} />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Authorize CLI Session</h1>
        <p className="text-gray-600 mb-8">
          The NexusVault CLI is requesting access to your account. 
          Only authorize this if you initiated the request from your terminal.
        </p>

        <div className="mb-8 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Verification Code</p>
          <p className="text-3xl font-mono font-black text-blue-600 tracking-tighter">{code}</p>
          <p className="text-xs text-gray-500 mt-2">Ensure this matches the code shown in your terminal.</p>
        </div>

        {status === 'idle' && (
          <div className="space-y-4">
            <button 
              onClick={handleAuthorize}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:shadow-blue-300 transition-all active:scale-95"
            >
              Authorize Terminal
            </button>
            <button 
              onClick={() => window.close()}
              className="w-full bg-gray-50 text-gray-600 py-3 rounded-xl font-medium hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="animate-in fade-in zoom-in duration-300">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-600 mb-2">Success!</h2>
            <p className="text-gray-600">You can now close this window and return to your terminal.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="animate-in fade-in zoom-in duration-300">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-600 mb-2">Error</h2>
            <p className="text-red-500">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
