from pathlib import Path

import requests


def main() -> None:
    sample_dir = Path("PlantDisease/prepared_template_style_split/test/Potato___Late_blight")
    img = next(sample_dir.glob("*.jpg"))

    with img.open("rb") as f:
        response = requests.post(
            "http://127.0.0.1:8000/api/predict",
            files={"file": (img.name, f, "image/jpeg")},
            timeout=120,
        )

    print("image", img)
    print("status", response.status_code)
    print(response.text)

    if response.status_code == 200:
        data = response.json()
        scoped = data["disease_label"].startswith(data["plant_label"] + "___")
        print("step2_is_plant_scoped", scoped)


if __name__ == "__main__":
    main()
