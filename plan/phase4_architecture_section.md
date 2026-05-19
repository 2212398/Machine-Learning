# Draft Architecture Section

## 1. Overall Architecture

The system is intentionally split into three layers so each major responsibility stays isolated and easier to defend in the report:

- **Frontend**: Next.js App Router with React client components for interactive flows such as authentication, image upload, diagnosis result rendering, recommendation display, and history browsing.
- **Backend/BaaS**: Supabase for authentication, database persistence, storage of uploaded images, and row-level security.
- **AI service**: FastAPI for image validation, preprocessing, two-stage inference, and recommendation generation.

This separation avoids mixing machine learning logic with UI logic and keeps the app easier to deploy, test, and explain during viva.

## 2. Frontend Layer

The current frontend lives in `code/frontend-next` and uses the App Router structure. It is responsible for:

- session-aware navigation and route protection,
- upload and preview of leaf images,
- triggering diagnosis requests,
- rendering the diagnosis result card,
- showing the recommendation checklist modal,
- collecting feedback on prediction correctness,
- displaying the user history page.

The frontend communicates with Supabase through server-side helpers and with FastAPI through a recommendation fetch from the diagnosis result card. In the final report, this layer should be described as the user-facing orchestration layer rather than the ML layer.

## 3. Supabase Layer

Supabase is used as the managed backend layer for:

- authentication with email/password,
- user profile persistence,
- diagnosis history storage,
- feedback storage,
- file storage for uploaded leaf images.

The important architectural decision here is that data is scoped by user through row-level security. This means the report can clearly claim that each account only sees its own diagnosis history and feedback. This is also the right place to explain why the service-role key is limited to server-side or export tooling.

## 4. FastAPI AI Service

The FastAPI backend keeps the AI pipeline separate from the web UI. It performs:

- file and payload validation,
- image preprocessing with OpenCV,
- plant classification as the first stage,
- disease classification as the second stage,
- consistency checking against the valid disease set for the detected plant,
- recommendation lookup and checklist generation,
- safety checks such as upload size limits and malformed requests.

The report should emphasize that the AI service does not handle authentication or user CRUD. Its job is inference only, which keeps the deployment and debugging surface smaller.

## 5. Data Flow

A clean summary of the runtime flow is:

1. The user logs in and uploads a leaf image from the frontend.
2. The frontend stores or references the image through Supabase Storage.
3. The frontend sends a request to the AI service through the Next.js layer.
4. FastAPI preprocesses the image and runs plant inference.
5. If the plant prediction is acceptable, the disease stage runs inside the allowed disease space.
6. FastAPI returns a structured JSON response with labels, confidences, status, and recommendation data.
7. The frontend renders the result card and allows the user to submit feedback.
8. Diagnosis and feedback data are stored in Supabase for history and retraining export.

This sequence is the core story for the report. It should be rendered as a sequence diagram or flowchart in the final document.

## 6. Recommendation and Retraining Loop

Phase 3 added a recommendation and retraining layer on top of the existing diagnosis flow. The system now:

- returns a short recommendation summary,
- shows a three-part checklist for immediate action, monitoring, and consultation,
- records user feedback as correct/incorrect,
- exports labeled feedback to a retraining manifest,
- derives retraining metadata from the diagnosis record when feedback rows do not contain snapshot fields.

This section of the report should explain that the retraining loop is not a full training automation pipeline yet, but it is already sufficient to collect structured data for future model improvement.

## 7. Deployment View

For deployment, the intended structure is:

- Next.js frontend container or runtime,
- FastAPI AI service container,
- Supabase as external managed service,
- reverse proxy and HTTPS termination for production.

Even if the current environment is local-first, the report should describe the deployment-ready architecture because it matches the project requirements and future extension path.

## 8. Suggested Figure Captions

Use these figure captions in the final report:

- System architecture overview
- Upload and inference sequence
- Supabase schema and RLS relationships
- Recommendation and retraining flow
- Deployment topology on VPS
