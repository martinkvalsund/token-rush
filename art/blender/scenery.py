"""Side scenery, zone structures, transition pieces, skyline and the Tech Debt boulder."""

import math
import random


def lattice(p, x, y, z0, z1, w, color):
    """A square lattice mast: four corner posts with diagonal braces."""
    h = z1 - z0
    for dx in (-w / 2, w / 2):
        for dy in (-w / 2, w / 2):
            p.box((0.12, 0.12, h), (x + dx, y + dy, z0 + h / 2), color)
    n = max(2, int(h / w))
    seg = h / n
    for i in range(n):
        zc = z0 + seg * (i + 0.5)
        ang = math.degrees(math.atan2(seg, w))
        for dy in (-w / 2, w / 2):
            p.box((math.hypot(w, seg), 0.07, 0.07), (x, y + dy, zc), color, rot=(0, -ang if i % 2 else ang, 0))
        for dx in (-w / 2, w / 2):
            p.box((0.07, math.hypot(w, seg), 0.07), (x + dx, y, zc), color, rot=(ang if i % 2 else -ang, 0, 0))


def build_tower_crane():
    p = Part("tower_crane")
    p.block(-2, 2, -2, 2, 0, 0.8, "concrete_dark")
    lattice(p, 0, 0, 0.8, 30, 1.8, "yellow")
    p.block(-1.2, 1.2, -1.2, 1.2, 30, 31.5, "yellow_dark")
    p.block(-1.0, 1.0, -2.4, -1.0, 29.0, 31.0, "white")
    p.block(-0.9, 0.9, -2.43, -1.4, 29.8, 30.8, "glass")
    p.block(-0.6, 0.6, -24, 0, 31.5, 32.6, "yellow")
    for i in range(12):
        y = -23 + i * 2
        p.box((1.1, 0.07, 1.4), (0, y, 32.05), "yellow_dark", rot=(45 if i % 2 else -45, 0, 0))
    p.block(-0.6, 0.6, 0, 9, 31.5, 32.4, "yellow")
    p.block(-1.2, 1.2, 6, 9, 30.5, 32.3, "concrete")
    p.box((0.2, 0.2, 5.0), (0, 0, 34.0), "yellow")
    for y, z0 in ((-16, 31.5), (6, 31.5)):
        p.box((0.06, 0.06, math.hypot(abs(y), 4.0)), (0, y / 2, 34.0 - 1.2), "black", rot=(math.degrees(math.atan2(y, 4.0)), 0, 0))
    p.box((0.6, 0.6, 0.5), (0, -18, 31.0), "dark_grey")
    p.cyl(0.03, 18, (0, -18, 21.5), "black", segs=4)
    p.cyl(0.1, 0.1, (0, 0, 36.6), "glow_red", segs=6)
    return p.finish()


def build_building_frame():
    p = Part("building_frame")
    floors = 4
    w, d, fh = 12.0, 10.0, 3.4
    for f in range(floors + 1):
        z = f * fh
        if f > 0:
            p.block(-w / 2, w / 2 if f < floors else 1.0, -d / 2, d / 2, z - 0.3, z, "concrete")
        if f < floors:
            for x in (-w / 2 + 0.3, 0, w / 2 - 0.3):
                for y in (-d / 2 + 0.3, d / 2 - 0.3):
                    if f == floors - 1 and x > 1.0:
                        continue
                    p.block(x - 0.25, x + 0.25, y - 0.25, y + 0.25, z, z + fh - 0.3, "concrete_dark")
    for x in (2.0, 3.5, 5.0):
        p.cyl(0.03, 2.0, (x, -d / 2 + 0.3, (floors - 1) * fh + 1.0), "rust", segs=4)
    p.block(-w / 2 - 0.1, -w / 2 + 3.5, -d / 2 - 0.4, -d / 2 - 0.3, 0.0, 2 * fh, "safety_green")
    p.block(-w / 2, -w / 2 + 3.4, -d / 2 - 0.9, -d / 2 - 0.4, 0.0, 0.1, "wood")
    return p.finish()


