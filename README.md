# RepoWiki AI

> Instant technical documentation for any public GitHub repository powered by Google's Gemini 3 Pro

**An AI-powered documentation generator that analyzes public GitHub repositories and produces comprehensive technical wikis in seconds.**

---

## 🎯 What is RepoWiki AI?

RepoWiki AI is an interactive web application that automatically analyzes any public GitHub repository and generates comprehensive technical documentation. Using Google's Gemini 3 Pro multimodal AI model, it performs intelligent static analysis, architecture detection, dependency scanning, and code comprehension—all in a user-friendly browser interface.

Simply paste a GitHub repository URL, and RepoWiki AI will:

1. **Analyze** the repository structure, README, and codebase
2. **Extract** architecture, dependencies, setup commands, and key code symbols
3. **Identify** common pitfalls and configuration issues
4. **Generate** a formatted wiki with installation guides, quickstart instructions, and troubleshooting tips
5. **Provide** confidence scores and source evidence for every claim

**Perfect for:** Quickly understanding unfamiliar codebases, accelerating developer onboarding, performing due diligence, or generating documentation stubs.

---

## ✨ Key Features

### 🚀 Core Analysis Pipeline

- **📝 One-Click Repository Analysis** - Paste a GitHub URL and get instant analysis
- **🏗️ Architecture Detection** - Automatically identifies project structure, runtime (Node/Python/Go), entry points, and main components
- **📦 Dependency & Setup Detection** - Extracts install commands, test commands, and environment variables from package.json, requirements.txt, Dockerfile, go.mod, Cargo.toml, etc.
- **🔍 Static Code Analysis** - Deep inspection of key files to extract functions, classes, interfaces with signatures and descriptions
- **⚠️ Pitfall Detection** - Identifies common issues (missing env vars, port conflicts, deprecated versions) with severity levels
- **📊 Provenance & Confidence** - Every claim includes source file citation and confidence level (High/Medium/Low)

### 🎨 User Experience

- **🎬 Real-time Progress Tracking** - Visual step-by-step progress through 10+ analysis stages
- **🎞️ Screenshot-to-Code Understanding** - Upload a code screenshot to get AI analysis of its purpose and architecture placement
- **💾 Smart Caching** - Caches analysis results (1 hour) to speed up repeat queries
- **📥 Export Options** - Download generated wiki as Markdown or HTML
- **📋 Copy-Paste Commands** - One-click copy of setup and test commands
- **🧪 Sandbox Simulation** - Simulate test runs and analyze output (limited to safe, whitelisted commands)

### 🔧 Technical Capabilities

- **Multi-Language Support** - Detects Node.js, Python, Go, Rust, Java, C++, Ruby, PHP, and more
- **Smart File Prioritization** - Focuses on important files (src/, app/, lib/, config files)
- **Recursive Repository Analysis** - Scans full repository tree and selects most relevant files
- **Symbol-Level Analysis** - Extracts and describes top-level exports and definitions
- **Demo Data Support** - Pre-cached analysis of popular repos (e.g., facebook/react) for instant demo

---

## 🏗️ Technical Architecture

### Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS + Vite
- **AI Engine**: Google Gemini 3 Pro API (@google/genai SDK)
- **Data Source**: GitHub REST API for repository analysis
- **Storage**: Browser LocalStorage for result caching

### Analysis Pipeline Flow

```
User Input (GitHub URL)
    ↓
[VALIDATING] URL format validation
    ↓
[READING] Fetch README.md and basic repo info
    ↓
[SUMMARIZING] Gemini: Extract one-line summary and runtime detection
    ↓
[SCANNING] Fetch top 12 important files + dependency manifests
    ↓
[DETECTING_SETUP] Gemini: Extract install/test commands and env vars
    ↓
[ARCHITECTING] Gemini: Analyze architecture, components, entry points
    ↓
[ANALYZING_SYMBOLS] Gemini: Deep static analysis of key entry point files
    ↓
[ANALYZING_PITFALLS] Gemini: Identify common pitfalls and issues
    ↓
[GENERATING_WIKI] Gemini: Synthesize all data into Markdown wiki
    ↓
[COMPLETE] Cache results, display to user
```

### Key Components

#### `services/githubService.ts`

- **parseGithubUrl()** - Validates and extracts owner/repo from GitHub URLs
- **fetchRepoReadme()** - Retrieves and decodes repository README
- **fetchRepoLanguages()** - Gets language statistics for the repository
- **fetchTopRepoFiles()** - Intelligently selects 12 most important files using scoring heuristics
- **fetchDependencyFiles()** - Extracts common manifest files (package.json, requirements.txt, Dockerfile, go.mod, etc.)
- **fetchFullFileContent()** - Retrieves complete file contents from GitHub API

**Smart File Selection**: Prioritizes files with names containing "src/", "app/", "lib/", "main", "index", "server" and shorter paths (closer to root).

#### `services/geminiService.ts`

