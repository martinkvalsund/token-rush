"""Tokens, low and overhead obstacles, and power-up pickups. Exec'd after lib.py."""

import math


def hexagon(r, rot=30):
    return [(r * math.cos(math.radians(rot + i * 60)), r * math.sin(math.radians(rot + i * 60))) for i in range(6)]


def build_token():
    p = Part("token")
    p.prism(hexagon(0.34), 0.1, color="glow_gold")
    p.prism(hexagon(0.24), 0.13, color="gold")
    p.text("T", 0.26, loc=(0, -0.07, -0.01), color="gold_dark", extrude=0.012)
    return p.finish()


# ---------------------------------------------------------------- low obstacles (jump)


def build_jersey_barrier():
    p = Part("jersey_barrier")
    prof = [(-0.3, 0), (0.3, 0), (0.3, 0.08), (0.12, 0.25), (0.08, 0.85), (-0.08, 0.85), (-0.12, 0.25), (-0.3, 0.08)]
    for x in (-0.53, 0.53):
        p.prism(prof, 1.03, loc=(x, 0, 0), color="concrete", rot=(0, 0, 90))
    p.stripes(-1.02, 1.02, 0.42, 0.7, -0.125, n=10, slant=0.12)
    p.box((2.08, 0.18, 0.05), (0, 0, 0.86), "concrete_dark")
    return p.finish()


def build_cone_cluster():
    p = Part("cone_cluster")
    for x in (-0.75, -0.25, 0.25, 0.75):
        p.box((0.4, 0.4, 0.05), (x, 0, 0.025), "black")
        p.cyl(0.17, 0.68, (x, 0, 0.39), "orange", r2=0.035, segs=10)
        p.cyl(0.125, 0.1, (x, 0, 0.36), "white", r2=0.105, segs=10)
        p.cyl(0.085, 0.08, (x, 0, 0.53), "white", r2=0.07, segs=10)
    for i in range(8):
        p.box((0.24, 0.06, 0.08), (-0.84 + i * 0.24, -0.02, 0.6), "yellow" if i % 2 == 0 else "black")
    return p.finish()


def build_barrel_row():
    p = Part("barrel_row")
    for x in (-0.66, 0, 0.66):
        p.cyl(0.3, 0.88, (x, 0, 0.44), "orange", segs=12)
        for z in (0.28, 0.6):
            p.cyl(0.305, 0.12, (x, 0, z), "white", segs=12)
        p.cyl(0.24, 0.04, (x, 0, 0.9), "black", segs=12)
    return p.finish()


def build_brick_pallet():
    p = Part("brick_pallet")
    p.box((1.9, 1.2, 0.12), (0, 0, 0.06), "wood")
    for layer in range(3):
        off = 0.11 if layer % 2 else 0
        for ix in range(4):
            for iy in range(5):
                x = -0.69 + ix * 0.46 + off
                if x > 0.8:
                    continue
                p.box((0.43, 0.2, 0.17), (x, -0.44 + iy * 0.22, 0.21 + layer * 0.19), "red" if (ix + iy + layer) % 3 else "red_dark")
    p.stripes(-0.9, 0.9, 0.5, 0.68, -0.57, n=8, slant=0.1)
    return p.finish()


def build_pipe_stack():
    p = Part("pipe_stack")
    rows = [(0.15, (-0.31, 0, 0.31)), (0.41, (-0.155, 0.155)), (0.67, (0,))]
    for z, ys in rows:
        for y in ys:
            p.cyl(0.15, 1.9, (0, y, z), "steel_blue", rot=(0, 90, 0), segs=10)
            for x in (-0.96, 0.96):
                p.cyl(0.155, 0.04, (x, y, z), "orange", rot=(0, 90, 0), segs=10)
    for x in (-0.7, 0.7):
        p.box((0.12, 0.9, 0.12), (x, 0, 0.06), "brown")
    p.stripes(-0.95, 0.95, 0.03, 0.13, -0.46, n=10, slant=0.05)
    return p.finish()


