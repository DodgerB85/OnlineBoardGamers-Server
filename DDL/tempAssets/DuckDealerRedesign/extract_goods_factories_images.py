#!/usr/bin/env python3
"""Extract unique embedded images from Goods_Factories.pdf for visual review."""

import argparse
import csv
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_PDF = SCRIPT_DIR / "Goods_Factories.pdf"
DEFAULT_OUTPUT_DIR = SCRIPT_DIR / "extracted_images"
ASSET_GROUPS = [
    ("orange-green-pistol.png", "211", ("211", "159", "179", "52")),
    ("yellow-rubber-duck.png", "210", ("210",)),
    ("colorful-beads.png", "208", ("208", "148")),
    ("super-blue-paint-can.png", "207", ("207", "153")),
    ("blue-green-bottle.png", "206", ("206", "151", "171", "48")),
    ("blue-phone-box.png", "205", ("205", "155")),
    ("industrial-tower.png", "204", ("204", "145")),
    ("satellite.png", "209", ("209", "161", "165", "54")),
    ("modern-radio.png", "75", ("75", "157", "167", "50")),
    ("red-capsules.png", "76", ("76", "37", "181", "64")),
    ("medical-symbol.png", "77", ("77", "29", "175", "56")),
    ("pink-flask.png", "78", ("78", "35", "177", "62")),
    ("floral-skull.png", "131", ("131", "33", "183", "60")),
    ("duck-artwork.png", "134", ("134", "39", "185", "66")),
    ("blue-rubber-duck.png", "136", ("136", "144", "146", "173", "46")),
    ("gold-coins.png", "138", ("138", "31", "169", "58")),
    ("vote-token.png", "140", ("140", "41", "164", "68")),
]


def parse_image_list(pdf_path):
    result = subprocess.run(
        ["pdfimages", "-list", str(pdf_path)],
        check=True,
        capture_output=True,
        text=True,
    )
    rows = []
    for line in result.stdout.splitlines():
        columns = line.split()
        if not columns or not columns[0].isdigit() or len(columns) < 12:
            continue
        rows.append(
            {
                "page": int(columns[0]),
                "num": int(columns[1]),
                "type": columns[2],
                "width": int(columns[3]),
                "height": int(columns[4]),
                "object_id": columns[10],
                "generation": columns[11],
            }
        )
    return rows


def extracted_file(directory, image_number):
    prefix = f"image-{image_number:03d}."
    matches = list(directory.glob(prefix + "*"))
    if not matches:
        raise FileNotFoundError(f"pdfimages did not extract image {image_number}")
    return matches[0]


def make_contact_sheet(entries, output_path):
    columns = 5
    cell_width = 220
    cell_height = 250
    rows = (len(entries) + columns - 1) // columns
    sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), "white")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()

    for index, entry in enumerate(entries):
        image = Image.open(entry["path"]).convert("RGBA")
        image.thumbnail((cell_width - 24, cell_height - 62))
        x = (index % columns) * cell_width
        y = (index // columns) * cell_height
        image_x = x + (cell_width - image.width) // 2
        image_y = y + 8
        sheet.paste(image, (image_x, image_y), image)
        draw.text((x + 8, y + cell_height - 48), entry["name"], fill="black", font=font)
        draw.text(
            (x + 8, y + cell_height - 30),
            f"page {entry['page']}, object {entry['object_id']}",
            fill="black",
            font=font,
        )

    sheet.save(output_path)


def extract_images(pdf_path, output_dir):
    if output_dir.exists():
        raise FileExistsError(f"Output directory already exists: {output_dir}")

    rows = parse_image_list(pdf_path)
    image_rows = {}
    mask_rows = {}
    for list_index, row in enumerate(rows):
        key = (row["object_id"], row["generation"])
        row["list_index"] = list_index
        if row["type"] == "image":
            image_rows.setdefault(key, row)
        elif row["type"] == "smask":
            mask_rows.setdefault(key, row)

    output_dir.mkdir(parents=True)
    with tempfile.TemporaryDirectory(prefix="goods-factories-") as temporary_dir:
        temporary_path = Path(temporary_dir)
        prefix_path = temporary_path / "image"
        # Let Poppler convert the PDF's CMYK images to RGB instead of relying
        # on Pillow's default CMYK-to-RGB conversion.
        subprocess.run(
            ["pdfimages", "-png", str(pdf_path), str(prefix_path)],
            check=True,
        )

        entries = []
        for file_name, representative_xref, source_xrefs in ASSET_GROUPS:
            key = (representative_xref, "0")
            row = image_rows[key]
            base_path = extracted_file(temporary_path, row["list_index"])
            image = Image.open(base_path).convert("RGB")

            mask_row = mask_rows.get(key)
            if mask_row:
                mask = Image.open(extracted_file(temporary_path, mask_row["list_index"])).convert("L")
                image.putalpha(mask)

            image.save(output_dir / file_name)
            entries.append(
                {
                    "name": file_name,
                    "source_xrefs": ",".join(source_xrefs),
                    "page": row["page"],
                    "num": row["num"],
                    "object_id": row["object_id"],
                    "generation": row["generation"],
                    "width": row["width"],
                    "height": row["height"],
                    "path": output_dir / file_name,
                }
            )

    with (output_dir / "manifest.csv").open("w", newline="", encoding="utf-8") as manifest_file:
        writer = csv.DictWriter(
            manifest_file,
            fieldnames=["name", "source_xrefs", "page", "num", "object_id", "generation", "width", "height"],
        )
        writer.writeheader()
        writer.writerows(
            {key: value for key, value in entry.items() if key != "path"}
            for entry in entries
        )

    make_contact_sheet(entries, output_dir / "contact_sheet.png")
    return entries


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", nargs="?", type=Path, default=DEFAULT_PDF)
    parser.add_argument("output_dir", nargs="?", type=Path, default=DEFAULT_OUTPUT_DIR)
    args = parser.parse_args()

    entries = extract_images(args.pdf.resolve(), args.output_dir.resolve())
    print(f"Extracted {len(entries)} unique images to {args.output_dir.resolve()}")
    print(f"Contact sheet: {args.output_dir.resolve() / 'contact_sheet.png'}")


if __name__ == "__main__":
    main()
