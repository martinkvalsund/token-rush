"""Build (and optionally export) all Token Rush assets.

Run inside Blender's Python console:

    TOKEN_RUSH_ROOT = '/path/to/token-rush'
    exec(open(TOKEN_RUSH_ROOT + '/art/blender/build.py').read())

Set ONLY = ['token', ...] before exec to rebuild a subset; EXPORT = False to skip export.
The repo root can also come from the TOKEN_RUSH_ROOT environment variable.
"""

import os

_root = globals().get("TOKEN_RUSH_ROOT") or os.environ.get("TOKEN_RUSH_ROOT")
if not _root:
    raise RuntimeError("Set TOKEN_RUSH_ROOT to the repository path before running build.py")
TOKEN_RUSH_ROOT = _root
_g = globals()
for _f in ("lib.py", "props.py", "vehicles.py", "scenery.py", "character.py"):
    _path = os.path.join(_root, "art", "blender", _f)
    if os.path.exists(_path):
        exec(open(_path).read(), _g)

REGISTRY = {}
for _name in ("PROPS", "VEHICLES", "SCENERY", "CHARACTER"):
    REGISTRY.update(_g.get(_name, {}))

_only = _g.get("ONLY") or list(REGISTRY)
_export = _g.get("EXPORT", True)
_out = os.path.join(_root, "public", "models")

col = collection()
for name in _only:
    old = bpy.data.objects.get(name)
    if old is not None:
        for o in [*old.children_recursive, old]:
            bpy.data.objects.remove(o, do_unlink=True)

for m in [m for m in bpy.data.meshes if m.users == 0]:
    bpy.data.meshes.remove(m)

REPORT = []
for i, name in enumerate(_only):
    root = REGISTRY[name]()
    root.name = name
    if _export:
        export_glb(root, _out)
    REPORT.append((name, tri_count(root)))
    # Lay assets out on a grid for viewing in the scene.
    keys = list(REGISTRY)
    k = keys.index(name)
    root.location = ((k % 8) * 6.0, (k // 8) * 8.0 + 40.0, 0)

print("\n".join(f"{n}: {t} tris" for n, t in REPORT))
