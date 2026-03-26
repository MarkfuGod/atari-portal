import * as THREE from 'three';
import AudioReactive from '../core/AudioReactiveSystem.js';

const GAME_W = 800;

const VERT = /* glsl */ `
void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

// ═══════════════════════════════════════════════════════════════════
//  Shader 1 — Synthwave sun & grid  (menu / boot)
//  Adapted from Jan Mróz (jaszunio15), CC BY 3.0
// ═══════════════════════════════════════════════════════════════════

const SYNTHWAVE_FRAG = /* glsl */ `
precision highp float;

uniform float iTime;
uniform vec2  iResolution;
uniform float battery;
uniform float bass;
uniform float beatIntensity;
uniform float brightness;
uniform vec3  tint;

float sun(vec2 uv, float bat) {
  float val   = smoothstep(0.3, 0.29, length(uv));
  float bloom = smoothstep(0.7, 0.0,  length(uv));
  float cut   = 3.0 * sin((uv.y + iTime * 0.2 * (bat + 0.02)) * 100.0)
                + clamp(uv.y * 14.0 + 1.0, -6.0, 6.0);
  cut = clamp(cut, 0.0, 1.0);
  return clamp(val * cut, 0.0, 1.0) + bloom * 0.6;
}

float grid(vec2 uv, float bat) {
  vec2 size = vec2(uv.y, uv.y * uv.y * 0.2) * 0.01;
  uv += vec2(0.0, iTime * 4.0 * (bat + 0.05));
  uv  = abs(fract(uv) - 0.5);
  vec2 lines = smoothstep(size, vec2(0.0), uv);
  lines += smoothstep(size * 5.0, vec2(0.0), uv) * 0.4 * bat;
  return clamp(lines.x + lines.y, 0.0, 3.0);
}

float dot2(in vec2 v) { return dot(v, v); }

float sdTrapezoid(in vec2 p, in float r1, float r2, float he) {
  vec2 k1 = vec2(r2, he);
  vec2 k2 = vec2(r2 - r1, 2.0 * he);
  p.x = abs(p.x);
  vec2  ca = vec2(p.x - min(p.x, (p.y < 0.0) ? r1 : r2), abs(p.y) - he);
  vec2  cb = p - k1 + k2 * clamp(dot(k1 - p, k2) / dot2(k2), 0.0, 1.0);
  float s  = (cb.x < 0.0 && ca.y < 0.0) ? -1.0 : 1.0;
  return s * sqrt(min(dot2(ca), dot2(cb)));
}

float sdLine(in vec2 p, in vec2 a, in vec2 b) {
  vec2  pa = p - a, ba = b - a;
  float h  = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float sdBox(in vec2 p, in vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, vec2(0))) + min(max(d.x, d.y), 0.0);
}

float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

float sdCloud(in vec2 p, in vec2 a1, in vec2 b1, in vec2 a2, in vec2 b2, float w) {
  float lv1 = sdLine(p, a1, b1);
  float lv2 = sdLine(p, a2, b2);
  vec2  ww  = vec2(w * 1.5, 0.0);
  vec2  boxCenter = (max(a1 + ww, a2 + ww) + min(b1 - ww, b2 - ww)) * 0.5;
  float boxH = abs(a2.y - a1.y) * 0.5;
  float bv   = sdBox(p - boxCenter, vec2(0.04, boxH)) + w;
  return min(opSmoothUnion(lv1, bv, 0.05), opSmoothUnion(lv2, bv, 0.05));
}

void main() {
  vec2  uv  = (2.0 * gl_FragCoord.xy - iResolution) / iResolution.y;
  float bat = battery;

  float fog = smoothstep(0.1, -0.02, abs(uv.y + 0.2));
  vec3  col = vec3(0.0, 0.1, 0.2);

  if (uv.y < -0.2) {
    uv.y = 3.0 / (abs(uv.y + 0.2) + 0.05);
    uv.x *= uv.y;
    float gv = grid(uv, bat);
    col = mix(col, vec3(1.0, 0.5, 1.0), gv);
    col += bass * gv * vec3(0.4, 0.0, 0.6);
  } else {
    float fujiD = min(uv.y * 4.5 - 0.5, 1.0);
    uv.y -= bat * 1.1 - 0.51;
    vec2 sunUV = uv + vec2(0.75, 0.2);

    col = vec3(1.0, 0.2, 1.0);
    float sv = sun(sunUV, bat);
    col = mix(col, vec3(1.0, 0.4, 0.1), sunUV.y * 2.0 + 0.2);
    col = mix(vec3(0.0), col, sv);

    float fv = sdTrapezoid(uv + vec2(-0.75, 0.5), 1.75 + pow(uv.y * uv.y, 2.1), 0.2, 0.5);
    float wv = smoothstep(0.0, 0.01, uv.y + sin(uv.x * 20.0 + iTime * 2.0) * 0.05 + 0.2);

    col = mix(col, mix(vec3(0.0, 0.0, 0.25), vec3(1.0, 0.0, 0.5), fujiD), step(fv, 0.0));
    col = mix(col, vec3(1.0, 0.5, 1.0), wv * step(fv, 0.0));
    col = mix(col, vec3(1.0, 0.5, 1.0), 1.0 - smoothstep(0.0, 0.01, abs(fv)));
    col += mix(col, mix(vec3(1.0, 0.12, 0.8), vec3(0.0, 0.0, 0.2),
               clamp(uv.y * 3.5 + 3.0, 0.0, 1.0)), step(0.0, fv));

    vec2  cUV = uv;
    cUV.x = mod(cUV.x + iTime * 0.1, 4.0) - 2.0;
    float ct = iTime * 0.5;
    float cY1 = -0.5;
    float cv1 = sdCloud(cUV,
      vec2( 0.1+sin(ct+140.5)*0.1, cY1),      vec2(1.05+cos(ct*0.9-36.56)*0.1, cY1),
      vec2( 0.2+cos(ct*0.867+387.165)*0.1, 0.25+cY1), vec2(0.5+cos(ct*0.9675-15.162)*0.09, 0.25+cY1), 0.075);
    float cY2 = -0.6;
    float cv2 = sdCloud(cUV,
      vec2(-0.9+cos(ct*1.02+541.75)*0.1, cY2),  vec2(-0.5+sin(ct*0.9-316.56)*0.1, cY2),
      vec2(-1.5+cos(ct*0.867+37.165)*0.1, 0.25+cY2), vec2(-0.6+sin(ct*0.9675+665.162)*0.09, 0.25+cY2), 0.075);
    float cv = min(cv1, cv2);
    col  = mix(col, vec3(0.0, 0.0, 0.2), 1.0 - smoothstep(0.075 - 0.0001, 0.075, cv));
    col += vec3(1.0) * (1.0 - smoothstep(0.0, 0.01, abs(cv - 0.075)));
  }

  col += fog * fog * fog;
  col  = mix(vec3(col.r) * 0.5, col, bat * 0.7);
  col += beatIntensity * vec3(0.18, 0.06, 0.25);
  col = col * brightness + tint;

  gl_FragColor = vec4(col, 1.0);
}`;

// ═══════════════════════════════════════════════════════════════════
//  Shader 2 — The Universe Within  (story gameplay)
//  Adapted from Martijn Steinrucken (BigWings), CC BY-NC-SA 3.0
// ═══════════════════════════════════════════════════════════════════

const UNIVERSE_FRAG = /* glsl */ `
precision highp float;

