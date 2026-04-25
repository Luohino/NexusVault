import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  name?: string;
  type?: string;
  image?: string;
  username?: string;
  repoName?: string;
  keywords?: string;
}

export const SEO = ({ 
  title, 
  description = "NexusVault - Next-generation decentralized source code management and collaboration platform.", 
  name = "NexusVault", 
  type = "website",
  image = "/nexusvault_red_logo.png",
  username,
  repoName,
  keywords = "NexusVault, GitHub alternative, code hosting, version control, developer platform"
}: SEOProps) => {
  const fullTitle = title ? `${title} | NexusVault` : "NexusVault - Decentralized Collaboration Platform";
  const url = window.location.href;
  const baseUrl = "https://nexusvault-luohino.vercel.app";
  const fullImage = image.startsWith('http') ? image : `${baseUrl}${image}`;

  // Schema.org Structured Data
  const schemaOrgJSONLD = [];

  if (username && repoName) {
    // SoftwareSourceCode Schema for Repositories
    schemaOrgJSONLD.push({
      "@context": "https://schema.org",
      "@type": "SoftwareSourceCode",
      "name": repoName,
      "description": description,
      "author": {
        "@type": "Person",
        "name": username,
        "url": `https://nexusvault-luohino.vercel.app/${username}`
      },
      "codeRepository": url,
      "programmingLanguage": "Mixed"
    });
  } else if (username) {
    // ProfilePage Schema for Users
    schemaOrgJSONLD.push({
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      "name": `${username}'s Profile`,
      "description": description,
      "mainEntity": {
        "@type": "Person",
        "name": username,
        "identifier": username
      }
    });
  }

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{fullTitle}</title>
      <meta name='description' content={description} />
      <meta name='keywords' content={keywords} />
      {username && <meta name='author' content={username} />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={url} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />

      {schemaOrgJSONLD.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};
