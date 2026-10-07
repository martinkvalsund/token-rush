"""Shop cosmetics: headgear (attached to the developer's head joint) and companions.

Headgear is built in head-local coordinates (same origin as the developer's `head` object),
so the game parents it straight onto the head and hides the default `hardhat`. Yellow parts
take the equipped outfit's hat colour, because the character's palette is recoloured.

Companions float next to the runner. Their origin is the body centre and they face +Y
(the running direction). Parts named `rotor*` / `propeller` spin in the game.
"""

import math


def build_hat_headlamp():
    root = empty_root("hat_headlamp")
    p = Part("hat_headlamp_mesh")
    hard_hat(p)
    p.cyl(0.198, 0.035, (0, 0.0, 0.33), "black", segs=14)
    p.cyl(0.05, 0.07, (0, 0.205, 0.335), "dark_grey", rot=(90, 0, 0), segs=10)
    p.cyl(0.038, 0.012, (0, 0.243, 0.335), "glow_lamp", rot=(90, 0, 0), segs=10)
    p.finish(parent=root)
    return root


def build_hat_viking():
    root = empty_root("hat_viking")
    p = Part("hat_viking_mesh")
    hard_hat(p)
    p.cyl(0.2, 0.03, (0, 0.01, 0.31), "gold", segs=14)
    for side in (-1, 1):
        # Three tapering segments curving out and up.
        p.cyl(0.05, 0.12, (side * 0.2, 0, 0.36), "cream", rot=(0, side * 62, 0), r2=0.042, segs=10)
        p.cyl(0.042, 0.11, (side * 0.27, 0, 0.43), "cream", rot=(0, side * 30, 0), r2=0.03, segs=10)
        p.cyl(0.03, 0.1, (side * 0.295, 0, 0.52), "cream", rot=(0, side * 5, 0), r2=0.004, segs=10)
        p.cyl(0.054, 0.02, (side * 0.185, 0, 0.35), "gold", rot=(0, side * 62, 0), segs=10)
    p.finish(parent=root)
    return root


def build_hat_propeller():
    root = empty_root("hat_propeller")
    p = Part("hat_propeller_mesh")
    hard_hat(p)
    p.cyl(0.012, 0.08, (0, 0, 0.48), "silver", segs=8)
    p.finish(parent=root)
    prop = Part("propeller")
    prop.sphere(0.025, (0, 0, 0), "red", subdiv=1)
    prop.box((0.34, 0.06, 0.012), (0.0, 0, 0.0), "red", rot=(12, 0, 0))
    prop.box((0.06, 0.34, 0.012), (0, 0.0, 0.0), "blue", rot=(0, 12, 0))
    prop.finish(parent=root, loc=(0, 0, 0.525))
    return root


def build_hat_crown():
    root = empty_root("hat_crown")
    p = Part("hat_crown_mesh")
    p.uvsphere(0.145, (0, 0, 0.305), "red", scale=(1.0, 1.0, 0.55), segs=12, rings=6)
    p.cyl(0.162, 0.1, (0, 0, 0.315), "gold", segs=16, caps=False)
    p.cyl(0.17, 0.025, (0, 0, 0.27), "gold_dark", segs=16)
    for i in range(8):
        a = math.radians(i * 45 + 22.5)
        x, y = math.sin(a) * 0.158, math.cos(a) * 0.158
        p.cyl(0.035, 0.09, (x, y, 0.405), "gold", r2=0.004, segs=8)
        p.sphere(0.014, (x * 1.02, y * 1.02, 0.455), "gold_dark", subdiv=1)
    for i, color in enumerate(("glow_red", "glow_lime", "glow_red")):
        a = math.radians(-35 + i * 35)
        p.sphere(0.024, (math.sin(a) * 0.168, math.cos(a) * 0.168, 0.315), color, subdiv=1)
    p.finish(parent=root)
    return root


def build_hat_headset():
    root = empty_root("hat_headset")
    p = Part("hat_headset_mesh")
    hard_hat(p)
    # Band arching over the hat, from ear to ear.
    n = 11
    for i in range(n):
        a = math.radians(-90 + 180 * i / (n - 1))
        x, z = math.sin(a) * 0.255, 0.2 + math.cos(a) * 0.255
        p.box((0.06, 0.045, 0.03), (x, 0, z), "dark_grey", rot=(0, math.degrees(a), 0))
    for side in (-1, 1):
        p.cyl(0.08, 0.07, (side * 0.19, 0, 0.2), "black", rot=(0, 90, 0), segs=14)
        p.cyl(0.06, 0.012, (side * 0.229, 0, 0.2), "glow_lime", rot=(0, 90, 0), segs=14)
    # Microphone boom towards the mouth.
    p.cyl(0.01, 0.2, (-0.19, 0.09, 0.15), "dark_grey", rot=(25, 0, 0), segs=6)
    p.cyl(0.01, 0.08, (-0.15, 0.18, 0.11), "dark_grey", rot=(0, 90, 20), segs=6)
    p.sphere(0.025, (-0.1, 0.19, 0.11), "black", subdiv=1)
    p.finish(parent=root)
    return root