- **summarizeRepo()** - Generates one-line summary + runtime detection (Node/Python/Go/Other) from README content
- **analyzeArchitecture()** - Extracts components, identifies entry points, includes confidence scoring and evidence
- **analyzeCodeSymbols()** - Parses functions/classes with signatures, descriptions, and dependencies from source code
- **detectSetup()** - Infers install commands, test commands, and environment variables with confidence levels
- **analyzePitfalls()** - Identifies security issues, missing configs, deprecated versions with remediation suggestions
- **generateWiki()** - Synthesizes all analysis into comprehensive Markdown documentation with source citations
- **analyzeScreenshot()** - Multimodal AI analysis of uploaded code screenshots
- **runSandboxSimulation()** - Simulates test execution based on code context (no actual execution)
- **summarizeTestOutput()** - Parses and summarizes test results with failure analysis

#### `App.tsx`

- Main React component orchestrating the complete analysis workflow
- Manages user input form, progress tracking, and result display
- Implements LocalStorage caching with 1-hour expiration
- Provides UI for wiki viewing, code screenshot analysis, and sandbox testing
- Handles markdown/HTML download and clipboard copy functionality
- Real-time progress visualization with step indicators

#### `types.ts`

TypeScript interfaces ensuring type safety across the application:

- `RepoInfo` - Repository metadata (owner, name, URL, default branch)
- `AnalysisResult` - Summary and detected runtime
- `ArchitectureAnalysis` - Components with roles, entry points, confidence levels
- `SymbolDefinition` - Extracted code symbols with signatures and descriptions
- `SetupDetection` - Detected installation, test, and environment configuration
- `Pitfall` - Issues with severity levels and remediation steps
- `SandboxResult` - Simulated test execution output and analysis
- `ScreenshotAnalysisResult` - Multimodal analysis of code screenshots

---

## 🚀 Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Safari, Edge)
- Public GitHub repository to analyze
- Google Gemini API key (for local development)

### Quick Start (Web Application)

1. **Enter Repository URL**

   - Paste a public GitHub URL: `https://github.com/owner/repo`
   - Examples: `https://github.com/facebook/react`, `https://github.com/torvalds/linux`

2. **Click Analyze**

   - Watch real-time progress through the analysis pipeline
   - Typical analysis takes 30-120 seconds depending on repository size

3. **Review Results**

   - **Setup & Commands**: Copy/paste ready-to-use installation and test commands
   - **Architecture**: Visual understanding of project structure and key components
   - **Pitfalls**: Identified issues with recommended fixes
   - **Generated Wiki**: Complete markdown documentation export
   - **Download**: Save as Markdown or HTML for sharing

4. **Optional: Screenshot Analysis**
   - Upload a screenshot of code or GitHub file
   - Get AI analysis explaining its purpose and architectural role

---

## 💻 Local Development

### Prerequisites

- Node.js 18+ with npm
- Google Gemini API key (free tier available)
- Git

### Setup Instructions

1. **Clone the Repository**

```bash
git clone https://github.com/GovardhaneNitin/repowiki-ai.git
cd repowiki-ai
```

2. **Install Dependencies**

```bash
npm install
```

3. **Configure Gemini API Key**
   Create a `.env.local` file in the project root:

```
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

4. **Get Your Gemini API Key**

   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Click "Create API Key"
   - Copy the key and paste into `.env.local`

5. **Start Development Server**

```bash
npm run dev
```

Open `http://localhost:5173` in your browser

6. **Build for Production**

```bash
npm run build
npm run preview
```

---

## 📋 Supported Technologies

### Dependency Files Detected

- `package.json` (Node.js / JavaScript)
- `requirements.txt`, `pyproject.toml`, `setup.py` (Python)
- `go.mod` (Go)
- `Cargo.toml` (Rust)
- `Gemfile` (Ruby)
- `pom.xml`, `build.gradle` (Java)
- `Dockerfile`, `docker-compose.yml` (Docker)
- `Makefile` (GNU Make)

### Programming Languages Analyzed

- JavaScript / TypeScript
- Python
- Go
- Rust
- Java
- C / C++
- Ruby
- PHP
- And 50+ more via Gemini's language understanding

---

## 🔒 Security & Limitations

### Security Design

- **Public Repositories Only**: Analyzes only publicly accessible GitHub repositories
- **No Credential Storage**: Never stores GitHub credentials or API keys
- **Simulated Execution**: Test execution is simulated based on code analysis, not actually executed
- **Local Caching**: Analysis results stored only in browser LocalStorage
- **API Rate Limiting**: Subject to GitHub (60/hr unauthenticated) and Gemini rate limits

### Known Limitations

- **Repository Size**: Very large monorepos (>50k files) may have reduced analysis depth
- **Language Coverage**: Best results for popular languages; specialized DSLs may have reduced accuracy
- **Probabilistic Analysis**: AI-generated insights are probabilistic; low-confidence claims should be verified
- **Private Repositories**: Not supported (public repos only)
- **Network Required**: Requires internet connection for GitHub and Gemini API