uniform float iTime;
uniform vec2  iResolution;
uniform float battery;
uniform float bass;
uniform float beatIntensity;
uniform float brightness;
uniform vec3  tint;

#define S(a, b, t) smoothstep(a, b, t)
#define NUM_LAYERS 4.

float N21(vec2 p) {
  vec3 a = fract(vec3(p.xyx) * vec3(213.897, 653.453, 253.098));
  a += dot(a, a.yzx + 79.76);
  return fract((a.x + a.y) * a.z);
}

vec2 GetPos(vec2 id, vec2 offs, float t) {
  float n  = N21(id + offs);
  float n1 = fract(n * 10.0);
  float n2 = fract(n * 100.0);
  float a  = t + n;
  return offs + vec2(sin(a * n1), cos(a * n2)) * 0.4;
}

float df_line(in vec2 a, in vec2 b, in vec2 p) {
  vec2  pa = p - a, ba = b - a;
  float h  = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float line(vec2 a, vec2 b, vec2 uv) {
  float r1 = 0.04;
  float r2 = 0.01;
  float d  = df_line(a, b, uv);
  float d2 = length(a - b);
  float fade = S(1.5, 0.5, d2);
  fade += S(0.05, 0.02, abs(d2 - 0.75));
  return S(r1, r2, d) * fade;
}

float NetLayer(vec2 st, float n, float t) {
  vec2 id = floor(st) + n;
  st = fract(st) - 0.5;

  vec2 p0 = GetPos(id, vec2(-1,-1), t);
  vec2 p1 = GetPos(id, vec2( 0,-1), t);
  vec2 p2 = GetPos(id, vec2( 1,-1), t);
  vec2 p3 = GetPos(id, vec2(-1, 0), t);
  vec2 p4 = GetPos(id, vec2( 0, 0), t);
  vec2 p5 = GetPos(id, vec2( 1, 0), t);
  vec2 p6 = GetPos(id, vec2(-1, 1), t);
  vec2 p7 = GetPos(id, vec2( 0, 1), t);
  vec2 p8 = GetPos(id, vec2( 1, 1), t);

  float m = 0.0;
  float sparkle = 0.0;

  m += line(p4, p0, st); m += line(p4, p1, st);
  m += line(p4, p2, st); m += line(p4, p3, st);
  m += line(p4, p5, st); m += line(p4, p6, st);
  m += line(p4, p7, st); m += line(p4, p8, st);

  m += line(p1, p3, st); m += line(p1, p5, st);
  m += line(p7, p5, st); m += line(p7, p3, st);

  float d0 = length(st-p0); sparkle += (0.005/(d0*d0)) * S(1.0,0.7,d0) * pow(sin((fract(p0.x)+fract(p0.y)+t)*5.0)*0.4+0.6, 20.0);
  float d1 = length(st-p1); sparkle += (0.005/(d1*d1)) * S(1.0,0.7,d1) * pow(sin((fract(p1.x)+fract(p1.y)+t)*5.0)*0.4+0.6, 20.0);
  float d2 = length(st-p2); sparkle += (0.005/(d2*d2)) * S(1.0,0.7,d2) * pow(sin((fract(p2.x)+fract(p2.y)+t)*5.0)*0.4+0.6, 20.0);
  float d3 = length(st-p3); sparkle += (0.005/(d3*d3)) * S(1.0,0.7,d3) * pow(sin((fract(p3.x)+fract(p3.y)+t)*5.0)*0.4+0.6, 20.0);
  float d4 = length(st-p4); sparkle += (0.005/(d4*d4)) * S(1.0,0.7,d4) * pow(sin((fract(p4.x)+fract(p4.y)+t)*5.0)*0.4+0.6, 20.0);
  float d5 = length(st-p5); sparkle += (0.005/(d5*d5)) * S(1.0,0.7,d5) * pow(sin((fract(p5.x)+fract(p5.y)+t)*5.0)*0.4+0.6, 20.0);
  float d6 = length(st-p6); sparkle += (0.005/(d6*d6)) * S(1.0,0.7,d6) * pow(sin((fract(p6.x)+fract(p6.y)+t)*5.0)*0.4+0.6, 20.0);
  float d7 = length(st-p7); sparkle += (0.005/(d7*d7)) * S(1.0,0.7,d7) * pow(sin((fract(p7.x)+fract(p7.y)+t)*5.0)*0.4+0.6, 20.0);
  float d8 = length(st-p8); sparkle += (0.005/(d8*d8)) * S(1.0,0.7,d8) * pow(sin((fract(p8.x)+fract(p8.y)+t)*5.0)*0.4+0.6, 20.0);

  float sPhase = (sin(t + n) + sin(t * 0.1)) * 0.25 + 0.5;
  sPhase += pow(sin(t * 0.1) * 0.5 + 0.5, 50.0) * 5.0;
  sPhase *= 1.0 + battery * 2.0;
  m += sparkle * sPhase;

  return m;
}

void main() {
  vec2  uv = (gl_FragCoord.xy - iResolution.xy * 0.5) / iResolution.y;
  vec2  M  = vec2(sin(iTime * 0.13) * 0.15, cos(iTime * 0.09) * 0.1);

  float t = iTime * 0.1;
  float s = sin(t), c = cos(t);
  mat2  rot = mat2(c, -s, s, c);
  vec2  st  = uv * rot;
  M *= rot * 2.0;

  float m = 0.0;
  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYERS) {
    float z    = fract(t + i);
    float size = mix(15.0, 1.0, z) * (1.0 + bass * 0.3);
    float fade = S(0.0, 0.6, z) * S(1.0, 0.8, z);
    m += fade * NetLayer(st * size - M * z, i, iTime);
  }

  float fft  = bass * 1.5 + battery * 0.3;
  float glow = -uv.y * fft * 2.0;

  vec3 baseCol = vec3(s, cos(t * 0.4), -sin(t * 0.24)) * 0.4 + 0.6;
  vec3 col = baseCol * m;
  col += baseCol * glow;
  col *= 1.0 - dot(uv, uv);
  col *= S(0.0, 3.0, iTime);
  col += beatIntensity * baseCol * 0.5;
  col = col * brightness + tint;

  gl_FragColor = vec4(col, 1.0);
}`;

// ═══════════════════════════════════════════════════════════════════
//  Shader 3 — Mystery Mountains  (game-over)
//  Adapted from David Hoskins, CC BY-NC-SA 3.0
// ═══════════════════════════════════════════════════════════════════

const MOUNTAINS_FRAG = /* glsl */ `
precision highp float;

