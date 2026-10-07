"""Vehicles, blocks, moving hazards and the ramp/platform. Fronts face -Y (towards the player)."""

import math


def wheels(p, xs, ys, r, w=0.3, color="rubber", hub="grey"):
    for x in xs:
        for y in ys:
            p.cyl(r, w, (x, y, r), color, rot=(0, 90, 0), segs=10)
            p.cyl(r * 0.5, w + 0.02, (x, y, r), hub, rot=(0, 90, 0), segs=8)


def tracks(p, x, y0, y1, h=0.7, w=0.5):
    p.block(x - w / 2, x + w / 2, y0, y1, 0, h, "rubber")
    for y in (y0 + 0.3, (y0 + y1) / 2, y1 - 0.3):
        p.cyl(0.25, w + 0.04, (x, y, 0.3), "dark_grey", rot=(0, 90, 0), segs=8)


def beacon(p, loc, color="glow_amber"):
    p.cyl(0.08, 0.06, (loc[0], loc[1], loc[2] - 0.05), "black", segs=8)
    p.cyl(0.07, 0.14, loc, color, segs=8)


def build_excavator():
    p = Part("excavator")
    tracks(p, -0.8, -1.6, 1.6)
    tracks(p, 0.8, -1.6, 1.6)
    p.block(-1.05, 1.05, -1.2, 1.4, 0.7, 1.6, "yellow")
    p.block(-1.05, 1.05, 0.9, 1.5, 0.7, 1.75, "yellow_dark")
    # cab on the left
    p.block(-1.0, -0.1, -1.0, 0.2, 1.6, 2.9, "yellow")
    p.block(-0.95, -0.15, -1.03, 0.0, 1.8, 2.75, "glass")
    p.block(-1.03, -0.1, -0.7, 0.1, 1.9, 2.7, "glass")
    # boom and stick raised at the front
    p.box((0.35, 1.9, 0.4), (0.45, -1.6, 2.35), "yellow", rot=(-38, 0, 0))
    p.box((0.3, 0.35, 1.7), (0.45, -2.25, 2.25), "yellow_dark", rot=(12, 0, 0))
    p.prism([(-0.45, 0), (0.45, 0), (0.35, 0.55), (-0.3, 0.6)], 0.8, (0.45, -2.35, 0.75), "dark_grey", rot=(0, 0, 90))
    p.cyl(0.08, 1.2, (0.45, -1.2, 2.0), "silver", rot=(-60, 0, 0), segs=6)
    beacon(p, (-0.55, -0.4, 3.0))
    p.stripes(-1.04, 1.04, 0.72, 0.95, -1.22, n=10, slant=0.08)
    return p.finish()


def build_road_roller():
    p = Part("road_roller")
    p.cyl(0.62, 1.9, (0, -1.05, 0.62), "dark_grey", rot=(0, 90, 0), segs=14)
    p.block(-1.0, 1.0, -1.5, -0.6, 0.9, 1.3, "yellow")
    p.block(-0.95, 0.95, -0.5, 1.6, 0.4, 1.5, "yellow")
    wheels(p, (-0.85, 0.85), (1.1,), 0.55, w=0.35)
    p.block(-0.7, 0.7, 0.0, 1.2, 1.5, 1.6, "black")
    for x in (-0.65, 0.65):
        for y in (0.05, 1.15):
            p.box((0.07, 0.07, 0.85), (x, y, 2.0), "black")
    p.block(-0.75, 0.75, -0.05, 1.25, 2.4, 2.48, "yellow")
    p.box((0.4, 0.4, 0.4), (0, 0.6, 1.8), "dark_grey")
    beacon(p, (0, 0.6, 2.55))
    p.stripes(-0.95, 0.95, 0.95, 1.2, -1.52, n=8, slant=0.08)
    return p.finish()


