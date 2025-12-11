import { RepoInfo, FileExcerpt } from '../types';

const GITHUB_API_BASE = 'https://api.github.com/repos';

export const parseGithubUrl = (url: string): RepoInfo | null => {
  try {
    const trimmed = url.trim();
    // Regex to capture owner and repo name
    const regex = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = trimmed.match(regex);

    if (match && match.length >= 3) {
      return {
        owner: match[1],
        name: match[2].replace('.git', ''), // Remove .git if present
        url: trimmed
      };
    }
    return null;
  } catch (e) {
    return null;
  }
};

// Helper to decode Base64 UTF-8 strings properly
const b64DecodeUnicode = (str: string): string => {
  try {
    return decodeURIComponent(
      Array.prototype.map
        .call(
          atob(str.replace(/\s/g, '')), // Remove whitespace/newlines from base64
          function (c: string) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }
        )
        .join('')
    );
  } catch (e) {
    console.error("Decoding error", e);
    // Simple fallback
    return atob(str.replace(/\s/g, ''));
  }
};

const fetchJson = async (url: string) => {
  const response = await fetch(url, {
    headers: { 'Accept': 'application/vnd.github.v3+json' }
  });
  if (!response.ok) {
    if (response.status === 403) throw new Error("GitHub API rate limit exceeded.");
    if (response.status === 404) throw new Error("Resource not found.");
    throw new Error(`GitHub API error: ${response.statusText}`);
  }
  return response.json();
};

export const fetchRepoReadme = async (repo: RepoInfo): Promise<string> => {
  const endpoint = `${GITHUB_API_BASE}/${repo.owner}/${repo.name}/readme`;
  const data = await fetchJson(endpoint);
  if (!data.content) throw new Error("Repository empty or unreadable.");
  return b64DecodeUnicode(data.content);
};

export const fetchRepoDetails = async (repo: RepoInfo): Promise<RepoInfo> => {
  const endpoint = `${GITHUB_API_BASE}/${repo.owner}/${repo.name}`;
  const data = await fetchJson(endpoint);
  return { ...repo, defaultBranch: data.default_branch };
};

export const fetchRepoLanguages = async (repo: RepoInfo): Promise<Record<string, number>> => {
  const endpoint = `${GITHUB_API_BASE}/${repo.owner}/${repo.name}/languages`;
  return await fetchJson(endpoint);
};

export const fetchFullFileContent = async (repo: RepoInfo, path: string): Promise<string> => {
   try {
      const contentUrl = `${GITHUB_API_BASE}/${repo.owner}/${repo.name}/contents/${path}`;
      const fileData = await fetchJson(contentUrl);
      if (!fileData.content) return "";
      return b64DecodeUnicode(fileData.content);
   } catch (e) {
      // Quiet fail for optional files
      return "";
   }
};

export const fetchDependencyFiles = async (repo: RepoInfo): Promise<FileExcerpt[]> => {
  // Try to fetch common dependency manifests
  const targets = [
    'package.json',
    'package-lock.json',
    'requirements.txt',
    'pyproject.toml',
    'setup.py',
    'Gemfile',
    'go.mod',
    'Cargo.toml',
    'Dockerfile',
    'docker-compose.yml',
    'Makefile'
  ];

  const results: FileExcerpt[] = [];
  
  // We use Promise.allSettled-like behavior manually or parallel execution
  // Since we want to be fast, we can fire them all. 404s are expected.
  const promises = targets.map(async (target) => {
    const content = await fetchFullFileContent(repo, target);
    if (content) {
      return {
        path: target,
        excerpt: content.substring(0, 3000), // Larger excerpt for deps
        size: content.length
      };
    }
    return null;
  });

  const files = await Promise.all(promises);
  return files.filter((f): f is FileExcerpt => f !== null);
};

export const fetchTopRepoFiles = async (repo: RepoInfo): Promise<FileExcerpt[]> => {
  if (!repo.defaultBranch) {
    throw new Error("Default branch not found");
  }

  // 1. Get Tree (Recursive)
  const treeUrl = `${GITHUB_API_BASE}/${repo.owner}/${repo.name}/git/trees/${repo.defaultBranch}?recursive=1`;
  const treeData = await fetchJson(treeUrl);
  
  if (!treeData.tree || !Array.isArray(treeData.tree)) {
    return [];
  }

  // 2. Filter & Sort files
  const interestingExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.rb', '.php', '.json', '.toml', '.yaml', '.yml', '.md'];
  const excludePatterns = ['node_modules', 'dist', 'build', 'coverage', 'package-lock.json', 'yarn.lock', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.git/'];

  const allFiles = treeData.tree.filter((item: any) => {
    if (item.type !== 'blob') return false; // files only
    if (excludePatterns.some(p => item.path.includes(p))) return false;
    const hasExtension = interestingExtensions.some(ext => item.path.endsWith(ext));
    const isConfig = ['Dockerfile', 'Makefile', 'Gemfile'].includes(item.path.split('/').pop());
    return hasExtension || isConfig;
  });

  // Simple scoring for "importance"
  const scoreFile = (path: string): number => {
    let score = 0;
    if (path.startsWith('src/')) score += 10;
    if (path.startsWith('app/')) score += 10;
    if (path.startsWith('lib/')) score += 8;
    if (path.includes('main')) score += 5;
    if (path.includes('index')) score += 5;
    if (path.includes('server')) score += 5;
    if (path.includes('App')) score += 5;
    if (path.split('/').length < 3) score += 2; // Closer to root is often important
    return score;
  };

  const sortedFiles = allFiles.sort((a: any, b: any) => scoreFile(b.path) - scoreFile(a.path));

  // Take top 12 files
  const topFiles = sortedFiles.slice(0, 12);

  // 3. Fetch content in parallel
  const excerpts: FileExcerpt[] = await Promise.all(topFiles.map(async (file: any) => {
    try {
      const contentUrl = `${GITHUB_API_BASE}/${repo.owner}/${repo.name}/contents/${file.path}`;
      const fileData = await fetchJson(contentUrl);
      
      const rawContent = b64DecodeUnicode(fileData.content);
      const limit = 500;
      const excerpt = rawContent.length > limit 
        ? rawContent.substring(0, limit) + `... [truncated]` 
        : rawContent;

      return {
        path: file.path,
        excerpt,
        size: file.size
      };
    } catch (e) {
      console.warn(`Failed to fetch content for ${file.path}`, e);
      return { path: file.path, excerpt: "(Read failed)", size: file.size || 0 };
    }
  }));

  return excerpts.filter(f => f.excerpt !== "(Read failed)");
};