uniform float iTime;
uniform vec2  iResolution;
uniform float battery;
uniform float bass;
uniform float beatIntensity;
uniform float brightness;
uniform vec3  tint;

float _mhash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec4 _mnoise(vec2 uv) {
  uv *= 256.0;
  vec2 i = floor(uv);
  vec2 f = fract(uv);
  f = f * f * (3.0 - 2.0 * f);
  float a = _mhash(i);
  float b = _mhash(i + vec2(1.0, 0.0));
  float c = _mhash(i + vec2(0.0, 1.0));
  float d = _mhash(i + vec2(1.0, 1.0));
  float v = mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  return vec4(v);
}

#define MF +_mnoise(.3+p.xz*s/3e3)/(s+=s)

void main() {
  vec2 w = gl_FragCoord.xy;
  vec4 p = vec4(w / iResolution.xy, 1.0, 1.0) - 0.5;
  vec4 d = p;
  vec4 t;
  p.z += iTime * 20.0;
  d.y -= 0.4;

  vec4 c = vec4(0.0);
  for (float i = 1.5; i > 0.0; i -= 0.003) {
    float s = 0.5;
    t = MF MF MF MF MF MF;
    c = 1.0 + d.x - t * i;
    c.z -= 0.1;
    if (t.x > p.y * 0.007 + 1.3) break;
    p += d;
  }

  c.rgb *= vec3(0.85, 0.65, 0.7);
  c.rgb += bass * vec3(0.08, 0.0, 0.12);
  c.rgb += beatIntensity * vec3(0.2, 0.03, 0.1);
  c.rgb *= 0.7 + battery * 0.5;
  c.rgb = c.rgb * brightness + tint;

  gl_FragColor = vec4(c.rgb, 1.0);
}`;

// ═══════════════════════════════════════════════════════════════════
//  Shader 4 — Dying Universe  (victory)
//  Adapted from Martijn Steinrucken (BigWings), CC BY-NC-SA 3.0
// ═══════════════════════════════════════════════════════════════════

const DYING_UNIVERSE_FRAG = /* glsl */ `
precision highp float;

uniform float iTime;
uniform vec2  iResolution;
uniform float battery;
uniform float bass;
uniform float beatIntensity;
uniform float brightness;
uniform vec3  tint;

#define DU_STARS 50
#define DU_ARCS 7
#define sat(x) clamp(x, 0., 1.)

const vec3 UP = vec3(0., 1., 0.);
const float PI_DU = 3.14159265;

float du_time;
vec4 duCool, duHot, duMid;
float duStarSize;

struct DURay { vec3 o; vec3 d; };
DURay du_camRay;

vec4  duNoise4(vec4 x) { return fract(sin(x) * 5346.1764) * 2. - 1.; }
float duNoise1(float x) { return fract(sin(x) * 5346.1764); }

float duDistSq(vec3 a, vec3 b) { vec3 D = a - b; return dot(D, D); }

vec3 duClosest(DURay r, vec3 p) {
  return r.o + max(0., dot(p - r.o, r.d)) * r.d;
}

float duPulse(float x, float p) {
  return pow((cos(x + sin(x)) + 1.) / 2., p);
}

