"""Rebuild the 38-zone reference drawing as shared, smooth SVG boundaries.

Usage: python tools/build-map.py path/to/reference.png
Build-time dependencies: Pillow, numpy, scipy. The website needs none of them.
"""

from collections import defaultdict
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

import numpy as np
from PIL import Image
from scipy import ndimage


# Same order and conditions as the original archive's 38 detected regions.
STATES = [
    ("Maine", "ME", False), ("Washington", "WA", False),
    ("Idaho", "ID", True), ("Montana", "MT", False),
    ("North Dakota", "ND", True), ("Minnesota", "MN", False),
    ("Wisconsin", "WI", True), ("Oregon", "OR", True),
    ("South Dakota", "SD", True), ("Wyoming", "WY", True),
    ("Michigan", "MI", True), ("New York", "NY", True),
    ("California", "CA", True), ("Nebraska", "NE", True),
    ("Nevada", "NV", True), ("Iowa", "IA", True),
    ("Pennsylvania", "PA", True), ("Vermont", "VT", True),
    ("Utah", "UT", True), ("Colorado", "CO", False),
    ("Illinois", "IL", True), ("Missouri", "MO", True),
    ("Arizona", "AZ", True), ("Kansas", "KS", True),
    ("New Mexico", "NM", True), ("Oklahoma", "OK", True),
    ("Indiana", "IN", True), ("Kentucky", "KY", True),
    ("Texas", "TX", False), ("Ohio", "OH", True),
    ("Arkansas", "AR", True), ("West Virginia", "WV", True),
    ("Tennessee", "TN", True), ("Virginia", "VA", True),
    ("North Carolina", "NC", True), ("South Carolina", "SC", True),
    ("Georgia", "GA", True), ("Florida", "FL", False),
]


def simplify(points, tolerance=2.5):
    """Douglas–Peucker; apply once per shared edge so neighboring zones match."""
    if len(points) < 3:
        return points
    p = np.asarray(points, dtype=float)
    a, b = p[0], p[-1]
    delta = b - a
    if np.dot(delta, delta):
        t = np.clip(((p - a) @ delta) / np.dot(delta, delta), 0, 1)
        distances = np.linalg.norm(p - (a + t[:, None] * delta), axis=1)
    else:
        distances = np.linalg.norm(p - a, axis=1)
    index = int(distances.argmax())
    if distances[index] > tolerance:
        return simplify(points[:index + 1], tolerance)[:-1] + simplify(points[index:], tolerance)
    return [points[0], points[-1]]


def number(value):
    return f"{value:.2f}".rstrip("0").rstrip(".")


def point(p):
    return f"{number(p[0])},{number(p[1])}"


def curve(points):
    """Gentle cubic smoothing with the same control points in either direction."""
    result = []
    for i in range(len(points) - 1):
        a, b = np.array(points[i], dtype=float), np.array(points[i + 1], dtype=float)
        prev = np.array(points[max(0, i - 1)], dtype=float)
        nxt = np.array(points[min(len(points) - 1, i + 2)], dtype=float)
        # Short handles preserve the drawing's corners without pixel stair steps.
        c1, c2 = a + (b - prev) / 8, b - (nxt - a) / 8
        result.append(f"C{point(c1)} {point(c2)} {point(b)}")
    return " ".join(result)


