# Plant Pest Detection: Project Plan & Architecture

This document outlines the detailed architecture and components for building a local plant pest detection system.

## 1. Core AI
*   **Language**: Python
*   **Framework**: PyTorch
*   **Models**:
    *   **Train**: MobileNetV3 (small and efficient for your local training/deploy pipeline)
    *   **Deploy**: MobileNetV3 (lightweight, optimized for inference)
*   **Inference Strategy**:
    *   **Step 1**: Detect plant leaf type first (for example: tomato, potato, pepper).
    *   **Step 2**: Detect disease/healthy status for that detected plant type.
    *   **Consistency Rule**: Step 2 must only use disease classes valid for the Step 1 plant type (for example, if plant type is potato, tomato disease labels are not allowed).

## 2. Image Processing
*   **Library**: OpenCV
*   **Used for**:
    *   Reading and loading images
    *   Resizing images to model input requirements
    *   Extracting leaf regions using thresholding and contour detection techniques to isolate the target area from the background.

## 3. Data Flow
*   **Images**: Curated dataset of:
    *   Plant leaf type classes (for example: tomato, potato, pepper)
    *   Healthy leaves per plant type
    *   Diseased/pest-infected leaves per plant type
*   **Format**: Image Classification (No object detection/YOLO involved).
*   **Labeling**:
    *   Level 1 label: plant leaf type
    *   Level 2 label: healthy or disease class for that plant type
    *   Disease labels should be plant-specific (for example: `potato___healthy`, `potato___late_blight`, `tomato___healthy`, `tomato___leaf_mold`).

## 4. Backend
*   **Framework**: FastAPI
*   **Handles**:
    *   Receiving image uploads via HTTP POST requests
    *   Routing images to the OpenCV processing pipeline
    *   Running plant leaf type classification first
    *   Selecting a plant-specific disease model or label space based on the detected plant type
    *   Running disease/healthy classification only inside that selected plant type
    *   Validating that disease output belongs to `allowed_diseases[plant_type]`
    *   Rejecting inconsistent outputs (for example: plant = potato, disease = tomato early blight)
    *   Returning JSON with plant type, plant confidence, disease label, and disease confidence

## 5. Frontend
*   **Tech Stack**: Vanilla HTML, CSS, and basic JavaScript
*   **Handles**:
    *   Simple UI for file selection and image upload
    *   Sending requests to the FastAPI backend via the `fetch` API
    *   Displaying plant type first, then disease class and confidence to the user on the page

## 6. Deployment
*   **Scope**: Local only (no cloud hosting planned at this stage). The FastAPI server and the frontend will be run on the local machine.

## 7. User Flow

### 7.1 Happy Path (Main Journey)
1. User opens the local web page.
2. User selects a leaf image from their device.
3. Frontend shows a preview and enables the "Detect" button.
4. User clicks "Detect".
5. Frontend sends the image to FastAPI using `fetch` (POST `/predict`).
6. Backend reads image with OpenCV, resizes it, and extracts the leaf region.
7. Backend runs plant leaf type classification first and calculates confidence.
8. Backend selects the matching disease model/label set for that plant type.
9. Backend runs disease/healthy classification inside that plant-specific scope.
10. Backend returns JSON response:
    * plant type label
    * plant type confidence score
    * disease/healthy label
    * disease confidence score
    * optional message or recommendation
11. Frontend displays result card with plant type first, then disease status and confidence.
12. User can upload another image and repeat.

### 7.2 Error and Edge Flows
1. Invalid file type:
    * Frontend blocks upload and shows "Please upload JPG/PNG image."
2. No leaf detected after OpenCV processing:
    * Backend returns error message.
    * Frontend shows "Leaf not detected. Try clearer image."
3. Low confidence plant type prediction:
    * Backend returns "unknown plant type" with confidence value.
    * Frontend asks user to upload a clearer image or choose plant type manually (optional future feature).
4. Low confidence disease prediction:
    * Backend returns disease result with low-confidence flag.
    * Frontend shows warning "Low confidence, retake image in better lighting."
5. API/server error:
    * Frontend catches request failure and shows "Server unavailable. Please try again."
6. Plant-disease logic mismatch:
    * If any mismatch appears (for example: Step 1 = potato but Step 2 = tomato disease), backend marks it as inconsistent and does not return that disease as final output.
    * Backend returns a safe fallback (unknown disease for detected plant) and asks for a clearer image.

### 7.3 Screen-Level Flow Map
1. Home screen:
    * Upload control
    * Image preview area
    * Detect button
2. Loading state:
    * Spinner + "Analyzing image..."
3. Result state:
    * Predicted plant type
    * Plant confidence value
    * Disease class
    * Disease confidence value
    * Guidance text
    * "Try another image" button

### 7.4 API Interaction Flow (Simplified)
1. Frontend -> `POST /predict` (multipart image)
2. FastAPI -> OpenCV preprocessing
3. FastAPI -> Plant type inference
4. FastAPI -> Select plant-specific disease model/labels
5. FastAPI -> Disease/healthy inference within selected plant scope
6. FastAPI -> Consistency check (`disease_label in allowed_diseases[plant_type]`)
7. FastAPI -> JSON response
8. Frontend -> Render result / error message

## 8. Confirmed Decisions (April 9, 2026)

1. Dataset is already labeled and will continue expanding.
2. Training uses 2 models; deployment serves 2 models (plant + disease) in sequential two-step inference.
3. Confidence thresholds:
    * Plant threshold: 0.70
    * Disease threshold: 0.60
4. API response includes treatment recommendation text.
5. Frontend language is Vietnamese with a simple, clean UI.
6. Runtime supports both CPU and GPU.
