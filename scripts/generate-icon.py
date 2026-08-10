from io import BytesIO
from pathlib import Path
import struct

from PIL import Image, ImageDraw

out_dir = Path(__file__).resolve().parents[1] / "assets"
out_dir.mkdir(parents=True, exist_ok=True)


def make_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    pad = max(1, size // 16)
    bg = (18, 22, 28, 255)
    accent = (125, 211, 192, 255)
    accent_dark = (79, 143, 191, 255)
    card = (26, 33, 43, 255)
    muted = (147, 161, 179, 255)

    radius = max(2, size // 6)
    draw.rounded_rectangle(
        (pad, pad, size - pad - 1, size - pad - 1), radius=radius, fill=bg
    )

    bar_w = max(2, size // 10)
    draw.rounded_rectangle(
        (
            pad + size // 10,
            pad + size // 6,
            pad + size // 10 + bar_w,
            size - pad - size // 6,
        ),
        radius=max(1, bar_w // 2),
        fill=accent,
    )

    left = pad + size // 10 + bar_w + max(2, size // 12)
    right = size - pad - size // 8
    row_h = max(2, size // 9)
    gap = max(1, size // 16)
    top = pad + size // 5
    for i in range(3):
        y1 = top + i * (row_h + gap)
        y2 = y1 + row_h
        if y2 >= size - pad - size // 10:
            break
        draw.rounded_rectangle(
            (left, y1, right, y2), radius=max(1, row_h // 3), fill=card
        )
        d = max(1, row_h // 3)
        cx = left + d + 1
        cy = (y1 + y2) // 2
        color = accent if i == 0 else (accent_dark if i == 1 else muted)
        draw.ellipse((cx - d, cy - d, cx + d, cy + d), fill=color)

    return img


def write_ico(path: Path, images: list[Image.Image]) -> None:
    # Manual ICO writer so every size is actually embedded.
    png_blobs = []
    for image in images:
        buf = BytesIO()
        image.save(buf, format="PNG")
        png_blobs.append(buf.getvalue())

    header = struct.pack("<HHH", 0, 1, len(images))
    entries = []
    offset = 6 + 16 * len(images)
    data = b""
    for image, blob in zip(images, png_blobs):
        width = 0 if image.width >= 256 else image.width
        height = 0 if image.height >= 256 else image.height
        entries.append(
            struct.pack("<BBBBHHII", width, height, 0, 0, 1, 32, len(blob), offset)
        )
        data += blob
        offset += len(blob)

    path.write_bytes(header + b"".join(entries) + data)


sizes = [16, 24, 32, 48, 64, 128, 256]
images = [make_icon(s) for s in sizes]
ico_path = out_dir / "icon.ico"
png_path = out_dir / "icon.png"
images[-1].save(png_path)
write_ico(ico_path, images)
print(f"WROTE {ico_path} ({ico_path.stat().st_size} bytes)")
print(f"WROTE {png_path} ({png_path.stat().st_size} bytes)")