def build(reference, output):
    image = np.asarray(Image.open(reference).convert("RGB"))
    ink = image.min(axis=2) < 180
    labels, count = ndimage.label(~ink)
    regions = []
    for label in range(1, count + 1):
        y, x = np.where(labels == label)
        if (len(x) > 80 and x.min() > 0 and y.min() > 0
                and x.max() < image.shape[1] - 1 and y.max() < image.shape[0] - 1):
            regions.append((y.mean(), x.mean(), label))
    regions.sort()
    if len(regions) != len(STATES):
        raise ValueError(f"Expected all 38 enclosed regions, found {len(regions)}")

    seeds = np.zeros(ink.shape, dtype=np.int16)
    for index, (_, _, label) in enumerate(regions, 1):
        seeds[labels == label] = index
    valid = (seeds > 0) | (labels == labels[0, 0])
    # Recover the ink centerlines, rather than leaving gaps as thick as the pen.
    _, nearest = ndimage.distance_transform_edt(~valid, return_indices=True)
    filled = seeds[tuple(nearest)]

    edges = defaultdict(list)
    for y, x in zip(*np.where(filled[:, :-1] != filled[:, 1:])):
        pair = tuple(sorted((int(filled[y, x]), int(filled[y, x + 1]))))
        edges[pair].append(((int(x + 1), int(y)), (int(x + 1), int(y + 1))))
    for y, x in zip(*np.where(filled[:-1, :] != filled[1:, :])):
        pair = tuple(sorted((int(filled[y, x]), int(filled[y + 1, x]))))
        edges[pair].append(((int(x), int(y + 1)), (int(x + 1), int(y + 1))))

    chains = []
    for pair, segments in edges.items():
        adjacency = defaultdict(list)
        for a, b in segments:
            adjacency[a].append(b)
            adjacency[b].append(a)
        unused = {tuple(sorted((a, b))) for a, b in segments}
        starts = sorted(p for p, neighbors in adjacency.items() if len(neighbors) == 1)
        for start in starts:
            if not any(tuple(sorted((start, b))) in unused for b in adjacency[start]):
                continue
            chain = [start]
            current = start
            while True:
                options = [b for b in adjacency[current] if tuple(sorted((current, b))) in unused]
                if not options:
                    break
                nxt = options[0]
                unused.remove(tuple(sorted((current, nxt))))
                chain.append(nxt)
                current = nxt
            chains.append((pair, simplify(chain)))
        if unused:
            raise ValueError(f"Untraced closed edge in {pair}")

    paths = []
    for region in range(1, len(STATES) + 1):
        remaining = [i for i, (pair, _) in enumerate(chains) if region in pair]
        parts = []
        while remaining:
            first = remaining.pop(0)
            points = chains[first][1]
            start, end = points[0], points[-1]
            parts.append(f"M{point(start)} {curve(points)}")
            while end != start:
                found = False
                for index in remaining:
                    pts = chains[index][1]
                    if pts[0] == end or pts[-1] == end:
                        if pts[-1] == end:
                            pts = list(reversed(pts))
                        parts.append(curve(pts))
                        end = pts[-1]
                        remaining.remove(index)
                        found = True
                        break
                if not found:
                    raise ValueError(f"Open boundary in region {region}")
            parts.append("Z")
        paths.append(" ".join(parts))

    y, x = np.where(filled > 0)
    padding = 30
    viewbox = f"{x.min() - padding} {y.min() - padding} {x.max() - x.min() + padding * 2} {y.max() - y.min() + padding * 2}"
    ET.register_namespace("", "http://www.w3.org/2000/svg")
    root = ET.Element("svg", xmlns="http://www.w3.org/2000/svg", viewBox=viewbox,
                      role="group", attrib={"aria-labelledby": "territoryTitle territoryDescription"})
    ET.SubElement(root, "title", id="territoryTitle").text = "Mapa territorial de contagio"
    ET.SubElement(root, "desc", id="territoryDescription").text = (
        "Reconstrucción vectorial del dibujo de referencia: 38 zonas independientes. "
        "Los nombres y condiciones corresponden al archivo narrativo original; "
        "es un mapa estilizado, no una cartografía geográfica exacta.")
    for index, ((name, abbr, infected), d) in enumerate(zip(STATES, paths), 1):
        status = "Con contagio" if infected else "Sin contagio"
        path = ET.SubElement(root, "path", {
            "id": f"territory-{abbr.lower()}", "class": "map-region", "d": d,
            "fill": "#ca7273" if infected else "#b8dd7c", "stroke": "#050708",
            "stroke-width": "1.15", "stroke-linejoin": "round", "stroke-linecap": "round",
            "vector-effect": "non-scaling-stroke", "data-name": name, "data-abbr": abbr,
            "data-condition": "infected" if infected else "healthy",
            "tabindex": "0", "role": "button", "aria-pressed": "false",
            "aria-label": f"{name}: {status}",
        })
        ET.SubElement(path, "title").text = f"{name} — {status}"
    # Visible labels use the same abbreviations and region order as the source.
    # Ignore pointer events so labels never block selecting the underlying zone.
    label_group = ET.SubElement(root, "g", {
        "class": "map-labels", "aria-hidden": "true", "pointer-events": "none",
        "fill": "#111b1b", "font-family": "Space Grotesk, sans-serif",
        "font-weight": "600", "text-anchor": "middle", "dominant-baseline": "central",
    })
    for (cy, cx, region), (_, abbr, _) in zip(regions, STATES):
        y, x = np.where(labels == region)
        area = len(x)
        # Find room for the whole abbreviation, including in narrow/concave zones.
        x0, y0 = x.min() - 1, y.min() - 1
        mask = labels[y0:y.max() + 2, x0:x.max() + 2] == region
        clearance = ndimage.distance_transform_edt(mask)
        preferred_size = 20 if area > 6000 else 16 if area > 2500 else 14
        font_size = min(preferred_size, max(12, int(clearance.max() * 1.1)))
        safe_y, safe_x = np.where(clearance >= min(font_size * .85, clearance.max() * .9))
        nearest = int(np.argmin((safe_x + x0 - cx) ** 2 + (safe_y + y0 - cy) ** 2))
        cx, cy = safe_x[nearest] + x0, safe_y[nearest] + y0
        ET.SubElement(label_group, "text", {
            "x": number(cx), "y": number(cy), "data-for": f"territory-{abbr.lower()}",
            "font-size": str(font_size),
        }).text = abbr
    ET.indent(root)
    ET.ElementTree(root).write(output, encoding="utf-8", xml_declaration=True)
    print(f"Built {output}: {len(paths)} regions, {len(chains)} shared boundary curves, "
          f"{sum(s[2] for s in STATES)} infected / {sum(not s[2] for s in STATES)} healthy")


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    build(Path(sys.argv[1]), root / "dist/assets/territorial-map.svg")
