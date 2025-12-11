export interface RepoInfo {
  owner: string;
  name: string;
  url: string;
  defaultBranch?: string;
}

export interface AnalysisResult {
  summary: string;
  runtime: 'node' | 'python' | 'go' | 'other' | 'unknown';
}

export interface FileExcerpt {
  path: string;
  excerpt: string;
  size: number;
}

export interface ComponentInfo {
  name: string;
  path: string;
  role: string;
  confidence?: 'high' | 'medium' | 'low';
  evidence?: string;
}

export interface EntryPointInfo {
  path: string;
  reason: string;
}

export interface ArchitectureAnalysis {
  summary: string;
  runtime: 'node' | 'python' | 'go' | 'other';
  components: ComponentInfo[];
  entry_points: EntryPointInfo[];
}

export interface SymbolDefinition {
  file: string;
  symbol: string;
  kind: 'function' | 'class' | 'variable' | 'interface' | 'type' | 'other';
  signature: string;
  description: string;
  dependencies: string[];
  notes?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export interface StaticAnalysisData {
  results: {
    path: string;
    symbols: SymbolDefinition[];
  }[];
}

export interface DeepScanData {
  languages: Record<string, number>;
  files: FileExcerpt[];
  architecture?: ArchitectureAnalysis;
}

export interface SetupDetection {
  install: string[];
  test: string[];
  env: { name: string; hint: string }[];
  notes: string;
  confidence?: 'high' | 'medium' | 'low';
  evidence?: string;
}

export interface Pitfall {
  issue: string;
  severity: 'high' | 'medium' | 'low';
  remediation: string;
}

export interface SandboxResult {
  rawOutput: string;
  summary: string;
  failures: string[];
  fixes: string[];
  status: 'passed' | 'failed' | 'error';
}

export interface ScreenshotAnalysisResult {
  summary: string;
  probable_path: string;
  responsibilities: string;
  dependencies: string[];
  issues: string[];
}

export interface ProcessingLog {
  step: 'idle' | 'validating' | 'cloning' | 'reading' | 'summarizing' | 'scanning' | 'architecting' | 'analyzing_symbols' | 'detecting_setup' | 'analyzing_pitfalls' | 'generating_wiki' | 'running_sandbox' | 'complete' | 'error';
  message: string;
}

export interface IconProps {
  className?: string;
  size?: number;
}

// Cache Structure
export interface CachedRepoData {
  timestamp: number;
  repoInfo: RepoInfo;
  readme: string;
  analysisResult: AnalysisResult;
  deepScanData: DeepScanData;
  setupData: SetupDetection;
  pitfalls: Pitfall[];
  staticAnalysisData: StaticAnalysisData | null;
  wikiMarkdown: string;
  dependencyFiles: FileExcerpt[];
}