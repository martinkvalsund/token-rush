"""The developer: a chunky jointed character. Faces +Y (three.js -Z, away from the camera).

Joint objects (hips, torso, head, armL, armR, legL, legR) have their origin at the joint, so
the game's procedural animation rotates them directly. Pivots match render/character.ts.
"""


def build_developer():
    root = bpy.data.objects.new("developer", None)
    collection().objects.link(root)

    hips = Part("hips")
    hips.box((0.42, 0.26, 0.22), (0, 0, -0.04), "denim")
    hips.box((0.44, 0.28, 0.05), (0, 0, 0.07), "black")
    hips.box((0.08, 0.02, 0.05), (0, 0.14, 0.07), "silver")
    hips_o = hips.finish(parent=root, loc=(0, 0, 0.9))

    torso = Part("torso")
    torso.box((0.48, 0.28, 0.6), (0, 0, 0.32), "steel_blue")
    # hi-vis vest with reflective bands
    torso.box((0.5, 0.3, 0.5), (0, 0, 0.3), "lime")
    for z in (0.18, 0.36):
        torso.box((0.51, 0.31, 0.05), (0, 0, z), "silver")
    torso.box((0.06, 0.31, 0.5), (0, 0.0, 0.3), "lime")
    torso.box((0.2, 0.02, 0.1), (0.12, 0.16, 0.48), "white")
    torso.box((0.26, 0.29, 0.06), (0, 0, 0.6), "steel_blue")
    # backpack with a laptop poking out (seen by the camera)
    torso.box((0.38, 0.16, 0.44), (0, -0.23, 0.32), "dark_grey")
    torso.box((0.3, 0.02, 0.18), (0, -0.32, 0.27), "grey")
    torso.box((0.32, 0.04, 0.24), (0, -0.19, 0.58), "black")
    torso.box((0.06, 0.01, 0.06), (0, -0.212, 0.6), "glow_screen")
    for x in (-0.15, 0.15):
        torso.box((0.05, 0.3, 0.05), (x, -0.06, 0.57), "black")
    torso_o = torso.finish(parent=hips_o)

    head = Part("head")
    head.cyl(0.07, 0.1, (0, 0, 0.03), "skin", segs=8)
    head.uvsphere(0.15, (0, 0.01, 0.2), "skin", scale=(1.0, 1.05, 1.12), segs=10, rings=6)
    head.uvsphere(0.152, (0, -0.02, 0.22), "hair", scale=(1.0, 1.0, 1.0), segs=10, rings=6)
    head.uvsphere(0.13, (0, 0.04, 0.17), "skin", scale=(1.08, 1.0, 1.1), segs=10, rings=6)
    # glasses
    for x in (-0.06, 0.06):
        head.box((0.075, 0.02, 0.05), (x, 0.165, 0.22), "black")
        head.box((0.055, 0.022, 0.032), (x, 0.168, 0.22), "glass")
    head.box((0.04, 0.02, 0.015), (0, 0.168, 0.23), "black")
    head.box((0.07, 0.02, 0.015), (0, 0.16, 0.12), "brown_dark")
    for x in (-0.15, 0.15):
        head.sphere(0.035, (x, 0.0, 0.2), "skin", subdiv=1)
    # hard hat
    head.uvsphere(0.19, (0, 0, 0.28), "yellow", scale=(1.0, 1.08, 0.72), segs=12, rings=6)
    head.cyl(0.215, 0.025, (0, 0.02, 0.29), "yellow_dark", segs=14)
    head.box((0.05, 0.3, 0.06), (0, 0, 0.42), "yellow_dark")
    head.box((0.12, 0.02, 0.05), (0, 0.205, 0.33), "white")
    head.finish(parent=torso_o, loc=(0, 0, 0.62))

    for name, side in (("armL", -1), ("armR", 1)):
        arm = Part(name)
        arm.box((0.14, 0.15, 0.32), (side * 0.01, 0, -0.14), "steel_blue")
        arm.box((0.15, 0.16, 0.12), (side * 0.01, 0, -0.03), "lime")
        arm.box((0.11, 0.12, 0.24), (side * 0.01, 0.0, -0.4), "skin")
        arm.box((0.13, 0.14, 0.05), (side * 0.01, 0.0, -0.3), "steel_blue")
        arm.sphere(0.07, (side * 0.01, 0.01, -0.56), "skin", subdiv=1, scale=(0.9, 1.0, 1.0))
        arm.finish(parent=torso_o, loc=(side * 0.33, 0, 0.52))

    for name, side in (("legL", -1), ("legR", 1)):
        leg = Part(name)
        leg.box((0.18, 0.2, 0.42), (0, 0, -0.2), "denim")
        leg.box((0.17, 0.19, 0.36), (0, 0.0, -0.56), "denim")
        leg.box((0.2, 0.32, 0.15), (0, 0.05, -0.81), "brown")
        leg.box((0.21, 0.33, 0.04), (0, 0.05, -0.875), "black")
        leg.box((0.205, 0.2, 0.04), (0, 0.0, -0.74), "lime")
        leg.box((0.19, 0.06, 0.08), (0, 0.2, -0.82), "silver")
        leg.finish(parent=hips_o, loc=(side * 0.12, 0, -0.02))

    return root


CHARACTER = {"developer": build_developer}
