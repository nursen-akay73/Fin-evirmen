precision mediump float;

uniform sampler2D uMap;
uniform float uTime;
uniform float uBurn;
uniform float uEdge;
uniform float uOpacity;
uniform float uBlur;
uniform vec3 uGold;

varying vec2 vUv;
varying float vFresnel;

void main() {
  vec2 uv = vUv;
  vec4 tex = texture2D(uMap, uv);
  if (uBlur > 0.0004) {
    vec2 o = vec2(uBlur, uBlur * 1.35);
    tex = (tex +
      texture2D(uMap, uv + vec2(o.x, 0.0)) +
      texture2D(uMap, uv - vec2(o.x, 0.0)) +
      texture2D(uMap, uv + vec2(0.0, o.y)) +
      texture2D(uMap, uv - vec2(0.0, o.y))) * 0.2;
  }
  if (tex.a < 0.08) {
    discard;
  }

  vec3 paper = tex.rgb * (0.78 + vFresnel * 0.1);
  paper = mix(paper, vec3(0.05, 0.08, 0.14), 0.22);
  gl_FragColor = vec4(paper, tex.a * uOpacity);
}
