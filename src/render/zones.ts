import * as THREE from 'three';
import { TUNING } from '../data/tuning';
import { ZONES, type ZoneDef } from '../data/zones';
import type { ModelLibrary } from './models/library';

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w; // keep the dome at the far plane
}`;

const SKY_FRAG = /* glsl */ `
uniform vec3 top;
uniform vec3 bottom;
uniform float stars;
varying vec3 vDir;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
void main() {
  float h = clamp(vDir.y * 1.6 + 0.08, 0.0, 1.0);
  vec3 col = mix(bottom, top, pow(h, 0.7));
  if (stars > 0.0) {
    vec3 cell = floor(vDir * 220.0);
    float s = step(0.996, hash(cell)) * smoothstep(0.05, 0.4, vDir.y);
    col += vec3(s) * stars;
  }
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const tmpA = new THREE.Color();
const tmpB = new THREE.Color();

function lerpColor(target: THREE.Color, a: number, b: number, t: number): void {
  tmpA.setHex(a);
  tmpB.setHex(b);
  target.copy(tmpA).lerp(tmpB, t);
}

/**
 * Per-zone sky, fog, lights, ground colours and the distant skyline, blended over the
 * last stretch of each zone so transitions are smooth.
 */
export class ZoneLook {
  readonly sky: THREE.Mesh;
  readonly skyline: THREE.Object3D;
  private readonly skyMat: THREE.ShaderMaterial;
  private readonly blendLength = 60;
  currentZone = 0;
  blend = 0;

  constructor(
    private readonly scene: THREE.Scene,
    private readonly hemi: THREE.HemisphereLight,
    private readonly sun: THREE.DirectionalLight,
    private readonly road: THREE.MeshLambertMaterial,
    private readonly ground: THREE.MeshLambertMaterial,
    lib: ModelLibrary,
  ) {
    this.skyMat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      uniforms: {
        top: { value: new THREE.Color() },
        bottom: { value: new THREE.Color() },
        stars: { value: 0 },
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(250, 24, 12), this.skyMat);
    this.sky.renderOrder = -1;
    this.sky.frustumCulled = false;
    scene.add(this.sky);
    if (!(scene.fog instanceof THREE.Fog)) scene.fog = new THREE.Fog(0xffffff, 40, 120);
    this.skyline = lib.has('skyline') ? lib.get('skyline').scene.clone(true) : new THREE.Group();
    this.skyline.position.set(0, -2, -230);
    this.skyline.scale.setScalar(1.2);
    this.skyline.traverse((o) => {
      if (o instanceof THREE.Mesh) o.castShadow = false;
    });
    scene.add(this.skyline);
  }

  update(distance: number, cameraPos: THREE.Vector3): void {
    const len = TUNING.world.zoneLength;
    const index = Math.floor(distance / len);
    const into = distance - index * len;
    const a = ZONES[index % ZONES.length] as ZoneDef;
    const b = ZONES[(index + 1) % ZONES.length] as ZoneDef;
    const t = THREE.MathUtils.smoothstep(into, len - this.blendLength, len);
    this.currentZone = index % ZONES.length;
    this.blend = t;
    this.apply(a, b, t);
    this.sky.position.copy(cameraPos);
    this.skyline.position.x = cameraPos.x * 0.9;
  }

  private apply(a: ZoneDef, b: ZoneDef, t: number): void {
    const la = a.look;
    const lb = b.look;
    const u = this.skyMat.uniforms;
    lerpColor(u.top?.value as THREE.Color, la.skyTop, lb.skyTop, t);
    lerpColor(u.bottom?.value as THREE.Color, la.skyBottom, lb.skyBottom, t);
    if (u.stars) u.stars.value = (la.skyMode === 2 ? 1 - t : 0) + (lb.skyMode === 2 ? t : 0);
    const fog = this.scene.fog as THREE.Fog;
    lerpColor(fog.color, la.fog, lb.fog, t);
    fog.near = THREE.MathUtils.lerp(la.fogNear, lb.fogNear, t);
    fog.far = THREE.MathUtils.lerp(la.fogFar, lb.fogFar, t);
    lerpColor(this.sun.color, la.sun, lb.sun, t);
    this.sun.intensity = THREE.MathUtils.lerp(la.sunIntensity, lb.sunIntensity, t);
    lerpColor(this.hemi.color, la.ambientSky, lb.ambientSky, t);
    lerpColor(this.hemi.groundColor, la.ambientGround, lb.ambientGround, t);
    this.hemi.intensity = THREE.MathUtils.lerp(la.ambientIntensity, lb.ambientIntensity, t);
    lerpColor(this.road.color, la.road, lb.road, t);
    this.road.color.multiplyScalar(1.6); // the road texture is light grey; tint it
    lerpColor(this.ground.color, la.ground, lb.ground, t);
    const enclosed = (la.skyMode === 1 ? 1 - t : 0) + (lb.skyMode === 1 ? t : 0);
    this.skyline.visible = enclosed < 0.5;
    const dirA = la.sunDir;
    const dirB = lb.sunDir;
    this.sunDir
      .set(
        THREE.MathUtils.lerp(dirA[0], dirB[0], t),
        THREE.MathUtils.lerp(dirA[1], dirB[1], t),
        THREE.MathUtils.lerp(dirA[2], dirB[2], t),
      )
      .normalize();
  }

  /** Direction towards the sun (used by the shadow rig). */
  readonly sunDir = new THREE.Vector3(0, 1, 0);
}
