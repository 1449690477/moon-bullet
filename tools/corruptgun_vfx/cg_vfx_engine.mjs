import { Geometry, Mesh, Program, Renderer } from 'ogl';

const VERSION = '2.0.0';
const LAYER_NAMES = ['back', 'front'];
const EFFECT_KIND = Object.freeze({
  orb: 0,
  trail: 1,
  impact: 2,
  mark: 3,
  cloneField: 4,
  muzzle: 5,
  ultimateOrb: 6,
  ultimateWheel: 7,
  ultimateSoul: 8,
});

const QUALITY_PROFILES = Object.freeze({
  high: Object.freeze({
    renderScale: 1,
    maxDrawCalls: 180,
    maxDpr: 2,
    shaderDetail: 1,
    particleDensity: 1,
    chromatic: 1,
  }),
  medium: Object.freeze({
    renderScale: 0.7,
    maxDrawCalls: 132,
    maxDpr: 1.5,
    shaderDetail: 0.72,
    particleDensity: 0.6,
    chromatic: 0,
  }),
  low: Object.freeze({
    renderScale: 0,
    maxDrawCalls: 0,
    maxDpr: 1,
    shaderDetail: 0,
    particleDensity: 0,
    chromatic: 0,
  }),
});

const VERTEX_SHADER = /* glsl */ `
  precision highp float;

  attribute vec2 position;

  uniform vec2 uResolution;
  uniform vec2 uCenter;
  uniform vec2 uSize;
  uniform float uRotation;

  varying vec2 vLocal;
  varying vec2 vUv;

  void main() {
    float c = cos(uRotation);
    float s = sin(uRotation);
    vec2 local = position * uSize * 0.5;
    vec2 rotated = vec2(c * local.x - s * local.y, s * local.x + c * local.y);
    vec2 pixel = uCenter + rotated;
    vec2 clip = pixel / uResolution * 2.0 - 1.0;
    clip.y = -clip.y;
    gl_Position = vec4(clip, 0.0, 1.0);
    vLocal = position;
    vUv = position * 0.5 + 0.5;
  }
`;

