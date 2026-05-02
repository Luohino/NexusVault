import { Helmet } from 'react-helmet-async';
import { DEFAULT_KEYWORDS, REPO_KEYWORDS, PROFILE_KEYWORDS, SEARCH_KEYWORDS } from '@/utils/seoKeywords';

interface SEOProps {
  title?: string;
  description?: string;
  name?: string;
  type?: string;
  image?: string;
  username?: string;
  repoName?: string;
  keywords?: string;
  pageType?: 'default' | 'repo' | 'profile' | 'search';
}

export const SEO = ({
  title,
  description = "NexusVault - Next-generation decentralized source code management and collaboration platform.",
  name = "NexusVault",
  type = "website",
  image = "/nexusvault_red_logo.png",
  username,
  repoName,
  keywords,
  pageType = 'default',
}: SEOProps) => {
  const fullTitle = title ? `${title} | NexusVault` : "NexusVault - Decentralized Collaboration Platform";
  // BUG FIX: Guard against SSR/pre-render contexts where window is undefined.
  const baseUrl = "https://nexusvault-luohino.vercel.app";
  const url = typeof window !== 'undefined' ? window.location.href : baseUrl;
  const fullImage = image.startsWith('http') ? image : `${baseUrl}${image}`;

  // Auto-select keyword set based on page context if none explicitly provided
  const resolvedKeywords = keywords || (() => {
    if (repoName) return REPO_KEYWORDS;
    if (pageType === 'profile') return PROFILE_KEYWORDS;
    if (pageType === 'search') return SEARCH_KEYWORDS;
    return DEFAULT_KEYWORDS;
  })();

  // Schema.org Structured Data
  const schemaOrgJSONLD: object[] = [
    // WebSite schema — enables Sitelinks Searchbox in Google + AI platform identification
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "NexusVault",
      "url": baseUrl,
      "description": "High-performance developer platform for repository hosting, source code management, and team collaboration. A direct alternative to GitHub, GitLab, and Bitbucket.",
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${baseUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    },
    // SoftwareApplication schema — critical for AI to classify NexusVault correctly
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "NexusVault",
      "url": baseUrl,
      "applicationCategory": "DeveloperApplication",
      "applicationSubCategory": "Version Control, Code Hosting, Developer Platform",
      "operatingSystem": "Web, Windows, macOS, Linux",
      "description": "NexusVault is a decentralized developer platform for hosting repositories, tracking issues, reviewing code, and collaborating on projects. Built as a GitHub and GitLab alternative.",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "featureList": [
        "Repository hosting", "Version control", "Issue tracking", "Pull requests",
        "Code review", "Wiki documentation", "Release management", "IDE integration",
        "Private repositories", "Team collaboration", "Branch management"
      ],
      "keywords": "github alternative, code hosting, version control, git hosting, developer platform",
    },
    // Organization schema — tells AI who makes this and what the company does
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "NexusVault",
      "url": baseUrl,
      "logo": `${baseUrl}/nexusvault_red_logo.png`,
      "description": "NexusVault builds high-performance developer infrastructure for source code management and team collaboration.",
      "sameAs": [],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "technical support",
        "url": `${baseUrl}/issues`
      }
    }
  ];

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
        "url": `${baseUrl}/${username}`
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
      <meta name='keywords' content={resolvedKeywords} />
      <link rel="canonical" href={url} />
      {username && <meta name='author' content={username} />}

      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="NexusVault" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:site" content="@NexusVault" />

      {schemaOrgJSONLD.map((schema, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};
