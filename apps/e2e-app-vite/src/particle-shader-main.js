import { getGlobalApi, init } from "react-grab";
import { registerThreeScene } from "react-grab/primitives";
import * as THREE from "three";

/* ---------------------------------------------------------------- renderer */
const PARTICLE_RAYCAST_THRESHOLD_UNITS = 10;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(1);
renderer.setSize(window.innerWidth, window.innerHeight);
if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
renderer.domElement.dataset.testid = "particle-shader-canvas";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02040a);

const camera = new THREE.PerspectiveCamera(46, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 0.6, 36);

const uTime = { value: 0 };
const uRes = { value: new THREE.Vector2(window.innerWidth, window.innerHeight) };

/* ---------------------------------------------------------------- palette */
const PALETTE = [
  { w: 0.4, h: 0.495, s: 0.85, l: 0.58 }, // cold teal
  { w: 0.26, h: 0.735, s: 0.66, l: 0.6 }, // violet
  { w: 0.2, h: 0.118, s: 0.58, l: 0.72 }, // pale gold
  { w: 0.14, h: 0.56, s: 0.3, l: 0.86 }, // ice white
];
const _c = new THREE.Color();
function pickColor() {
  const r = Math.random();
  let acc = 0,
    p = PALETTE[0];
  for (let i = 0; i < PALETTE.length; i++) {
    acc += PALETTE[i].w;
    if (r <= acc) {
      p = PALETTE[i];
      break;
    }
  }
  const h = p.h + (Math.random() - 0.5) * 0.05;
  const s = Math.min(1, p.s * (0.78 + Math.random() * 0.4));
  const l = Math.min(1, p.l * (0.78 + Math.random() * 0.34));
  _c.setHSL(h, s, l);
  return _c;
}

/* ---------------------------------------------------------------- backdrop */
const backdropMat = new THREE.ShaderMaterial({
  uniforms: { uTime, uRes },
  side: THREE.BackSide,
  depthWrite: false,
  vertexShader: [
    "varying vec3 vDir;",
    "void main(){",
    "  vDir = normalize(position);",
    "  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);",
    "}",
  ].join("\n"),
  fragmentShader: [
    "precision highp float;",
    "uniform float uTime;",
    "uniform vec2 uRes;",
    "varying vec3 vDir;",
    "void main(){",
    "  vec3 d = normalize(vDir);",
    "  float y = d.y * 0.5 + 0.5;",
    "  vec3 c = mix(vec3(0.014,0.024,0.048), vec3(0.026,0.070,0.098), smoothstep(0.05,0.90,y));",
    "  c = mix(c, vec3(0.062,0.028,0.088), smoothstep(0.55,0.02,y));",
    "  float b1 = 0.5 + 0.5*sin(d.x*2.4 + d.y*3.6 + uTime*0.14);",
    "  float b2 = 0.5 + 0.5*sin(d.y*5.0 - d.z*2.2 - uTime*0.10 + 1.7);",
    "  float b3 = 0.5 + 0.5*sin(d.x*4.1 + d.z*3.0 + uTime*0.08 - 0.6);",
    "  c += vec3(0.030,0.105,0.108) * pow(b1, 4.0) * 0.85;",
    "  c += vec3(0.078,0.030,0.118) * pow(b2, 5.0) * 0.80;",
    "  c += vec3(0.040,0.070,0.090) * pow(b3, 7.0) * 0.55;",
    "  vec2 uv = gl_FragCoord.xy / uRes - 0.5;",
    "  float vig = smoothstep(0.98, 0.20, length(uv * vec2(1.05, 1.28)));",
    "  c *= 0.30 + 1.05 * vig;",
    "  gl_FragColor = vec4(c, 1.0);",
    "}",
  ].join("\n"),
});
const backdrop = new THREE.Mesh(new THREE.SphereGeometry(180, 64, 40), backdropMat);
backdrop.frustumCulled = false;
backdrop.renderOrder = -10;
scene.add(backdrop);

/* ------------------------------------------------------- shared GLSL parts */
const CURVE_GLSL = [
  "vec3 curve(float t){",
  "  float a = t * 6.2831853;",
  "  return vec3(",
  "    13.0*sin(a) + 3.4*sin(3.0*a + 1.1),",
  "    4.8*sin(2.0*a + 0.4) + 2.0*cos(3.0*a + 2.0),",
  "    9.5*cos(a) + 3.8*cos(2.0*a - 0.7)",
  "  );",
  "}",
  "vec3 flowField(vec3 p, float t){",
  "  vec3 q = p * 0.085;",
  "  return vec3(",
  "    sin(q.y*2.3 + t*0.36) + 0.6*cos(q.z*3.1 - t*0.21),",
  "    sin(q.z*2.0 - t*0.29) + 0.6*cos(q.x*2.7 + t*0.24),",
  "    sin(q.x*2.6 + t*0.31) + 0.6*cos(q.y*3.3 - t*0.18)",
  "  );",
  "}",
].join("\n");

