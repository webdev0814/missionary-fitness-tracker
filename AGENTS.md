# Agent Briefing: missionary-fitness-tracker

## 1. Repository Overview & Purpose
- **Repository**: `webdev0814/missionary-fitness-tracker`
- **Visibility**: `Public`
- **Default Branch**: `main`
- **Last Updated / Pushed**: 2026-09-08
- **Description**: Missionary Ready 90-Day Fitness Tracker workbook and dashboard
- **Context from README**: A production-ready 90-day Google Sheets tracker for a missionary fitness and wellness routine. What it includes: - A dashboard with daily mission guidance, progress tracking, and phase summaries - Two visual progress charts on the dashboard


---

## 2. Tech Stack & Architecture
- **Primary Language / Ecosystem**: JavaScript
- **Key Directories**: `outputs/`, `work/`
- **Notable Top-Level Files**: `.gitignore`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `LICENSE`, `README.md`

---

## 3. Setup & Execution Commands
### Environment Setup & Installation
```bash
# Review repository files and install dependencies corresponding to the language/runtime.
```

### Running / Starting
```bash
# Check main entry point scripts or config files.
```

### Testing / Verification
```bash
# Run relevant unit/integration tests (e.g. pytest or npm test)
```

---

## 4. Recent Commit Activity (Where We Left Off)
The most recent commits show the latest development trajectory:
- `[6b1f159]` (2026-09-08) docs: update agent briefing with multi-computer handoff protocol
- `[cd34aad]` (2026-09-08) docs: update agent briefing with multi-computer handoff protocol
- `[da4f3ca]` (2026-09-08) docs: update agent briefing with multi-computer handoff protocol
- `[42cca73]` (2026-09-08) docs: update agent briefing with multi-computer handoff protocol
- `[ee2fe0f]` (2026-09-08) docs: update agent briefing with multi-computer handoff protocol
- `[3d33b8f]` (2026-09-08) docs: update agent briefing with multi-computer handoff protocol
- `[5dc304a]` (2026-09-08) docs: update agent briefing with multi-computer handoff protocol
- `[3b7f8e2]` (2026-09-08) docs: update agent briefing with multi-computer handoff protocol
- `[16fe8eb]` (2026-09-08) docs: update agent briefing with multi-computer handoff protocol
- `[04457d9]` (2026-09-08) docs: update agent briefing with multi-computer handoff protocol

---

## 5. Current State & Immediate Next Steps
- **Current State**: Project is active under branch `main`.
- **When picking up this repo**:
  1. Inspect the top-level files and recent commits to understand the active feature or bugfix context.
  2. Verify all required credentials and environment variables before running integration scripts.
  3. Ensure all tests and linting pass after making modifications.
  4. Follow the repository conventions and preserve existing architecture patterns.

---

## 6. Multi-Computer Handoff & Git Sync Protocol
- **On Session Start**: Always run `git pull` when opening this repository on any computer to synchronize the latest changes.
- **On Task Completion**: Before ending any agent session, the agent **MUST**:
  1. Update Section 5 (Current State & Next Steps) in this `AGENTS.md` file.
  2. Stage all modifications (`git add .`).
  3. Commit with a concise conventional message (`git commit -m "feat/fix: ..."`).
  4. Push directly to GitHub (`git push`).
- **Secret Hygiene**: NEVER commit plain-text API keys, tokens, or credentials into repository files.
