"""Build the generic home-screen PNG icon from the book-and-coin motif."""

from pathlib import Path
from PIL import Image, ImageDraw


SIZE = 512
SCALE = 2
im = Image.new("RGBA", (SIZE * SCALE, SIZE * SCALE), "#f8f4e8")
d = ImageDraw.Draw(im)


def box(points):
    return tuple(int(value * SCALE) for value in points)


d.ellipse(box((-21, 289, 211, 521)), fill="#e8f2e9")
book_outline = [(95, 137), (172, 122), (256, 151), (340, 122), (417, 137), (417, 378), (337, 370), (256, 397), (175, 370), (95, 378)]
d.polygon([(x * SCALE, y * SCALE) for x, y in book_outline], fill="#1f6655")
d.line([(x * SCALE, y * SCALE) for x, y in book_outline + [book_outline[0]]], fill="#174d42", width=15 * SCALE, joint="curve")
paper = [(118, 157), (185, 153), (256, 175), (327, 153), (394, 157), (394, 350), (325, 347), (256, 367), (187, 347), (118, 350)]
d.polygon([(x * SCALE, y * SCALE) for x, y in paper], fill="#fffdfa")
d.line(box((256, 174, 256, 369)), fill="#174d42", width=11 * SCALE)
for x1, x2 in ((144, 221), (291, 358)):
    for y in (236, 282):
        d.line(box((x1, y, x2, y)), fill="#a9cab9", width=14 * SCALE)
d.ellipse(box((308, 80, 426, 198)), fill="#d4a04c", outline="#174d42", width=13 * SCALE)
d.line(box((367, 106, 367, 173)), fill="#fffdfa", width=13 * SCALE)
d.line(box((338, 139, 396, 139)), fill="#fffdfa", width=13 * SCALE)
d.ellipse(box((120, 91, 138, 109)), fill="#d4a04c")
d.ellipse(box((149, 76, 159, 86)), fill="#174d42")

im.resize((SIZE, SIZE), Image.Resampling.LANCZOS).convert("RGB").save(Path(__file__).with_name("icon.png"), optimize=True)
