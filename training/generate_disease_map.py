import argparse
import json
from collections import defaultdict
from pathlib import Path


def get_args():
    parser = argparse.ArgumentParser(description="Generate disease_labels_by_plant.json from flat disease labels")
    parser.add_argument("--disease-labels", required=True, help="Path to disease_labels_flat.json")
    parser.add_argument("--plant-labels", required=True, help="Path to plant_labels.json")
    parser.add_argument("--output", required=True, help="Output JSON path")
    return parser.parse_args()


def main() -> None:
    args = get_args()
    disease_labels = json.loads(Path(args.disease_labels).read_text(encoding="utf-8"))
    plant_labels = json.loads(Path(args.plant_labels).read_text(encoding="utf-8"))

    grouped: dict[str, list[str]] = defaultdict(list)
    for label in disease_labels:
        plant = str(label).split("___", 1)[0]
        grouped[plant].append(str(label))

    result = {str(plant): grouped.get(str(plant), []) for plant in plant_labels}
    for plant, labels in grouped.items():
        result.setdefault(plant, labels)

    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {output} ({len(result)} plants, {len(disease_labels)} diseases)")


if __name__ == "__main__":
    main()