def build_site_cabin():
    p = Part("site_cabin")
    p.block(-1.15, 1.15, -1.8, 1.8, 0.0, 0.25, "dark_grey")
    p.block(-1.15, 1.15, -1.8, 1.8, 0.25, 2.65, "white")
    p.block(-1.2, 1.2, -1.85, 1.85, 2.65, 2.8, "sign_blue")
    for y in (-1.0, 0.0, 1.0):
        for x in (-1.16, 1.16):
            p.block(x - 0.02, x + 0.02, y - 0.35, y + 0.35, 1.2, 2.0, "glass")
    p.block(-0.8, 0.8, -1.82, -1.78, 1.2, 2.0, "glass")
    p.block(-0.95, -0.15, -1.83, -1.79, 0.25, 2.1, "sign_blue")
    for i in range(3):
        p.block(-0.95, -0.15, -2.0 - i * 0.22, -1.8 - i * 0.22, 0.0, 0.22 - i * 0.07 + 0.0, "grey")
    return p.finish()


def build_mine_cart():
    p = Part("mine_cart")
    wheels(p, (-0.75, 0.75), (-0.95, 0.95), 0.25, w=0.12, color="rust", hub="dark_grey")
    p.block(-0.85, 0.85, -1.4, 1.4, 0.35, 0.5, "dark_grey")
    p.prism([(-0.9, 0.5), (0.9, 0.5), (1.0, 1.85), (-1.0, 1.85)], 2.9, (0, 0, 0), "rust", rot=(0, 0, 0))
    p.block(-0.9, 0.9, -1.48, -1.42, 0.6, 1.8, "rust")
    for z in (0.9, 1.5):
        p.block(-1.0, 1.0, -1.5, 1.5, z, z + 0.08, "brown_dark")
    p.sphere(0.5, (0, 0, 1.75), "rock_dark", scale=(1.6, 2.4, 0.6))
    beacon(p, (0.75, -1.3, 1.95))
    return p.finish()


def build_segment_stack():
    p = Part("segment_stack")
    for layer in range(3):
        z = 0.15 + layer * 0.75
        pts = []
        for i in range(9):
            a = math.radians(200 + i * (140 / 8))
            pts.append((1.15 * math.cos(a), 1.15 * math.sin(a) + 1.15))
        for i in range(8, -1, -1):
            a = math.radians(200 + i * (140 / 8))
            pts.append((0.85 * math.cos(a), 0.85 * math.sin(a) + 1.15))
        p.prism(pts, 2.6, (0, 0, z - 0.1), "concrete" if layer % 2 == 0 else "concrete_dark", rot=(0, 0, 0))
        p.box((2.3, 0.15, 0.12), (0, -0.9, z - 0.04), "wood")
        p.box((2.3, 0.15, 0.12), (0, 0.9, z - 0.04), "wood")
    p.stripes(-1.0, 1.0, 0.0, 0.1, -1.31, n=8, slant=0.04)
    return p.finish()


def build_drill_rig():
    p = Part("drill_rig")
    tracks(p, -0.8, -1.7, 1.7)
    tracks(p, 0.8, -1.7, 1.7)
    p.block(-1.05, 1.05, -1.2, 1.6, 0.7, 1.7, "red")
    p.block(-1.0, 0.0, 0.4, 1.5, 1.7, 2.8, "red")
    p.block(-0.95, 0.05, 0.37, 1.2, 1.9, 2.65, "glass")
    # mast leaning forward over the front
    p.box((0.4, 0.4, 6.0), (0.45, -1.4, 3.6), "yellow", rot=(-8, 0, 0))
    for z in (1.5, 2.6, 3.7, 4.8, 5.9):
        p.box((0.5, 0.5, 0.08), (0.45, -1.4 - (z - 3.6) * 0.14, z), "dark_grey", rot=(-8, 0, 0))
    p.cyl(0.08, 3.0, (0.45, -1.75, 1.6), "silver", rot=(-8, 0, 0), segs=6)
    p.block(-1.1, 1.1, -1.9, -1.2, 0.2, 0.7, "dark_grey")
    beacon(p, (-0.5, 1.0, 2.95))
    p.stripes(-1.04, 1.04, 0.75, 1.0, -1.22, n=10, slant=0.08)
    return p.finish()


