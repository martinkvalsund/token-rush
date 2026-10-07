"""Shared helpers for building Token Rush assets in Blender.

Every asset is built from primitives into a bmesh. Each face stores a palette index; on
finish the face's UVs point at that swatch in an 8x8 palette texture, so the game draws
every model with one shared material (and one draw call per instanced model part).

Conventions: 1 unit = 1 m, Z up, origin at the base centre. Blender +Y becomes three.js -Z
(the direction the player runs). Obstacles face the player, so their fronts point to -Y.
"""

import json
import math
import os

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

# build.py sets TOKEN_RUSH_ROOT before exec'ing this file (or use the environment variable).
ROOT = globals().get("TOKEN_RUSH_ROOT") or os.environ["TOKEN_RUSH_ROOT"]
PALETTE = json.load(open(os.path.join(ROOT, "art", "palette.json")))
GRID = PALETTE["size"]
COLOR_INDEX = {c["name"]: i for i, c in enumerate(PALETTE["colors"])}
COLLECTION = "TokenRushAssets"
# Quality knobs: chamfer size on box edges (m), round-part detail multiplier, crease angle.
BEVEL = 0.03
DETAIL = 1.6
SMOOTH_ANGLE = 50


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))


def mat4(loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    r = Euler(tuple(math.radians(a) for a in rot), "XYZ").to_matrix().to_4x4()
    return Matrix.Translation(Vector(loc)) @ r @ Matrix.Diagonal((*scale, 1))


class Part:
    """A mesh under construction. Methods add primitives with a palette colour."""

    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.col = self.bm.faces.layers.int.new("col")

    def _paint(self, verts, color):
        idx = COLOR_INDEX[color]
        for f in {f for v in verts for f in v.link_faces}:
            f[self.col] = idx

    def _xform(self, verts, m):
        bmesh.ops.transform(self.bm, matrix=m, verts=verts)

    def box(self, size, loc=(0, 0, 0), color="grey", rot=(0, 0, 0)):
        """Box of size (x, y, z) centred at loc."""
        r = bmesh.ops.create_cube(self.bm, size=1.0)
        self._xform(r["verts"], mat4(loc, rot, size))
        verts = r["verts"]
        self._paint(verts, color)
        # Chamfer every edge so boxes catch highlights like hand-made game props.
        offset = min(BEVEL, 0.2 * min(abs(d) for d in size))
        if offset > 0.004:
            faces = list({f for v in verts for f in v.link_faces})
            edges = list({e for f in faces for e in f.edges})
            res = bmesh.ops.bevel(
                self.bm, geom=edges, offset=offset, offset_type="OFFSET",
                segments=1, profile=0.5, affect="EDGES", clamp_overlap=True,
            )
            # Bevel rebuilds the box's faces too, so recolour everything now attached to it.
            idx = COLOR_INDEX[color]
            verts = list({v for f in res["faces"] for v in f.verts})
            for f in {f for v in verts for f in v.link_faces}:
                f[self.col] = idx
        return verts

    def block(self, x0, x1, y0, y1, z0, z1, color="grey"):
        """Axis-aligned box from min/max coordinates."""
        return self.box((x1 - x0, y1 - y0, z1 - z0), ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), color)

    def cyl(self, r, depth, loc=(0, 0, 0), color="grey", rot=(0, 0, 0), segs=12, r2=None, caps=True):
        """Cylinder (or cone with r2) along local Z, centred at loc."""
        segs = max(segs, int(round(segs * DETAIL)))
        res = bmesh.ops.create_cone(
            self.bm, cap_ends=caps, cap_tris=False, segments=segs, radius1=r,
            radius2=r if r2 is None else r2, depth=depth,
        )
        self._xform(res["verts"], mat4(loc, rot))
        self._paint(res["verts"], color)
        return res["verts"]

    def sphere(self, r, loc=(0, 0, 0), color="grey", scale=(1, 1, 1), subdiv=1, rot=(0, 0, 0)):
        res = bmesh.ops.create_icosphere(self.bm, subdivisions=max(subdiv, 2), radius=r)
        self._xform(res["verts"], mat4(loc, rot, scale))
        self._paint(res["verts"], color)
        return res["verts"]

    def uvsphere(self, r, loc=(0, 0, 0), color="grey", scale=(1, 1, 1), segs=12, rings=6, rot=(0, 0, 0)):
        segs = int(round(segs * DETAIL))
        rings = int(round(rings * DETAIL))
        res = bmesh.ops.create_uvsphere(self.bm, u_segments=segs, v_segments=rings, radius=r)
        self._xform(res["verts"], mat4(loc, rot, scale))
        self._paint(res["verts"], color)
        return res["verts"]

    def prism(self, points, depth, loc=(0, 0, 0), color="grey", rot=(0, 0, 0), plane="XZ"):
        """Extrude a 2D polygon. plane XZ extrudes along Y; XY extrudes along Z."""
        bm = self.bm
        front, back = [], []
        for a, b in points:
            if plane == "XZ":
                front.append(bm.verts.new((a, -depth / 2, b)))
                back.append(bm.verts.new((a, depth / 2, b)))
            else:
                front.append(bm.verts.new((a, b, -depth / 2)))
                back.append(bm.verts.new((a, b, depth / 2)))
        n = len(points)
        faces = [bm.faces.new(front), bm.faces.new(list(reversed(back)))]
        for i in range(n):
            j = (i + 1) % n
            faces.append(bm.faces.new((front[i], back[i], back[j], front[j])))
        verts = front + back
        bmesh.ops.recalc_face_normals(bm, faces=faces)
        self._xform(verts, mat4(loc, rot))
        self._paint(verts, color)
        return verts

    def wedge(self, w, d, h, loc=(0, 0, 0), color="grey", rot=(0, 0, 0)):
        """Ramp: width w (X), length d (Y), rising from 0 at -Y to h at +Y."""
        pts = [(-d / 2, 0), (d / 2, 0), (d / 2, h)]
        return self.prism([(p[0], p[1]) for p in pts], w, loc, color, rot=(rot[0], rot[1], rot[2] + 90))

    def text(self, body, size, loc=(0, 0, 0), color="white", rot=(90, 0, 0), extrude=0.01, align="CENTER"):
        """Extruded text converted to mesh. Default rotation faces -Y (towards the player)."""
        curve = bpy.data.curves.new("tmp_text", "FONT")
        curve.body = body
        curve.size = size
        curve.extrude = extrude
        curve.align_x = align
        curve.align_y = "CENTER"
        curve.resolution_u = 2
        obj = bpy.data.objects.new("tmp_text", curve)
        bpy.context.scene.collection.objects.link(obj)
        dg = bpy.context.evaluated_depsgraph_get()
        mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(dg))
        bpy.data.objects.remove(obj)
        bpy.data.curves.remove(curve)
        before = set(self.bm.verts)
        self.bm.from_mesh(mesh)
        bpy.data.meshes.remove(mesh)
        verts = [v for v in self.bm.verts if v not in before]
        self._xform(verts, mat4(loc, rot))
        self._paint(verts, color)
        return verts

    def stripes(self, x0, x1, z0, z1, y, colors=("yellow", "black"), n=6, depth=0.02, slant=0.0):
        """Row of hazard stripe panels on a face at y (facing -Y)."""
        w = (x1 - x0) / n
        for i in range(n):
            xa = x0 + i * w
            pts = [(xa, z0), (xa + w, z0), (xa + w + slant, z1), (xa + slant, z1)]
            self.prism(pts, depth, (0, y, 0), colors[i % len(colors)])

    def finish(self, parent=None, loc=(0, 0, 0)):
        """Write UVs from palette indices and create the object."""
        bm = self.bm
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        uv = bm.loops.layers.uv.new("UVMap")
        for f in bm.faces:
            i = f[self.col]
            u = (i % GRID + 0.5) / GRID
            v = 1 - (i // GRID + 0.5) / GRID
            for loop in f.loops:
                loop[uv].uv = (u, v)
        mesh = bpy.data.meshes.new(self.name)
        bm.to_mesh(mesh)
        bm.free()
        # Smooth shading with sharp creases: chamfers and round parts shade softly, hard
        # corners stay crisp, and big flat faces stay flat (weighted normals).
        for p in mesh.polygons:
            p.use_smooth = True
        mesh.set_sharp_from_angle(angle=math.radians(SMOOTH_ANGLE))
        mesh.materials.append(palette_material())
        obj = bpy.data.objects.new(self.name, mesh)
        collection().objects.link(obj)
        wn = obj.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL")
        wn.mode = "FACE_AREA"
        wn.keep_sharp = True
        obj.location = loc
        if parent is not None:
            obj.parent = parent
        return obj


def collection():
    col = bpy.data.collections.get(COLLECTION)
    if col is None:
        col = bpy.data.collections.new(COLLECTION)
        bpy.context.scene.collection.children.link(col)
    return col


def palette_material():
    mat = bpy.data.materials.get("TR_Palette")
    if mat:
        return mat
    img = bpy.data.images.get("tr_palette") or bpy.data.images.new("tr_palette", GRID, GRID)
    px = [0.0] * (GRID * GRID * 4)
    for i, c in enumerate(PALETTE["colors"]):
        r, g, b = hex_to_rgb(c["hex"])
        x, y = i % GRID, GRID - 1 - i // GRID
        o = (y * GRID + x) * 4
        px[o : o + 4] = [r, g, b, 1.0]
    img.pixels = px
    mat = bpy.data.materials.new("TR_Palette")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = next(n for n in nt.nodes if n.type == "BSDF_PRINCIPLED")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    tex.interpolation = "Closest"
    nt.links.new(tex.outputs[0], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.8
    return mat


def empty(name, loc=(0, 0, 0), parent=None):
    obj = bpy.data.objects.new(name, None)
    collection().objects.link(obj)
    obj.location = loc
    if parent is not None:
        obj.parent = parent
    return obj


def clear_collection():
    col = bpy.data.collections.get(COLLECTION)
    if not col:
        return
    for o in list(col.objects):
        data = o.data
        bpy.data.objects.remove(o, do_unlink=True)
        if data is not None and getattr(data, "users", 1) == 0:
            bpy.data.meshes.remove(data)


def tri_count(obj):
    n = 0
    for o in [obj, *obj.children_recursive]:
        if o.type == "MESH":
            n += sum(len(p.vertices) - 2 for p in o.data.polygons)
    return n


def export_glb(root, out_dir):
    """Export root and its children as <name>.glb with the root at the origin."""
    import logging

    logging.disable(logging.INFO)
    saved = root.location.copy()
    root.location = (0, 0, 0)
    bpy.ops.object.select_all(action="DESELECT")
    for o in [root, *root.children_recursive]:
        o.select_set(True)
    bpy.context.view_layer.objects.active = root
    path = os.path.join(out_dir, root.name + ".glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_materials="NONE",
        export_texcoords=True,
        export_normals=True,
        export_extras=False,
        export_animations=False,
    )
    root.location = saved
    return path