def build_hat_wizard():
    root = empty_root("hat_wizard")
    p = Part("hat_wizard_mesh")
    p.cyl(0.26, 0.025, (0, 0, 0.31), "purple", segs=18)
    p.cyl(0.165, 0.42, (0, -0.03, 0.52), "purple", r2=0.01, rot=(-12, 0, 0), segs=16)
    p.cyl(0.168, 0.05, (0, -0.005, 0.35), "gold", segs=16)
    for x, z, s in ((0.07, 0.48, 0.03), (-0.05, 0.6, 0.022), (0.03, 0.7, 0.016)):
        p.sphere(s, (x, 0.12 - (z - 0.45) * 0.25, z), "glow_gold", subdiv=1)
    p.finish(parent=root)
    return root


def build_pet_duck():
    root = empty_root("pet_duck")
    p = Part("pet_duck_mesh")
    p.sphere(0.14, (0, -0.02, 0), "yellow", scale=(1.0, 1.25, 0.8), subdiv=2)
    p.sphere(0.09, (0, 0.1, 0.12), "yellow", subdiv=2)
    p.box((0.09, 0.07, 0.03), (0, 0.2, 0.1), "orange")
    for x in (-0.04, 0.04):
        p.sphere(0.016, (x, 0.18, 0.15), "black", subdiv=1)
    p.box((0.1, 0.05, 0.06), (0, -0.17, 0.05), "yellow_dark", rot=(30, 0, 0))
    for x in (-0.1, 0.1):
        p.sphere(0.05, (x, -0.02, 0.02), "yellow_dark", scale=(0.4, 1.0, 0.7), subdiv=1)
    p.finish(parent=root)
    return root


def build_pet_drone():
    root = empty_root("pet_drone")
    p = Part("pet_drone_mesh")
    p.box((0.18, 0.2, 0.07), (0, 0, 0), "dark_grey")
    p.box((0.12, 0.14, 0.03), (0, 0, 0.045), "orange")
    p.sphere(0.035, (0, 0.1, -0.03), "glass", subdiv=1)
    p.box((0.1, 0.02, 0.01), (0, -0.101, 0), "glow_lime")
    for i in range(4):
        a = math.radians(45 + i * 90)
        x, y = math.sin(a) * 0.17, math.cos(a) * 0.17
        p.box((0.2, 0.03, 0.025), (x / 2, y / 2, 0.01), "black", rot=(0, 0, -math.degrees(a) + 90))
        p.cyl(0.03, 0.05, (x, y, 0.03), "black", segs=8)
        p.cyl(0.075, 0.012, (x, y, 0.05), "light_grey", segs=14, caps=True)
    p.finish(parent=root)
    for i in range(4):
        a = math.radians(45 + i * 90)
        x, y = math.sin(a) * 0.17, math.cos(a) * 0.17
        r = Part(f"rotor_{i}")
        r.box((0.15, 0.022, 0.006), (0, 0, 0), "white", rot=(0, 0, 30 * i))
        r.finish(parent=root, loc=(x, y, 0.066))
    return root


def build_pet_bot():
    root = empty_root("pet_bot")
    p = Part("pet_bot_mesh")
    p.box((0.24, 0.2, 0.2), (0, 0, 0.06), "white")
    p.box((0.2, 0.02, 0.1), (0, 0.1, 0.07), "black")
    for x in (-0.05, 0.05):
        p.box((0.035, 0.012, 0.035), (x, 0.112, 0.075), "glow_screen")
    for x in (-0.13, 0.13):
        p.cyl(0.035, 0.03, (x, 0, 0.06), "orange", rot=(0, 90, 0), segs=10)
    p.cyl(0.008, 0.08, (0, 0, 0.2), "silver", segs=6)
    p.sphere(0.025, (0, 0, 0.245), "glow_red", subdiv=1)
    p.cyl(0.07, 0.1, (0, 0, -0.08), "light_grey", r2=0.03, segs=12)
    p.cyl(0.035, 0.02, (0, 0, -0.14), "glow_lime", segs=10)
    p.finish(parent=root)
    return root


def build_pet_token():
    root = empty_root("pet_token")
    p = Part("pet_token_mesh")
    p.prism(hexagon(0.16), 0.06, color="glow_gold", rot=(0, 0, 0))
    p.prism(hexagon(0.115), 0.075, color="gold")
    for x in (-0.045, 0.045):
        p.sphere(0.024, (x, 0.04, 0.03), "white", subdiv=1, scale=(1, 0.6, 1.2))
        p.sphere(0.012, (x, 0.052, 0.028), "black", subdiv=1)
    p.box((0.05, 0.012, 0.01), (0, 0.04, -0.03), "gold_dark")
    p.finish(parent=root)
    return root


COSMETICS = {
    "hat_headlamp": build_hat_headlamp,
    "hat_viking": build_hat_viking,
    "hat_propeller": build_hat_propeller,
    "hat_crown": build_hat_crown,
    "hat_headset": build_hat_headset,
    "hat_wizard": build_hat_wizard,
    "pet_duck": build_pet_duck,
    "pet_drone": build_pet_drone,
    "pet_bot": build_pet_bot,
    "pet_token": build_pet_token,
}
