# Design Improvements to Back-Port into `App_LG`

This note captures refactoring wins surfaced during the aborted `App.tsx` rewrite. None of the items add new product features; they focus on maintainability, clarity, and future-proofing the existing LangGraph implementation.

## 1. Modular Hook Architecture

- **Extract workflow orchestration**: Wrap `runWorkflow_LG`, revision logic, and interrupt handling in a `useWorkflow` hook. Expose status, completed steps, sent prompts, and streaming callbacks via hook return values. This shrinks `App_LG` and localizes LangGraph integration details.
- **Agent management hook**: Move iteration selectors, prompt persistence, and task-profile wiring into `useAgentManagement`. The app component should depend on a tiny surface—`selectedIterations`, `setIterationForAgent`, `sentPrompts`, and handlers to open modals.
- **Session management hook**: Encapsulate autosave, restore-toast logic, and share-link generation. Replace scattered `localStorage` calls with high-level actions (`restoreLastRun`, `saveSnapshot`, `copyShareLink`).
- **Theme hook**: Centralize theme toggling (currently repeated across files) so we touch DOM class toggles in exactly one place.

**ROI**: Hooks decouple responsibilities, making future modifications (e.g., swapping LangGraph services or altering session persistence) much safer. They also make unit testing possible at a smaller granularity.

## 2. `AgentGrid` Layout Wrapper

- Replace the inline grid markup in `App_LG` with a dedicated `AgentGrid` component. Pass the agent list, iteration state, sent prompts, and callbacks as props; let `AgentGrid` handle the row/column layout and iteration selectors.
- Keep `AgentCard` as-is; the wrapper simply orchestrates card placement and ensures the tool-results props are applied consistently.

**ROI**: UI becomes declarative. Swapping card order or adding a diagnostic column becomes a single change in the config array rather than manual DOM edits across the JSX tree.

## 3. Centralized Utilities Worth Adopting

- **Export helpers**: Use `createExportFilename` (from the new code) to standardize filenames across Markdown and JSON exports.
- **Health checks**: Reuse the LLM/tool health ping logic to surface readiness indicators in the existing control panel. Even if we keep the old layout, the additional status badges make debugging runs faster.
- **Prompt persistence helper**: The refactor’s `setAgentPromptsWithPersistence` pattern avoids repetition around `localStorage` read/write and gives us a single source of truth when we add new agents.

## 4. Additional High-ROI Cleanups

- **Type co-location**: Move custom types (e.g., `SavedRun`, agent iteration maps) into `@shared/types` so `App_LG` imports them instead of re-declaring. This reduces merge pain as the codebase grows.
- **Logging discipline**: Introduce a lightweight logger utility (wrapping `console`) to standardize emojis, levels, and to make it easy to silence noise in production builds.
- **Error boundaries for modals**: Wrap modal-heavy sections (prompt editor, workflow templates, memory tools) in small error boundaries. This prevents transient UI failures from tearing down the whole app.
- **Metric tracking**: Persist the duration/character counts already captured in state to a hook so they can later feed into dashboards without rummaging through component state.

## 5. Suggested Sequencing

1. Extract `useTheme` (low risk, no behavioural change).
2. Lift autosave/restore into `useSessionManagement` to simplify `App_LG`.
3. Introduce `AgentGrid` to reduce JSX noise.
4. Finally, peel workflow orchestration into `useWorkflow`, validating parity after each step.

This incremental plan keeps the working app stable while harvesting the structural improvements from the refactor branch.

