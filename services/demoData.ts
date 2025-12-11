import { CachedRepoData } from '../types';

export const DEMO_DATA_REACT: CachedRepoData = {
  timestamp: Date.now(),
  repoInfo: {
    owner: 'facebook',
    name: 'react',
    url: 'https://github.com/facebook/react',
    defaultBranch: 'main'
  },
  readme: "# React\n\nReact is a JavaScript library for building user interfaces.",
  analysisResult: {
    summary: "React is a declarative, efficient, and flexible JavaScript library for building user interfaces, primarily maintained by Meta.",
    runtime: "node"
  },
  deepScanData: {
    languages: { JavaScript: 100 },
    files: [
      { path: 'packages/react/index.js', excerpt: "export { default as useState } from './src/useState';", size: 500 },
      { path: 'packages/react-dom/index.js', excerpt: "export * from './src/client/ReactDOM';", size: 600 }
    ],
    architecture: {
      summary: "Monorepo structure managing core React library, reconcilers, and renderers.",
      runtime: "node",
      components: [
        { name: "React Core", path: "packages/react", role: "Core component APIs and hooks", confidence: "high", evidence: "packages/react/package.json" },
        { name: "React DOM", path: "packages/react-dom", role: "Renderer for the DOM", confidence: "high", evidence: "packages/react-dom/package.json" },
        { name: "Scheduler", path: "packages/scheduler", role: "Cooperative multitasking scheduler", confidence: "medium", evidence: "packages/scheduler" }
      ],
      entry_points: [
        { path: "packages/react/index.js", reason: "Main entry point for the core library" }
      ]
    }
  },
  setupData: {
    install: ["yarn install"],
    test: ["yarn test", "yarn lint"],
    env: [],
    notes: "Requires Yarn and Node.js.",
    confidence: "high"
  },
  pitfalls: [
    { issue: "Version Mismatch", severity: "medium", remediation: "Ensure you are using the correct Node version specified in .nvmrc." }
  ],
  staticAnalysisData: {
    results: [
      {
        path: "packages/react/index.js",
        symbols: [
          {
             file: "packages/react/index.js",
             symbol: "useState",
             kind: "function",
             signature: "useState(initialState)",
             description: "Returns a stateful value, and a function to update it.",
             dependencies: [],
             confidence: "high"
          }
        ]
      }
    ]
  },
  wikiMarkdown: "# React Project Wiki\n\n## Project Summary\nA JavaScript library for building user interfaces.\n\n## Quickstart\n```bash\nyarn install\nyarn start\n```\n\n## Architecture\n- **React Core**: Core logic.\n- **React DOM**: Web renderer.\n",
  dependencyFiles: []
};