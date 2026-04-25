import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  name?: string;
  type?: string;
  image?: string;
  username?: string;
  repoName?: string;
}

export const SEO = ({ 
  title, 
  description = "NexusVault - Next-generation decentralized source code management and collaboration platform.", 
  name = "NexusVault", 
  type = "website",
  image = "/nexusvault_red_logo.png",
  username,
  repoName
}: SEOProps) => {
  const fullTitle = title ? `${title} | NexusVault` : "NexusVault - Decentralized Collaboration Platform";
  const url = window.location.href;

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

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Structured Data */}
      {schemaOrgJSONLD.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};