def build_bulldozer():
    p = Part("bulldozer")
    tracks(p, -0.85, -1.4, 1.6, h=0.75)
    tracks(p, 0.85, -1.4, 1.6, h=0.75)
    p.block(-0.9, 0.9, -1.1, 0.6, 0.75, 1.6, "yellow")
    p.block(-0.8, 0.8, 0.4, 1.5, 0.75, 2.5, "yellow")
    p.block(-0.75, 0.75, 0.37, 1.4, 1.7, 2.35, "glass")
    p.block(-0.85, 0.85, 0.35, 1.55, 2.5, 2.6, "yellow_dark")
    p.prism([(-0.25, 0), (0.15, 0), (0.15, 1.25), (-0.1, 1.35), (-0.3, 0.6)], 2.4, (0, -1.75, 0), "yellow_dark", rot=(0, 0, 90))
    p.cyl(0.07, 0.6, (0.35, -0.5, 1.9), "black", segs=6)
    beacon(p, (-0.5, 1.2, 2.67))
    p.stripes(-1.15, 1.15, 0.9, 1.15, -1.92, n=10, slant=0.08)
    return p.finish()


def build_scissor_lift():
    p = Part("scissor_lift")
    wheels(p, (-0.8, 0.8), (-1.0, 1.0), 0.22, w=0.2)
    p.block(-0.95, 0.95, -1.4, 1.4, 0.2, 0.6, "orange")
    for side in (-0.85, 0.85):
        for i in range(3):
            z = 0.75 + i * 0.55
            p.box((0.06, 2.6, 0.08), (side, 0, z), "dark_grey", rot=(22, 0, 0))
            p.box((0.06, 2.6, 0.08), (side, 0, z), "dark_grey", rot=(-22, 0, 0))
    p.block(-1.0, 1.0, -1.45, 1.45, 2.2, 2.32, "orange")
    for x in (-0.97, 0.97):
        p.block(x - 0.03, x + 0.03, -1.42, 1.42, 2.32, 3.2, "yellow")
    for y in (-1.42, 1.42):
        p.block(-0.97, 0.97, y - 0.03, y + 0.03, 3.1, 3.2, "yellow")
        p.block(-0.97, 0.97, y - 0.03, y + 0.03, 2.7, 2.76, "yellow")
    p.stripes(-0.95, 0.95, 0.25, 0.55, -1.42, n=8, slant=0.08)
    return p.finish()


def build_dump_truck():
    p = Part("dump_truck")
    wheels(p, (-0.95, 0.95), (-2.4, 1.2, 2.5), 0.55, w=0.4)
    p.block(-1.05, 1.05, -3.5, 3.4, 0.55, 0.9, "dark_grey")
    # cab at the front (-Y)
    p.block(-1.1, 1.1, -3.5, -2.0, 0.9, 2.9, "orange")
    p.block(-1.0, 1.0, -3.53, -3.0, 1.9, 2.7, "glass")
    p.block(-1.12, 1.12, -2.9, -2.1, 1.95, 2.6, "glass")
    p.block(-1.1, 1.1, -3.55, -3.45, 0.9, 1.35, "silver")
    for x in (-0.75, 0.75):
        p.block(x - 0.2, x + 0.2, -3.57, -3.52, 1.1, 1.25, "glow_lamp")
    # dump body
    p.prism([(-1.15, 1.0), (1.15, 1.0), (1.2, 3.0), (-1.2, 3.0)], 5.2, (0, 0.8, 0), "yellow", rot=(0, 0, 0))
    p.block(-1.2, 1.2, -1.85, -1.75, 1.0, 3.2, "yellow_dark")
    p.sphere(0.9, (0, 0.8, 3.0), "dirt", scale=(1.2, 2.6, 0.4))
    beacon(p, (0, -2.8, 3.0))
    p.stripes(-1.1, 1.1, 0.58, 0.88, -3.52, n=10, slant=0.08)
    return p.finish()