def build_sandbag_wall():
    p = Part("sandbag_wall")
    for row, (z, n) in enumerate(((0.12, 5), (0.33, 4), (0.53, 5))):
        w = 2.0 / n
        for i in range(n):
            x = -1.0 + w / 2 + i * w
            p.sphere(0.25, (x, 0, z), "tan" if (i + row) % 2 else "sand", scale=(w / 0.5 * 0.98, 1.4, 0.45))
    p.stripes(-0.98, 0.98, 0.62, 0.7, -0.36, n=10, slant=0.05)
    return p.finish()


def build_wheelbarrow():
    p = Part("wheelbarrow")
    tray = [(-0.75, 0.75), (0.75, 0.75), (0.5, 0.3), (-0.5, 0.3)]
    p.prism(tray, 0.95, (0, 0, 0), "orange", rot=(0, 0, 0))
    p.box((1.3, 0.85, 0.04), (0, 0, 0.73), "orange_dark")
    p.cyl(0.24, 0.12, (0, -0.55, 0.24), "black", rot=(0, 90, 0), segs=12)
    p.cyl(0.1, 0.13, (0, -0.55, 0.24), "grey", rot=(0, 90, 0), segs=8)
    for x in (-0.35, 0.35):
        p.box((0.05, 1.3, 0.05), (x, 0.25, 0.35), "grey", rot=(12, 0, 0))
        p.box((0.06, 0.06, 0.32), (x, 0.4, 0.16), "grey")
    p.stripes(-0.62, 0.62, 0.45, 0.62, -0.49, n=6, slant=0.06)
    return p.finish()


def build_toolbox_crate():
    p = Part("toolbox_crate")
    p.box((1.6, 0.8, 0.62), (0, 0, 0.31), "wood")
    for x in (-0.79, 0.79):
        p.box((0.06, 0.82, 0.64), (x, 0, 0.31), "brown")
    for z in (0.05, 0.58):
        p.box((1.62, 0.82, 0.06), (0, 0, z), "brown")
    p.box((0.55, 0.28, 0.2), (0.35, 0.05, 0.72), "red")
    p.box((0.3, 0.04, 0.06), (0.35, 0.05, 0.85), "black")
    p.stripes(-0.7, 0.7, 0.22, 0.42, -0.41, n=8, slant=0.08)
    return p.finish()


def build_rock_pile():
    p = Part("rock_pile")
    rocks = [(-0.6, 0, 0.3, 0.42), (0.1, 0.1, 0.35, 0.5), (0.7, -0.1, 0.28, 0.38), (-0.2, -0.3, 0.25, 0.3), (0.4, 0.4, 0.22, 0.32), (-0.75, 0.35, 0.2, 0.28)]
    for i, (x, y, z, r) in enumerate(rocks):
        p.sphere(r, (x, y, z), "rock" if i % 2 else "rock_dark", scale=(1.2, 1.0, 0.8), rot=(i * 20, i * 33, i * 47))
    p.box((0.05, 0.05, 0.9), (0.95, -0.5, 0.45), "black")
    p.box((0.3, 0.02, 0.2), (0.95, -0.52, 0.8), "yellow")
    return p.finish()


# ------------------------------------------------------------- overhead obstacles (slide)


def red_white(p, x0, x1, z0, z1, y, n=8):
    p.stripes(x0, x1, z0, z1, y, colors=("red", "white"), n=n, slant=0.1)


def build_height_gantry():
    p = Part("height_gantry")
    for x in (-1.17, 1.17):
        p.box((0.1, 0.1, 2.1), (x, 0, 1.05), "yellow")
        p.box((0.3, 0.3, 0.06), (x, 0, 0.03), "dark_grey")
    p.box((2.34, 0.4, 0.55), (0, 0, 1.48), "white")
    red_white(p, -1.17, 1.17, 1.22, 1.73, -0.21, n=9)
    p.box((0.9, 0.05, 0.34), (0, -0.02, 2.0), "white")
    p.cyl(0.15, 0.03, (-0.27, -0.06, 2.0), "red", rot=(90, 0, 0), segs=12)
    p.text("1.2m", 0.18, (0.12, -0.06, 1.99), "black", extrude=0.01)
    return p.finish()


def build_vent_duct():
    p = Part("vent_duct")
    p.box((2.4, 1.2, 0.9), (0, 0, 1.65), "light_grey")
    for x in (-1.0, -0.4, 0.2, 0.8):
        p.box((0.06, 1.24, 0.94), (x, 0, 1.65), "grey")
    for x in (-0.9, 0.9):
        p.box((0.05, 0.05, 2.5), (x, 0, 3.35), "dark_grey")
    red_white(p, -1.2, 1.2, 1.2, 1.42, -0.61, n=10)
    return p.finish()