float duBounce(float t, float decay) {
  float height = 1.;
  float heights[DU_ARCS];
  heights[0] = 1.;
  float hd[DU_ARCS];
  hd[0] = 1.;
  float halfDur = 0.5;
  for (int i = 1; i < DU_ARCS; i++) {
    height *= decay;
    heights[i] = height;
    hd[i] = sqrt(height);
    halfDur += hd[i];
  }
  t *= halfDur * 2.;
  float y = 1. - t * t;
  for (int i = 1; i < DU_ARCS; i++) {
    t -= hd[i-1] + hd[i];
    y = max(y, heights[i] - t * t);
  }
  return sat(y);
}

vec4 duStarPos(int idx) {
  float n = duNoise1(float(idx));
  vec4 nv = duNoise4(vec4(n, n+1., n+2., n+3.));
  float t = fract(du_time * 0.1 + n) * 2.;
  float fade = smoothstep(2., 0.5, t);
  float sz = duStarSize + n * 0.03;
  sz *= fade;
  float b = duBounce(t, 0.4 + n * 0.1) * 7. + sz;
  return vec4(nv.x * 10., b, nv.y * 10., fade);
}

vec4 duStar(DURay r, float seed) {
  vec4 nv = duNoise4(vec4(seed, seed+1., seed+2., seed+3.));
  float t = fract(du_time * 0.1 + seed) * 2.;
  float fade = smoothstep(2., 0.5, t);
  vec4 col = mix(duCool, duHot, fade);
  float sz = duStarSize + seed * 0.03;
  sz *= fade;
  float b = duBounce(t, 0.4 + seed * 0.1) * 7. + sz;
  vec3 sp = vec3(nv.x * 10., b, nv.y * 10.);
  vec3 cp = duClosest(r, sp);
  float dist = duDistSq(cp, sp) / (sz * sz);
  return col / dist;
}

vec4 duStars(DURay r) {
  vec4 col = vec4(0.);
  for (int i = 0; i < DU_STARS; i++) {
    col += duStar(r, duNoise1(float(i + 1)));
  }
  return col;
}

vec3 duPlaneHit(DURay r) {
  float t = -r.o.y / r.d.y;
  return r.o + max(0., t) * r.d;
}

vec4 duGround(DURay r) {
  vec4 ground = vec4(0.);
  if (r.d.y > 0.) return ground;
  vec3 I = duPlaneHit(r);
  vec3 R = reflect(r.d, UP);
  for (int i = 0; i < DU_STARS; i++) {
    vec4 star = duStarPos(i);
    vec3 L = star.xyz - I;
    float dist = length(L);
    L /= dist;
    float lambert = sat(dot(L, UP));
    float light = lambert / dist;
    vec4 col = mix(duCool, duMid, star.w);
    ground += vec4(light) * 0.1 * col * (sin(du_time) * 0.5 + 0.6);
    float spec = pow(sat(dot(R, L)), 400.);
    float fresnel = pow(1. - sat(dot(L, UP)), 10.);
    ground += col * spec / dist * star.w * 0.5 * fresnel;
  }
  return ground;
}

void main() {
  vec2 uv = (gl_FragCoord.xy / iResolution.xy) - 0.5;
  uv.y *= iResolution.y / iResolution.x;

  du_time = iTime * 0.4;
  duStarSize = 0.03 + bass * 0.02;

  float t = du_time * PI_DU * 0.1;
  duCool = vec4(sin(t), cos(t * 0.23), cos(t * 0.3453), 1.) * 0.5 + 0.5;
  duHot  = vec4(sin(t * 2.), cos(t * 2. * 0.33), cos(t * 0.3453), 1.) * 0.5 + 0.5;
  duHot  = mix(duHot, vec4(1.), sin(du_time * 2.) * 0.5 + 0.5);
  duMid  = (duHot + duCool) * 0.5;

  float s = sin(t), c = cos(t);
  mat3 rot = mat3(c, 0., s, 0., 1., 0., s, 0., -c);
  float camH = mix(3.5, 0.1, duPulse(du_time * 0.1, 2.));
  vec3 pos = vec3(0., camH, -10.) * rot * (1. + sin(du_time) * 0.3);

  vec3 fwd = normalize(-pos);
  vec3 left = cross(UP, fwd);
  vec3 camUp = cross(fwd, left);
  vec3 center = pos + fwd * 0.5;
  vec3 scrPt = center + left * uv.x + camUp * uv.y;
  du_camRay.o = pos;
  du_camRay.d = normalize(scrPt - pos);

  vec4 col = duGround(du_camRay);
  col += duStars(du_camRay);

  col.rgb += beatIntensity * duHot.rgb * 0.3;
  col.rgb *= 0.7 + battery * 0.6;
  col.rgb = col.rgb * brightness + tint;

  gl_FragColor = vec4(col.rgb, 1.0);
}`;

// ═══════════════════════════════════════════════════════════════════
//  Shader 5 — DJ Console  (arcade mode / mod select)
//  Raymarched synth mixer — adapted from 0b5vr, CC BY 3.0
// ═══════════════════════════════════════════════════════════════════

const DJ_CONSOLE_FRAG = /* glsl */ `
precision highp float;

uniform float iTime;
uniform vec2  iResolution;
uniform float battery;
uniform float bass;
uniform float beatIntensity;
uniform float brightness;
uniform vec3  tint;
uniform sampler2D iChannel0;

#define lofi(i,j) (floor((i)/(j))*(j))
#define lofir(i,j) (floor(((i)/(j))+0.5)*(j))

const float PI_DJ = acos(-1.);

mat2 r2d(float t) {
  float c = cos(t), s = sin(t);
  return mat2(c, s, -s, c);
}

mat3 orthbas(vec3 z) {
  z = normalize(z);
  vec3 u = abs(z.y) > .999 ? vec3(0,0,1) : vec3(0,1,0);
  vec3 x = normalize(cross(u, z));
  return mat3(x, cross(z, x), z);
}

