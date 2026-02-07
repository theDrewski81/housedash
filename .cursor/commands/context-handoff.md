# Context handoff (end of day)

Generate or update a **context handoff document** for this project so another Cursor instance (e.g. on another machine) can get up to speed when work resumes.

## What to do

1. **Output:** Create or overwrite a single file at the **workspace root**: `CONTEXT-handoff.md`.
2. **Content:** Write lightweight Markdown that:
   - **Purpose** — State that the doc is for bringing Cursor AI (or a human) up to speed when switching machines or resuming work.
   - **Project in one sentence** — Summarize what this project is (from README or top-level docs).
   - **Where to start when resuming** — Table or list: key docs (README, PRD, design docs, deployment refs, etc.) with short purpose for each. Use relative paths from repo root.
   - **Current state** — What's done vs in progress: main features or phases documented or implemented, and what was last updated (e.g. "Step 2 outlined and README updated").
   - **Architecture / stack** — If present in README or docs: hosting, DBs, auth, external systems, export/deploy flow. If absent, say "Not yet defined" or omit.
   - **Open / next** — Bullet list of open decisions, next tasks, or "pick up here" items from README or project docs.
   - **Workspace conventions** — If the repo has `.cursor/rules/` or `.cursor/agents/`, mention them in one line. Otherwise omit.
   - **Footer** — One line: *Update this file when you make significant progress so the next handoff stays accurate.*

3. **Sources:** Infer from the current workspace only: README, docs in `docs/` (or similar), `.cursor/` structure. Do not invent project details. If the project has no README or clear docs, keep the handoff short and factual.

4. **Tone:** Concise, skimmable. Prefer bullets and short tables. No marketing copy.

Run this when finishing work for the day so the handoff is ready for the next session (e.g. on a laptop).
