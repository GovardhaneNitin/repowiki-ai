import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  parseGithubUrl, 
  fetchRepoReadme, 
  fetchRepoDetails, 
  fetchRepoLanguages, 
  fetchTopRepoFiles,
  fetchFullFileContent,
  fetchDependencyFiles
} from './services/githubService';
import { 
  summarizeRepo, 
  analyzeArchitecture, 
  analyzeCodeSymbols, 
  generateWiki, 
  detectSetup,
  analyzePitfalls,
  runSandboxSimulation,
  summarizeTestOutput,
  analyzeScreenshot
} from './services/geminiService';
import { DEMO_DATA_REACT } from './services/demoData';
import { 
  AnalysisResult, 
  ProcessingLog, 
  DeepScanData, 
  StaticAnalysisData, 
  SetupDetection,
  Pitfall,
  SandboxResult,
  CachedRepoData,
  ScreenshotAnalysisResult
} from './types';
import { 
  LoaderIcon, 
  CheckCircleIcon, 
  AlertCircleIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  GithubIcon,
  TerminalIcon,
  FileIcon,
  ServerIcon,
  CodeIcon,
  WikiIcon,
  DownloadIcon,
  CopyIcon,
  BeakerIcon,
  PlayIcon,
  ShieldIcon,
  XIcon,
  ImageIcon,
  UploadIcon,
  BookOpenIcon
} from './components/Icons';

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [currentStep, setCurrentStep] = useState<ProcessingLog['step']>('idle');
  const [logMessage, setLogMessage] = useState<string>('');
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [deepScanData, setDeepScanData] = useState<DeepScanData | null>(null);
  const [staticAnalysisData, setStaticAnalysisData] = useState<StaticAnalysisData | null>(null);
  const [setupData, setSetupData] = useState<SetupDetection | null>(null);
  const [pitfalls, setPitfalls] = useState<Pitfall[]>([]);
  const [wikiMarkdown, setWikiMarkdown] = useState<string>('');
  const [dependencyFiles, setDependencyFiles] = useState<any[]>([]);
  const [cachedData, setCachedData] = useState<CachedRepoData | null>(null);

  const [rawReadme, setRawReadme] = useState<string>('');
  const [isRawExpanded, setIsRawExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFileIndex, setExpandedFileIndex] = useState<number | null>(0);

  // Sandbox State
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [sandboxResult, setSandboxResult] = useState<SandboxResult | null>(null);
  const [isSandboxRunning, setIsSandboxRunning] = useState(false);

  // Screenshot Analysis State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [screenshotAnalysis, setScreenshotAnalysis] = useState<ScreenshotAnalysisResult | null>(null);
  const [isAnalyzingScreenshot, setIsAnalyzingScreenshot] = useState(false);

  // Intro Modal State
  const [showIntroModal, setShowIntroModal] = useState(true);

  // Load cache on mount
  useEffect(() => {
    const saved = localStorage.getItem('repoWikiCache');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Expire after 1 hour
        if (Date.now() - parsed.timestamp < 3600000) {
          // We don't auto-load into view, but we keep it ready
          // setCachedData(parsed);
        }
      } catch (e) {
        localStorage.removeItem('repoWikiCache');
      }
    }
  }, []);

  const saveToCache = (data: Partial<CachedRepoData>) => {
    // We only support single repo cache for simplicity in this demo
    // Ideally map[url] -> data
    const payload = {
       timestamp: Date.now(),
       repoInfo: data.repoInfo!,
       readme: rawReadme,
       analysisResult: analysisResult!,
       deepScanData: deepScanData!,
       setupData: setupData!,
       pitfalls: pitfalls,
       staticAnalysisData: staticAnalysisData,
       wikiMarkdown: wikiMarkdown,
       dependencyFiles: dependencyFiles,
       ...data
    };
    try {
      localStorage.setItem('repoWikiCache', JSON.stringify(payload));
    } catch (e) {
      console.warn("Cache quota exceeded");
    }
  };

  const loadDemoData = () => {
    const data = DEMO_DATA_REACT;
    setUrl(data.repoInfo.url);
    setAnalysisResult(data.analysisResult);
    setDeepScanData(data.deepScanData);
    setSetupData(data.setupData);
    setPitfalls(data.pitfalls);
    setStaticAnalysisData(data.staticAnalysisData);
    setWikiMarkdown(data.wikiMarkdown);
    setRawReadme(data.readme);
    setCurrentStep('complete');
    setLogMessage('Loaded Demo Data');
    setShowIntroModal(false);
  };

  const handleAnalyze = async (skipCache = false) => {
    // Check cache first
    const saved = localStorage.getItem('repoWikiCache');
    let repoInfo = parseGithubUrl(url);
    if (!repoInfo) {
      setCurrentStep('error');
      setError('Invalid GitHub URL. Format: https://github.com/owner/repo');
      return;
    }

    if (!skipCache && saved) {
      const parsed = JSON.parse(saved);
      if (parsed.repoInfo.name === repoInfo.name && parsed.repoInfo.owner === repoInfo.owner) {
        setAnalysisResult(parsed.analysisResult);
        setDeepScanData(parsed.deepScanData);
        setSetupData(parsed.setupData);
        setPitfalls(parsed.pitfalls);
        setStaticAnalysisData(parsed.staticAnalysisData);
        setWikiMarkdown(parsed.wikiMarkdown);
        setRawReadme(parsed.readme);
        setDependencyFiles(parsed.dependencyFiles || []);
        setCurrentStep('complete');
        setLogMessage('Restored from Cache');
        return;
      }
    }

    // Reset state
    setError(null);
    setAnalysisResult(null);
    setDeepScanData(null);
    setStaticAnalysisData(null);
    setSetupData(null);
    setPitfalls([]);
    setWikiMarkdown('');
    setRawReadme('');
    setIsRawExpanded(false);
    setExpandedFileIndex(0);
    setSandboxResult(null);
    
    setCurrentStep('validating');
    setLogMessage('Validating URL format...');
    await new Promise(r => setTimeout(r, 500));

    try {
      setCurrentStep('cloning');
      setLogMessage(`Cloning ${repoInfo.owner}/${repoInfo.name}...`);
      repoInfo = await fetchRepoDetails(repoInfo);

      setCurrentStep('reading');
      setLogMessage('Reading README.md...');
      const readmeContent = await fetchRepoReadme(repoInfo);
      setRawReadme(readmeContent);
      
      setCurrentStep('summarizing');
      setLogMessage('Analyzing README with Gemini 3 Pro...');
      const result = await summarizeRepo(readmeContent);
      setAnalysisResult(result);

      setCurrentStep('scanning');
      setLogMessage('Scanning file structure & identifying languages...');
      const [languages, files, deps] = await Promise.all([
        fetchRepoLanguages(repoInfo),
        fetchTopRepoFiles(repoInfo),
        fetchDependencyFiles(repoInfo)
      ]);
      setDependencyFiles(deps);
      setDeepScanData({ languages, files, architecture: undefined });

      setCurrentStep('detecting_setup');
      setLogMessage('Detecting build/test commands...');
      const setup = await detectSetup(deps);
      setSetupData(setup);

      setCurrentStep('analyzing_pitfalls');
      setLogMessage('Checking for common runtime pitfalls...');
      const allFilesForContext = [...deps, ...files].slice(0, 15);
      const pitfallsResult = await analyzePitfalls(allFilesForContext);
      setPitfalls(pitfallsResult);

      let entryPoints: string[] = [];
      let archData: any = undefined;
      if (files.length > 0) {
        setCurrentStep('architecting');
        setLogMessage('Architecting system overview...');
        const architecture = await analyzeArchitecture(files);
        archData = architecture;
        setDeepScanData(prev => prev ? { ...prev, architecture } : null);
        
        entryPoints = architecture.entry_points.map(ep => ep.path);
        if (entryPoints.length < 2) {
           entryPoints = [...entryPoints, ...files.slice(0, 3).map(f => f.path)];
        }
        entryPoints = Array.from(new Set(entryPoints)).slice(0, 3);
      }

      const staticResults = [];
      if (entryPoints.length > 0) {
        setCurrentStep('analyzing_symbols');
        setLogMessage('Deep Static Analysis of key components...');
        for (const filePath of entryPoints) {
          setLogMessage(`Analyzing symbols in ${filePath}...`);
          const content = await fetchFullFileContent(repoInfo, filePath);
          if (content) {
            const symbols = await analyzeCodeSymbols(filePath, content);
            staticResults.push({ path: filePath, symbols });
          }
        }
        setStaticAnalysisData({ results: staticResults });
      }

      setCurrentStep('generating_wiki');
      setLogMessage('Synthesizing comprehensive Wiki documentation...');
      const wiki = await generateWiki(readmeContent, archData, { results: staticResults }, deps);
      setWikiMarkdown(wiki);

      // Save to cache at the end
      saveToCache({
         repoInfo, 
         readme: readmeContent, 
         analysisResult: result, 
         deepScanData: { languages, files, architecture: archData },
         setupData: setup,
         pitfalls: pitfallsResult,
         staticAnalysisData: { results: staticResults },
         wikiMarkdown: wiki,
         dependencyFiles: deps
      });

      setCurrentStep('complete');
      setLogMessage('Full analysis complete.');

    } catch (err: any) {
      setCurrentStep('error');
      setError(err.message || 'An unexpected error occurred.');
    }
  };

  const runSandbox = async () => {
    if (!setupData || !deepScanData) return;
    setIsSandboxRunning(true);
    setCurrentStep('running_sandbox');
    setLogMessage('Initializing Sandbox Environment...');
    
    try {
      const testCmd = setupData.test.length > 0 ? setupData.test[0] : 'npm test';
      setLogMessage(`Running: ${testCmd} (Simulated)...`);
      await new Promise(r => setTimeout(r, 1500)); // Fake boot delay

      const contextFiles = [...(deepScanData.files || [])];
      const rawOutput = await runSandboxSimulation(contextFiles, testCmd);
      setLogMessage('Analyzing test output...');
      
      const summary = await summarizeTestOutput(rawOutput);
      setSandboxResult(summary);
      setCurrentStep('complete');
      setLogMessage('Sandbox run finished.');
    } catch (e) {
      setSandboxResult({ 
        rawOutput: 'Error running simulation', 
        summary: 'Failed to run.', 
        failures: [], 
        fixes: [], 
        status: 'error' 
      });
    } finally {
      setIsSandboxRunning(false);
      setShowSandboxModal(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Create preview URL
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
      setScreenshotAnalysis(null);

      // Convert to Base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        // Remove data URL prefix for API
        const base64Data = base64String.split(',')[1];
        setSelectedImageBase64(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeScreenshot = async () => {
    if (!selectedImageBase64) return;
    setIsAnalyzingScreenshot(true);
    setScreenshotAnalysis(null);
    try {
       // Assuming standard image type for simplicity or extract from file input
       const result = await analyzeScreenshot(selectedImageBase64, 'image/jpeg');
       setScreenshotAnalysis(result);
    } catch (e) {
       console.error(e);
       alert("Failed to analyze screenshot. Please try again.");
    } finally {
       setIsAnalyzingScreenshot(false);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!wikiMarkdown) return;
    const blob = new Blob([wikiMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'WIKI.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadHTML = () => {
    if (!wikiMarkdown) return;
    // Simple HTML wrap
    const htmlContent = `<!DOCTYPE html>
<html><head><title>RepoWiki Export</title>
<style>body{font-family:sans-serif;max-width:800px;margin:2rem auto;line-height:1.6;padding:0 1rem;}pre{background:#f4f4f5;padding:1rem;overflow-x:auto;border-radius:0.5rem;}code{font-family:monospace;background:#f4f4f5;padding:0.2rem 0.4rem;border-radius:0.2rem;}</style>
</head><body>
<!-- Content would ideally be rendered markdown, here raw for simplicity unless we pull a parser lib -->
<pre>${wikiMarkdown}</pre>
</body></html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wiki.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  };

  const ConfidenceBadge: React.FC<{ level?: 'high'|'medium'|'low', evidence?: string }> = ({ level, evidence }) => {
    if (!level) return null;
    const colors = {
      high: 'bg-green-100 text-green-700 border-green-200',
      medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      low: 'bg-red-100 text-red-700 border-red-200'
    };
    return (
      <span title={evidence ? `Source: ${evidence}` : 'AI Inferred'} className={`ml-2 text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wider cursor-help ${colors[level]}`}>
        {level} Conf.
      </span>
    );
  };

  const stepsList = ['validating', 'cloning', 'reading', 'summarizing', 'scanning', 'detecting_setup', 'architecting', 'analyzing_symbols', 'generating_wiki', 'complete'];
  const getStepLabel = (step: string) => {
    if (step === 'detecting_setup') return 'Setup Detect';
    if (step === 'analyzing_symbols') return 'Deep Static';
    if (step === 'generating_wiki') return 'Wiki Gen';
    return step.charAt(0).toUpperCase() + step.slice(1);
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans selection:bg-blue-100 pb-20 relative flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-2 rounded-lg shadow-sm">
              <BookOpenIcon size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-zinc-800 hidden sm:block">
              RepoWiki <span className="text-blue-600">AI</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <button onClick={() => setShowIntroModal(true)} className="text-xs font-medium text-zinc-500 hover:text-blue-600">Help</button>
             <span className="text-xs font-medium px-2 py-1 bg-zinc-100 rounded text-zinc-500 border border-zinc-200">
              Gemini 3 Pro
             </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 flex-grow">
        
        {/* Input Section */}
        <div className="bg-white p-2 rounded-xl shadow-md border border-zinc-200 flex flex-col sm:flex-row gap-2 mb-8 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 max-w-3xl mx-auto">
          <div className="flex-grow relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <GithubIcon className="text-zinc-400" size={20} />
            </div>
            <input
              type="text"
              placeholder="https://github.com/facebook/react"
              className="block w-full pl-10 pr-3 py-3 text-zinc-900 placeholder-zinc-400 bg-transparent border-none focus:ring-0 focus:outline-none"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze(false)}
            />
          </div>
          <button
            onClick={() => handleAnalyze(false)}
            disabled={currentStep !== 'idle' && currentStep !== 'complete' && currentStep !== 'error'}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 min-w-[120px]"
          >
            {(currentStep !== 'idle' && currentStep !== 'complete' && currentStep !== 'error') ? (
              <LoaderIcon className="animate-spin" size={20} />
            ) : (
              'Analyze'
            )}
          </button>
        </div>

        {currentStep === 'idle' && !analysisResult && (
           <div className="text-center mt-4 mb-8">
              <p className="text-xs text-zinc-400 mb-2">Or try a demo:</p>
              <button onClick={loadDemoData} className="px-3 py-1 bg-white border border-zinc-200 hover:border-blue-300 text-zinc-600 rounded-full text-xs shadow-sm transition-all hover:shadow-md">
                facebook/react (Pre-cached)
              </button>
           </div>
        )}

        {/* Status Area */}
        {currentStep !== 'idle' && (
          <div className="mb-10 bg-zinc-50 rounded-lg border border-zinc-200 overflow-hidden max-w-3xl mx-auto">
            <div className="p-4 border-b border-zinc-100 bg-white/50 flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-700">Progress</span>
              <div className="flex items-center gap-3">
                {currentStep === 'complete' && (
                  <button onClick={() => handleAnalyze(true)} className="text-[10px] text-blue-600 hover:underline">
                    Refresh Analysis
                  </button>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${
                  currentStep === 'error' ? 'bg-red-100 text-red-700' : 
                  currentStep === 'complete' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'
                }`}>
                  {currentStep === 'error' ? <AlertCircleIcon size={12}/> : 
                   currentStep === 'complete' ? <CheckCircleIcon size={12}/> : <LoaderIcon size={12}/>}
                  {logMessage}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 p-4">
              {stepsList.filter(s => s !== 'error').map((label, idx) => {
                const stepKey = label as ProcessingLog['step'];
                const stepIndex = stepsList.indexOf(stepKey);
                const currentIndex = stepsList.indexOf(currentStep);
                
                const isActive = currentStep === stepKey;
                const isDone = currentIndex > stepIndex || currentStep === 'complete';
                
                return (
                  <div key={label} className="flex flex-col items-center gap-2 text-center">
                    <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                      isActive ? 'bg-blue-500 scale-150' : 
                      isDone ? 'bg-green-500' : 'bg-zinc-200'
                    }`} />
                    <span className={`text-[9px] leading-tight truncate w-full ${
                      isActive ? 'text-blue-700 font-bold' : 
                      isDone ? 'text-green-700' : 'text-zinc-400'
                    }`}>
                      {getStepLabel(label)}
                    </span>
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="p-4 bg-red-50 border-t border-red-100 text-red-600 text-sm flex items-start gap-3 animate-fade-in">
                <AlertCircleIcon className="mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        )}

        {/* --- MAIN CONTENT AREA --- */}
        <div className="space-y-8 animate-fade-in-up">
          
          {/* Setup & Environment + Pitfalls */}
          {(setupData || pitfalls.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Setup Card */}
              <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                    <BeakerIcon size={16}/> Setup & Env
                  </h4>
                  {setupData?.confidence && <ConfidenceBadge level={setupData.confidence} evidence={setupData.evidence} />}
                  {setupData?.test && setupData.test.length > 0 && (
                     <button 
                       onClick={() => setShowSandboxModal(true)}
                       className="ml-auto text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
                     >
                       <PlayIcon size={12} /> Run Quick Test
                     </button>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-zinc-500 font-semibold mb-1 block">Install</span>
                    {setupData?.install?.map((cmd, i) => (
                      <div key={i} className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded p-2 group">
                        <code className="text-xs text-pink-600 font-mono flex-1">{cmd}</code>
                        <button onClick={() => copyToClipboard(cmd)} className="text-zinc-400 hover:text-zinc-600">
                          <CopyIcon size={12}/>
                        </button>
                      </div>
                    ))}
                    {(!setupData?.install || setupData.install.length === 0) && <span className="text-xs text-zinc-400">No install commands detected</span>}
                  </div>

                  <div>
                    <span className="text-xs text-zinc-500 font-semibold mb-1 block">Test</span>
                    {setupData?.test?.map((cmd, i) => (
                      <div key={i} className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded p-2">
                        <code className="text-xs text-blue-600 font-mono flex-1">{cmd}</code>
                        <button onClick={() => copyToClipboard(cmd)} className="text-zinc-400 hover:text-zinc-600">
                          <CopyIcon size={12}/>
                        </button>
                      </div>
                    ))}
                  </div>

                  {setupData?.env && setupData.env.length > 0 && (
                    <div>
                      <span className="text-xs text-zinc-500 font-semibold mb-1 block">Environment Vars</span>
                      <div className="flex flex-wrap gap-2">
                        {setupData.env.map((e, i) => (
                          <span key={i} className="text-[10px] px-2 py-1 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded" title={e.hint}>
                            {e.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Pitfalls Card */}
              <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
                <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                  <ShieldIcon size={16}/> Pitfalls & Fixes
                </h4>
                <div className="space-y-3">
                  {pitfalls.map((p, i) => (
                    <div key={i} className="p-3 rounded-lg border border-zinc-100 bg-zinc-50">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-zinc-700">{p.issue}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          p.severity === 'high' ? 'bg-red-100 text-red-600' :
                          p.severity === 'medium' ? 'bg-orange-100 text-orange-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>{p.severity.toUpperCase()}</span>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">{p.remediation}</p>
                    </div>
                  ))}
                  {pitfalls.length === 0 && <p className="text-xs text-zinc-400">No obvious pitfalls detected.</p>}
                </div>
              </div>
            </div>
          )}

          {/* Sandbox Results */}
          {sandboxResult && (
            <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-lg animate-fade-in-up">
              <div className={`p-4 border-b flex items-center justify-between ${
                sandboxResult.status === 'passed' ? 'bg-green-50 border-green-100' :
                sandboxResult.status === 'failed' ? 'bg-red-50 border-red-100' : 'bg-zinc-50 border-zinc-100'
              }`}>
                <div className="flex items-center gap-2">
                   <div className={`p-1.5 rounded-md ${
                      sandboxResult.status === 'passed' ? 'bg-green-200 text-green-700' :
                      sandboxResult.status === 'failed' ? 'bg-red-200 text-red-700' : 'bg-zinc-200 text-zinc-600'
                   }`}>
                      <BeakerIcon size={16} />
                   </div>
                   <h3 className={`text-sm font-bold ${
                      sandboxResult.status === 'passed' ? 'text-green-900' :
                      sandboxResult.status === 'failed' ? 'text-red-900' : 'text-zinc-700'
                   }`}>Sandbox Simulation Result: {sandboxResult.status.toUpperCase()}</h3>
                </div>
                <button onClick={() => setSandboxResult(null)} className="text-zinc-400 hover:text-zinc-600"><XIcon size={16}/></button>
              </div>
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <h4 className="text-xs font-bold text-zinc-400 uppercase mb-2">Analysis Summary</h4>
                   <p className="text-sm text-zinc-700 mb-4">{sandboxResult.summary}</p>
                   {sandboxResult.failures.length > 0 && (
                     <div className="mb-4">
                       <h5 className="text-xs font-bold text-red-500 mb-1">Failures</h5>
                       <ul className="list-disc list-outside ml-4 text-xs text-zinc-600 space-y-1">
                         {sandboxResult.failures.map((f, i) => <li key={i}>{f}</li>)}
                       </ul>
                     </div>
                   )}
                   {sandboxResult.fixes.length > 0 && (
                     <div>
                       <h5 className="text-xs font-bold text-emerald-600 mb-1">Suggested Fixes</h5>
                       <ul className="list-disc list-outside ml-4 text-xs text-zinc-600 space-y-1">
                         {sandboxResult.fixes.map((f, i) => <li key={i}>{f}</li>)}
                       </ul>
                     </div>
                   )}
                </div>
                <div className="bg-zinc-900 rounded-lg p-4 overflow-x-auto">
                   <h4 className="text-xs font-bold text-zinc-500 uppercase mb-2">Raw Output</h4>
                   <pre className="text-[10px] font-mono text-zinc-300 whitespace-pre-wrap">{sandboxResult.rawOutput}</pre>
                </div>
              </div>
            </div>
          )}

          {/* Wiki Card */}
          {wikiMarkdown && (
             <div className="bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden relative">
               <div className="bg-zinc-50 border-b border-zinc-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-pink-100 text-pink-700 rounded-lg">
                      <WikiIcon size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900">Generated Wiki</h3>
                      <p className="text-xs text-zinc-500">Synthesized from codebase & README</p>
                    </div>
                 </div>
                 <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={handleDownloadMarkdown}
                      className="flex-1 sm:flex-none items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium border border-zinc-200 rounded-lg transition-colors flex"
                    >
                      <DownloadIcon size={14} /> .md
                    </button>
                    <button 
                      onClick={handleDownloadHTML}
                      className="flex-1 sm:flex-none items-center justify-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium border border-zinc-900 rounded-lg transition-colors flex"
                    >
                      <DownloadIcon size={14} /> .html
                    </button>
                 </div>
               </div>

               <div className="p-8 prose prose-zinc prose-sm max-w-none">
                  <ReactMarkdown 
                    components={{
                      code({node, inline, className, children, ...props}: any) {
                        return !inline ? (
                          <pre className="bg-zinc-100 p-4 rounded-lg overflow-x-auto border border-zinc-200 text-sm text-zinc-800">
                            <code {...props} className={className}>
                              {children}
                            </code>
                          </pre>
                        ) : (
                          <code {...props} className="bg-zinc-100 px-1 py-0.5 rounded text-pink-600 font-mono text-xs">
                            {children}
                          </code>
                        )
                      },
                      h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-zinc-900 mb-6 pb-2 border-b border-zinc-100" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-zinc-800 mt-8 mb-4" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-xl font-semibold text-zinc-800 mt-6 mb-3" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 space-y-1 text-zinc-600" {...props} />,
                      a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
                    }}
                  >
                    {wikiMarkdown}
                  </ReactMarkdown>
               </div>
             </div>
          )}

          {/* Architecture & Static Analysis */}
          {(deepScanData || staticAnalysisData) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-75 hover:opacity-100 transition-opacity duration-300">
               {deepScanData?.architecture && (
                  <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
                    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Architecture</h4>
                    <p className="text-sm text-zinc-700 mb-4 font-medium">{deepScanData.architecture.summary}</p>
                    <div className="space-y-2">
                       {deepScanData.architecture.components.slice(0, 3).map((c, i) => (
                         <div key={i} className="text-xs bg-zinc-50 p-2 rounded border border-zinc-100 text-zinc-600">
                           <span className="font-bold text-zinc-800">{c.name}</span>: {c.role}
                           <ConfidenceBadge level={c.confidence} evidence={c.evidence} />
                         </div>
                       ))}
                    </div>
                  </div>
               )}

               {staticAnalysisData && (
                 <div className="bg-white rounded-xl border border-zinc-200 p-6 shadow-sm">
                    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Analyzed Modules</h4>
                    <div className="space-y-2">
                      {staticAnalysisData.results.map((res, i) => (
                        <div key={i} className="flex justify-between items-center text-xs p-2 hover:bg-zinc-50 rounded cursor-default">
                           <div className="font-mono font-medium text-zinc-700 truncate max-w-[200px]">{res.path}</div>
                           <div className="text-emerald-600 font-medium">{res.symbols.length} symbols</div>
                        </div>
                      ))}
                    </div>
                 </div>
               )}
            </div>
          )}
          
          {/* Raw README */}
          {rawReadme && (
            <div className="border border-zinc-200 rounded-xl bg-white overflow-hidden shadow-sm">
              <button 
                onClick={() => setIsRawExpanded(!isRawExpanded)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-zinc-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-700">Raw README.md</span>
                  <span className="text-xs bg-zinc-100 px-2 py-0.5 rounded text-zinc-500">
                    {rawReadme.length} chars
                  </span>
                </div>
                {isRawExpanded ? <ChevronUpIcon className="text-zinc-400" /> : <ChevronDownIcon className="text-zinc-400" />}
              </button>
              
              {isRawExpanded && (
                <div className="border-t border-zinc-100 bg-zinc-50 p-6 overflow-x-auto">
                  <pre className="text-xs font-mono text-zinc-600 whitespace-pre-wrap break-words max-h-[500px] overflow-y-auto">
                    {rawReadme}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Screenshot-to-Understanding Section */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-blue-100 p-6 shadow-sm mt-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                  <ImageIcon size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                    Screenshot-to-Understanding
                    <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                      NEW • Multimodal AI
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500">Upload a screenshot of code or a GitHub file for instant analysis</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 space-y-4">
                <div className="relative border-2 border-dashed border-indigo-200 rounded-xl p-8 text-center hover:bg-white/50 transition-colors">
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  />
                  <div className="flex flex-col items-center justify-center pointer-events-none">
                    <UploadIcon className="text-indigo-400 mb-2" size={32} />
                    <span className="text-sm font-medium text-indigo-600">Click or Drag to Upload</span>
                    <span className="text-xs text-zinc-400 mt-1">PNG, JPG supported</span>
                  </div>
                </div>

                {selectedImage && (
                   <div className="relative rounded-lg overflow-hidden border border-zinc-200">
                      <img src={selectedImage} alt="Preview" className="w-full h-auto max-h-64 object-contain bg-zinc-900" />
                   </div>
                )}
                
                <button 
                  onClick={handleAnalyzeScreenshot}
                  disabled={!selectedImage || isAnalyzingScreenshot}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-300 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isAnalyzingScreenshot ? <LoaderIcon className="animate-spin" size={20} /> : 'Analyze Screenshot'}
                </button>
              </div>

              {screenshotAnalysis && (
                <div className="flex-[2] bg-white rounded-xl border border-zinc-200 p-6 animate-fade-in">
                   <div className="flex justify-between items-start mb-4">
                      <h4 className="text-sm font-bold text-zinc-800">Analysis Result</h4>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => copyToClipboard(screenshotAnalysis.summary)} 
                          className="text-xs text-zinc-500 hover:text-indigo-600 flex items-center gap-1 bg-zinc-50 px-2 py-1 rounded border border-zinc-100"
                        >
                          <CopyIcon size={12} /> Copy Summary
                        </button>
                        <button 
                          onClick={() => copyToClipboard(JSON.stringify(screenshotAnalysis, null, 2))} 
                          className="text-xs text-zinc-500 hover:text-indigo-600 flex items-center gap-1 bg-zinc-50 px-2 py-1 rounded border border-zinc-100"
                        >
                          <CopyIcon size={12} /> Copy JSON
                        </button>
                      </div>
                   </div>
                   
                   <div className="space-y-4">
                      <div>
                        <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Summary</span>
                        <p className="text-sm text-zinc-800 mt-1 leading-relaxed">{screenshotAnalysis.summary}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-zinc-50 p-3 rounded border border-zinc-100">
                           <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider block mb-1">Probable Path</span>
                           <code className="text-xs font-mono text-indigo-600">{screenshotAnalysis.probable_path || 'Unknown'}</code>
                        </div>
                        <div className="bg-zinc-50 p-3 rounded border border-zinc-100">
                           <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider block mb-1">Role</span>
                           <p className="text-xs text-zinc-700">{screenshotAnalysis.responsibilities}</p>
                        </div>
                      </div>

                      {screenshotAnalysis.dependencies.length > 0 && (
                        <div>
                           <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider block mb-2">Dependencies</span>
                           <div className="flex flex-wrap gap-2">
                             {screenshotAnalysis.dependencies.map((d, i) => (
                               <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-100">{d}</span>
                             ))}
                           </div>
                        </div>
                      )}

                      {screenshotAnalysis.issues.length > 0 && (
                        <div>
                           <span className="text-xs text-zinc-400 uppercase font-bold tracking-wider block mb-2">Potential Issues</span>
                           <ul className="space-y-1">
                             {screenshotAnalysis.issues.map((issue, i) => (
                               <li key={i} className="text-xs text-red-600 flex items-start gap-2">
                                 <span className="mt-1">•</span> {issue}
                               </li>
                             ))}
                           </ul>
                        </div>
                      )}
                   </div>
                   
                   <div className="mt-6 pt-4 border-t border-zinc-100 text-right">
                     <span className="text-[10px] text-zinc-400 italic">Image-based understanding powered by Gemini 3 Pro multimodality.</span>
                   </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 bg-white py-8 mt-12">
         <div className="max-w-5xl mx-auto px-4 flex flex-col items-center text-center">
            <div className="mb-4">
              <p className="text-sm font-medium text-zinc-800">
                Google DeepMind - Vibe Code with Gemini 3 Pro in AI Studio
              </p>
              <p className="text-xs text-zinc-500 mt-1 max-w-lg mx-auto">
                RepoWiki AI generates insights based on public code. Please verify critical commands and outputs before execution.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-4 border-t border-zinc-100 w-full max-w-xs">
              <p className="text-xs text-zinc-400">Made with 💖 by <span className="font-semibold text-zinc-600">Nitin Govardhane</span></p>
            </div>
         </div>
      </footer>

      {/* Sandbox Confirmation Modal */}
      {showSandboxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4 text-zinc-900">
              <div className="p-2 bg-yellow-100 text-yellow-700 rounded-lg">
                <ShieldIcon size={24} />
              </div>
              <h3 className="text-lg font-bold">Sandbox Safety</h3>
            </div>
            <p className="text-sm text-zinc-600 mb-4 leading-relaxed">
              You are about to run a quick test. 
              <br/><br/>
              <strong>Constraints:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-zinc-500">
                <li>Demo Mode: Executed via Gemini Simulation</li>
                <li>Isolated environment (no network access)</li>
                <li>Timeout: 30 seconds</li>
              </ul>
            </p>
            <div className="bg-zinc-50 p-3 rounded border border-zinc-200 mb-6">
              <div className="text-xs font-bold text-zinc-500 uppercase mb-1">Command to run</div>
              <code className="text-sm font-mono text-blue-600">
                {setupData?.test && setupData.test.length > 0 ? setupData.test[0] : 'npm test'}
              </code>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowSandboxModal(false)}
                className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={runSandbox}
                disabled={isSandboxRunning}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isSandboxRunning ? <LoaderIcon className="animate-spin" size={16}/> : 'Confirm & Run'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Intro / Instructions Modal */}
      {showIntroModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-fade-in-up relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-pink-500"></div>
              <button onClick={() => setShowIntroModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600">
                <XIcon size={20} />
              </button>

              <div className="mb-6">
                 <h2 className="text-2xl font-bold text-zinc-900 mb-2">Welcome to RepoWiki AI</h2>
                 <p className="text-zinc-500">Turn any GitHub repository into a comprehensive, interactive Wiki in seconds using Gemini 3 Pro.</p>
              </div>

              <div className="space-y-4 mb-8">
                 <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 font-bold text-sm">1</div>
                    <div>
                       <h4 className="text-sm font-bold text-zinc-800">Paste URL or use Demo</h4>
                       <p className="text-xs text-zinc-500">Enter a public GitHub URL (e.g. facebook/react) or click the "Demo" button.</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 text-purple-600 font-bold text-sm">2</div>
                    <div>
                       <h4 className="text-sm font-bold text-zinc-800">Deep Analysis</h4>
                       <p className="text-xs text-zinc-500">Gemini scans file structure, architecture, and pitfalls.</p>
                    </div>
                 </div>
                 <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0 text-pink-600 font-bold text-sm">3</div>
                    <div>
                       <h4 className="text-sm font-bold text-zinc-800">Export & Share</h4>
                       <p className="text-xs text-zinc-500">Download the generated Wiki as Markdown or HTML.</p>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                 <button onClick={() => setShowIntroModal(false)} className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium transition-colors">
                   Get Started
                 </button>
                 <button onClick={loadDemoData} className="flex-1 py-3 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-lg font-medium transition-colors">
                   Load Demo Repo
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;