const MOTE_VERT = [
  "precision highp float;",
  "attribute float aT;",
  "attribute float aSeed;",
  "attribute float aSize;",
  "attribute vec3 aOff;",
  "attribute vec3 aColor;",
  "uniform float uTime;",
  "uniform float uSize;",
  "uniform float uAlpha;",
  "varying vec3 vColor;",
  "varying float vA;",
  CURVE_GLSL,
  "void main(){",
  "  float t = fract(aT + uTime * (0.028 + 0.020 * aSeed));",
  "  vec3 c0 = curve(t);",
  "  vec3 tg = normalize(curve(t + 0.004) - curve(t - 0.004));",
  "  vec3 nn = normalize(cross(tg, normalize(vec3(0.11, 1.0, 0.06))));",
  "  vec3 bb = cross(tg, nn);",
  "  vec3 p = c0 + nn * aOff.x + bb * aOff.y + tg * aOff.z;",
  "  vec3 f = flowField(p, uTime);",
  "  p += f * (1.7 + 1.5 * aSeed);",
  "  float crest = 0.5 + 0.5 * sin(t * 25.13274 + uTime * 0.80 + aSeed * 6.2831853);",
  "  float lift = 0.5 + 0.5 * f.y;",
  "  float br = pow(crest, 1.7) * 0.72 + lift * 0.46;",
  "  br *= 0.72 + 0.32 * sin(uTime * 0.50 + aSeed * 5.0 + aOff.x * 0.2);",
  "  br = clamp(br, 0.0, 1.25);",
  "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
  "  float dist = max(0.5, -mv.z);",
  "  gl_Position = projectionMatrix * mv;",
  "  gl_PointSize = clamp(uSize * aSize * (0.5 + 0.85 * br) * (320.0 / dist), 0.8, 70.0);",
  "  vColor = mix(aColor * 0.30, mix(aColor, vec3(1.0, 0.95, 0.86), 0.42), min(br, 1.0));",
  "  float fade = smoothstep(3.0, 15.0, dist) * smoothstep(170.0, 72.0, dist);",
  "  vA = uAlpha * (0.07 + 0.62 * br) * fade;",
  "}",
].join("\n");

const MOTE_FRAG = [
  "precision highp float;",
  "varying vec3 vColor;",
  "varying float vA;",
  "void main(){",
  "  float d = length(gl_PointCoord - 0.5) * 2.0;",
  "  if (d > 1.0) discard;",
  "  float k = 1.0 - d;",
  "  float a = (0.16 * k + 0.50 * pow(k, 3.0) + 0.95 * pow(k, 11.0)) * vA;",
  "  gl_FragColor = vec4(vColor * a, a);",
  "}",
].join("\n");

const GLOW_FRAG = [
  "precision highp float;",
  "varying vec3 vColor;",
  "varying float vA;",
  "void main(){",
  "  float d = length(gl_PointCoord - 0.5) * 2.0;",
  "  if (d > 1.0) discard;",
  "  float k = 1.0 - d;",
  "  float a = (0.085 * pow(k, 2.0) + 0.05 * pow(k, 0.7)) * vA;",
  "  gl_FragColor = vec4(vColor * a, a);",
  "}",
].join("\n");

/* ---------------------------------------------------------- the pollen cloud */
const COUNT = 70000;
const posArr = new Float32Array(COUNT * 3);
const offArr = new Float32Array(COUNT * 3);
const colArr = new Float32Array(COUNT * 3);
const tArr = new Float32Array(COUNT);
const seedArr = new Float32Array(COUNT);
const sizeArr = new Float32Array(COUNT);

function curveAt(t, out) {
  const a = t * Math.PI * 2;
  out.set(
    13.0 * Math.sin(a) + 3.4 * Math.sin(3 * a + 1.1),
    4.8 * Math.sin(2 * a + 0.4) + 2.0 * Math.cos(3 * a + 2.0),
    9.5 * Math.cos(a) + 3.8 * Math.cos(2 * a - 0.7),
  );
}