def build_mixer_truck():
    p = Part("mixer_truck")
    wheels(p, (-0.95, 0.95), (-2.4, 1.3, 2.5), 0.55, w=0.4)
    p.block(-1.05, 1.05, -3.5, 3.4, 0.55, 0.9, "dark_grey")
    p.block(-1.1, 1.1, -3.5, -2.0, 0.9, 2.9, "white")
    p.block(-1.0, 1.0, -3.53, -3.0, 1.9, 2.7, "glass")
    p.block(-1.12, 1.12, -2.9, -2.1, 1.95, 2.6, "glass")
    for x in (-0.75, 0.75):
        p.block(x - 0.2, x + 0.2, -3.57, -3.52, 1.1, 1.25, "glow_lamp")
    p.cyl(1.1, 3.6, (0, 0.8, 2.05), "orange", rot=(-8, 0, 0), r2=0.7, segs=14)
    for i in range(4):
        p.cyl(1.0 - i * 0.07, 0.12, (0, -0.6 + i * 0.9, 2.05 + i * 0.12), "white", rot=(-8, 0, 0), segs=14)
    p.block(-0.3, 0.3, 2.7, 3.4, 2.2, 2.9, "dark_grey")
    p.block(-0.15, 0.15, 3.0, 3.6, 1.2, 2.3, "grey")
    beacon(p, (0, -2.8, 3.0))
    p.stripes(-1.1, 1.1, 0.58, 0.88, -3.52, n=10, slant=0.08)
    return p.finish()


def container_body(p, length, color, color_dark):
    l2 = length / 2
    p.block(-1.15, 1.15, -l2, l2, 0.0, 2.6, color)
    n = max(3, int(length / 0.45))
    for i in range(n):
        y = -l2 + (i + 0.5) * length / n
        for x in (-1.17, 1.17):
            p.block(x - 0.02, x + 0.02, y - 0.08, y + 0.08, 0.1, 2.5, color_dark)
    for x in (-1.15, 1.15):
        for y in (-l2, l2):
            p.block(x - 0.08, x + 0.08, y - 0.08, y + 0.08, 0, 2.6, color_dark)
    for z in (0.04, 2.56):
        p.block(-1.17, 1.17, -l2, l2, z - 0.05, z + 0.05, color_dark)


def build_container():
    p = Part("container")
    container_body(p, 7.2, "orange", "orange_dark")
    # doors facing the player
    for x in (-0.55, 0.55):
        p.block(x - 0.5, x + 0.5, -3.63, -3.6, 0.15, 2.45, "orange_dark")
        p.block(x - 0.05, x + 0.05, -3.66, -3.62, 0.2, 2.4, "silver")
    p.text("TOKEN-LOGISTICS", 0.32, (1.19, 0.2, 1.4), "white", rot=(90, 0, 90), extrude=0.01)
    return p.finish()


def build_container_platform():
    p = Part("container_platform")
    container_body(p, 4.0, "sign_blue", "navy")
    p.block(-1.18, 1.18, -2.0, -1.95, 2.6, 2.7, "yellow")
    p.stripes(-1.15, 1.15, 2.0, 2.5, -2.02, n=10, slant=0.08)
    return p.finish()


def build_ramp():
    p = Part("ramp")
    p.wedge(2.2, 4.0, 2.6, (0, 0, 0), "steel_blue")
    for i in range(9):
        y = -1.8 + i * 0.45
        z = 2.6 * (y + 2.0) / 4.0
        p.box((2.1, 0.06, 0.05), (0, y, z + 0.02), "steel_blue_dark", rot=(-33, 0, 0))
    for x in (-1.12, 1.12):
        p.prism([(-2.0, 0), (2.0, 0), (2.0, 2.65), (1.9, 2.65)], 0.06, (x, 0, 0), "yellow", rot=(0, 0, 90))
    p.stripes(-1.1, 1.1, 0.0, 0.12, -2.02, n=10, slant=0.04)
    return p.finish()


