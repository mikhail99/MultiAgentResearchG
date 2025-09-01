## Common Template Roadmap (High-ROI)

### 1) Unify LLM client
- Create `@shared/services/llmService` with:
  - `generateContent`, `generateContentStream`
  - Providers: LOCAL (Ollama-like), GEMINI (Google GenAI)
  - Single options shape: `{ provider: ModelProvider; url?: string; model?: string; temperature?: number }`
- Replace per-app LLM calls (research-agents, data-preprocessing, knowledge-extraction) with shared service.
  - Acceptance: no direct LLM fetches in apps.

### 2) Consolidate tool service
- Use single `@shared/services/toolService`:
  - Safe env: `(process as any).env?.VITE_FASTAPI_URL`
  - Typed params for `executeResearcherTools(topic, { includeWebSearch, includeLocalSearch, metadata? })`
- Replace any per-app tool logic with shared service.
  - Acceptance: only `@shared/services/toolService` used in apps.

### 3) Shared hooks
- Move into `@shared/hooks`:
  - `useModelSettings` (provider, URL, toggles)
  - `useWorkflowState` (status, completed, outputs)
  - `useUIState` (theme, modals)
  - `useWorkflowTemplates` (ensure all apps use shared)
- Update app imports to `@shared/hooks`.
  - Acceptance: no app-local duplicates; compile passes.

### 4) Standardize components
- Ensure apps import from `@shared/components`:
  - `AgentCard`, `ResultsPanel`, `StatusBar`, `ControlPanel`
- Remove app-local duplicates where overlapping.
  - Acceptance: components come from shared, consistent UI.

### 5) Template-driven workflows
- Extend `@shared/types/workflowTemplates` to support scheduling:
  - Example: `schedule: [ 'SEARCHING', ['LEARNING','OPPORTUNITY_ANALYZING','PROPOSING'], 'AGGREGATING' ]`
- Add `@shared/services/workflowRunner` that:
  - Reads template, resolves prompts
  - Executes steps (sequential/parallel) with streaming callbacks
  - Uses `llmService` + `toolService`
- Adapt apps to runner:
  - research-agents: map agents to standard phases
  - knowledge-extraction: simple fast→precise cascade (already aligned)
  - data-preprocessing: map pipeline steps to schedule; call backend tools via shared service
  - Acceptance: each app supplies a template; runner does orchestration.

### 6) Remove dead features & flakiness
- A‑Mem removed; keep memory fields only for type-compat
- TS strict cleanup:
  - fix `noUnusedLocals` (prefix `_` or remove)
  - ensure only valid `ProcessStatus` values used
  - normalize all LLM options to shared type
- Consistent aliases:
  - Vite alias `@shared` → `../../packages/shared/src`
  - tsconfig paths aligned across apps
  - Acceptance: `pnpm -w type-check` passes.

### 7) Minimal test coverage
- Add Playwright smokes per app:
  - Launch app
  - Enter topic/question
  - Start run; assert streamed content appears in an `AgentCard`
  - Trigger export (md/json) and assert presence in UI
- Add script: `"test:smoke": "playwright test"`
  - Acceptance: smokes pass locally (headless, 30s timeout).

---

### Order of work
1. Unify LLM client + consolidate tool service
2. Standardize hooks (move to shared)
3. Implement workflow runner + integrate KE
4. Migrate research-agents to runner
5. Adapt data-preprocessing to runner (tools/backend wired)
6. TS cleanup and alias consistency
7. Add Playwright smokes



### Remaining refactoring steps
- [x] Unify LLM client to `@shared/services/llmService` (done)
- [x] Consolidate tool service to `@shared/services/toolService` (done)
- [ ] Shared hooks
  - Move `useModelSettings`, `useWorkflowState`, `useUIState`, `useWorkflowTemplates` to `@shared/hooks`
  - Replace app-local imports; delete duplicates under `apps/*/src/hooks`
- [ ] Components standardization
  - Ensure `ControlPanel`, `StatusBar`, `AgentCard`, `ResultsPanel` are consumed from `@shared/components`
  - Remove/merge app-local duplicates or thin wrappers
- [ ] Template-driven workflows
  - Implement `template.schedule` parsing in `@shared/services/workflowRunner` (support parallel arrays)
  - Migrate `knowledge-extraction` to runner (fast → parallel analyzers → synth)
  - Migrate `research-agents` to runner; adapt `data-preprocessing` pipeline
- [ ] TS strict cleanup & aliases
  - Remove unused vars/params; validate `ProcessStatus` usages only
  - Ensure `@shared` alias matches in Vite + tsconfig for all apps
  - `pnpm -w type-check` must pass
- [ ] Minimal test coverage
  - Add Playwright smoke per app (launch → run → stream visible → export visible)
  - Add script: `"test:smoke": "playwright test"`

### Quick verification commands
- `pnpm -w type-check`
- `pnpm -w -r build`
- `pnpm -w -r test:smoke`