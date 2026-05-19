# Demo and Viva Checklist

## Demo Flow

1. Sign in with a test account.
2. Upload a valid leaf image.
3. Show plant classification result.
4. Show disease classification result.
5. Open recommendations and checklist.
6. Submit correct / incorrect feedback.
7. Open history and show saved diagnosis records.
8. Show retraining export output or export script.

## Must-Show Evidence

- Login / sign-up flow
- Supabase Storage upload
- Diagnosis result card
- Recommendation checklist modal
- Feedback persistence
- History isolation via RLS
- Export script for retraining dataset
- Commit history on GitHub

## Likely Viva Questions

- Why use a two-stage classification pipeline?
- Why is Supabase used instead of a custom backend for auth and storage?
- Why does FastAPI only handle AI inference?
- How is user data isolated from other users?
- Why MobileNetV3?
- How are recommendations generated?
- What happens if the image has multiple leaves or low confidence?
- How is retraining data prepared?
- What is the role of Docker and VPS deployment?

## Quick Answers to Prepare

- Architecture split: Next.js + Supabase + FastAPI.
- Security split: RLS for data, server-side for sensitive operations.
- ML choice: MobileNetV3 balances accuracy and lightweight inference.
- Retraining loop: feedback and diagnosis history can be exported for future dataset improvement.
- Demo fallback: if the live AI path fails, use a preloaded result or screenshot sequence.
