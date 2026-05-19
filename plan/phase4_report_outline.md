# Phase 4 Report Outline

Use this as the skeleton for the final report. The goal is a clear academic structure that matches the current implementation in the repo.

## 1. Introduction
- Problem statement
- Why plant disease detection matters
- Project scope and constraints
- Final objectives of the system

## 2. Background and Technology Choices
- Two-stage classification strategy
- Why MobileNetV3
- Why OpenCV preprocessing
- Why FastAPI for the AI service
- Why Next.js App Router for the frontend
- Why Supabase for auth, database, and storage

## 3. System Architecture
- Overall 3-layer architecture: Next.js, Supabase, FastAPI
- Client/server boundaries
- Data flow from upload to prediction
- Recommendation and retraining loop
- Deployment architecture overview

## 4. Data Design and Security
- Database schema
- Row Level Security policies
- Storage bucket design
- History and feedback tracking
- Retraining/export flow

## 5. AI Pipeline
- Plant classification step
- Disease classification step
- OpenCV leaf extraction
- Confidence thresholds and gating logic
- Recommendation mapping

## 6. Frontend Implementation
- Authentication pages
- Diagnosis upload and result flow
- History page
- Feedback and recommendation UI
- Responsive UI decisions

## 7. Backend Implementation
- FastAPI endpoints
- Validation and error handling
- Upload limits and safety checks
- Background export job
- Health and recommendation endpoints

## 8. Testing and Validation
- Manual smoke tests
- Non-image upload rejection
- Multi-image diagnosis flow
- History/RLS verification
- Recommendation flow validation

## 9. Deployment and Operations
- Dockerization plan
- VPS and reverse proxy setup
- SSL/domain notes
- Runtime configuration

## 10. Results and Discussion
- What works end-to-end
- Known limitations
- Trade-offs made
- Future improvements

## 11. Conclusion
- Summary of achievements
- Readiness for demo and defense

## 12. Appendices
- AI tool usage log
- Commit history summary
- Screenshots
- Test cases
- Deployment notes

## Suggested Writing Order
1. Fill sections 1, 2, and 3 first.
2. Add implementation details from the current codebase.
3. Insert screenshots and test evidence.
4. Finish with appendices and the AI log.