def build_floodlight_tower():
    p = Part("floodlight_tower")
    p.block(-0.8, 0.8, -1.2, 1.2, 0.3, 0.9, "yellow")
    for y in (-0.8, 0.8):
        p.cyl(0.3, 0.2, (0.85, y, 0.3), "rubber", rot=(0, 90, 0), segs=8)
        p.cyl(0.3, 0.2, (-0.85, y, 0.3), "rubber", rot=(0, 90, 0), segs=8)
    p.cyl(0.1, 7.0, (0, 0, 4.4), "silver", segs=8)
    p.block(-1.0, 1.0, -0.12, 0.12, 7.6, 7.75, "dark_grey")
    for x in (-0.7, 0.0, 0.7):
        for z in (7.95, 8.55):
            p.block(x - 0.27, x + 0.27, -0.35, -0.1, z - 0.24, z + 0.24, "dark_grey")
            p.block(x - 0.22, x + 0.22, -0.38, -0.34, z - 0.19, z + 0.19, "glow_lamp")
    return p.finish()


def build_sign_post():
    p = Part("sign_post")
    for x in (-0.9, 0.9):
        p.box((0.08, 0.08, 2.6), (x, 0.05, 1.3), "silver")
    p.block(-1.3, 1.3, 0.0, 0.08, 1.6, 2.7, "white")
    obj = p.finish()
    face = Part("sign_post_face")
    face.block(-1.25, 1.25, -0.02, 0.0, 1.65, 2.65, "white")
    f = face.finish(parent=obj)
    set_face_uvs(f)
    return obj


def build_billboard():
    p = Part("billboard")
    for x in (-2.4, 2.4):
        p.box((0.25, 0.25, 4.0), (x, 0.2, 2.0), "steel_blue_dark")
    p.block(-3.3, 3.3, 0.05, 0.3, 3.0, 6.4, "steel_blue_dark")
    p.block(-3.3, 3.3, -0.4, 0.3, 2.85, 2.95, "dark_grey")
    for x in (-2.2, 0.0, 2.2):
        p.box((0.08, 0.6, 0.08), (x, -0.25, 6.55), "dark_grey", rot=(30, 0, 0))
        p.block(x - 0.25, x + 0.25, -0.6, -0.4, 6.6, 6.75, "glow_lamp")
    obj = p.finish()
    face = Part("billboard_face")
    face.block(-3.2, 3.2, 0.0, 0.03, 3.1, 6.3, "white")
    f = face.finish(parent=obj)
    set_face_uvs(f)
    return obj


def set_face_uvs(obj):
    """Planar 0..1 UVs on the front (-Y) of a sign face, so a canvas texture can map onto it."""
    mesh = obj.data
    xs = [v.co.x for v in mesh.vertices]
    zs = [v.co.z for v in mesh.vertices]
    x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
    uv = mesh.uv_layers.active
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            co = mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv = ((co.x - x0) / (x1 - x0), (co.z - z0) / (z1 - z0))


def build_cone():
    p = Part("cone")
    p.box((0.4, 0.4, 0.05), (0, 0, 0.025), "black")
    p.cyl(0.17, 0.68, (0, 0, 0.39), "orange", r2=0.035, segs=10)
    p.cyl(0.125, 0.1, (0, 0, 0.36), "white", r2=0.105, segs=10)
    return p.finish()


def build_pipe_rack():
    p = Part("pipe_rack")
    for y in (-1.8, 1.8):
        p.box((0.1, 0.1, 4.2), (0, y, 2.1), "dark_grey")
        for z in (1.0, 2.2, 3.4):
            p.box((0.7, 0.1, 0.08), (-0.3, y, z), "dark_grey")
    for z, c, r in ((1.12, "steel_blue", 0.14), (2.35, "orange", 0.16), (3.55, "green", 0.12)):
        p.cyl(r, 4.0, (-0.3, 0, z), c, rot=(90, 0, 0), segs=8)
    for z in (1.3, 2.55):
        p.cyl(0.05, 4.0, (-0.55, 0, z), "black", rot=(90, 0, 0), segs=6)
    p.block(-0.02, 0.02, -2.0, 2.0, 2.8, 3.0, "glow_lamp")
    return p.finish()


def build_tbm_cutterhead():
    p = Part("tbm_cutterhead")
    p.cyl(3.0, 0.8, (0, 0, 3.2), "orange", rot=(0, 90, 0), segs=20)
    p.cyl(2.6, 0.82, (0, 0, 3.2), "orange_dark", rot=(0, 90, 0), segs=20)
    for i in range(6):
        a = i * 60
        p.box((0.9, 0.4, 5.4), (-0.3, 0, 3.2), "yellow_dark", rot=(a, 0, 0))
    for i in range(16):
        a = math.radians(i * 22.5)
        r = 1.2 + (i % 3) * 0.6
        p.cyl(0.14, 0.3, (-0.5, r * math.cos(a), 3.2 + r * math.sin(a)), "silver", rot=(0, 90, 0), segs=6)
    p.cyl(0.5, 0.4, (-0.6, 0, 3.2), "dark_grey", rot=(0, 90, 0), segs=10)
    p.block(-1.0, 1.0, -2.0, 2.0, 0.0, 0.3, "wood")
    return p.finish()


