import { GoogleGenAI, Type } from "@google/genai";
import { 
  AnalysisResult, 
  FileExcerpt, 
  ArchitectureAnalysis, 
  SymbolDefinition, 
  SetupDetection,
  Pitfall,
  SandboxResult,
  StaticAnalysisData,
  ScreenshotAnalysisResult
} from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = 'gemini-3-pro-preview';

export const summarizeRepo = async (readmeContent: string): Promise<AnalysisResult> => {
  const truncatedContent = readmeContent.length > 8000 
    ? readmeContent.substring(0, 8000) + "\n...[Truncated]..." 
    : readmeContent;

  const prompt = `You are a senior technical summarizer. Given the README text below, return a JSON object with keys: { 'summary': '<1-2 sentence summary>', 'runtime': 'node|python|go|other' }.

  README CONTENT:
  ${truncatedContent}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            runtime: { type: Type.STRING, enum: ["node", "python", "go", "other", "unknown"] }
          },
          required: ["summary", "runtime"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response generated from Gemini.");
    return JSON.parse(text) as AnalysisResult;
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze the repository content.");
  }
};

export const analyzeArchitecture = async (files: FileExcerpt[]): Promise<ArchitectureAnalysis> => {
  const filePrompt = files.map(f => `
--- FILE: ${f.path} ---
${f.excerpt}
  `).join('\n');

  const prompt = `You are a code architect. Given a list of files, produce a JSON object describing the architecture.
  For each component, provide a confidence level (high/medium/low) and cite the specific file or folder used as evidence.

  FILES:
  ${filePrompt}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            runtime: { type: Type.STRING, enum: ["node", "python", "go", "other"] },
            components: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  path: { type: Type.STRING },
                  role: { type: Type.STRING },
                  confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
                  evidence: { type: Type.STRING }
                },
                required: ["name", "path", "role"]
              }
            },
            entry_points: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  path: { type: Type.STRING },
                  reason: { type: Type.STRING }
                },
                required: ["path", "reason"]
              }
            }
          },
          required: ["summary", "runtime", "components", "entry_points"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini.");
    return JSON.parse(text) as ArchitectureAnalysis;
  } catch (error) {
    console.error("Gemini Architecture Error:", error);
    throw new Error("Failed to analyze architecture.");
  }
};

export const analyzeCodeSymbols = async (path: string, fullContent: string): Promise<SymbolDefinition[]> => {
  const CHUNK_SIZE = 2500;
  const chunks: string[] = [];
  
  for (let i = 0; i < fullContent.length; i += 2000) {
    chunks.push(fullContent.substring(i, Math.min(i + CHUNK_SIZE, fullContent.length)));
  }
  const chunksToProcess = chunks.slice(0, 3);
  
  const chunkPromises = chunksToProcess.map(async (chunk, index) => {
    const prompt = `You are a senior developer-documenter. Extract top-level functions and classes.
    For each symbol, assess confidence (high: signature is explicit, low: inferred).

    FILE: ${path} (Chunk ${index + 1})
    CONTENT:
    ${chunk}
    `;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                file: { type: Type.STRING },
                symbol: { type: Type.STRING },
                kind: { type: Type.STRING, enum: ["function", "class", "variable", "interface", "type", "other"] },
                signature: { type: Type.STRING },
                description: { type: Type.STRING },
                dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                notes: { type: Type.STRING },
                confidence: { type: Type.STRING, enum: ["high", "medium", "low"] }
              },
              required: ["file", "symbol", "kind", "signature", "description", "dependencies"]
            }
          }
        }
      });
      const text = response.text;
      if (!text) return [];
      return JSON.parse(text) as SymbolDefinition[];
    } catch (e) {
      console.error(`Error analyzing chunk ${index} of ${path}`, e);
      return [];
    }
  });

  const results = await Promise.all(chunkPromises);
  const allSymbols = results.flat();
  const seen = new Set<string>();
  return allSymbols.filter(s => {
    const key = `${s.symbol}-${s.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const detectSetup = async (dependencyFiles: FileExcerpt[]): Promise<SetupDetection> => {
  if (dependencyFiles.length === 0) {
    return { install: [], test: [], env: [], notes: 'No dependency files found.' };
  }

  const prompt = `Determine install/test commands and env vars.
  Provide confidence level and the file used as evidence (e.g. package.json).
  
  FILES:
  ${dependencyFiles.map(f => `--- ${f.path} ---\n${f.excerpt}`).join('\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            install: { type: Type.ARRAY, items: { type: Type.STRING } },
            test: { type: Type.ARRAY, items: { type: Type.STRING } },
            env: { 
              type: Type.ARRAY, 
              items: { 
                type: Type.OBJECT, 
                properties: { name: { type: Type.STRING }, hint: { type: Type.STRING } },
                required: ["name", "hint"]
              } 
            },
            notes: { type: Type.STRING },
            confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
            evidence: { type: Type.STRING }
          },
          required: ["install", "test", "env", "notes"]
        }
      }
    });

    if (response.text) return JSON.parse(response.text);
    return { install: [], test: [], env: [], notes: 'Failed to parse setup.' };
  } catch (e) {
    console.error("Setup Detection Error", e);
    return { install: [], test: [], env: [], notes: 'Error during detection.' };
  }
};