vec3 pcg3df(vec3 s) {
  s = fract(s * vec3(0.1031, 0.1030, 0.0973));
  s += dot(s, s.yzx + 33.33);
  return fract((s.xxy + s.yxx) * s.zyx);
}

struct DJGrid {
  vec3 s; vec3 c; vec3 h; int i; float d;
};

DJGrid dogrid(vec3 ro, vec3 rd) {
  DJGrid r;
  r.s = vec3(2,2,100);
  for (int i = 0; i < 3; i++) {
    r.c = (floor(ro / r.s) + .5) * r.s;
    r.h = pcg3df(r.c);
    r.i = i;
    if (r.h.x < .4) break;
    else if (i == 0) r.s = vec3(2,1,100);
    else if (i == 1) r.s = vec3(1,1,100);
  }
  vec3 src = -(ro - r.c) / rd;
  vec3 dst = abs(.501 * r.s / rd);
  vec3 bv = src + dst;
  r.d = min(min(bv.x, bv.y), bv.z);
  return r;
}

float djbox3(vec3 p, vec3 s) {
  vec3 d = abs(p) - s;
  return length(max(d, 0.)) + min(0., max(max(d.x, d.y), d.z));
}

float djbox2(vec2 p, vec2 s) {
  vec2 d = abs(p) - s;
  return length(max(d, 0.)) + min(0., max(d.x, d.y));
}