def build_tunnel_ring():
    """An 8 m tunnel section: shotcrete arch (inward facing), lamp strip, cable tray, rib."""
    p = Part("tunnel_ring")
    r, length, segs = 7.4, 8.0, 14
    pts_outer, pts_inner = [], []
    for i in range(segs + 1):
        a = math.radians(-8 + i * (196 / segs))
        pts_outer.append((r * 1.04 * math.cos(a), r * 1.04 * math.sin(a)))
        pts_inner.append((r * math.cos(a), r * math.sin(a)))
    for i in range(segs):
        a0, a1 = pts_inner[i], pts_inner[i + 1]
        b0, b1 = pts_outer[i], pts_outer[i + 1]
        p.prism([a0, a1, b1, b0], length, (0, 0, -0.6), "concrete" if i % 2 else "concrete_dark")
    for i in range(segs):
        a0, a1 = pts_inner[i], pts_inner[i + 1]
        b0 = (a0[0] * 0.95, a0[1] * 0.95)
        b1 = (a1[0] * 0.95, a1[1] * 0.95)
        p.prism([a0, a1, b1, b0], 0.5, (0, -length / 2 + 0.25, -0.6), "concrete_dark")
    p.block(-0.15, 0.15, -length / 2, length / 2, 6.55, 6.65, "glow_lamp")
    p.block(-0.3, 0.3, -length / 2, length / 2, 6.65, 6.75, "dark_grey")
    for x in (-5.2, 5.2):
        p.block(x - 0.25, x + 0.25, -length / 2, length / 2, 3.6, 3.7, "dark_grey")
        p.cyl(0.08, length, (x, 0, 3.78), "black", rot=(90, 0, 0), segs=6)
        p.block(x - 0.06, x + 0.06, -length / 2, length / 2, 2.4, 2.5, "glow_orange" if x < 0 else "glow_lamp")
    for y in (-3.0, -1.0, 1.0, 3.0):
        p.block(-4.6, 4.6, y - 0.12, y + 0.12, -0.02, 0.04, "brown_dark")
    for x in (-3.4, -2.0):
        p.block(x - 0.05, x + 0.05, -length / 2, length / 2, 0.04, 0.12, "silver")
    return p.finish()


def build_scaffold_wall():
    p = Part("scaffold_wall")
    for x in (-4.0, -2.0, 0.0, 2.0, 4.0):
        for y in (-0.6, 0.6):
            p.cyl(0.04, 8.0, (y, x, 4.0), "silver", segs=6)
    for z in (2.0, 4.0, 6.0, 8.0):
        for y in (-0.6, 0.6):
            p.cyl(0.04, 8.2, (y, 0, z), "silver", rot=(90, 0, 0), segs=6)
        p.block(-0.7, 0.7, -4.1, 4.1, z - 0.06, z, "wood")
    for i in range(4):
        p.box((0.04, 2.8, 0.04), (0.6, -3.0 + i * 2.0, 3.0 + (i % 2) * 2.0), "silver", rot=(45, 0, 0))
    p.block(-0.8, -0.74, -4.0, 4.0, 2.0, 8.0, "safety_green")
    p.block(-0.81, -0.75, -1.5, 1.5, 4.6, 5.4, "white")
    return p.finish()


def build_rock_wall():
    p = Part("rock_wall")
    random.seed(7)
    for i in range(9):
        y = -6 + i * 1.5
        h = 4.5 + random.random() * 4.0
        p.sphere(2.2, (random.uniform(-0.6, 0.6), y, h / 2), "rock" if i % 2 else "rock_dark",
                 scale=(1.0, 0.9, h / 4.4), rot=(random.uniform(0, 40), random.uniform(0, 40), random.uniform(0, 90)))
    p.block(-2.5, 2.5, -7.0, 7.0, -0.2, 0.6, "rock_dark")
    return p.finish()


