const extensionToLanguage: Record<string, string> = {
  '.js': 'JavaScript',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.jsx': 'JavaScript',
  '.py': 'Python',
  '.java': 'Java',
  '.cpp': 'C++',
  '.c': 'C',
  '.go': 'Go',
  '.rs': 'Rust',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.html': 'HTML',
  '.css': 'CSS',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.dart': 'Dart',
};

export function detectLanguage(files: string[]): string | null {
  if (files.length === 0) return null;

  const counts: Record<string, number> = {};
  
  for (const file of files) {
    const ext = file.slice(file.lastIndexOf('.')).toLowerCase();
    const lang = extensionToLanguage[ext];
    if (lang) {
      counts[lang] = (counts[lang] || 0) + 1;
    }
  }

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : null;
}
