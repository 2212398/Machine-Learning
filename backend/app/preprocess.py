from typing import Tuple

import cv2
import numpy as np


def extract_leaf_region_with_stats(
    image: np.ndarray,
    target_size: Tuple[int, int] = (224, 224),
    min_leaf_ratio: float = 0.01,
) -> tuple[np.ndarray, bool, dict[str, float | int]]:
    if image is None or image.size == 0:
        return (
            np.zeros((target_size[1], target_size[0], 3), dtype=np.uint8),
            False,
            {
                "leaf_candidate_count": 0,
                "largest_leaf_ratio": 0.0,
            },
        )

    blur = cv2.GaussianBlur(image, (5, 5), 0)
    hsv = cv2.cvtColor(blur, cv2.COLOR_BGR2HSV)

    # Green-ish mask for leaf isolation in common field photos.
    lower_green = np.array([25, 35, 35], dtype=np.uint8)
    upper_green = np.array([95, 255, 255], dtype=np.uint8)
    mask = cv2.inRange(hsv, lower_green, upper_green)

    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return (
            cv2.resize(image, target_size),
            False,
            {
                "leaf_candidate_count": 0,
                "largest_leaf_ratio": 0.0,
            },
        )

    img_area = float(image.shape[0] * image.shape[1])
    if img_area <= 0:
        return (
            cv2.resize(image, target_size),
            False,
            {
                "leaf_candidate_count": 0,
                "largest_leaf_ratio": 0.0,
            },
        )

    significant_contours = [
        contour for contour in contours if (cv2.contourArea(contour) / img_area) >= min_leaf_ratio
    ]

    if not significant_contours:
        return (
            cv2.resize(image, target_size),
            False,
            {
                "leaf_candidate_count": 0,
                "largest_leaf_ratio": 0.0,
            },
        )

    largest = max(significant_contours, key=cv2.contourArea)
    area = cv2.contourArea(largest)
    largest_ratio = float(area / img_area)
    leaf_stats = {
        "leaf_candidate_count": int(len(significant_contours)),
        "largest_leaf_ratio": round(largest_ratio, 4),
    }

    if largest_ratio < min_leaf_ratio:
        return cv2.resize(image, target_size), False, leaf_stats

    x, y, w, h = cv2.boundingRect(largest)

    pad_x = int(0.08 * w)
    pad_y = int(0.08 * h)

    x1 = max(0, x - pad_x)
    y1 = max(0, y - pad_y)
    x2 = min(image.shape[1], x + w + pad_x)
    y2 = min(image.shape[0], y + h + pad_y)

    crop = image[y1:y2, x1:x2]
    if crop.size == 0:
        return cv2.resize(image, target_size), False, leaf_stats

    return cv2.resize(crop, target_size), True, leaf_stats


def extract_leaf_region(image: np.ndarray, target_size: Tuple[int, int] = (224, 224)) -> tuple[np.ndarray, bool]:
    crop, leaf_found, _ = extract_leaf_region_with_stats(image=image, target_size=target_size)
    return crop, leaf_found
