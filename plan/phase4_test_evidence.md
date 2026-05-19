# Draft Test Evidence Section

## 1. Test Strategy

The project was validated using a mix of browser-driven smoke tests, UI interaction checks, backend endpoint verification, and export-script validation. The goal was to verify that the whole flow works end-to-end rather than only proving that individual modules compile.

## 2. Verified Flows

### Authentication and Session
- Sign up and sign in flows were tested with test accounts.
- Session persistence and sign-out behavior were verified in the browser.

### Diagnosis Flow
- Valid leaf images were uploaded and diagnosed successfully.
- The result card displayed plant label, disease label, confidence values, and diagnosis time.
- Recommendation summary and checklist were fetched and rendered.

### Validation / Error Handling
- Non-image uploads were rejected by the UI with a clear message.
- The FastAPI recommendation endpoint was smoke-tested directly and returned a structured response.
- The frontend result card TypeScript errors were fixed and revalidated.

### History and Isolation
- Diagnosis history was recorded per user.
- Cross-user isolation was checked to confirm that RLS prevents seeing another account’s records.

### Retraining Export
- The feedback export script was executed successfully.
- A CSV manifest was generated from feedback and diagnosis data.
- The exporter was validated with Python syntax checks before use.

## 3. Example Test Table

| ID | Scenario | Expected Result | Status |
| --- | --- | --- | --- |
| T1 | Upload a valid leaf image | Diagnosis result is shown | Pass |
| T2 | Upload a non-image file | UI blocks upload | Pass |
| T3 | Open recommendation section | Summary and checklist are visible | Pass |
| T4 | Submit correct/incorrect feedback | Feedback is stored | Pass |
| T5 | View history as another user | No data leakage | Pass |
| T6 | Run export script | CSV manifest is generated | Pass |

## 4. Evidence to Attach Later

Add these artifacts to the final report appendix:

- screenshots of sign-in and upload screens,
- screenshots of the diagnosis result card,
- screenshots of the recommendation checklist modal,
- screenshots of the history page,
- terminal output from backend smoke tests,
- terminal output from the export script,
- Git commit history snapshot.

## 5. Notes for Final Writing

- Keep the test descriptions concrete and tied to the implemented feature.
- Mention both successful and failed attempts only when they led to a real fix.
- Use the test table as the backbone for the methodology and validation sections.