def build_rolling_pipe():
    p = Part("rolling_pipe")
    p.cyl(0.65, 2.0, (0, 0, 0.65), "concrete", rot=(0, 90, 0), segs=14)
    p.cyl(0.5, 2.04, (0, 0, 0.65), "concrete_dark", rot=(0, 90, 0), segs=14)
    for x in (-0.85, 0.85):
        p.cyl(0.68, 0.18, (x, 0, 0.65), "orange", rot=(0, 90, 0), segs=14)
    p.box((2.05, 0.1, 0.1), (0, -0.66, 0.65), "yellow")
    return p.finish()


def build_crane_load():
    """A pallet of bricks hanging from a hook. Origin on the ground; load spans 0.3–1.8 m."""
    p = Part("crane_load")
    p.block(-1.0, 1.0, -0.8, 0.8, 0.3, 0.45, "wood")
    for layer in range(3):
        for ix in range(4):
            for iy in range(3):
                p.box((0.46, 0.5, 0.36), (-0.72 + ix * 0.48, -0.52 + iy * 0.52, 0.64 + layer * 0.38), "red" if (ix + iy + layer) % 2 else "red_dark")
    for x in (-0.95, 0.95):
        for y in (-0.75, 0.75):
            p.cyl(0.02, 1.7, (x * 0.5, y * 0.5, 2.4), "orange", rot=(-y * 25, x * 25, 0), segs=4)
    p.cyl(0.12, 0.3, (0, 0, 3.2), "yellow", segs=8)
    p.box((0.3, 0.1, 0.25), (0, 0, 3.45), "yellow_dark")
    p.cyl(0.025, 14.0, (0, 0, 10.5), "black", segs=6)
    p.stripes(-1.0, 1.0, 0.3, 0.45, -0.81, n=10, slant=0.05)
    return p.finish()


def build_sweep_arm():
    """A swinging rock bucket hanging from a cable (drill site). Spans 0.4–1.6 m."""
    p = Part("sweep_arm")
    p.prism([(-0.9, 0.4), (0.9, 0.4), (1.1, 1.5), (-1.1, 1.5)], 1.0, (0, 0, 0), "dark_grey")
    for x in (-0.8, -0.4, 0.0, 0.4, 0.8):
        p.cyl(0.06, 0.25, (x, -0.45, 0.32), "silver", r2=0.0, segs=5)
    p.sphere(0.5, (0, 0, 1.5), "rock", scale=(1.8, 0.8, 0.4))
    for x in (-1.0, 1.0):
        p.cyl(0.03, 1.6, (x * 0.5, 0, 2.2), "black", rot=(0, x * 30, 0), segs=4)
    p.cyl(0.025, 12.0, (0, 0, 9.0), "black", segs=6)
    p.stripes(-1.0, 1.0, 1.35, 1.5, -0.51, n=8, slant=0.06)
    beacon(p, (1.05, 0, 1.6))
    return p.finish()


VEHICLES = {
    "excavator": build_excavator,
    "road_roller": build_road_roller,
    "site_cabin": build_site_cabin,
    "mine_cart": build_mine_cart,
    "segment_stack": build_segment_stack,
    "drill_rig": build_drill_rig,
    "bulldozer": build_bulldozer,
    "scissor_lift": build_scissor_lift,
    "dump_truck": build_dump_truck,
    "mixer_truck": build_mixer_truck,
    "container": build_container,
    "container_platform": build_container_platform,
    "ramp": build_ramp,
    "rolling_pipe": build_rolling_pipe,
    "crane_load": build_crane_load,
    "sweep_arm": build_sweep_arm,
}
