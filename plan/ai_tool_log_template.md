# AI Tool Log Template

Record each meaningful AI-assisted step here. Keep it factual and tied to code, tests, or docs.

## Entry Format

- Date:
- Task:
- Prompt or request:
- Tool used:
- Output / suggestion from AI:
- What was accepted:
- What was changed manually:
- Verification:
- Commit / file reference:

## Example Entry

- Date: 2026-05-17
- Task: Phase 3 recommendation UI cleanup
- Prompt or request: Fix TypeScript errors in `result-card.tsx`
- Tool used: Copilot coding assistant
- Output / suggestion from AI: Replace unsupported button variant and make checklist state non-null
- What was accepted: Switched `variant="outline"` to `variant="secondary"`
- What was changed manually: Initialized checklist arrays and added `hasChecklist`
- Verification: `get_errors` returned no errors for `result-card.tsx`
- Commit / file reference: `code/frontend-next/components/diagnosis/result-card.tsx`

## Suggested Sections for the Final Log

- Phase 1: setup and migration work
- Phase 2: AI integration and history UI
- Phase 3: recommendation and retraining loop
- Phase 4: report and documentation support

## Tips

- Log only major decisions, fixes, and validations.
- Mention tests when a suggestion was verified.
- Avoid generic statements like "AI helped with coding".