def build_blast_sign():
    p = Part("blast_sign")
    p.box((0.1, 0.1, 2.6), (0, 0.05, 1.3), "silver")
    p.prism([(-0.7, 1.6), (0.7, 1.6), (0, 2.6)], 0.06, (0, 0, 0), "yellow")
    p.prism([(-0.5, 1.72), (0.5, 1.72), (0, 2.42)], 0.07, (0, -0.005, 0), "black")
    p.text("BLAST", 0.22, (0, -0.06, 1.82), "yellow", extrude=0.01)
    p.cyl(0.12, 0.2, (0, 0.05, 2.75), "glow_amber", segs=8)
    return p.finish()


def build_bridge_truss():
    """12 m steel truss section over the road with deck edges and cable lamps."""
    p = Part("bridge_truss")
    L, W, H = 12.0, 12.0, 7.0
    for x in (-W / 2, W / 2):
        p.block(x - 0.25, x + 0.25, -L / 2, L / 2, 0.0, 0.5, "night_steel")
        p.block(x - 0.2, x + 0.2, -L / 2, L / 2, H - 0.4, H, "night_steel")
        p.block(x - 0.2, x + 0.2, -L / 2, -L / 2 + 0.4, 0.0, H, "night_steel")
        ang = math.degrees(math.atan2(L, H))
        p.box((0.25, 0.25, math.hypot(L, H)), (x, 0, H / 2), "night_steel", rot=(ang, 0, 0))
        p.block(x - 0.1, x + 0.1, -L / 2, L / 2, 1.0, 1.15, "silver")
    p.block(-W / 2, W / 2, -L / 2, -L / 2 + 0.4, H - 0.4, H, "night_steel")
    p.box((W, 0.2, 0.2), (0, 0, H - 0.2), "night_steel", rot=(0, 0, 0))
    for x in (-3.0, 3.0):
        p.block(x - 0.3, x + 0.3, -0.2, 0.2, H - 0.7, H - 0.45, "dark_grey")
        p.block(x - 0.25, x + 0.25, -0.18, 0.18, H - 0.75, H - 0.7, "glow_lamp")
    p.block(-W / 2 - 3, -W / 2, -L / 2, L / 2, -0.6, -0.1, "night_steel")
    p.block(W / 2, W / 2 + 3, -L / 2, L / 2, -0.6, -0.1, "night_steel")
    return p.finish()


def build_site_gate():
    p = Part("site_gate")
    for x in (-6.3, 6.3):
        p.block(x - 0.35, x + 0.35, -0.35, 0.35, 0.0, 6.2, "yellow")
        p.stripes(x - 0.35, x + 0.35, 0.0, 1.2, -0.37, n=3, slant=0.2)
    p.block(-6.7, 6.7, -0.3, 0.3, 6.2, 7.6, "dark_grey")
    p.block(-6.6, 6.6, -0.33, -0.3, 6.3, 7.5, "yellow")
    p.text("SITE ENTRANCE", 0.75, (0, -0.36, 6.9), "black", extrude=0.02)
    for x in (-6.0, 6.0):
        p.cyl(0.15, 0.25, (x, -0.2, 7.8), "glow_amber", segs=8)
    return p.finish()


def build_tunnel_portal():
    p = Part("tunnel_portal")
    r = 7.6
    edge = r * 1.18
    p.block(-14, -edge, -0.6, 0.6, 0, 12, "concrete_dark")
    p.block(edge, 14, -0.6, 0.6, 0, 12, "concrete_dark")
    p.block(-edge, edge, -0.6, 0.6, edge, 12, "concrete_dark")
    for i in range(12):
        a0 = math.radians(i * 15)
        a1 = math.radians((i + 1) * 15)
        q = [(r * math.cos(a0), r * math.sin(a0)), (r * math.cos(a1), r * math.sin(a1)),
             (edge * math.cos(a1), edge * math.sin(a1)), (edge * math.cos(a0), edge * math.sin(a0))]
        p.prism(q, 1.4, (0, -0.1, 0), "yellow" if i % 2 else "black")
        # Fill the corner between the arch and the square frame.
        corner = (edge if i < 6 else -edge, edge)
        p.prism([(edge * math.cos(a0), edge * math.sin(a0)), (edge * math.cos(a1), edge * math.sin(a1)), corner], 1.2, (0, 0, 0), "concrete_dark")
    p.text("TUNNEL", 1.0, (0, -0.1, 10.4), "white", extrude=0.03)
    return p.finish()