export const analyzePitfalls = async (files: FileExcerpt[]): Promise<Pitfall[]> => {
  const prompt = `Analyze for pitfalls (missing keys, port conflicts, deprecated versions). Return top 5 issues.
  
  FILES:
  ${files.map(f => `--- ${f.path} ---\n${f.excerpt}`).join('\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              issue: { type: Type.STRING },
              severity: { type: Type.STRING, enum: ["high", "medium", "low"] },
              remediation: { type: Type.STRING }
            },
            required: ["issue", "severity", "remediation"]
          }
        }
      }
    });

    if (response.text) return JSON.parse(response.text);
    return [];
  } catch (e) {
    console.error("Pitfall Analysis Error", e);
    return [];
  }
};

export const runSandboxSimulation = async (files: FileExcerpt[], testCommand: string): Promise<string> => {
  const prompt = `You are a CI environment. User runs: \`${testCommand}\`.
  Simulate stdout/stderr based on code.
  
  CODE CONTEXT:
  ${files.map(f => `--- ${f.path} ---\n${f.excerpt}`).join('\n')}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    return response.text || "Simulation failed to generate output.";
  } catch (e) {
    return "Error: Sandbox simulation timed out or failed.";
  }
};

export const summarizeTestOutput = async (rawOutput: string): Promise<SandboxResult> => {
  const prompt = `Analyze test output. Return JSON summary.
  
  OUTPUT:
  ${rawOutput.substring(0, 10000)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            failures: { type: Type.ARRAY, items: { type: Type.STRING } },
            fixes: { type: Type.ARRAY, items: { type: Type.STRING } },
            status: { type: Type.STRING, enum: ["passed", "failed", "error"] }
          },
          required: ["summary", "failures", "fixes", "status"]
        }
      }
    });
    
    const parsed = JSON.parse(response.text!);
    return { ...parsed, rawOutput };
  } catch (e) {
    return { 
      rawOutput, 
      summary: "Failed to parse output", 
      failures: [], 
      fixes: [], 
      status: 'error' 
    };
  }
};

export const generateWiki = async (
  readme: string,
  architecture: ArchitectureAnalysis | undefined,
  staticAnalysis: StaticAnalysisData | null,
  dependencyFiles: FileExcerpt[]
): Promise<string> => {
  const truncatedReadme = readme.length > 5000 ? readme.substring(0, 5000) + "...(truncated)" : readme;
  
  const prompt = `You are a technical writer using Gemini 3 Pro. 
  Construct a GitHub Wiki (Markdown).
  
  Synthesize inputs:
  1. README: ${truncatedReadme}
  2. ARCHITECTURE: ${JSON.stringify(architecture, null, 2)}
  3. SYMBOLS: ${JSON.stringify(staticAnalysis?.results || [], null, 2)}
  4. DEPENDENCIES: ${dependencyFiles.map(f => f.path).join(', ')}
  
  INSTRUCTIONS:
  - Produce a single Markdown document.
  - Sections: Project Summary, Installation, Quickstart, Architecture, Key Files, Tests, Troubleshooting, Contribution.
  - IMPORTANT: Where possible, add a small footnote style reference to the source file, e.g. "Main entry point [^src/index.js]".
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });
    
    return response.text || "# Error generating wiki";
  } catch (e) {
    console.error("Wiki Generation Error:", e);
    return "# Error generating wiki\n\nFailed to synthesize documentation.";
  }
};

export const analyzeScreenshot = async (base64Data: string, mimeType: string): Promise<ScreenshotAnalysisResult> => {
   const prompt = `You are a code reasoning assistant. Given this screenshot of code or a GitHub file, identify:
       - What this file or snippet does,
       - Where it likely belongs in a software project architecture,
       - Dependencies or modules referenced,
       - Its role if part of a larger application,
       - Any potential issues or unclear patterns.
      Return only JSON with keys: {summary, probable_path, responsibilities, dependencies, issues}.`;

   const response = await ai.models.generateContent({
     model: MODEL_NAME, // gemini-3-pro-preview
     contents: {
       parts: [
         { inlineData: { mimeType, data: base64Data } },
         { text: prompt }
       ]
     },
     config: {
        responseMimeType: "application/json",
        responseSchema: {
           type: Type.OBJECT,
           properties: {
             summary: { type: Type.STRING },
             probable_path: { type: Type.STRING },
             responsibilities: { type: Type.STRING },
             dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
             issues: { type: Type.ARRAY, items: { type: Type.STRING } }
           },
           required: ["summary", "probable_path", "responsibilities", "dependencies", "issues"]
        }
     }
   });

   if (response.text) return JSON.parse(response.text);
   throw new Error("No response");
};