def build_cable_tray():
    p = Part("cable_tray")
    p.box((2.4, 0.8, 0.05), (0, 0, 1.22), "grey")
    for y in (-0.38, 0.38):
        p.box((2.4, 0.04, 0.25), (0, y, 1.35), "grey")
    for i, (y, c) in enumerate(((-0.24, "orange"), (-0.08, "black"), (0.08, "red"), (0.24, "orange"))):
        p.cyl(0.07, 2.4, (0, y, 1.33 + (i % 2) * 0.04), c, rot=(0, 90, 0), segs=8)
    for x in (-1.0, 1.0):
        p.box((0.04, 0.04, 2.6), (x, 0, 2.6), "dark_grey")
    red_white(p, -1.2, 1.2, 1.2, 1.46, -0.41, n=10)
    return p.finish()


def build_scaffold_beam():
    p = Part("scaffold_beam")
    for x in (-1.2, 1.2):
        p.cyl(0.04, 3.4, (x, 0, 1.7), "silver", segs=8)
        p.box((0.2, 0.2, 0.03), (x, 0, 0.015), "dark_grey")
    p.cyl(0.04, 2.5, (0, 0, 3.2), "silver", rot=(0, 90, 0), segs=8)
    p.cyl(0.035, 2.9, (0, 0.05, 2.2), "silver", rot=(0, 55, 0), segs=8)
    p.box((2.45, 0.25, 0.45), (0, 0, 1.43), "wood")
    red_white(p, -1.2, 1.2, 1.22, 1.64, -0.13, n=9)
    return p.finish()


def build_pipe_bundle():
    p = Part("pipe_bundle")
    for y, z in ((-0.16, 1.36), (0.16, 1.36), (0, 1.62)):
        p.cyl(0.16, 2.3, (0, y, z), "rust", rot=(0, 90, 0), segs=10)
    for x in (-0.7, 0.7):
        p.box((0.06, 0.5, 0.05), (x, 0, 1.18), "orange")
        p.box((0.05, 0.05, 0.9), (x, 0, 1.75), "orange", rot=(0, (-1 if x < 0 else 1) * 25, 0))
    p.cyl(0.08, 0.15, (0, 0, 2.25), "yellow", segs=8)
    p.cyl(0.02, 7.0, (0, 0, 5.8), "black", segs=6)
    red_white(p, -1.1, 1.1, 1.2, 1.3, -0.33, n=8)
    return p.finish()


def build_girder():
    p = Part("girder")
    p.box((2.5, 0.42, 0.08), (0, 0, 1.24), "orange_dark")
    p.box((2.5, 0.42, 0.08), (0, 0, 1.86), "orange_dark")
    p.box((2.5, 0.08, 0.56), (0, 0, 1.55), "orange")
    for x in (-1.0, -0.4, 0.2, 0.8):
        p.box((0.05, 0.42, 0.56), (x, 0, 1.55), "orange_dark")
    for x in (-1.24, 1.24):
        p.box((0.12, 0.12, 2.6), (x, 0, 1.3), "night_steel")
    red_white(p, -1.2, 1.2, 1.2, 1.29, -0.22, n=10)
    return p.finish()


# ---------------------------------------------------------------------- pickups


def build_laptop():
    p = Part("laptop")
    p.box((0.72, 0.5, 0.045), (0, 0, -0.18), "dark_grey")
    p.box((0.62, 0.3, 0.01), (0, -0.04, -0.152), "light_grey")
    p.box((0.72, 0.045, 0.48), (0, 0.24, 0.08), "dark_grey", rot=(-12, 0, 0))
    p.box((0.64, 0.01, 0.4), (0, 0.215, 0.085), "glow_screen", rot=(-12, 0, 0))
    p.text("</>", 0.12, (0, 0.205, 0.09), "navy", rot=(78, 0, 0), extrude=0.005)
    return p.finish()