// psrdnoise() is adapted from psrdnoise2.glsl by Stefan Gustavson and Ian
// McEwan. The complete MIT notice is preserved in THIRD_PARTY_NOTICES.md.
const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform float uKind;
  uniform float uTime;
  uniform float uPhase;
  uniform float uProgress;
  uniform float uPower;
  uniform float uVariant;
  uniform float uOpacity;
  uniform float uQuality;
  uniform float uParticleDensity;
  uniform float uChromatic;

  varying vec2 vLocal;
  varying vec2 vUv;

  const float PI = 3.141592653589793;
  const float TAU = 6.283185307179586;

  float psrdnoise(vec2 x, vec2 period, float alpha, out vec2 gradient) {
    vec2 uv = vec2(x.x + x.y * 0.5, x.y);
    vec2 i0 = floor(uv);
    vec2 f0 = fract(uv);
    float cmp = step(f0.y, f0.x);
    vec2 o1 = vec2(cmp, 1.0 - cmp);
    vec2 i1 = i0 + o1;
    vec2 i2 = i0 + vec2(1.0, 1.0);
    vec2 v0 = vec2(i0.x - i0.y * 0.5, i0.y);
    vec2 v1 = vec2(v0.x + o1.x - o1.y * 0.5, v0.y + o1.y);
    vec2 v2 = vec2(v0.x + 0.5, v0.y + 1.0);
    vec2 x0 = x - v0;
    vec2 x1 = x - v1;
    vec2 x2 = x - v2;
    vec3 iu;
    vec3 iv;
    vec3 xw;
    vec3 yw;

    if (any(greaterThan(period, vec2(0.0)))) {
      xw = vec3(v0.x, v1.x, v2.x);
      yw = vec3(v0.y, v1.y, v2.y);
      if (period.x > 0.0) xw = mod(xw, period.x);
      if (period.y > 0.0) yw = mod(yw, period.y);
      iu = floor(xw + 0.5 * yw + 0.5);
      iv = floor(yw + 0.5);
    } else {
      iu = vec3(i0.x, i1.x, i2.x);
      iv = vec3(i0.y, i1.y, i2.y);
    }

    vec3 hash = mod(iu, 289.0);
    hash = mod((hash * 51.0 + 2.0) * hash + iv, 289.0);
    hash = mod((hash * 34.0 + 10.0) * hash, 289.0);
    vec3 psi = hash * 0.07482 + alpha;
    vec3 gx = cos(psi);
    vec3 gy = sin(psi);
    vec2 g0 = vec2(gx.x, gy.x);
    vec2 g1 = vec2(gx.y, gy.y);
    vec2 g2 = vec2(gx.z, gy.z);
    vec3 w = 0.8 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2));
    w = max(w, 0.0);
    vec3 w2 = w * w;
    vec3 w4 = w2 * w2;
    vec3 gdotx = vec3(dot(g0, x0), dot(g1, x1), dot(g2, x2));
    float n = dot(w4, gdotx);
    vec3 w3 = w2 * w;
    vec3 dw = -8.0 * w3 * gdotx;
    vec2 dn0 = w4.x * g0 + dw.x * x0;
    vec2 dn1 = w4.y * g1 + dw.y * x1;
    vec2 dn2 = w4.z * g2 + dw.z * x2;
    gradient = 10.9 * (dn0 + dn1 + dn2);
    return 10.9 * n;
  }

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  mat2 rotate2d(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c);
  }

  float band(float value, float center, float width, float softness) {
    return 1.0 - smoothstep(width, width + softness, abs(value - center));
  }

  float lifeEnvelope(float p, float openEnd, float closeStart) {
    return smoothstep(0.0, openEnd, p + 0.001) * (1.0 - smoothstep(closeStart, 1.0, p));
  }

  vec4 shadeOrb(vec2 p) {
    float radius = length(p);
    float cloneFactor = step(0.5, uVariant) * (1.0 - step(1.5, uVariant));
    float sphereRadius = 0.70;
    vec2 q = p / sphereRadius;
    float inside = step(radius, sphereRadius);
    float sphereMask = (1.0 - smoothstep(sphereRadius - 0.045, sphereRadius + 0.018, radius));
    float z = sqrt(max(0.0, 1.0 - dot(q, q)));

    vec2 flowGradientA;
    float flowA = psrdnoise(
      q * 2.15 + vec2(uPhase * 1.7, -uTime * 0.20),
      vec2(0.0),
      uTime * 0.92 + uPhase,
      flowGradientA
    );
    vec2 warp = flowGradientA * mix(0.07, 0.13, uQuality);
    vec2 flowGradientB;
    float flowB = psrdnoise(
      q * 4.6 + warp + vec2(-uTime * 0.34, uTime * 0.22),
      vec2(0.0),
      -uTime * 1.27 + uPhase * 2.1,
      flowGradientB
    );
    vec2 flowGradientC;
    float flowC = psrdnoise(
      q * 8.2 + flowGradientB * 0.055,
      vec2(0.0),
      uTime * 1.78 - uPhase,
      flowGradientC
    );

    float liquid = smoothstep(-0.55, 0.78, flowA * 0.62 + flowB * 0.38);
    float veins = pow(smoothstep(0.30, 0.91, abs(flowB * 0.75 + flowC * 0.45)), 3.0);
    float cavities = smoothstep(0.18, 0.92, -flowA * 0.82 + flowC * 0.18);
    vec3 lightDirection = normalize(vec3(-0.48, -0.55, 0.69));
    float diffuse = max(0.0, dot(normalize(vec3(q, z)), lightDirection));
    float hemisphere = 0.18 + 0.82 * z;
    float lowerOcclusion = smoothstep(-0.95, 0.78, -q.y - q.x * 0.28);
    float fresnel = pow(1.0 - z, 2.7) * inside;

    vec3 voidBlack = mix(vec3(0.002, 0.0004, 0.006), vec3(0.001, 0.0001, 0.004), cloneFactor);
    vec3 deepRed = mix(vec3(0.12, 0.002, 0.018), vec3(0.055, 0.0004, 0.014), cloneFactor);
    vec3 bloodRed = mix(vec3(0.73, 0.012, 0.055), vec3(0.39, 0.003, 0.060), cloneFactor);
    vec3 hotRed = mix(vec3(1.0, 0.08, 0.16), vec3(0.64, 0.010, 0.105), cloneFactor);
    vec3 color = mix(voidBlack, deepRed, liquid * 0.82);
    color = mix(color, bloodRed, veins * (0.50 + 0.50 * liquid));
    color *= 0.30 + diffuse * 0.94 + hemisphere * 0.30;
    color *= 1.0 - cavities * lowerOcclusion * 0.72;
    color += hotRed * fresnel * (0.40 + veins * 0.80);

    vec2 coreOffset = q - vec2(-0.13, -0.17);
    float core = 1.0 - smoothstep(0.040, mix(0.090, 0.110, cloneFactor), length(coreOffset));
    float coreHalo = (1.0 - smoothstep(0.07, mix(0.23, 0.27, cloneFactor), length(coreOffset))) * 0.48;
    vec3 coreColor = mix(vec3(1.0, 0.79, 0.83), vec3(0.58, 0.008, 0.095), cloneFactor);
    color += coreColor * core + hotRed * coreHalo;

    float angle = atan(p.y, p.x);
    float innerCount = mix(12.0, 8.0, cloneFactor);
    float outerCount = mix(18.0, 11.0, cloneFactor);
    float innerSegments = smoothstep(0.08, 0.62, sin(angle * innerCount + uTime * 2.4 + uPhase * 7.0));
    float outerSegments = smoothstep(0.10, 0.66, sin(angle * outerCount - uTime * 1.35 - uPhase * 4.0));
    float innerRing = band(radius, 0.785, mix(0.017, 0.024, cloneFactor), 0.013) * (0.38 + 0.62 * innerSegments);
    float outerRing = band(radius, 0.905, mix(0.015, 0.022, cloneFactor), 0.013) * (0.32 + 0.68 * outerSegments);
    float tickCount = mix(30.0, 16.0, cloneFactor);
    float ticks = band(radius, 0.845, mix(0.011, 0.017, cloneFactor), 0.009)
      * step(0.62, fract(angle / TAU * tickCount + uTime * 0.21));
    float spokePhase = abs(fract(angle / TAU * mix(12.0, 8.0, cloneFactor) + 0.5) - 0.5);
    float spokes = (1.0 - smoothstep(0.035, 0.105, spokePhase))
      * smoothstep(0.705, 0.755, radius)
      * (1.0 - smoothstep(0.875, 0.925, radius));
    float fastTicks = band(radius, 0.742, 0.010, 0.010)
      * step(0.72, fract(angle / TAU * mix(24.0, 12.0, cloneFactor) - uTime * 0.34));
    color += mix(vec3(0.86, 0.018, 0.095), vec3(0.42, 0.002, 0.070), cloneFactor) * innerRing * 1.62;
    color += mix(vec3(1.0, 0.10, 0.21), vec3(0.66, 0.008, 0.12), cloneFactor) * outerRing * 1.82;
    color += mix(vec3(1.0, 0.62, 0.68), vec3(0.58, 0.035, 0.13), cloneFactor) * ticks * 1.15;
    color += mix(vec3(0.82, 0.020, 0.13), vec3(0.34, 0.001, 0.07), cloneFactor) * spokes * 1.35;
    color += mix(vec3(1.0, 0.36, 0.45), vec3(0.56, 0.015, 0.12), cloneFactor) * fastTicks * 1.10;

    float scanBand = cloneFactor * step(0.72, fract((q.y + uTime * 0.82 + uPhase) * 8.0));
    float scanCut = cloneFactor * step(0.86, fract((q.y - uTime * 1.16 + uPhase * 0.7) * 4.0));
    color += vec3(0.34, 0.002, 0.065) * scanBand * sphereMask * 0.78;
    color *= 1.0 - scanCut * sphereMask * 0.42;

    float particles = 0.0;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float enabled = step(fi / 6.0, uParticleDensity + 0.02);
      float orbitAngle = uTime * mix(0.78, 1.18, mod(fi, 2.0)) + fi * 1.0472 + uPhase * 9.0;
      vec2 orbit = rotate2d(uPhase + fi * 0.17) * vec2(cos(orbitAngle) * 0.88, sin(orbitAngle) * 0.64);
      float dotMask = 1.0 - smoothstep(0.020, 0.052, length(p - orbit));
      particles += dotMask * enabled * (0.52 + 0.48 * sin(uTime * 6.0 + fi));
    }
    vec3 particleDark = mix(vec3(1.0, 0.10, 0.17), vec3(0.54, 0.006, 0.095), cloneFactor);
    vec3 particleHot = mix(vec3(1.0, 0.72, 0.78), vec3(0.72, 0.035, 0.14), cloneFactor);
    color += mix(particleDark, particleHot, particles) * particles * 1.7;

    float halo = (1.0 - smoothstep(0.70, 1.0, radius)) * smoothstep(1.0, 0.71, radius);
    color += vec3(0.45, 0.002, 0.035) * halo * 0.55;
    color += vec3(0.12, 0.0, 0.12) * fresnel * uChromatic * 0.22;
    float alpha = max(sphereMask * (0.91 + 0.09 * z), max(innerRing, max(outerRing, ticks)));
    alpha = max(alpha, max(spokes * 0.82, fastTicks));
    alpha = max(alpha, min(1.0, particles));
    alpha = max(alpha, halo * 0.34);
    return vec4(color, clamp(alpha, 0.0, 1.0) * uOpacity);
  }

  vec4 shadeTrail(vec2 p) {
    vec2 gradientA;
    float flowA = psrdnoise(
      vec2(p.x * 3.4 - uTime * 3.2, p.y * 2.6 + uPhase * 3.0),
      vec2(0.0),
      uTime * 1.35,
      gradientA
    );
    vec2 gradientB;
    float flowB = psrdnoise(
      vec2(p.x * 7.5 - uTime * 4.2, p.y * 4.1) + gradientA * 0.06,
      vec2(0.0),
      -uTime * 1.8 + uPhase,
      gradientB
    );
    float localAlong = p.x * 0.5 + 0.5;
    float globalAlong = clamp(uProgress + (localAlong - 0.5) * 0.18, 0.0, 1.0);
    float taper = pow(globalAlong, 1.22);
    float tailFade = smoothstep(-0.025, 0.095, globalAlong);
    float firstSegment = 1.0 - smoothstep(0.14, 0.24, uProgress);
    float tailEndpoint = clamp(uVariant, -0.88, -0.18);
    float wedgeT = clamp((p.x + 1.0) / max(0.05, tailEndpoint + 1.0), 0.0, 1.0);
    float wedgeRegion = firstSegment * (1.0 - step(tailEndpoint, p.x));
    tailFade = mix(tailFade, smoothstep(0.0, 0.22, wedgeT), wedgeRegion);
    float localTailPoint = smoothstep(-0.98, -0.42, p.x);
    float segmentJoin = smoothstep(-1.0, -0.86, p.x) * (1.0 - smoothstep(0.90, 1.0, p.x));
    float endMask = segmentJoin * mix(1.0, localTailPoint, firstSegment);
    float widthNoise = flowA * 0.032 + flowB * 0.016;
    float halfWidth = max(0.030, mix(0.055, 0.94, taper) + widthNoise * (1.0 - taper * 0.44));
    float wedgeWidth = mix(0.018, 0.80, pow(wedgeT, 1.28));
    halfWidth = mix(halfWidth, wedgeWidth + widthNoise * 0.12, wedgeRegion);
    float edgeRatio = abs(p.y) / max(0.055, halfWidth);
    float edge = 1.0 - smoothstep(0.82, 1.10, edgeRatio);
    float edgeZone = smoothstep(0.46, 1.03, edgeRatio);
    float fracture = smoothstep(0.48, 0.82, sin(p.x * 27.0 - uTime * 8.0 + flowB * 5.0 + floor(abs(p.y) * 7.0)));
    edge *= 1.0 - edgeZone * fracture * mix(0.82, 0.48, taper);

    float stream = pow(smoothstep(-0.28, 0.78, flowA * 0.58 + flowB * 0.42), 1.65);
    float brightCore = (1.0 - smoothstep(0.030, 0.08 + taper * 0.10, abs(p.y - flowA * 0.032))) * edge;
    float dataDash = step(0.67, fract((p.x - uTime * 2.35) * 9.0 + hash21(vec2(uPhase, floor(p.y * 6.0)))))
      * (1.0 - smoothstep(0.07, 0.29, abs(p.y - flowB * 0.33)))
      * uParticleDensity;
    float outerBand = smoothstep(0.54, 0.91, edgeRatio) * (1.0 - smoothstep(1.00, 1.52, edgeRatio));
    float particleCell = hash21(floor(vec2((p.x - uTime * 1.75) * 22.0, p.y * 13.0)) + uPhase * 11.0);
    float dataParticle = step(0.88, particleCell) * outerBand * uParticleDensity;
    float ember = step(0.945, hash21(floor(vec2((p.x - uTime * 2.3) * 19.0, p.y * 14.0)) + uPhase))
      * (1.0 - smoothstep(0.0, 1.48, edgeRatio)) * uParticleDensity;
    float outerGlow = (1.0 - smoothstep(0.72, 1.48, edgeRatio)) * tailFade * 0.34;

    vec3 color = vec3(0.012, 0.0002, 0.007) * edge * 1.35;
    color += vec3(0.48, 0.003, 0.054) * stream * edge * 1.34;
    color += vec3(1.0, 0.055, 0.145) * brightCore * (0.92 + 0.38 * stream);
    color += vec3(1.0, 0.70, 0.76) * dataDash * 1.05;
    color += vec3(1.0, 0.20, 0.31) * dataParticle * 1.45;
    color += vec3(1.0, 0.12, 0.24) * ember * 1.25;
    color += vec3(0.34, 0.0, 0.055) * outerGlow;
    color += vec3(0.72, 0.006, 0.082) * edge * (1.0 - taper) * 0.48;
    float alpha = edge * endMask * tailFade * (0.60 + 0.54 * stream + 0.54 * brightCore);
    alpha = max(alpha, (dataDash * 0.82 + dataParticle + ember * 0.78) * endMask * tailFade);
    alpha = max(alpha, outerGlow * endMask);
    return vec4(color, clamp(alpha, 0.0, 1.0) * uOpacity);
  }

  vec4 shadeImpact(vec2 p) {
    float progress = clamp(uProgress, 0.0, 1.0);
    float cloneFactor = step(0.5, uVariant);
    float radius = length(p);
    float angle = atan(p.y, p.x);
    vec2 gradient;
    float flow = psrdnoise(
      rotate2d(-uTime * 0.8) * p * 4.2,
      vec2(0.0),
      uTime * 2.1 + uPhase,
      gradient
    );

    float implosionLife = 1.0 - smoothstep(0.17, 0.34, progress);
    float implosionRadius = mix(0.74, 0.13, smoothstep(0.0, 0.28, progress));
    float implosion = band(radius, implosionRadius, 0.035, 0.05) * implosionLife;
    float voidDisk = (1.0 - smoothstep(implosionRadius * 0.82, implosionRadius, radius)) * implosionLife;
    float implosionSpokes = smoothstep(0.54, 0.90, sin(angle * 10.0 + flow * 2.2 - uTime * 3.0))
      * smoothstep(0.05, implosionRadius * 0.45, radius)
      * (1.0 - smoothstep(implosionRadius * 0.52, implosionRadius * 0.92, radius))
      * implosionLife;

    float burstLife = lifeEnvelope(progress, 0.07, 0.48);
    float burstRadius = mix(0.04, 0.31, smoothstep(0.08, 0.42, progress));
    float burst = (1.0 - smoothstep(burstRadius * 0.34, burstRadius, radius)) * burstLife;
    float whiteCore = (1.0 - smoothstep(0.0, mix(0.10, 0.015, progress), radius)) * burstLife;

    float ringLife = lifeEnvelope(clamp((progress - 0.12) / 0.72, 0.0, 1.0), 0.06, 0.76);
    float ringRadiusA = mix(0.16, 0.88, smoothstep(0.10, 0.80, progress));
    float ringRadiusB = mix(0.06, 0.66, smoothstep(0.16, 0.72, progress));
    float ringSegments = 0.30 + 0.70 * smoothstep(0.10, 0.72, sin(angle * 16.0 - uTime * 3.1));
    float ringA = band(radius, ringRadiusA, 0.018, 0.025) * ringLife * ringSegments;
    float ringB = band(radius, ringRadiusB, 0.012, 0.024) * ringLife;

    // Progress clamps at 1.0 after the caller's impact duration. Keep the corrosion state alive at
    // that endpoint; the caller owns the later opacity fade.
    float residualLife = smoothstep(0.28, 0.47, progress);
    float spiralSignal = sin(angle * 5.0 + radius * 21.0 - uTime * 4.6 + flow * 2.5);
    float spiral = pow(smoothstep(0.12, 0.74, spiralSignal), 1.45);
    spiral *= smoothstep(0.055, 0.20, radius) * (1.0 - smoothstep(0.56, 0.93, radius)) * residualLife;
    float corrosionSegments = 0.32 + 0.68 * smoothstep(0.02, 0.74, sin(angle * 13.0 + flow * 1.4 - uTime * 2.1));
    float corrosionRing = band(radius, mix(0.40, 0.73, smoothstep(0.48, 1.0, progress)), 0.022, 0.036)
      * corrosionSegments * residualLife;
    float residualCore = (1.0 - smoothstep(0.035, 0.18, radius))
      * residualLife * (0.72 + 0.28 * sin(uTime * 7.0 + uPhase * 9.0));

    float shard = 0.0;
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      float enabled = step(fi / 8.0, uParticleDensity + 0.02);
      float a = fi * 0.7854 + uPhase * 7.0;
      float travel = mix(0.18, 0.94, smoothstep(0.10, 0.72, progress));
      vec2 shardPos = vec2(cos(a), sin(a)) * travel * (0.72 + 0.24 * hash21(vec2(fi, uPhase)));
      float shardLife = max(ringLife, residualLife * 0.58);
      shard += (1.0 - smoothstep(0.018, 0.055, length(p - shardPos))) * enabled * shardLife;
    }

    vec3 color = vec3(0.002, 0.0002, 0.008) * voidDisk * 1.5;
    color += mix(vec3(0.54, 0.0, 0.068), vec3(0.29, 0.0, 0.052), cloneFactor) * implosion;
    color += mix(vec3(0.76, 0.008, 0.105), vec3(0.43, 0.002, 0.074), cloneFactor) * implosionSpokes * 1.15;
    color += mix(vec3(1.0, 0.045, 0.13), vec3(0.64, 0.006, 0.10), cloneFactor) * burst * 1.4;
    color += mix(vec3(1.0, 0.83, 0.86), vec3(0.58, 0.012, 0.10), cloneFactor) * whiteCore * 1.8;
    color += mix(vec3(1.0, 0.055, 0.17), vec3(0.56, 0.004, 0.10), cloneFactor) * ringA * 1.6;
    color += mix(vec3(0.68, 0.005, 0.16), vec3(0.35, 0.001, 0.09), cloneFactor) * ringB * 1.25;
    color += mix(vec3(0.88, 0.010, 0.13), vec3(0.46, 0.002, 0.08), cloneFactor) * spiral * 1.35;
    color += mix(vec3(1.0, 0.045, 0.17), vec3(0.59, 0.004, 0.11), cloneFactor) * corrosionRing * 1.48;
    color += mix(vec3(1.0, 0.32, 0.40), vec3(0.62, 0.018, 0.12), cloneFactor) * residualCore * 1.05;
    color += mix(vec3(1.0, 0.50, 0.59), vec3(0.54, 0.018, 0.12), cloneFactor) * shard * 1.4;
    float alpha = max(voidDisk * 0.86, max(implosion, max(burst, max(ringA, ringB))));
    alpha = max(alpha, implosionSpokes * 0.82);
    alpha = max(alpha, spiral * 0.86);
    alpha = max(alpha, corrosionRing * 0.94);
    alpha = max(alpha, residualCore * 0.78);
    alpha = max(alpha, shard);
    return vec4(color, clamp(alpha, 0.0, 1.0) * uOpacity);
  }

  vec4 shadeMark(vec2 p) {
    float progress = clamp(uProgress, 0.0, 1.0);
    float envelope = progress < 0.001 ? 1.0 : lifeEnvelope(progress, 0.12, 0.82);
    vec2 eyeP = vec2(p.x, p.y * 2.35);
    float eyeRadius = length(eyeP);
    float angle = atan(eyeP.y, eyeP.x);
    vec2 gradient;
    float flow = psrdnoise(
      eyeP * 4.0 + vec2(uTime * 0.18, -uTime * 0.30),
      vec2(0.0),
      uTime * 1.6 + uPhase,
      gradient
    );
    float brokenRing = band(eyeRadius, 0.70, 0.034, 0.038)
      * (0.30 + 0.70 * smoothstep(0.0, 0.66, sin(angle * 10.0 + uTime * 2.2 + flow)));
    float innerRing = band(eyeRadius, 0.40, 0.022, 0.035)
      * (0.45 + 0.55 * smoothstep(-0.2, 0.75, flow));
    float slit = (1.0 - smoothstep(0.025, 0.075, abs(p.x + flow * 0.025)))
      * (1.0 - smoothstep(0.06, 0.31, abs(p.y)));
    float pupil = 1.0 - smoothstep(0.035, 0.13, length(vec2(p.x * 1.5, p.y)));

    float orbitDots = 0.0;
    for (int i = 0; i < 5; i++) {
      float fi = float(i);
      float enabled = step(fi + 0.5, max(1.0, uPower));
      float a = uTime * (1.1 + fi * 0.07) + fi * 1.2566 + uPhase * 5.0;
      vec2 dotPos = vec2(cos(a) * 0.83, sin(a) * 0.33);
      orbitDots += (1.0 - smoothstep(0.022, 0.060, length(p - dotPos))) * enabled;
    }
    float pulse = 0.72 + 0.28 * sin(uTime * (4.0 + min(uPower, 5.0) * 0.72) + uPhase * 8.0);
    vec3 color = vec3(0.26, 0.001, 0.035) * brokenRing;
    color += vec3(0.88, 0.018, 0.13) * innerRing * pulse;
    color += vec3(1.0, 0.20, 0.30) * slit;
    color += vec3(1.0, 0.78, 0.82) * pupil * 0.88;
    color += vec3(1.0, 0.08, 0.19) * orbitDots * 1.5;
    float alpha = max(brokenRing * 0.86, max(innerRing, max(slit, pupil * 0.82)));
    alpha = max(alpha, orbitDots);
    return vec4(color, clamp(alpha * envelope, 0.0, 1.0) * uOpacity);
  }

  vec4 shadeCloneField(vec2 p) {
    float radius = length(p);
    float angle = atan(p.y, p.x);
    float pulse = 0.78 + 0.22 * sin(uTime * 3.6 + uPhase * 9.0);
    vec2 gradient;
    float flow = psrdnoise(
      rotate2d(uTime * 0.18) * p * 3.5,
      vec2(0.0),
      uTime * 0.86 + uPhase,
      gradient
    );
    float ringA = band(radius, 0.50 + flow * 0.018, 0.012, 0.024)
      * (0.28 + 0.72 * smoothstep(-0.28, 0.64, sin(angle * 4.0 + uTime * 0.72)));
    float ringB = band(radius, 0.76, 0.012, 0.026)
      * (0.28 + 0.72 * smoothstep(0.16, 0.78, sin(angle * 12.0 - uTime * 1.7 + uPhase * 4.0)));
    float ringC = band(radius, 0.92, 0.008, 0.022)
      * (0.24 + 0.76 * smoothstep(0.05, 0.72, sin(angle * 5.0 + uTime * 0.55 + uPhase)));
    float scanY = fract(uTime * 0.42 + uPhase) * 2.0 - 1.0;
    float scan = (1.0 - smoothstep(0.015, 0.080, abs(p.y - scanY)))
      * (1.0 - smoothstep(0.26, 0.86, abs(p.x)))
      * (1.0 - smoothstep(0.80, 0.94, radius));
    float hologram = (1.0 - smoothstep(0.18, 0.88, radius))
      * step(0.64, fract((p.y + uTime * 0.34) * 24.0 + flow * 0.3));

    float motes = 0.0;
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      float enabled = step(fi / 8.0, uParticleDensity + 0.02);
      float lane = hash21(vec2(fi, uPhase)) * 1.6 - 0.8;
      float rise = fract(uTime * (0.12 + fi * 0.006) + fi * 0.173 + uPhase) * 1.8 - 0.9;
      vec2 motePos = vec2(lane, -rise);
      motes += (1.0 - smoothstep(0.014, 0.045, length(p - motePos))) * enabled;
    }

    vec3 color = vec3(0.34, 0.001, 0.055) * ringA;
    color += vec3(0.88, 0.018, 0.15) * ringB * pulse;
    color += vec3(1.0, 0.18, 0.27) * ringC;
    color += vec3(1.0, 0.07, 0.18) * scan * 1.1;
    color += vec3(0.32, 0.0, 0.08) * hologram * 0.40;
    color += vec3(1.0, 0.34, 0.42) * motes * 1.2;
    float alpha = max(ringA * 0.72, max(ringB, ringC));
    alpha = max(alpha, scan * 0.66);
    alpha = max(alpha, hologram * 0.24);
    alpha = max(alpha, motes);
    return vec4(color, clamp(alpha, 0.0, 1.0) * uOpacity);
  }

  vec4 shadeMuzzle(vec2 p) {
    float progress = clamp(uProgress, 0.0, 1.0);
    float cloneFactor = step(0.5, uVariant);
    float envelope = lifeEnvelope(progress, 0.10, 0.72);
    float suck = 1.0 - smoothstep(0.0, 0.30, progress);
    float release = smoothstep(0.20, 0.58, progress);
    float recoil = lifeEnvelope(clamp((progress - 0.42) / 0.58, 0.0, 1.0), 0.12, 0.82);
    float radius = length(p);
    float angle = atan(p.y, p.x);
    vec2 gradient;
    float flow = psrdnoise(
      vec2(p.x * 4.8 - uTime * 2.4, p.y * 3.5),
      vec2(0.0),
      uTime * 1.7 + uPhase,
      gradient
    );
    float intakeRadius = mix(0.84, 0.22, smoothstep(0.0, 0.34, progress));
    float intake = band(radius, intakeRadius, 0.025, 0.040) * suck
      * (0.32 + 0.68 * smoothstep(0.0, 0.72, sin(angle * 14.0 + uTime * 3.0)));
    float core = (1.0 - smoothstep(0.04, mix(0.24, 0.10, progress), radius)) * envelope;
    float beamWidth = mix(0.24, 0.055, max(0.0, p.x));
    float forward = smoothstep(-0.10, 0.10, p.x)
      * (1.0 - smoothstep(0.76, 1.0, p.x))
      * (1.0 - smoothstep(beamWidth, beamWidth + 0.09, abs(p.y - flow * 0.04)))
      * release;
    float recoilRing = band(radius, mix(0.18, 0.78, recoil), 0.018, 0.032) * recoil;
    float dash = step(0.66, fract((p.x - uTime * 2.3) * 9.0 + uPhase))
      * (1.0 - smoothstep(0.08, 0.24, abs(p.y)))
      * forward * uParticleDensity;
    vec3 color = mix(vec3(0.46, 0.0, 0.065), vec3(0.24, 0.0, 0.050), cloneFactor) * intake;
    color += mix(vec3(1.0, 0.055, 0.16), vec3(0.58, 0.005, 0.10), cloneFactor) * core * 1.35;
    color += mix(vec3(1.0, 0.24, 0.33), vec3(0.48, 0.014, 0.11), cloneFactor) * forward * 1.30;
    color += mix(vec3(1.0, 0.76, 0.80), vec3(0.62, 0.035, 0.13), cloneFactor) * dash * 1.25;
    color += mix(vec3(0.70, 0.006, 0.13), vec3(0.38, 0.002, 0.085), cloneFactor) * recoilRing;
    float alpha = max(intake, max(core, max(forward, recoilRing)));
    alpha = max(alpha, dash);
    return vec4(color, clamp(alpha, 0.0, 1.0) * uOpacity);
  }

  vec4 shadeUltimateOrb(vec2 p) {
    float radius = length(p);
    float sphereMask = 1.0 - smoothstep(0.66, 0.73, radius);
    float z = sqrt(max(0.0, 1.0 - dot(p / 0.70, p / 0.70)));
    vec2 gradientA;
    float flowA = psrdnoise(p * 3.1 + vec2(-uTime * 0.42, uTime * 0.18), vec2(0.0), uTime * 1.2 + uPhase, gradientA);
    vec2 gradientB;
    float flowB = psrdnoise(p * 7.2 + gradientA * 0.14, vec2(0.0), -uTime * 1.7 + uPhase * 2.0, gradientB);
    float liquid = smoothstep(-0.48, 0.68, flowA * 0.66 + flowB * 0.34) * sphereMask;
    float veins = pow(smoothstep(0.22, 0.82, abs(flowB + flowA * 0.30)), 2.4) * sphereMask;
    float darkCavity = smoothstep(0.12, 0.86, -flowA) * sphereMask;
    float fresnel = pow(1.0 - z, 2.2) * sphereMask;
    vec3 color = vec3(0.002, 0.0, 0.005) * sphereMask;
    color += vec3(0.15, 0.001, 0.020) * liquid * (0.35 + z * 0.65);
    color += vec3(0.92, 0.016, 0.085) * veins * (0.45 + z * 0.55);
    color *= 1.0 - darkCavity * 0.72;
    color += vec3(0.82, 0.014, 0.095) * fresnel;

    float angle = atan(p.y, p.x);
    float ringA = band(radius, 0.78, 0.014, 0.020) * (0.32 + 0.68 * smoothstep(0.1, 0.78, sin(angle * 18.0 + uTime * 2.2)));
    float ringB = band(radius, 0.91, 0.012, 0.020) * (0.28 + 0.72 * smoothstep(0.0, 0.74, sin(angle * 26.0 - uTime * 1.35)));
    float orbit = 0.0;
    for (int i = 0; i < 6; i++) {
      float fi = float(i);
      float enabled = step(fi / 6.0, uParticleDensity + 0.02);
      float a = uTime * (1.0 + mod(fi, 2.0) * 0.35) + fi * 1.0472 + uPhase * 7.0;
      vec2 point = vec2(cos(a) * 0.90, sin(a) * 0.62);
      orbit += (1.0 - smoothstep(0.018, 0.052, length(p - point))) * enabled;
    }
    color += vec3(0.85, 0.014, 0.10) * ringA * 1.6;
    color += vec3(1.0, 0.06, 0.15) * ringB * 1.8;
    color += vec3(1.0, 0.22, 0.31) * orbit * 1.4;
    float alpha = max(sphereMask * 0.86, max(ringA, max(ringB, orbit)));
    return vec4(color, clamp(alpha, 0.0, 1.0) * uOpacity);
  }

  vec4 shadeUltimateWheel(vec2 p) {
    float radius = length(p);
    vec2 outerP = rotate2d(-uPhase * 2.24) * p;
    vec2 innerP = rotate2d(uPhase * 3.24) * p;
    float outerAngle = atan(outerP.y, outerP.x);
    float innerAngle = atan(innerP.y, innerP.x);
    vec2 gradientA;
    float flowA = psrdnoise(outerP * 3.4, vec2(0.0), uTime * 0.76 + uPhase, gradientA);
    vec2 gradientB;
    float flowB = psrdnoise(innerP * 8.2 + gradientA * 0.12, vec2(0.0), -uTime * 1.42 + uPhase * 2.0, gradientB);
    float absorbed = clamp(uPower, 0.0, 1.0);
    float collapse = clamp(uProgress, 0.0, 1.0);
    float outerSegments = 0.26 + 0.74 * smoothstep(0.02, 0.76, sin(outerAngle * 24.0 + flowA));
    float innerSegments = 0.28 + 0.72 * smoothstep(0.04, 0.74, sin(innerAngle * 16.0 + flowB));
    float outerRing = band(radius, 0.79, 0.010, 0.019) * outerSegments;
    float innerRing = band(radius, 0.50, 0.009, 0.018) * innerSegments;
    float fissures = pow(smoothstep(0.44, 0.88, abs(flowB + sin(outerAngle * 9.0 + radius * 26.0) * 0.32)), 2.7)
      * smoothstep(0.30, 0.46, radius) * (1.0 - smoothstep(0.80, 0.96, radius));
    float flameBand = smoothstep(0.73, 0.86, radius) * (1.0 - smoothstep(0.90, 1.05, radius));
    float flame = flameBand * smoothstep(-0.18, 0.76, flowA + sin(outerAngle * 11.0) * 0.42);
    float blackPulse = (1.0 - smoothstep(0.12, 0.34, radius)) * (0.90 + 0.10 * sin(uTime * 6.8));
    vec3 color = vec3(0.12, 0.001, 0.018) * fissures;
    color += vec3(0.82, 0.010, 0.070) * outerRing * (0.72 + absorbed * 0.62);
    color += vec3(0.58, 0.004, 0.066) * innerRing;
    color += vec3(0.36, 0.001, 0.032) * flame * (0.62 + absorbed * 0.38);
    color += vec3(0.015, 0.0, 0.012) * blackPulse;
    color *= 1.0 + collapse * 0.45;
    float alpha = max(fissures * 0.72, max(outerRing, max(innerRing, flame * 0.72)));
    alpha = max(alpha, blackPulse * 0.22);
    return vec4(color, clamp(alpha, 0.0, 1.0) * uOpacity);
  }

  vec4 shadeUltimateSoul(vec2 p) {
    float progress = clamp(uProgress, 0.0, 1.0);
    float seekVariant = 1.0 - step(0.5, uVariant);
    float possessVariant = step(0.5, uVariant) * (1.0 - step(1.5, uVariant));
    float dissolveVariant = step(1.5, uVariant);
    float intensity = clamp(uPower, 0.0, 1.0);

    vec2 gradientA;
    float flowA = psrdnoise(
      vec2(p.x * 3.25 - uTime * 1.72, p.y * 4.15 + uPhase * 2.7),
      vec2(0.0),
      uTime * 0.92 + uPhase * 5.0,
      gradientA
    );
    vec2 domainWarp = gradientA * mix(0.035, 0.095, uQuality);
    vec2 gradientB;
    float flowB = psrdnoise(
      p * vec2(7.4, 8.8) + domainWarp + vec2(uTime * 0.56, -uTime * 0.78),
      vec2(0.0),
      -uTime * 1.34 + uPhase * 9.0,
      gradientB
    );
    vec2 gradientC;
    float flowC = psrdnoise(
      p * 14.5 + gradientB * 0.045,
      vec2(0.0),
      uTime * 1.78 - uPhase * 3.0,
      gradientC
    );

    // Seek is a stretched, direction-facing spectre. The noisy spine stays dark while the
    // displaced rim and veins carry the readable blood-red motion.
    float along = p.x * 0.5 + 0.5;
    float head = 1.0 - smoothstep(0.12, 0.55, length(vec2((p.x - 0.42) * 1.32, p.y * 1.18)));
    float spineOffset = sin(p.x * 4.6 - uTime * 3.2 + uPhase * 11.0) * 0.075
      + flowA * mix(0.025, 0.065, uQuality);
    float taper = mix(0.055, 0.36, smoothstep(0.0, 0.76, along));
    taper *= 0.86 + head * 0.42;
    float seekDistance = abs(p.y - spineOffset);
    float seekBody = (1.0 - smoothstep(taper * 0.68, taper, seekDistance))
      * smoothstep(-1.03, -0.82, p.x)
      * (1.0 - smoothstep(0.72, 1.02, p.x));
    float seekRim = (1.0 - smoothstep(taper, taper + 0.10, seekDistance)) - seekBody * 0.76;
    float tailTear = smoothstep(0.10, 0.86, flowB + sin(p.x * 18.0 - uTime * 4.4) * 0.23);
    seekBody *= 1.0 - (1.0 - along) * tailTear * 0.72;
    float seekVeins = pow(smoothstep(0.36, 0.84, abs(flowB * 0.76 + flowC * 0.42)), 2.1)
      * seekBody;
    float eye = (1.0 - smoothstep(0.018, 0.060, length(vec2(p.x - 0.51, p.y - spineOffset + 0.025))))
      * seekVariant;

    // Possession coils around the victim instead of looking like another projectile.
    vec2 coilP = rotate2d(-uTime * (1.25 + intensity * 0.72) - uPhase * 3.0) * p;
    float coilRadius = length(coilP);
    float coilAngle = atan(coilP.y, coilP.x);
    float close = smoothstep(0.0, 0.66, progress);
    float shellRadius = mix(0.82, 0.42, close);
    float shell = 1.0 - smoothstep(shellRadius * 0.76, shellRadius, coilRadius);
    float shellEdge = band(coilRadius, shellRadius, 0.028, 0.060);
    float coilSignal = sin(coilAngle * 5.0 + coilRadius * 18.0 - uTime * 5.2 + flowA * 2.4);
    float coils = pow(smoothstep(0.05, 0.76, coilSignal), 1.45)
      * smoothstep(0.08, 0.22, coilRadius)
      * (1.0 - smoothstep(shellRadius * 0.78, shellRadius + 0.08, coilRadius));
    float claws = smoothstep(0.38, 0.84, sin(coilAngle * 9.0 - uTime * 3.4 + flowB * 1.8))
      * band(coilRadius, shellRadius * 0.88, 0.045, 0.075);
    float corePulse = (1.0 - smoothstep(0.055, 0.20, coilRadius))
      * (0.72 + 0.28 * sin(uTime * 8.2 + uPhase * 13.0));

    // Dissolve erases the body from the trailing side and carries its edge into finite dust.
    float dissolveFront = mix(-1.10, 1.18, progress);
    float breakup = flowA * 0.18 + flowB * 0.08;
    float remaining = 1.0 - smoothstep(dissolveFront - 0.18, dissolveFront + 0.12, p.x + breakup);
    float dissolveEdge = band(p.x + breakup, dissolveFront, 0.045, 0.11)
      * (1.0 - smoothstep(0.24, 0.96, abs(p.y)));
    float dustCell = hash21(floor(vec2((p.x + uTime * 0.52) * 18.0, (p.y - uTime * 0.26) * 15.0)) + uPhase * 47.0);
    float dust = step(mix(0.89, 0.75, uParticleDensity), dustCell)
      * (1.0 - smoothstep(0.08, 0.78, abs(p.x - dissolveFront)))
      * (1.0 - smoothstep(0.18, 1.02, abs(p.y)))
      * (1.0 - smoothstep(0.82, 1.0, progress));

    float body = seekBody * seekVariant;
    float rim = seekRim * seekVariant;
    float veins = seekVeins * seekVariant;
    body += shell * possessVariant * 0.82;
    rim += max(shellEdge, claws) * possessVariant;
    veins += coils * possessVariant;

    float dissolveShape = max(seekBody, seekRim * 0.82) * remaining;
    body += dissolveShape * dissolveVariant * 0.86;
    rim += dissolveEdge * dissolveVariant;
    veins += seekVeins * remaining * dissolveVariant;

    vec3 voidColor = vec3(0.0012, 0.0001, 0.0045);
    vec3 abyssColor = vec3(0.020, 0.0002, 0.028);
    vec3 bloodColor = vec3(0.52, 0.003, 0.075);
    vec3 edgeColor = vec3(0.92, 0.018, 0.145);
    vec3 hotColor = vec3(1.0, 0.16, 0.25);
    vec3 color = mix(voidColor, abyssColor, smoothstep(-0.50, 0.56, flowA)) * body * 1.55;
    color += bloodColor * veins * (1.18 + intensity * 0.42);
    color += edgeColor * rim * (0.88 + intensity * 0.38);
    color += vec3(0.32, 0.001, 0.085) * max(0.0, flowC) * body * 0.56;
    color += hotColor * eye * 1.45;
    color += edgeColor * corePulse * possessVariant * 1.22;
    color += vec3(0.68, 0.008, 0.14) * dissolveEdge * dissolveVariant * 1.32;
    color += vec3(0.78, 0.025, 0.18) * dust * dissolveVariant * 1.25;

    float alpha = max(body * 0.90, max(rim * 0.88, veins * 0.78));
    alpha = max(alpha, eye);
    alpha = max(alpha, corePulse * possessVariant * 0.82);
    alpha = max(alpha, dissolveEdge * dissolveVariant);
    alpha = max(alpha, dust * dissolveVariant);
    float phaseEnvelope = mix(1.0, 1.0 - smoothstep(0.84, 1.0, progress), dissolveVariant);
    return vec4(color, clamp(alpha * phaseEnvelope, 0.0, 1.0) * uOpacity);
  }

  void main() {
    vec4 color;
    if (uKind < 0.5) {
      color = shadeOrb(vLocal);
    } else if (uKind < 1.5) {
      color = shadeTrail(vLocal);
    } else if (uKind < 2.5) {
      color = shadeImpact(vLocal);
    } else if (uKind < 3.5) {
      color = shadeMark(vLocal);
    } else if (uKind < 4.5) {
      color = shadeCloneField(vLocal);
    } else if (uKind < 5.5) {
      color = shadeMuzzle(vLocal);
    } else if (uKind < 6.5) {
      color = shadeUltimateOrb(vLocal);
    } else if (uKind < 7.5) {
      color = shadeUltimateWheel(vLocal);
    } else {
      color = shadeUltimateSoul(vLocal);
    }
    if (color.a <= 0.002) discard;
    gl_FragColor = color;
  }