const tmp = new THREE.Vector3();
for (let i = 0; i < COUNT; i++) {
  const t = Math.random();
  tArr[i] = t;
  seedArr[i] = Math.random();
  const core = Math.random() < 0.8;
  const rad = Math.pow(Math.random(), 0.55) * (core ? 3.1 : 9.2);
  const ang = Math.random() * Math.PI * 2;
  const ox = Math.cos(ang) * rad;
  const oy = Math.sin(ang) * rad * 0.8;
  const oz = (Math.random() * 2 - 1) * 1.8;
  offArr[i * 3] = ox;
  offArr[i * 3 + 1] = oy;
  offArr[i * 3 + 2] = oz;
  sizeArr[i] = 0.55 + Math.pow(Math.random(), 3.4) * 4.8;
  const c = pickColor();
  colArr[i * 3] = c.r;
  colArr[i * 3 + 1] = c.g;
  colArr[i * 3 + 2] = c.b;
  curveAt(t, tmp);
  posArr[i * 3] = tmp.x + ox;
  posArr[i * 3 + 1] = tmp.y + oy;
  posArr[i * 3 + 2] = tmp.z + oz;
}

const moteGeo = new THREE.BufferGeometry();
moteGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
moteGeo.setAttribute("aOff", new THREE.BufferAttribute(offArr, 3));
moteGeo.setAttribute("aColor", new THREE.BufferAttribute(colArr, 3));
moteGeo.setAttribute("aT", new THREE.BufferAttribute(tArr, 1));
moteGeo.setAttribute("aSeed", new THREE.BufferAttribute(seedArr, 1));
moteGeo.setAttribute("aSize", new THREE.BufferAttribute(sizeArr, 1));

function moteMaterial(frag, size, alpha) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime, uSize: { value: size }, uAlpha: { value: alpha } },
    vertexShader: MOTE_VERT,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
  });
}

const cloudGroup = new THREE.Group();
scene.add(cloudGroup);

const glowLayer = new THREE.Points(moteGeo, moteMaterial(GLOW_FRAG, 1.35, 0.85));
glowLayer.name = "pollen-glow";
glowLayer.frustumCulled = false;
glowLayer.renderOrder = 1;
cloudGroup.add(glowLayer);

const moteLayer = new THREE.Points(moteGeo, moteMaterial(MOTE_FRAG, 0.3, 0.92));
moteLayer.name = "pollen-particles";
moteLayer.frustumCulled = false;
moteLayer.renderOrder = 2;
cloudGroup.add(moteLayer);

/* ---------------------------------------------------------------- soft haze */
const HCOUNT = 16000;
const hPos = new Float32Array(HCOUNT * 3);
const hCol = new Float32Array(HCOUNT * 3);
const hSeed = new Float32Array(HCOUNT);
const hSize = new Float32Array(HCOUNT);
for (let i = 0; i < HCOUNT; i++) {
  const u = Math.random() * Math.PI * 2;
  const r = 14 + Math.pow(Math.random(), 0.7) * 34;
  hPos[i * 3] = Math.cos(u) * r;
  hPos[i * 3 + 1] = (Math.random() * 2 - 1) * 16 * (1.0 - r / 80);
  hPos[i * 3 + 2] = Math.sin(u) * r * 0.85;
  hSeed[i] = Math.random();
  hSize[i] = 0.5 + Math.pow(Math.random(), 2.5) * 3.0;
  const c = pickColor();
  hCol[i * 3] = c.r * 0.85;
  hCol[i * 3 + 1] = c.g * 0.85;
  hCol[i * 3 + 2] = c.b * 0.9;
}
const hazeGeo = new THREE.BufferGeometry();
hazeGeo.setAttribute("position", new THREE.BufferAttribute(hPos, 3));
hazeGeo.setAttribute("aColor", new THREE.BufferAttribute(hCol, 3));
hazeGeo.setAttribute("aSeed", new THREE.BufferAttribute(hSeed, 1));
hazeGeo.setAttribute("aSize", new THREE.BufferAttribute(hSize, 1));