def build_energy_can():
    p = Part("energy_can")
    p.cyl(0.16, 0.56, (0, 0, 0), "black", segs=16)
    p.cyl(0.162, 0.26, (0, 0, -0.02), "glow_lime", segs=16)
    p.cyl(0.14, 0.04, (0, 0, 0.3), "silver", r2=0.13, segs=16)
    p.cyl(0.14, 0.04, (0, 0, -0.3), "silver", r2=0.155, segs=16)
    p.box((0.06, 0.1, 0.01), (0, 0.02, 0.325), "silver")
    p.text("ENERGY", 0.075, (0, -0.165, -0.02), "black", extrude=0.006)
    return p.finish()


def build_coffee_cup():
    p = Part("coffee_cup")
    p.cyl(0.15, 0.5, (0, 0, -0.05), "white", r2=0.2, segs=16)
    p.cyl(0.18, 0.18, (0, 0, -0.03), "brown", r2=0.19, segs=16)
    p.cyl(0.21, 0.05, (0, 0, 0.22), "brown_dark", r2=0.19, segs=16)
    p.cyl(0.13, 0.04, (0, 0, 0.26), "brown_dark", r2=0.1, segs=16)
    for i, (x, z) in enumerate(((-0.05, 0.36), (0.04, 0.45), (-0.02, 0.55))):
        p.sphere(0.05 + i * 0.01, (x, 0, z), "white", subdiv=1)
    return p.finish()


def build_ai_spark():
    p = Part("ai_spark")
    pts = []
    rays = 12
    for i in range(rays * 2):
        a = math.pi / 2 + i * math.pi / rays
        if i % 2 == 0:
            r = 0.46 if (i // 2) % 2 == 0 else 0.34
        else:
            r = 0.1
        pts.append((r * math.cos(a), r * math.sin(a)))
    p.prism(pts, 0.1, color="glow_coral")
    p.cyl(0.09, 0.14, (0, 0, 0), "cream", rot=(90, 0, 0), segs=12)
    return p.finish()


def build_boots():
    p = Part("boots")
    for x in (-0.13, 0.13):
        p.box((0.2, 0.24, 0.34), (x, 0.06, 0.02), "brown")
        p.box((0.21, 0.4, 0.14), (x, -0.02, -0.2), "brown")
        p.box((0.22, 0.42, 0.04), (x, -0.02, -0.28), "black")
        p.box((0.205, 0.245, 0.05), (x, 0.06, 0.06), "lime")
        p.box((0.2, 0.12, 0.08), (x, -0.17, -0.16), "silver")
    return p.finish()


def build_mystery_box():
    p = Part("mystery_box")
    p.box((0.66, 0.66, 0.66), (0, 0, 0), "orange")
    for a in (-1, 1):
        for b in (-1, 1):
            p.box((0.7, 0.06, 0.06), (0, a * 0.32, b * 0.32), "orange_dark")
            p.box((0.06, 0.7, 0.06), (a * 0.32, 0, b * 0.32), "orange_dark")
            p.box((0.06, 0.06, 0.7), (a * 0.32, b * 0.32, 0), "orange_dark")
    for rz in (0, 90, 180, 270):
        a = math.radians(rz)
        loc = (0.335 * math.sin(a), -0.335 * math.cos(a), 0)
        p.text("?", 0.46, loc, "white", rot=(90, 0, rz), extrude=0.02)
    return p.finish()


PROPS = {
    "token": build_token,
    "jersey_barrier": build_jersey_barrier,
    "cone_cluster": build_cone_cluster,
    "barrel_row": build_barrel_row,
    "brick_pallet": build_brick_pallet,
    "pipe_stack": build_pipe_stack,
    "sandbag_wall": build_sandbag_wall,
    "wheelbarrow": build_wheelbarrow,
    "toolbox_crate": build_toolbox_crate,
    "rock_pile": build_rock_pile,
    "height_gantry": build_height_gantry,
    "vent_duct": build_vent_duct,
    "cable_tray": build_cable_tray,
    "scaffold_beam": build_scaffold_beam,
    "pipe_bundle": build_pipe_bundle,
    "girder": build_girder,
    "laptop": build_laptop,
    "energy_can": build_energy_can,
    "coffee_cup": build_coffee_cup,
    "ai_spark": build_ai_spark,
    "boots": build_boots,
    "mystery_box": build_mystery_box,
}
