export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);
  
  // If the request is for the API, we can proxy it or handle it here.
  // For now, we'll let the frontend know where the sovereign backend lives.
  if (url.pathname.startsWith('/api')) {
    // You can set an environment variable in Cloudflare called BACKEND_URL
    // pointing to your Vercel deployment (e.g., https://nexusvault.vercel.app)
    const backendUrl = context.env.BACKEND_URL || 'https://nexusvault.vercel.app';
    const newUrl = new URL(url.pathname + url.search, backendUrl);
    
    return fetch(new Request(newUrl, context.request));
  }

  // Otherwise, serve the static assets
  return context.next();
};