def build_skyline():
    """Distant silhouettes for the horizon: towers, frames and cranes on a wide arc."""
    p = Part("skyline")
    random.seed(3)
    for i in range(46):
        x = -220 + i * 9.6 + random.uniform(-3, 3)
        h = random.choice((18, 26, 34, 44, 58, 72))
        w = random.uniform(8, 16)
        y = random.uniform(-10, 25)
        p.block(x - w / 2, x + w / 2, y - 6, y + 6, 0, h, random.choice(("steel_blue_dark", "navy", "night_steel", "dark_grey")))
        if random.random() < 0.25:
            p.block(x - 1.2, x + 1.2, y - 11.2, y - 8.8, 0, h + 20, "yellow_dark")
            p.block(x - 1, x + 1, y - 30, y - 8, h + 20, h + 22, "yellow_dark")
    for i in range(8):
        x = -200 + i * 55
        p.sphere(60, (x, 70, -30), "green", scale=(1.6, 0.6, 0.8))
    return p.finish()


def build_boulder():
    obj = empty_root("boulder")
    ball = Part("boulder_ball")
    v = ball.sphere(1.6, (0, 0, 1.6), "rock", subdiv=2)
    random.seed(11)
    for vert in v:
        n = (vert.co - Vector((0, 0, 1.6))).normalized()
        vert.co += n * random.uniform(-0.12, 0.12)
    b = ball.finish(parent=obj)
    # Spherical UVs for the merge-conflict canvas texture.
    mesh = b.data
    uv = mesh.uv_layers.active
    for poly in mesh.polygons:
        us = []
        for li in poly.loop_indices:
            co = mesh.vertices[mesh.loops[li].vertex_index].co - Vector((0, 0, 1.6))
            u = 0.5 + math.atan2(co.y, co.x) / (2 * math.pi)
            vv = 0.5 + math.asin(max(-1, min(1, co.z / co.length))) / math.pi
            us.append([li, u, vv])
        lo = min(u for _, u, _ in us)
        for item in us:
            if item[1] - lo > 0.5:
                item[1] -= 1
        for li, u, vv in us:
            uv.data[li].uv = (u, vv)
    rubble = Part("boulder_rubble")
    for i in range(10):
        a = random.uniform(0, 2 * math.pi)
        r = random.uniform(1.6, 2.6)
        rubble.sphere(random.uniform(0.15, 0.35), (r * math.cos(a), r * math.sin(a) * 0.6 + 0.6, 0.15), "rock_dark" if i % 2 else "rock", subdiv=1, scale=(1, 1, 0.7))
    rubble.finish(parent=obj)
    return obj


def build_rubber_duck():
    """Easter egg: a giant rubber debugging duck on a pallet."""
    p = Part("rubber_duck")
    p.box((1.6, 1.6, 0.15), (0, 0, 0.075), "wood")
    p.sphere(0.75, (0, 0.1, 0.85), "yellow", scale=(1.0, 1.25, 0.8), subdiv=2)
    p.sphere(0.48, (0, -0.45, 1.55), "yellow", subdiv=2)
    p.prism([(-0.22, 0), (0.22, 0), (0.15, 0.12), (-0.15, 0.12)], 0.3, (0, -0.95, 1.45), "orange", rot=(0, 0, 0))
    for x in (-0.18, 0.18):
        p.sphere(0.07, (x, -0.86, 1.68), "black", subdiv=1)
    p.box((0.5, 0.2, 0.3), (0, 0.75, 1.05), "yellow_dark", rot=(-30, 0, 0))
    return p.finish()


def empty_root(name):
    obj = bpy.data.objects.new(name, None)
    collection().objects.link(obj)
    return obj


SCENERY = {
    "tower_crane": build_tower_crane,
    "building_frame": build_building_frame,
    "floodlight_tower": build_floodlight_tower,
    "sign_post": build_sign_post,
    "billboard": build_billboard,
    "cone": build_cone,
    "pipe_rack": build_pipe_rack,
    "tbm_cutterhead": build_tbm_cutterhead,
    "tunnel_ring": build_tunnel_ring,
    "scaffold_wall": build_scaffold_wall,
    "rock_wall": build_rock_wall,
    "blast_sign": build_blast_sign,
    "bridge_truss": build_bridge_truss,
    "site_gate": build_site_gate,
    "tunnel_portal": build_tunnel_portal,
    "skyline": build_skyline,
    "boulder": build_boulder,
    "rubber_duck": build_rubber_duck,
}
