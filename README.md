# RepoWiki AI

**Subtitle:** Google DeepMind - Vibe Code with Gemini 3 Pro in AI Studio — _Google DeepMind Hackathon_

**Contributors:**

- Rutuja Jadhav

---

## Overview

RepoWiki AI automatically analyzes any **public GitHub repository** and generates a detailed, actionable technical report (a single-page Wiki) in seconds. It combines static code analysis, dependency and test detection, and multimodal reasoning (screenshot understanding) powered by **Gemini 3 Pro** in **Google AI Studio**. The output includes a one-line summary, architecture overview, critical file explanations, install & test commands, sandbox test summaries, prioritized pitfalls with fixes, contributor guidance, and provenance-backed confidence scores.

This README documents the project, how it works, how to run it, design decisions, limitations, and how to contribute.

---

## Key Features

- **One-click repo analysis**: Paste a public `owner/repo` URL → RepoWiki clones, scans and analyzes the repository.
- **Automated README & Wiki generation**: Produces an exportable Markdown/HTML technical wiki summarizing setup, architecture, and key symbols.
- **Architecture extraction**: Detects runtime, entry points, and high-level components.
- **Symbol extraction**: Extracts top-level functions/classes with signatures and short descriptions.
- **Dependency & test detection**: Infers install/test commands from `package.json`, `requirements.txt`, `Dockerfile`, etc.
- **Sandboxed test runner (curated)**: Runs safe, whitelisted test commands for vetted demo repos and summarizes results.
- **Provenance & confidence**: Every factual claim is accompanied by the file/snippet evidence and a confidence level.
- **Multimodal screenshot understanding**: Upload a screenshot of code or file and get an explanation of what it does and where it belongs in the architecture.
- **Export & share**: Download Markdown or HTML wiki, and copy quickstart commands.

---

## Demo & Video

- 2-minute demo script and video were produced for the hackathon submission.
- App deployed in Google AI Studio Build (public share link used for the Kaggle submission; include your app URL here).

---

## Architecture (High-level)

```

User (Browser)
├─ UI (AI Studio app) — analyze form, show progress, show wiki
├─ Worker (ephemeral) — git clone, file scanning, chunking
├─ Gemini 3 Pro (AI Studio calls) — summarization, chunk analysis, reasoning, vision
├─ Image/Processing helpers — resize/compress or sandbox runner for tests (curated)
└─ Cache layer — stores analysis results for demo stability

```

- **UI**: Single-page app in AI Studio Build. Displays progress, architecture, pitfalls, and wiki.
- **Worker**: Clones public repo to ephemeral workspace, extracts files and dependency manifests, builds chunked inputs for the model.
- **AI layer**: Series of structured prompts to Gemini 3 Pro (readme summarizer → architecture scanner → chunk analyzer → wiki synthesizer → pitfalls/test summarizer).
- **Sandbox**: Isolated, resource-limited environment used only for pre-approved demo repos (whitelisted commands). Not used for arbitrary user-supplied repos.

---

## JSON Report Schema (short)

The app also produces machine-readable JSON for programmatic use. Key fields:

```json
{
  "metadata": {
    "repo": "owner/repo",
    "url": "",
    "detected_runtime": "",
    "languages": [],
    "analysis_timestamp": ""
  },
  "one_line_summary": "",
  "detailed_summary": "",
  "architecture": { "summary": "", "components": [] },
  "critical_files": [],
  "setup": { "install_commands": [], "env_vars": [], "run_commands": [] },
  "testing": {
    "detected_tests": false,
    "test_commands": [],
    "sandbox_result_summary": "",
    "raw_test_output": ""
  },
  "pitfalls": [],
  "how_to_contribute": {},
  "extension_suggestions": [],
  "confidence_score_overall": 0.0,
  "provenance": []
}
```

---

## Installation & Local Development (Optional)

> Note: The canonical deployment target for this hackathon is **Google AI Studio Build** using Gemini 3 Pro. The local instructions below are for development and testing only; running the full app locally is optional and requires API access.

1. Clone the RepoWiki AI repository:

```bash
git clone https://github.com/your-org/repowiki-ai.git
cd repowiki-ai
```

2. Install dependencies (example for Node-based worker + simple UI):

```bash
# server (worker) dependencies
cd server
npm install

# web (if any local dev UI)
cd ../web
npm install
```

3. Environment variables (example `.env` — DO NOT commit keys):