### Best Practices

- Always verify generated setup commands before production use
- Review recommendations within your specific environment context
- Use confidence scores to prioritize which claims to validate
- Combine automated analysis with manual code review for critical systems
- Test setup commands in a sandbox environment first

---

## 📊 Understanding Confidence Scores

### Confidence Levels

- **High Confidence** - Explicit code evidence, clear patterns, industry-standard conventions
- **Medium Confidence** - Inferred from common patterns, file naming, documentation hints
- **Low Confidence** - Deduced patterns, unusual structure, limited evidence available

### Pitfall Severity

- **High** - Security vulnerabilities, missing critical configuration, breaking changes
- **Medium** - Potential failures under certain conditions, performance issues
- **Low** - Best practice recommendations, optimization opportunities, code quality improvements

### Evidence Citation

Every claim in the generated wiki includes source file paths and snippet references for verification.

---

## 📥 Export & Sharing

The generated wiki can be exported in multiple formats:

### Markdown Export

- Full GitHub-compatible markdown format
- Suitable for GitHub wikis, documentation sites, and version control
- Preserves all formatting, code blocks, and links

### HTML Export

- Self-contained HTML file with embedded styling
- Can be opened in any web browser
- Suitable for printing or email distribution

### Copy Features

- One-click copy of setup commands
- Copy individual test commands
- Copy environment variable suggestions

---

## 🛠️ Troubleshooting

### "GitHub API rate limit exceeded"

- **Solution**: Wait 1 hour for rate limit reset
- **Alternative**: Cached results available for recently analyzed repos
- **Production**: Configure GitHub authentication token for higher limits

### "Invalid GitHub URL"

- **Check**: Format should be `https://github.com/owner/repo`
- **Requirement**: Repository must be public and accessible
- **Test**: Try facebook/react or another well-known repo first

### "Gemini API error"

- **Verify**: API key is correct and has remaining budget
- **Check**: Internet connection is active
- **Confirm**: Gemini 3 Pro API is available in your region

### Analysis takes too long

- **Note**: Large repositories naturally take longer (normal behavior)
- **Tips**: Check network connection speed
- **Try**: Start with a smaller repository to verify functionality

### Downloaded wiki is incomplete

- **Cause**: Some repos have unusual structures affecting analysis depth
- **Resolution**: Review "Architecture" and "Pitfalls" sections for context
- **Verify**: Manually cross-check critical information

---

## 📈 Performance Characteristics

- **Typical Analysis Time**: 30-120 seconds per repository
- **Cache Duration**: 1 hour per analyzed repository
- **API Overhead**: 10-15 GitHub API calls + 8-10 Gemini API calls per analysis
- **Optimization**: Parallel GitHub API calls for speed
- **Browser Compatibility**: Works on all modern browsers with ES2020+ support

---

## 🤝 Contributing

We welcome contributions! Here's how to help:

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature-name`
3. Implement your changes
4. Test locally with `npm run dev`
5. Submit a pull request with detailed description

### Contribution Ideas

- **Language Detection**: Add support for additional programming languages
- **Framework Patterns**: Implement specialized detection for popular frameworks (React, Django, Rails, etc.)
- **UI/UX**: Enhance the visual design and user experience
- **Performance**: Optimize API calls and caching strategies
- **Testing**: Add unit tests and integration tests
- **Documentation**: Improve generated wiki quality and formatting
- **Accessibility**: Improve accessibility for users with disabilities

### Reporting Issues

- Check existing issues to avoid duplicates
- Include the GitHub repository URL that demonstrates the issue
- Provide error messages and browser console output
- Describe expected behavior vs. actual behavior
- Screenshot helpful for UI-related issues

---

## 🏆 Built For

- **Event**: Google DeepMind - Vibe Code with Gemini 3 Pro in AI Studio Hackathon
- **Focus**: Demonstrating practical AI applications in developer tooling
- **Technology**: Leverages Gemini 3 Pro's multimodal and reasoning capabilities

---

## 👥 Credits & Acknowledgments

- **Core Technology**: Google Gemini 3 Pro API
- **Frontend Framework**: React 19, Vite, Tailwind CSS
- **Contributors**: Rutuja Jadhav
- **Inspiration**: Democratizing access to quality open source documentation

---

## 🔮 Future Roadmap

- [ ] Private repository support via GitHub App authentication
- [ ] Visual architecture diagram generation (Mermaid/PlantUML)
- [ ] Framework-specific analysis templates
- [ ] RESTful API for programmatic access
- [ ] Bulk repository analysis
- [ ] Git history analysis for contributor insights
- [ ] VS Code extension integration
- [ ] Automated GitHub Wiki publishing
- [ ] Repository comparison tools
- [ ] Team collaboration features

---

_RepoWiki AI - Making open source more discoverable through intelligent AI-powered documentation._

**Built with ❤️ using Gemini 3 Pro**

[⭐ Star us on GitHub](https://github.com/GovardhaneNitin/repowiki-ai)