const hazeMat = new THREE.ShaderMaterial({
  uniforms: { uTime, uSize: { value: 0.55 } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: [
    "precision highp float;",
    "attribute float aSeed;",
    "attribute float aSize;",
    "attribute vec3 aColor;",
    "uniform float uTime;",
    "uniform float uSize;",
    "varying vec3 vColor;",
    "varying float vA;",
    "void main(){",
    "  float ang = uTime * 0.050 + aSeed * 0.25;",
    "  float ca = cos(ang), sa = sin(ang);",
    "  vec3 p = vec3(position.x * ca - position.z * sa, position.y, position.x * sa + position.z * ca);",
    "  vec3 q = p * 0.06;",
    "  p += vec3(sin(q.y*3.0 + uTime*0.19), cos(q.z*2.4 - uTime*0.15), sin(q.x*2.7 + uTime*0.13)) * 2.8;",
    "  float tw = 0.5 + 0.5 * sin(uTime * 0.6 + aSeed * 7.0);",
    "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
    "  float dist = max(0.5, -mv.z);",
    "  gl_Position = projectionMatrix * mv;",
    "  gl_PointSize = clamp(uSize * aSize * (320.0 / dist), 0.8, 42.0);",
    "  vColor = aColor;",
    "  vA = (0.045 + 0.085 * tw) * smoothstep(2.0, 20.0, dist) * smoothstep(210.0, 80.0, dist);",
    "}",
  ].join("\n"),
  fragmentShader: [
    "precision highp float;",
    "varying vec3 vColor;",
    "varying float vA;",
    "void main(){",
    "  float d = length(gl_PointCoord - 0.5) * 2.0;",
    "  if (d > 1.0) discard;",
    "  float k = 1.0 - d;",
    "  float a = (0.55 * pow(k, 2.5) + 0.12 * k) * vA;",
    "  gl_FragColor = vec4(vColor * a, a);",
    "}",
  ].join("\n"),
});
const haze = new THREE.Points(hazeGeo, hazeMat);
haze.name = "ambient-haze";
haze.frustumCulled = false;
haze.renderOrder = 0;
cloudGroup.add(haze);

/* ------------------------------------------------------- near bokeh motes */
const BCOUNT = 48;
const bPos = new Float32Array(BCOUNT * 3);
const bCol = new Float32Array(BCOUNT * 3);
const bSeed = new Float32Array(BCOUNT);
const bSize = new Float32Array(BCOUNT);
for (let i = 0; i < BCOUNT; i++) {
  const a = Math.random() * Math.PI * 2;
  const r = 6 + Math.pow(Math.random(), 0.8) * 20;
  bPos[i * 3] = Math.cos(a) * r;
  bPos[i * 3 + 1] = Math.sin(a) * r * 0.62 + (Math.random() - 0.5) * 4;
  bPos[i * 3 + 2] = 3 + Math.random() * 22;
  bSeed[i] = Math.random();
  bSize[i] = 1.0 + Math.pow(Math.random(), 1.6) * 2.6;
  const c = pickColor();
  bCol[i * 3] = c.r;
  bCol[i * 3 + 1] = c.g;
  bCol[i * 3 + 2] = c.b;
}
const bokehGeo = new THREE.BufferGeometry();
bokehGeo.setAttribute("position", new THREE.BufferAttribute(bPos, 3));
bokehGeo.setAttribute("aColor", new THREE.BufferAttribute(bCol, 3));
bokehGeo.setAttribute("aSeed", new THREE.BufferAttribute(bSeed, 1));
bokehGeo.setAttribute("aSize", new THREE.BufferAttribute(bSize, 1));

const bokehMat = new THREE.ShaderMaterial({
  uniforms: { uTime, uSize: { value: 1.0 } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: [
    "precision highp float;",
    "attribute float aSeed;",
    "attribute float aSize;",
    "attribute vec3 aColor;",
    "uniform float uTime;",
    "uniform float uSize;",
    "varying vec3 vColor;",
    "varying float vA;",
    "void main(){",
    "  vec3 p = position;",
    "  p.x += sin(uTime * 0.15 + aSeed * 6.2831) * 1.9;",
    "  p.y += cos(uTime * 0.12 + aSeed * 4.1) * 1.5;",
    "  p.z += sin(uTime * 0.09 + aSeed * 2.3) * 1.2;",
    "  vec4 mv = modelViewMatrix * vec4(p, 1.0);",
    "  float dist = max(0.5, -mv.z);",
    "  gl_Position = projectionMatrix * mv;",
    "  gl_PointSize = clamp(uSize * aSize * (320.0 / dist), 6.0, 130.0);",
    "  vColor = mix(aColor, vec3(1.0, 0.96, 0.90), 0.18);",
    "  vA = (0.085 + 0.075 * (0.5 + 0.5 * sin(uTime * 0.40 + aSeed * 6.0))) * smoothstep(2.0, 8.0, dist);",
    "}",
  ].join("\n"),
  fragmentShader: [
    "precision highp float;",
    "varying vec3 vColor;",
    "varying float vA;",
    "void main(){",
    "  float d = length(gl_PointCoord - 0.5) * 2.0;",
    "  if (d > 1.0) discard;",
    "  float disc = smoothstep(1.0, 0.80, d);",
    "  float rim = smoothstep(0.50, 0.99, d);",
    "  float a = disc * (0.50 + 0.85 * rim) * vA;",
    "  gl_FragColor = vec4(vColor * a, a);",
    "}",
  ].join("\n"),
});
const nearGroup = new THREE.Group();
const bokeh = new THREE.Points(bokehGeo, bokehMat);
bokeh.name = "near-bokeh";
bokeh.frustumCulled = false;
bokeh.renderOrder = 5;
nearGroup.add(bokeh);
scene.add(nearGroup);

const raycastPointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = PARTICLE_RAYCAST_THRESHOLD_UNITS;
registerThreeScene({ camera, pointer: raycastPointer, raycaster, renderer, scene });
const reactGrab = getGlobalApi() ?? init();
const reactGrabControls = document.querySelector("#react-grab-controls");
const reactGrabActivateButton = document.querySelector("#react-grab-activate");
const reactGrabStatus = document.querySelector("#react-grab-status");

const updateReactGrabControls = () => {
  const isActive = reactGrab.isActive();
  reactGrabControls.dataset.active = String(isActive);
  reactGrabActivateButton.textContent = isActive ? "React Grab active" : "Start React Grab";
  reactGrabStatus.textContent = isActive
    ? "Move over a particle and click it. Press Escape to stop."
    : "Then move over a particle and click it.";
};

reactGrabActivateButton.addEventListener("click", () => {
  reactGrab.activate();
  updateReactGrabControls();
});

window.addEventListener("keyup", (event) => {
  if (event.key === "Escape") requestAnimationFrame(updateReactGrabControls);
});
window.addEventListener("react-grab:element-selected", () => {
  requestAnimationFrame(updateReactGrabControls);
});
updateReactGrabControls();

/* ---------------------------------------------------------------- pointer */
const ptr = { tx: 0, ty: 0, x: 0, y: 0 };
function onMove(e) {
  const w = window.innerWidth,
    h = window.innerHeight;
  const cx = e.clientX !== undefined ? e.clientX : w * 0.5;
  const cy = e.clientY !== undefined ? e.clientY : h * 0.5;
  ptr.tx = (cx / w) * 2 - 1;
  ptr.ty = (cy / h) * 2 - 1;
}
window.addEventListener("pointermove", onMove, { passive: true });
window.addEventListener("mousemove", onMove, { passive: true });
window.addEventListener(
  "touchmove",
  function (e) {
    if (e.touches && e.touches.length) onMove(e.touches[0]);
  },
  { passive: true },
);

window.addEventListener("resize", function () {
  const w = window.innerWidth,
    h = window.innerHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  uRes.value.set(w, h);
});

/* ---------------------------------------------------------------- loop */
const clock = new THREE.Clock();
let prev = 0;

// pre-warm a plausible "already alive" state for the very first frame
uTime.value = 0.0;
cloudGroup.rotation.set(0.1, -0.35, 0.04);

function animate() {
  const t = clock.getElapsedTime();
  const dt = Math.min(0.06, Math.max(0.0, t - prev));
  prev = t;
  uTime.value = t;

  const k = 1.0 - Math.exp(-dt * 3.2);
  ptr.x += (ptr.tx - ptr.x) * k;
  ptr.y += (ptr.ty - ptr.y) * k;

  cloudGroup.rotation.y = -0.35 + t * 0.058 + ptr.x * 0.42;
  cloudGroup.rotation.x = 0.1 + Math.sin(t * 0.13) * 0.075 - ptr.y * 0.3;
  cloudGroup.rotation.z = 0.04 + Math.sin(t * 0.091) * 0.055 + ptr.x * 0.05;

  nearGroup.rotation.y = t * 0.022 + ptr.x * 0.16;
  nearGroup.rotation.x = -ptr.y * 0.12;

  camera.position.x = ptr.x * 5.2 + Math.sin(t * 0.11) * 0.9;
  camera.position.y = 0.6 - ptr.y * 3.4 + Math.cos(t * 0.09) * 0.6;
  camera.position.z = 36.0 - Math.abs(ptr.x) * 1.4;
  camera.lookAt(ptr.x * 1.2, -ptr.y * 0.8, 0);

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);