```
GEMINI_API_KEY=your_gemini_key_here
CACHE_DIR=/tmp/repowiki_cache
SANDBOX_WHITELIST=pytest,npm_test
```

4. Run worker & UI (development):

```bash
# in server
npm run dev

# in web
npm run dev
```

5. For testing only: place a public repo URL into the UI and click Analyze. If you want to run sandbox tests locally, use only the curated demo repos to avoid security issues.

---

## Usage (Deployed on AI Studio)

1. Open the RepoWiki AI app in Google AI Studio (Build) — use the public share link.
2. Paste a public GitHub repo URL (format: `https://github.com/owner/repo`) into the input box.
3. Click **Analyze** and watch progress (Validating → Cloning → Reading → Summarizing → Scanning → Architecting → Deep Static → Wiki Gen → Complete).
4. Review:

   - **Setup & Env**: copy/pasteable install & run commands.
   - **Pitfalls & Fixes**: prioritized list of likely issues with suggested fixes.
   - **Generated Wiki**: exportable Markdown/HTML ready for consumption.
   - **Sandbox Simulation**: if a curated repo was chosen, see test results snapshot.

5. Optionally upload a code screenshot in the **Screenshot-to-Understanding** card to get a multimodal explanation.

---

## Sandbox & Security Notes

- **Sandbox runs are gated**: users must explicitly confirm and sandbox only runs a whitelisted set of safe commands (`pytest`, `npm test`, etc.) on pre-approved demo repos. This prevents remote code execution of arbitrary scripts.
- **No secrets required**: the analysis only handles public repos. It will warn and refuse to run any commands that require credentials or secrets.
- **Provenance & confidence**: every suggested command, claim, and fix includes evidence: file path and snippet cited. Confidence levels (High/Med/Low) are shown based on explicit code evidence.

---

## Design Decisions & Rationale

- **Why Gemini 3 Pro / Multimodality?** Gemini provides large-context reasoning and vision capabilities. These are crucial for (a) extracting structure from long READMEs and large codebases, and (b) interpreting screenshots for multimodal reasoning.
- **Chunked analysis**: we never dump whole repos to a single prompt. Files are chunked and summarized progressively to respect token limits and improve traceability of claims.
- **Provenance first**: the tool must avoid hallucination. Every claim includes evidence from specific file snippets.
- **Conservative sandboxing**: running arbitrary code is risky — so a curated, explicit-run design is implemented.

---

## Limitations

- **Closed/private repos**: not supported (no automated access to private repos without credentials). The app explicitly requires a public GitHub URL.
- **Large monorepos**: for extremely large repositories, analysis will focus on root-level manifests and `src`/`packages` directories and may skip rarely referenced files.
- **Execution risk**: sandbox runs are limited and only for vetted demo repos. Do not rely on the sandbox for arbitrary CI-grade testing.
- **Accuracy & edge cases**: automated reasoning is probabilistic. Low-confidence claims are possible and are surfaced as such — always validate critical commands before running.

---

## Roadmap (possible next steps)

- Add repository-specific templates to speed up synthesis for popular frameworks.
- Add a small static graph visualizer for component interactions.
- Implement contributor onboarding recommendations using `git blame` and issues extraction.
- Add authenticated GitHub App integration for private repo analysis (with explicit consent).
- Build a browser extension to overlay the guidance directly on GitHub pages.

---

## How to Contribute

If you'd like to contribute:

1. Fork the repo.
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Add tests (where applicable).
4. Open a PR with a clear description and test evidence.

Suggested first issues:

- Improve detection heuristics for Rust/C++ projects.
- Add more robust Dockerfile parsing for multi-stage builds.
- Improve screenshot-to-structure mapping accuracy.

---

## Acknowledgements & Credits

- Built during **Google DeepMind - Vibe Code with Gemini 3 Pro in AI Studio** hackathon.
- Core multimodal reasoning: **Gemini 3 Pro** (Google AI Studio).
- Project contributors: **Rutuja Jadhav** (listed contributor).

---

## License

Specify project license here, for example:

```
MIT License
```

Replace with the license you prefer.

---

## Contact

For questions or collaboration, include your contact method or GitHub handle:

- GitHub: `https://github.com/your-org/repowiki-ai`
- Email: `you@example.com` (optional)

---

_Generated by the RepoWiki AI project — built with Gemini 3 Pro in Google AI Studio. Verify detected commands and test outputs before running them in production._