`;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function finiteOr(value, fallback) {
  return Number.isFinite(value) ? value : fallback;
}

function pointXY(point) {
  if (Array.isArray(point)) return [finiteOr(point[0], 0), finiteOr(point[1], 0)];
  return [finiteOr(point && point.x, 0), finiteOr(point && point.y, 0)];
}

function normalizeQuality(value) {
  if (value === 'medium' || value === 'low') return value;
  return 'high';
}

class CorruptGunVfxEngine {
  constructor(options = {}) {
    this.version = VERSION;
    this.width = Math.max(1, finiteOr(options.width, 1280));
    this.height = Math.max(1, finiteOr(options.height, 720));
    this.deviceDpr = clamp(finiteOr(options.dpr, globalThis.devicePixelRatio || 1), 0.5, 3);
    this.quality = normalizeQuality(options.quality);
    this.profile = QUALITY_PROFILES[this.quality];
    this.time = 0;
    this.layers = new Map();
    this.available = false;
    this.destroyed = false;
    this.mode = 'initializing';
    this.fallbackReason = null;
    this.lastError = null;
    this.contextLossCount = 0;
    this.drawCalls = 0;
    this.droppedDrawCalls = 0;
    this._onStatus = typeof options.onStatus === 'function' ? options.onStatus : null;
    this._canvasFactory = typeof options.canvasFactory === 'function' ? options.canvasFactory : null;
    this._loggedErrors = new Set();

    if (this.quality === 'low') {
      this.mode = 'fallback';
      this.fallbackReason = 'quality-low';
      this._emitStatus();
      return;
    }

    try {
      for (const name of LAYER_NAMES) this.layers.set(name, this._createLayer(name));
      this.available = true;
      this.mode = 'webgl';
      this._emitStatus();
    } catch (error) {
      this._fail('initialization-failed', error);
      this._disposeLayers();
    }
  }

  _makeCanvas() {
    if (this._canvasFactory) return this._canvasFactory();
    if (!globalThis.document || typeof globalThis.document.createElement !== 'function') {
      throw new Error('CgVfxEngine needs a browser canvas factory');
    }
    const canvas = globalThis.document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.dataset.cgVfxOffscreen = 'true';
    return canvas;
  }

  _createLayer(name) {
    const canvas = this._makeCanvas();
    const effectiveDpr = this._effectiveDpr();
    const renderer = new Renderer({
      canvas,
      width: this.width,
      height: this.height,
      dpr: effectiveDpr,
      alpha: true,
      depth: false,
      stencil: false,
      antialias: this.quality === 'high',
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      autoClear: false,
      webgl: 1,
    });
    const gl = renderer.gl;
    if (!gl) throw new Error(`WebGL unavailable for ${name} layer`);
    gl.clearColor(0, 0, 0, 0);

    const geometry = new Geometry(gl, {
      position: {
        size: 2,
        data: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      },
    });
    const uniforms = {
      uResolution: { value: new Float32Array([this.width, this.height]) },
      uCenter: { value: new Float32Array([0, 0]) },
      uSize: { value: new Float32Array([1, 1]) },
      uRotation: { value: 0 },
      uKind: { value: 0 },
      uTime: { value: 0 },
      uPhase: { value: 0 },
      uProgress: { value: 0 },
      uPower: { value: 1 },
      uVariant: { value: 0 },
      uOpacity: { value: 1 },
      uQuality: { value: this.profile.shaderDetail },
      uParticleDensity: { value: this.profile.particleDensity },
      uChromatic: { value: this.profile.chromatic },
    };
    const program = new Program(gl, {
      vertex: VERTEX_SHADER,
      fragment: FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      cullFace: null,
      depthTest: false,
      depthWrite: false,
    });
    if (!gl.getProgramParameter(program.program, gl.LINK_STATUS)) {
      throw new Error(`Corrupt Gun shader link failed for ${name} layer`);
    }
    const mesh = new Mesh(gl, {
      geometry,
      program,
      mode: gl.TRIANGLE_STRIP,
      frustumCulled: false,
    });
    const layer = {
      name,
      canvas,
      renderer,
      gl,
      geometry,
      program,
      uniforms,
      mesh,
      lost: false,
      onLost: null,
      onRestored: null,
    };

    layer.onLost = (event) => {
      event.preventDefault();
      if (this.destroyed || layer.lost) return;
      layer.lost = true;
      this.contextLossCount += 1;
      this._fail('context-lost', new Error(`Corrupt Gun WebGL ${name} context lost`));
    };
    layer.onRestored = () => {
      if (this.destroyed) return;
      this._rebuildLayer(name);
    };
    canvas.addEventListener('webglcontextlost', layer.onLost, false);
    canvas.addEventListener('webglcontextrestored', layer.onRestored, false);
    this._clearLayer(layer);
    return layer;
  }

  _effectiveDpr() {
    return Math.max(0.5, Math.min(this.deviceDpr, this.profile.maxDpr) * this.profile.renderScale);
  }

  _clearLayer(layer) {
    if (!layer || layer.lost || layer.gl.isContextLost()) return;
    layer.renderer.bindFramebuffer();
    layer.renderer.setViewport(layer.canvas.width, layer.canvas.height);
    layer.gl.clearColor(0, 0, 0, 0);
    layer.gl.clear(layer.gl.COLOR_BUFFER_BIT);
  }

  _rebuildLayer(name) {
    try {
      const oldLayer = this.layers.get(name);
      // Resources from a restored context are already invalidated by WebGL.
      // Detach listeners without issuing delete calls against stale handles.
      this._disposeLayer(oldLayer, { deleteResources: false, loseContext: false });
      this.layers.set(name, this._createLayer(name));
      const allReady = LAYER_NAMES.every((layerName) => {
        const layer = this.layers.get(layerName);
        return layer && !layer.lost;
      });
      this.available = allReady && this.quality !== 'low';
      this.mode = this.available ? 'webgl' : 'fallback';
      this.fallbackReason = this.available ? null : 'context-restore-incomplete';
      this.lastError = this.available ? null : this.lastError;
      this._emitStatus();
    } catch (error) {
      this._fail('context-restore-failed', error);
    }
  }

  _fail(reason, error) {
    this.available = false;
    this.mode = 'fallback';
    this.fallbackReason = reason;
    this.lastError = error instanceof Error ? error.message : String(error);
    if (!this._loggedErrors.has(reason)) {
      this._loggedErrors.add(reason);
      console.error(`[CgVfxEngine] ${reason}: ${this.lastError}`);
    }
    this._emitStatus();
  }

  _emitStatus() {
    if (this._onStatus) this._onStatus(this.getStatus());
  }

  _disposeLayer(layer, { deleteResources = true, loseContext = true } = {}) {
    if (!layer) return;
    if (layer.canvas && layer.onLost) layer.canvas.removeEventListener('webglcontextlost', layer.onLost, false);
    if (layer.canvas && layer.onRestored) layer.canvas.removeEventListener('webglcontextrestored', layer.onRestored, false);
    try {
      if (deleteResources && layer.geometry) layer.geometry.remove();
      if (deleteResources && layer.program) layer.program.remove();
      const extension = layer.gl && layer.gl.getExtension('WEBGL_lose_context');
      if (loseContext && extension && !layer.gl.isContextLost()) extension.loseContext();
    } catch (_) {
      // Context disposal must not hide the original initialization/loss error.
    }
  }

  _disposeLayers() {
    for (const layer of this.layers.values()) this._disposeLayer(layer);
    this.layers.clear();
  }

  setQuality(quality) {
    const next = normalizeQuality(quality);
    if (next === this.quality) return this.getStatus();
    this.quality = next;
    this.profile = QUALITY_PROFILES[next];
    if (next === 'low') {
      this.available = false;
      this.mode = 'fallback';
      this.fallbackReason = 'quality-low';
      this._emitStatus();
      return this.getStatus();
    }

    try {
      if (this.layers.size !== LAYER_NAMES.length) {
        this._disposeLayers();
        for (const name of LAYER_NAMES) this.layers.set(name, this._createLayer(name));
      }
      const effectiveDpr = this._effectiveDpr();
      for (const layer of this.layers.values()) {
        layer.renderer.dpr = effectiveDpr;
        layer.renderer.setSize(this.width, this.height);
        layer.uniforms.uQuality.value = this.profile.shaderDetail;
        layer.uniforms.uParticleDensity.value = this.profile.particleDensity;
        layer.uniforms.uChromatic.value = this.profile.chromatic;
      }
      this.available = true;
      this.mode = 'webgl';
      this.fallbackReason = null;
      this.lastError = null;
      this._emitStatus();
    } catch (error) {
      this._fail('quality-switch-failed', error);
    }
    return this.getStatus();
  }

  resize(width, height, dpr = this.deviceDpr) {
    this.width = Math.max(1, finiteOr(width, this.width));
    this.height = Math.max(1, finiteOr(height, this.height));
    this.deviceDpr = clamp(finiteOr(dpr, this.deviceDpr), 0.5, 3);
    if (this.quality === 'low') return false;
    const effectiveDpr = this._effectiveDpr();
    for (const layer of this.layers.values()) {
      layer.renderer.dpr = effectiveDpr;
      layer.renderer.setSize(this.width, this.height);
      layer.uniforms.uResolution.value[0] = this.width;
      layer.uniforms.uResolution.value[1] = this.height;
    }
    return true;
  }

  beginFrame(frameOrWidth = {}, height, time, quality) {
    let frame;
    if (typeof frameOrWidth === 'number') {
      frame = { width: frameOrWidth, height, time, quality };
    } else {
      frame = frameOrWidth || {};
    }
    if (frame.quality && frame.quality !== this.quality) this.setQuality(frame.quality);
    if (Number.isFinite(frame.width) || Number.isFinite(frame.height) || Number.isFinite(frame.dpr)) {
      this.resize(
        finiteOr(frame.width, this.width),
        finiteOr(frame.height, this.height),
        finiteOr(frame.dpr, this.deviceDpr),
      );
    }
    this.time = finiteOr(frame.time, this.time);
    this.drawCalls = 0;
    this.droppedDrawCalls = 0;
    if (!this.available || this.destroyed) return false;
    for (const layer of this.layers.values()) this._clearLayer(layer);
    return true;
  }

  clear(layerName) {
    if (layerName) {
      this._clearLayer(this.layers.get(layerName));
      return;
    }
    for (const layer of this.layers.values()) this._clearLayer(layer);
  }

  _drawPrimitive(layerName, kind, options) {
    if (!this.available || this.destroyed) return false;
    if (this.drawCalls >= this.profile.maxDrawCalls) {
      this.droppedDrawCalls += 1;
      return false;
    }
    const layer = this.layers.get(layerName) || this.layers.get('front');
    if (!layer || layer.lost || layer.gl.isContextLost()) return false;
    const center = options.center || [options.x, options.y];
    const size = options.size || [options.width, options.height];
    const cx = finiteOr(center[0], this.width * 0.5);
    const cy = finiteOr(center[1], this.height * 0.5);
    const sx = Math.max(0.5, finiteOr(size[0], 64));
    const sy = Math.max(0.5, finiteOr(size[1], sx));
    const uniforms = layer.uniforms;
    uniforms.uCenter.value[0] = cx;
    uniforms.uCenter.value[1] = cy;
    uniforms.uSize.value[0] = sx;
    uniforms.uSize.value[1] = sy;
    uniforms.uRotation.value = finiteOr(options.rotation, 0);
    uniforms.uKind.value = kind;
    uniforms.uTime.value = finiteOr(options.time, this.time);
    uniforms.uPhase.value = finiteOr(options.phase, 0);
    uniforms.uProgress.value = clamp(finiteOr(options.progress, 0), 0, 1);
    uniforms.uPower.value = Math.max(0, finiteOr(options.power, 1));
    uniforms.uVariant.value = finiteOr(options.variant, 0);
    uniforms.uOpacity.value = clamp(finiteOr(options.opacity, 1), 0, 1);
    try {
      layer.renderer.render({
        scene: layer.mesh,
        clear: false,
        update: false,
        sort: false,
        frustumCull: false,
      });
      this.drawCalls += 1;
      return true;
    } catch (error) {
      this._fail('draw-failed', error);
      return false;
    }
  }

  drawOrb(options = {}) {
    const diameter = Math.max(1, finiteOr(options.diameter, finiteOr(options.size, 82)));
    return this._drawPrimitive(options.layer || 'front', EFFECT_KIND.orb, {
      ...options,
      center: [finiteOr(options.x, 0), finiteOr(options.y, 0)],
      size: [diameter, diameter],
      phase: finiteOr(options.phase, finiteOr(options.seed, 0) * 0.6180339),
      power: finiteOr(options.power, options.variant === 'clone' ? 0.72 : 1),
      variant: options.variant === 'clone' ? 1 : options.variant === 'over' ? 2 : 0,
    });
  }

  drawTrail(options = {}) {
    const points = Array.isArray(options.points) ? options.points : [];
    if (points.length < 2) return false;
    const tailWidth = Math.max(1, finiteOr(options.tailWidth, finiteOr(options.width, 5) * 0.34));
    const headWidth = Math.max(tailWidth, finiteOr(options.headWidth, finiteOr(options.width, 18)));
    let drew = false;
    for (let index = 0; index < points.length - 1; index += 1) {
      const a = pointXY(points[index]);
      const b = pointXY(points[index + 1]);
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const length = Math.hypot(dx, dy);
      if (length < 0.5) continue;
      const t = (index + 0.5) / (points.length - 1);
      const segmentWidth = tailWidth + (headWidth - tailWidth) * t;
      drew = this._drawPrimitive(options.layer || 'back', EFFECT_KIND.trail, {
        ...options,
        center: [(a[0] + b[0]) * 0.5, (a[1] + b[1]) * 0.5],
        size: [length + headWidth * 0.62, Math.max(segmentWidth * 2.1, headWidth * 1.48)],
        rotation: Math.atan2(dy, dx),
        phase: finiteOr(options.phase, finiteOr(options.seed, 0) * 0.754877) + index * 0.173,
        progress: t,
        variant: -length / (length + headWidth * 0.62),
        opacity: finiteOr(options.opacity, 1) * (0.84 + 0.16 * t),
      }) || drew;
    }
    return drew;
  }

  drawImpact(options = {}) {
    const diameter = Math.max(1, finiteOr(options.diameter, finiteOr(options.size, 124)));
    const duration = Math.max(1, finiteOr(options.duration, 380));
    const elapsed = finiteOr(options.elapsed, finiteOr(options.progress, 0) * duration);
    return this._drawPrimitive(options.layer || 'front', EFFECT_KIND.impact, {
      ...options,
      center: [finiteOr(options.x, 0), finiteOr(options.y, 0)],
      size: [diameter, diameter],
      progress: clamp(elapsed / duration, 0, 1),
      phase: finiteOr(options.phase, finiteOr(options.seed, 0) * 0.56984),
      variant: options.variant === 'clone' ? 1 : 0,
    });
  }

  drawMark(options = {}) {
    const width = Math.max(1, finiteOr(options.width, finiteOr(options.size, 58)));
    const height = Math.max(1, finiteOr(options.height, width * 0.72));
    return this._drawPrimitive(options.layer || 'front', EFFECT_KIND.mark, {
      ...options,
      center: [finiteOr(options.x, 0), finiteOr(options.y, 0)],
      size: [width, height],
      progress: options.expiring ? clamp(finiteOr(options.progress, 0), 0, 1) : 0,
      power: clamp(finiteOr(options.stacks, finiteOr(options.power, 1)), 1, 5),
      phase: finiteOr(options.phase, finiteOr(options.seed, 0) * 0.43829),
    });
  }

  drawCloneField(options = {}) {
    const diameter = Math.max(1, finiteOr(options.diameter, finiteOr(options.size, 132)));
    return this._drawPrimitive(options.layer || 'back', EFFECT_KIND.cloneField, {
      ...options,
      center: [finiteOr(options.x, 0), finiteOr(options.y, 0)],
      size: [diameter, diameter],
      phase: finiteOr(options.phase, finiteOr(options.slot, 0) * 0.271828),
    });
  }

  drawMuzzle(options = {}) {
    const length = Math.max(1, finiteOr(options.length, options.over ? 118 : 96));
    const width = Math.max(1, finiteOr(options.width, options.over ? 78 : 64));
    const duration = Math.max(1, finiteOr(options.duration, 140));
    const elapsed = finiteOr(options.elapsed, finiteOr(options.progress, 0) * duration);
    return this._drawPrimitive(options.layer || 'front', EFFECT_KIND.muzzle, {
      ...options,
      center: [finiteOr(options.x, 0), finiteOr(options.y, 0)],
      size: [length, width],
      rotation: finiteOr(options.rotation, finiteOr(options.angle, -Math.PI * 0.5)),
      progress: clamp(elapsed / duration, 0, 1),
      phase: finiteOr(options.phase, finiteOr(options.seed, 0) * 0.693147),
      variant: options.variant === 'clone' ? 1 : 0,
    });
  }

  drawUltimateOrb(options = {}) {
    const diameter = Math.max(1, finiteOr(options.diameter, finiteOr(options.size, 108)));
    return this._drawPrimitive(options.layer || 'front', EFFECT_KIND.ultimateOrb, {
      ...options,
      center: [finiteOr(options.x, 0), finiteOr(options.y, 0)],
      size: [diameter, diameter],
      phase: finiteOr(options.phase, finiteOr(options.seed, 0) * 0.6180339),
      power: clamp(finiteOr(options.power, 1), 0, 1.5),
    });
  }

  drawUltimateWheel(options = {}) {
    const diameter = Math.max(1, finiteOr(options.diameter, finiteOr(options.size, 496)));
    return this._drawPrimitive(options.layer || 'front', EFFECT_KIND.ultimateWheel, {
      ...options,
      center: [finiteOr(options.x, 0), finiteOr(options.y, 0)],
      size: [diameter, diameter],
      phase: finiteOr(options.phase, 0),
      power: clamp(finiteOr(options.absorbed, finiteOr(options.power, 0)), 0, 1),
      progress: clamp(finiteOr(options.collapse, finiteOr(options.progress, 0)), 0, 1),
    });
  }

  drawUltimateSoul(options = {}) {
    const variant = options.variant === 'possess' || options.variant === 1
      ? 1
      : options.variant === 'dissolve' || options.variant === 2
        ? 2
        : 0;
    const defaultWidth = variant === 1 ? 156 : 188;
    const defaultHeight = variant === 1 ? 156 : 112;
    const width = Math.max(1, finiteOr(options.width, finiteOr(options.size, defaultWidth)));
    const height = Math.max(1, finiteOr(options.height, variant === 1 ? width : defaultHeight));
    return this._drawPrimitive(options.layer || 'front', EFFECT_KIND.ultimateSoul, {
      ...options,
      center: [finiteOr(options.x, 0), finiteOr(options.y, 0)],
      size: [width, height],
      rotation: finiteOr(options.rotation, finiteOr(options.angle, 0)),
      phase: finiteOr(options.phase, finiteOr(options.seed, 0) * 0.41421356),
      progress: clamp(finiteOr(options.progress, 0), 0, 1),
      power: clamp(finiteOr(options.power, 1), 0, 1),
      variant,
    });
  }

  compositeTo(context, layerName = 'back', options = {}) {
    const layer = this.layers.get(layerName);
    if (!this.available || !layer || !context || typeof context.drawImage !== 'function') return false;
    context.save();
    context.globalAlpha = clamp(finiteOr(options.opacity, 1), 0, 1);
    context.globalCompositeOperation = options.compositeOperation || 'source-over';
    context.drawImage(layer.canvas, 0, 0, this.width, this.height);
    context.restore();
    return true;
  }

  getCanvas(layerName = 'back') {
    const layer = this.layers.get(layerName);
    return layer ? layer.canvas : null;
  }

  endFrame() {
    return {
      back: this.getCanvas('back'),
      front: this.getCanvas('front'),
      drawCalls: this.drawCalls,
      droppedDrawCalls: this.droppedDrawCalls,
      status: this.getStatus(),
    };
  }

  getStatus() {
    const layerStatus = {};
    for (const name of LAYER_NAMES) {
      const layer = this.layers.get(name);
      layerStatus[name] = {
        ready: Boolean(layer && !layer.lost),
        width: layer ? layer.canvas.width : 0,
        height: layer ? layer.canvas.height : 0,
      };
    }
    return {
      version: VERSION,
      mode: this.mode,
      available: this.available,
      quality: this.quality,
      renderScale: this.profile.renderScale,
      fallbackReason: this.fallbackReason,
      lastError: this.lastError,
      contextLossCount: this.contextLossCount,
      drawCalls: this.drawCalls,
      droppedDrawCalls: this.droppedDrawCalls,
      maxDrawCalls: this.profile.maxDrawCalls,
      layers: layerStatus,
    };
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.available = false;
    this.mode = 'destroyed';
    this._disposeLayers();
    this._emitStatus();
  }
}

function isSupported() {
  if (!globalThis.document || typeof globalThis.document.createElement !== 'function') return false;
  try {
    const canvas = globalThis.document.createElement('canvas');
    const gl = canvas.getContext('webgl', { alpha: true });
    if (!gl) return false;
    const extension = gl.getExtension('WEBGL_lose_context');
    if (extension) extension.loseContext();
    return true;
  } catch (_) {
    return false;
  }
}

const CgVfxEngine = Object.freeze({
  VERSION,
  EFFECT_KIND,
  QUALITY_PROFILES,
  create(options) {
    return new CorruptGunVfxEngine(options);
  },
  isSupported,
});

globalThis.CgVfxEngine = CgVfxEngine;

export { CgVfxEngine, CorruptGunVfxEngine, EFFECT_KIND, QUALITY_PROFILES, VERSION };
