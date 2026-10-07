import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/** Final grade: gentle contrast and saturation, warm highlights, vignette. */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    vignette: { value: 0.32 },
    saturation: { value: 1.12 },
    contrast: { value: 1.06 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vignette;
    uniform float saturation;
    uniform float contrast;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, saturation);
      c.rgb = (c.rgb - 0.5) * contrast + 0.5;
      c.rgb += vec3(0.012, 0.006, -0.006) * smoothstep(0.4, 1.0, l);
      float d = distance(vUv, vec2(0.5));
      c.rgb *= 1.0 - smoothstep(0.38, 0.88, d) * vignette;
      gl_FragColor = c;
    }`,
};

/**
 * Post stack: multisampled HDR scene → ambient occlusion (High only) → bloom → output → grade.
 * Rendering into a multisampled target keeps edges anti-aliased with post enabled.
 */
export class Post {
  readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly ao: GTAOPass;
  enabled = true;

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(renderer, target);
    this.composer.addPass(new RenderPass(scene, camera));
    this.ao = new GTAOPass(scene, camera, 1, 1);
    this.ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1, scale: 1 });
    this.ao.blendIntensity = 0.85;
    this.composer.addPass(this.ao);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.4, 1.25);
    this.composer.addPass(this.bloom);
    // Tone map + sRGB first, then grade the final display colours (grading HDR values
    // pushes sunlit surfaces towards yellow).
    this.composer.addPass(new OutputPass());
    this.composer.addPass(new ShaderPass(GradeShader));
  }

  /** Ambient occlusion costs the most; only the High quality level keeps it. */
  setAmbientOcclusion(on: boolean): void {
    this.ao.enabled = on;
  }

  setSize(w: number, h: number): void {
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
  }

  render(scene: THREE.Scene, camera: THREE.Camera): void {
    if (this.enabled) this.composer.render();
    else this.renderer.render(scene, camera);
  }
}