vec4 djmap(vec3 p, DJGrid grid) {
  p -= grid.c;
  p.z += .4 * sin(2.*iTime + fract(grid.h.z*28.) + .3*(grid.c.x+grid.c.y));
  vec3 psize = grid.s / 2.;
  psize.z = 1.; psize -= .02;
  float d = djbox3(p + vec3(0,0,1), psize) - .02;
  float pcol = 1.;
  vec3 pt = p;

  if (grid.i == 0) {
    if (grid.h.y < .3) {
      vec3 c = vec3(0);
      pt.xy *= r2d(PI_DJ/4.);
      c.xy = lofir(pt.xy, .1);
      pt -= c; pt.xy *= r2d(-PI_DJ/4.);
      float r = .02*smoothstep(.9,.7,abs(p.x))*smoothstep(.9,.7,abs(p.y));
      d = max(d, -(length(pt.xy)-r));
    } else if (grid.h.y < .5) {
      vec3 c = vec3(0);
      c.x = clamp(lofir(pt.x,.2),-.6,.6); pt -= c;
      float hole = djbox2(pt.xy, vec2(0.,.7))-.03;
      d = max(d, -hole);
      pt.y -= .5-smoothstep(-.5,.5,sin(iTime+c.x+grid.h.z*100.));
      float d2 = djbox3(pt, vec3(.02,.07,.07))-.03;
      if (d2 < d) { float l = step(abs(pt.y),.02); return vec4(d2,2.*l,l,0); }
      pt = p; c.y = clamp(lofir(pt.y,.2),-.6,.6); pt -= c;
      pcol *= smoothstep(.0,.01,djbox2(pt.xy,vec2(.07,.0))-.005);
      pt = p; c.y = clamp(lofir(pt.y,.6),-.6,.6); pt -= c;
      pcol *= smoothstep(.0,.01,djbox2(pt.xy,vec2(.1,.0))-.01);
      pcol = mix(1.,pcol,smoothstep(.0,.01,djbox2(pt.xy,vec2(.03,1.))-.01));
    } else if (grid.h.y < .6) {
      float hole = djbox2(p.xy, vec2(.9)+.02);
      d = max(d, -hole);
      float d2 = djbox3(p, vec3(.9,.9,.05));
      if (d2 < d) { float l = step(abs(p.x),.7)*step(abs(p.y),.7); return vec4(d2,4.*l,0,0); }
    } else {
      float ani = smoothstep(-.5,.5,sin(iTime+grid.h.z*100.));
      pt.xy *= r2d(PI_DJ/6.*5.*mix(-1.,1.,ani));
      float metal = step(length(pt.xy),.45);
      float wave = metal*sin(length(pt.xy)*500.)/1000.;
      float d2 = length(pt.xy)-.63+.05*pt.z-.02*cos(8.*atan(pt.y,pt.x));
      d2 = max(d2, abs(pt.z)-.4-wave);
      float d2b = length(pt.xy)-.67+.05*pt.z;
      d2b = max(d2b, abs(pt.z)-.04);
      d2 = min(d2, d2b);
      if (d2 < d) { float l = smoothstep(.01,.0,length(pt.xy-vec2(0,.53))-.03); return vec4(d2,3.*metal,l,0); }
      pt = p;
      float a = clamp(lofir(atan(-pt.x,pt.y),PI_DJ/12.),-PI_DJ/6.*5.,PI_DJ/6.*5.);
      pt.xy *= r2d(a);
      pcol *= smoothstep(.0,.01,length(pt.xy-vec2(0,.74))-.015);
      pt = p;
      a = clamp(lofir(atan(-pt.x,pt.y),PI_DJ/6.*5.),-PI_DJ/6.*5.,PI_DJ/6.*5.);
      pt.xy *= r2d(a);
      pcol *= smoothstep(.0,.01,length(pt.xy-vec2(0,.74))-.03);
      float d3 = length(p-vec3(.7,-.7,0))-.05;
      if (d3 < d) { float led = (1.-ani)*(.5+.5*sin(iTime*exp2(3.+3.*grid.h.z))); return vec4(d3,2,led,0); }
    }
  } else if (grid.i == 1) {
    if (grid.h.y < .4) {
      float hole = djbox2(p.xy, vec2(.9,.05));
      d = max(d, -hole);
      float ani = smoothstep(-.2,.2,sin(iTime+grid.h.z*100.));
      pt.x -= mix(-.8,.8,ani);
      float d2 = djbox3(pt, vec3(.07,.25,.4))+.05*p.z;
      d2 = max(d2, -p.z);
      if (d2 < d) { float l = smoothstep(.01,.0,abs(p.y)-.02); return vec4(d2,0,l,0); }
      pt = p; vec3 c = vec3(0);
      c.x = clamp(lofir(pt.x,.2),-.8,.8); pt -= c;
      pcol *= smoothstep(.0,.01,djbox2(pt.xy,vec2(.0,.15))-.005);
      pt = p; c = vec3(0);
      c.x = clamp(lofir(pt.x,.8),-.8,.8); pt -= c;
      pcol *= smoothstep(.0,.01,djbox2(pt.xy,vec2(.0,.18))-.01);
      pcol = mix(1.,pcol,smoothstep(.0,.01,djbox2(p.xy,vec2(1.,.08))));
    } else if (grid.h.y < .5) {
      vec3 c = vec3(0);
      c.x = clamp(lofi(pt.x,.44)+.44/2.,-.44*1.5,.44*1.5); pt -= c;
      float hole = djbox2(pt.xy, vec2(.19,.33))-.01;
      d = max(d, -hole);
      float ani = smoothstep(.8,.9,sin(10.*iTime-c.x*2.2+grid.h.z*100.));
      vec4 hit = vec4(d,0,0,0);
      float d3 = length(pt-vec3(0,.22,.04))-.05;
      if (d3 < hit.x) hit = vec4(d3,2,ani,0);
      float d2 = djbox3(pt, vec3(.17,.3,.05))-.01;
      d2 = min(d2, djbox3(pt-vec3(0,-.1,0), vec3(.17,.2,.08))-.01)+.5*pt.z;
      if (d2 < hit.x) hit = vec4(d2,5,fract(grid.h.z*8.89),0);
      if (hit.x < d) return hit;
    } else {
      float hole = djbox2(p.xy, vec2(.9,.3)+.02);
      d = max(d, -hole);
      float d2 = djbox3(p, vec3(.9,.3,.1));
      if (d2 < d) { float l = step(abs(p.x),.8)*step(abs(p.y),.2); return vec4(d2,l,0,0); }
    }
  } else {
    if (grid.h.y < .5) {
      float hole = length(p.xy)-.25;
      d = max(d, -hole);
      float ani = smoothstep(-.5,.5,sin(2.*iTime+grid.h.z*100.));
      pt.xy *= r2d(PI_DJ/6.*5.*mix(-1.,1.,ani));
      float d2 = length(pt.xy)-.23+.05*pt.z;
      d2 = max(d2, abs(pt.z)-.4);
      if (d2 < d) { float l = smoothstep(.01,.0,abs(pt.x)-.015)*smoothstep(.01,.0,-pt.y+.05); return vec4(d2,0,l,0); }
      pt = p;
      float a = clamp(lofir(atan(-pt.x,pt.y),PI_DJ/6.),-PI_DJ/6.*5.,PI_DJ/6.*5.);
      pt.xy *= r2d(a);
      pcol *= smoothstep(.0,.01,djbox2(pt.xy-vec2(0,.34),vec2(.0,.02))-.005);
      pt = p;
      a = clamp(lofir(atan(-pt.x,pt.y),PI_DJ/6.*5.),-PI_DJ/6.*5.,PI_DJ/6.*5.);
      pt.xy *= r2d(a);
      pcol *= smoothstep(.0,.01,djbox2(pt.xy-vec2(0,.34),vec2(.0,.03))-.01);
    } else if (grid.h.y < .8) {
      float hole = length(p.xy)-.1;
      d = max(d, -hole);
      float d2 = length(p.xy)-.15;
      d2 = max(d2, abs(p.z)-.12);
      pt.xy *= r2d(100.*grid.h.z);
      float d3 = abs(pt.y)-.2;
      pt.xy *= r2d(PI_DJ/3.*2.); d3 = max(d3, abs(pt.y)-.2);
      pt.xy *= r2d(PI_DJ/3.*2.); d3 = max(d3, abs(pt.y)-.2);
      d3 = max(d3, abs(p.z)-.03);
      d2 = min(d2, d3); d2 = max(d2, -hole);
      if (d2 < d) return vec4(d2,3,0,0);
    } else if (grid.h.y < .99) {
      pt.y += .08;
      float hole = djbox2(pt.xy, vec2(.22))-.05;
      d = max(d, -hole);
      float ani = sin(2.*iTime+grid.h.z*100.);
      float push = smoothstep(.3,.0,abs(ani));
      ani = smoothstep(-.1,.1,ani);
      pt.z += .06*push;
      float d2 = djbox3(pt, vec3(.2,.2,.05))-.05;
      if (d2 < d) return vec4(d2,0,0,0);
      float d3 = length(p-vec3(0,.3,0))-.05;
      if (d3 < d) return vec4(d3,2,ani,0);
    } else {
      pt = abs(pt);
      pt.xy = pt.x < pt.y ? pt.yx : pt.xy;
      pcol *= smoothstep(.0,.01,djbox2(pt.xy,vec2(.05)));
      pcol *= smoothstep(.0,.01,djbox2(pt.xy-vec2(.2,0),vec2(.05,.15)));
      pcol = 1.-pcol;
    }
  }
  return vec4(d, 0, pcol, 0);
}

vec3 djnorm(vec3 p, DJGrid grid, float dd) {
  vec2 d = vec2(0, dd);
  return normalize(vec3(
    djmap(p+d.yxx,grid).x - djmap(p-d.yxx,grid).x,
    djmap(p+d.xyx,grid).x - djmap(p-d.xyx,grid).x,
    djmap(p+d.xxy,grid).x - djmap(p-d.xxy,grid).x
  ));
}

struct DJMarch { vec4 isect; vec3 rp; float rl; DJGrid grid; };

