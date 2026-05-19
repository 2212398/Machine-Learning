# Phase 4 Evidence Checklist

Use this file to collect the screenshots and log excerpts that will be attached to the final report appendix.

## 1. Already Verified in This Session

These items already have working evidence from the coding session and can be referenced in the report:

- Recommendation API smoke test succeeded on `GET /api/recommendation`.
- Export script succeeded and wrote a retraining manifest CSV.
- Python syntax checks passed for the touched backend and training files.
- TypeScript errors in `result-card.tsx` were fixed and revalidated.
- Phase 3 changes were committed and pushed to `origin/main`.

## 2. Screenshots to Capture

### Authentication
- Sign-in page before login.
- Sign-up page or test-account creation if shown.
- Signed-in navbar state after login.

### Diagnosis Flow
- Upload area with a selected image.
- Diagnosis loading state.
- Final diagnosis result card showing plant label, disease label, and confidence values.
- Recommendation summary and checklist trigger.
- Checklist modal open.

### History and Feedback
- History page with at least one diagnosis row.
- Feedback buttons visible on the result card.
- Feedback submission success state if available.

### Error Handling
- Non-image upload rejection message.
- Any low-confidence or retry guidance state if available.

### Export / Retraining
- Terminal output from the retraining export script.
- Output folder showing the generated CSV manifest.

## 3. Terminal / Log Evidence to Capture

### Backend and API
- FastAPI startup output.
- `/api/health` if you want a short environment check.
- Recommendation endpoint response sample.

### Validation
- `py_compile` success output for `code/backend/app/main.py`.
- `py_compile` success output for `code/training/export_feedbacks_for_retraining.py`.

### Git History
- Final commit hash for Phase 3 completion.
- `git log --oneline -n 5` screenshot or text snippet.

## 4. Suggested File Naming

Use a date prefix and short description so files sort naturally:

- `2026-05-17-signin.png`
- `2026-05-17-diagnosis-result.png`
- `2026-05-17-checklist-modal.png`
- `2026-05-17-history.png`
- `2026-05-17-export-output.txt`

## 5. Appendix Structure

Recommended appendix order:

1. Authentication screenshots
2. Diagnosis and recommendation screenshots
3. History and feedback screenshots
4. Export script terminal output
5. Backend smoke test output
6. Git commit summary

## 6. Notes

- If a screenshot is not possible, replace it with a short text capture of the terminal or browser state.
- Only include evidence that supports the final implementation; keep the appendix concise.