DJMarch djmarch(vec3 ro, vec3 rd, int iter) {
  float rl = 1E-2;
  vec3 rp = ro + rd * rl;
  vec4 isect = vec4(0.0);
  DJGrid grid;
  float gridlen = rl;
  for (int i = 0; i < 64; i++) {
    if (i >= iter) break;
    if (gridlen <= rl) { grid = dogrid(rp, rd); gridlen += grid.d; }
    isect = djmap(rp, grid);
    rl = min(rl + isect.x * .8, gridlen);
    rp = ro + rd * rl;
    if (abs(isect.x) < 1E-4) break;
    if (rl > 50.) break;
  }
  DJMarch r;
  r.isect = isect; r.rp = rp; r.rl = rl; r.grid = grid;
  return r;
}

void main() {
  vec2 uv = vec2(gl_FragCoord.x / iResolution.x, gl_FragCoord.y / iResolution.y);
  vec2 p = uv * 2. - 1.;
  p.x *= iResolution.x / iResolution.y;
  vec3 col = vec3(0);

  float canim = smoothstep(-.2,.2,sin(iTime));
  vec3 co = mix(vec3(-6,-8,-40), vec3(0,-2,-40), canim);
  vec3 ct = vec3(0,0,-50);
  float cr = mix(.5,.0,canim);
  co.xy += iTime; ct.xy += iTime;
  mat3 cb = orthbas(co - ct);
  vec3 ro = co + cb * vec3(4. * p * r2d(cr), 0);
  vec3 rd = cb * normalize(vec3(0,0,-2));

  DJMarch march = djmarch(ro, rd, 64);

  if (march.isect.x < 1E-2) {
    vec3 basecol = vec3(.5);
    vec3 speccol = vec3(.2);
    float specpow = 30.;
    float ndelta = 1E-4;
    float mtl = march.isect.y;
    float mtlp = march.isect.z;

    if (mtl == 0.) {
      mtlp = mix(mtlp, 1.-mtlp, step(fract(march.grid.h.z*66.),.1));
      vec3 cv = .9 + .0*sin(.1*(march.grid.c.x+march.grid.c.y)+march.grid.h.z+vec3(0,2,3));
      basecol = mix(vec3(.04), cv, mtlp);
    } else if (mtl == 1.) {
      basecol = vec3(0); speccol = vec3(.5); specpow = 60.;
      vec2 size = vec2(.05,.2);
      vec2 pp = (march.rp - march.grid.c).xy;
      vec2 cv = lofi(pp.xy, size) + size/2.;
      vec2 cc = pp - cv;
      vec3 led = exp(-60.*djbox2(cc, vec2(0.,.08))) * (cv.x>.5 ? vec3(5,1,2) : vec3(1,5,2));
      float lv = texture2D(iChannel0, vec2(march.grid.h.z, 0.5)).x;
      col += led * step(cv.x, -.8 + 1.6*lv);
      basecol = .04 * led;
    } else if (mtl == 2.) {
      basecol = vec3(0); speccol = vec3(1.); specpow = 100.;
      col += mtlp * vec3(2,.5,.5);
    } else if (mtl == 3.) {
      basecol = vec3(.2); speccol = vec3(1.8); specpow = 100.; ndelta = 3E-2;
    } else if (mtl == 4.) {
      basecol = vec3(0); speccol = vec3(.5); specpow = 60.;
      vec2 size = vec2(.1);
      vec2 pp = (march.rp - march.grid.c).xy;
      vec2 cv = lofi(pp.xy, size) + size/2.;
      vec2 cc = pp - cv;
      vec3 led = exp(-60.*djbox2(cc, vec2(0.))) * vec3(2,1,2);
      float plasma = sin(length(cv)*10.-10.*iTime+march.grid.h.z*.7) + sin(cv.y*10.-7.*iTime);
      led *= .5 + .5*sin(plasma);
      col += 2.*led;
      basecol = .04*led;
    } else if (mtl == 5.) {
      basecol = vec3(.9, mtlp, .02);
    }

    vec3 n = djnorm(march.rp, march.grid, ndelta);
    vec3 v = -rd;
    {
      vec3 l = normalize(vec3(1,3,5));
      vec3 h = normalize(l+v);
      float shadow = step(1E-1, djmarch(march.rp,l,16).isect.x);
      col += vec3(.5,.6,.7) * shadow * max(0.,dot(n,l)) * (basecol/PI_DJ + speccol*pow(max(0.,dot(n,h)),specpow));
    }
    {
      vec3 l = normalize(vec3(-1,-1,5));
      vec3 h = normalize(l+v);
      float shadow = step(1E-1, djmarch(march.rp,l,16).isect.x);
      col += shadow * max(0.,dot(n,l)) * (basecol/PI_DJ + speccol*pow(max(0.,dot(n,h)),specpow));
    }
  }

  col = pow(col, vec3(.4545));
  col = smoothstep(vec3(0,-.1,-.2), vec3(1,1.1,1.2), col);
  col += beatIntensity * vec3(0.15, 0.05, 0.2);
  col *= 0.7 + battery * 0.5;
  col = col * brightness + tint;

  gl_FragColor = vec4(col, 1.0);
}`;

// ═══════════════════════════════════════════════════════════════════

const SCENE_MAP = {
  BootScene:      'synthwave',
  MenuScene:      'synthwave',
  GameOverScene:  'mountains',
  VictoryScene:   'dyinguniverse',
  ModSelectScene: 'djconsole',
};

const MODE_BG = {
  story:  'universe',
  arcade: 'djconsole',
};

function makeUniforms(vw, vh, pr) {
  return {
    iTime:         { value: 0 },
    iResolution:   { value: new THREE.Vector2(vw * pr, vh * pr) },
    battery:       { value: 0.3 },
    bass:          { value: 0 },
    beatIntensity: { value: 0 },
    brightness:    { value: 0.55 },
    tint:          { value: new THREE.Vector3(0, 0, 0) },
  };
}

const AudioBackground = {
  _ready: false,
  _current: null,

  init() {
    if (this._ready) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if ((vw - GAME_W) / 2 < 30) return;

    this._ready = true;
    this._vw = vw;
    this._vh = vh;
    this._batterySmooth = 0.3;

    const pr = Math.min(window.devicePixelRatio, 1.5);
    this._pr = pr;

    this.renderer = new THREE.WebGLRenderer({
      alpha: false,
      antialias: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(vw, vh);
    this.renderer.setPixelRatio(pr);
    this.renderer.domElement.id = 'three-bg';
    document.body.prepend(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const hw = vw / 2, hh = vh / 2;
    this.camera = new THREE.OrthographicCamera(-hw, hw, hh, -hh, 0.1, 100);
    this.camera.position.z = 10;

    this._audioTexData = new Uint8Array(128 * 4);
    this._audioTex = new THREE.DataTexture(
      this._audioTexData, 128, 1,
      THREE.RGBAFormat, THREE.UnsignedByteType,
    );
    this._audioTex.minFilter = THREE.LinearFilter;
    this._audioTex.magFilter = THREE.LinearFilter;
    this._audioTex.wrapS = THREE.ClampToEdgeWrapping;
    this._audioTex.wrapT = THREE.ClampToEdgeWrapping;

    this._materials = {
      synthwave: new THREE.ShaderMaterial({
        uniforms:       makeUniforms(vw, vh, pr),
        vertexShader:   VERT,
        fragmentShader: SYNTHWAVE_FRAG,
        depthWrite: false, depthTest: false,
      }),
      universe: new THREE.ShaderMaterial({
        uniforms:       makeUniforms(vw, vh, pr),
        vertexShader:   VERT,
        fragmentShader: UNIVERSE_FRAG,
        depthWrite: false, depthTest: false,
      }),
      mountains: new THREE.ShaderMaterial({
        uniforms:       makeUniforms(vw, vh, pr),
        vertexShader:   VERT,
        fragmentShader: MOUNTAINS_FRAG,
        depthWrite: false, depthTest: false,
      }),
      dyinguniverse: new THREE.ShaderMaterial({
        uniforms:       makeUniforms(vw, vh, pr),
        vertexShader:   VERT,
        fragmentShader: DYING_UNIVERSE_FRAG,
        depthWrite: false, depthTest: false,
      }),
      djconsole: new THREE.ShaderMaterial({
        uniforms: {
          ...makeUniforms(vw, vh, pr),
          iChannel0: { value: this._audioTex },
        },
        vertexShader:   VERT,
        fragmentShader: DJ_CONSOLE_FRAG,
        depthWrite: false, depthTest: false,
      }),
    };

    this._materials.synthwave.uniforms.tint.value.set(0.04, 0.0, 0.06);
    this._materials.universe.uniforms.tint.value.set(0.0, 0.03, 0.07);
    this._materials.mountains.uniforms.tint.value.set(0.07, 0.01, 0.02);
    this._materials.dyinguniverse.uniforms.tint.value.set(0.03, 0.05, 0.01);
    this._materials.djconsole.uniforms.tint.value.set(0.05, 0.01, 0.06);

    this._quad = new THREE.Mesh(
      new THREE.PlaneGeometry(vw, vh),
      this._materials.synthwave,
    );
    this._quad.position.z = 0;
    this.scene.add(this._quad);
    this._current = 'synthwave';

    this._clock = new THREE.Clock();
    const loop = () => { requestAnimationFrame(loop); this._update(); };
    requestAnimationFrame(loop);

    window.addEventListener('resize', () => this._resize());
  },

  setScene(sceneName, mode) {
    if (!this._ready) return;
    const target = SCENE_MAP[sceneName] || (mode && MODE_BG[mode]) || 'universe';
    if (target === this._current) return;
    this._current = target;
    this._quad.material = this._materials[target];
  },

  _update() {
    const ar  = AudioReactive;
    const mat = this._materials[this._current];
    const u   = mat.uniforms;

    u.iTime.value = this._clock.getElapsedTime();

    const energy = ar._connected ? ar.energy : 0;
    const targetBat = 0.25 + energy * 0.75;
    this._batterySmooth += (targetBat - this._batterySmooth) * 0.08;
    u.battery.value = this._batterySmooth;

    u.bass.value = ar._connected ? ar.bassSmooth : 0;

    if (ar.isBeat) {
      u.beatIntensity.value = Math.min(1.0, ar.beatIntensity);
    }
    u.beatIntensity.value = Math.max(0, u.beatIntensity.value - 0.025);

    if (this._current === 'djconsole' && ar._connected && ar._freqData) {
      const fd = ar._freqData;
      const td = this._audioTexData;
      const len = Math.min(128, fd.length);
      for (let i = 0; i < len; i++) {
        const v = fd[i];
        td[i * 4]     = v;
        td[i * 4 + 1] = v;
        td[i * 4 + 2] = v;
        td[i * 4 + 3] = 255;
      }
      this._audioTex.needsUpdate = true;
    }

    this.renderer.render(this.scene, this.camera);
  },

  _resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    this._vw = vw;
    this._vh = vh;
    const pr = this._pr;

    this.renderer.setSize(vw, vh);

    const hw = vw / 2, hh = vh / 2;
    this.camera.left = -hw; this.camera.right = hw;
    this.camera.top = hh;   this.camera.bottom = -hh;
    this.camera.updateProjectionMatrix();

    this._quad.geometry.dispose();
    this._quad.geometry = new THREE.PlaneGeometry(vw, vh);

    for (const key in this._materials) {
      this._materials[key].uniforms.iResolution.value.set(vw * pr, vh * pr);
    }
  },
};

export default AudioBackground;
