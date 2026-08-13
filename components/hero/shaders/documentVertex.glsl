varying vec2 vUv;
varying float vFresnel;

void main() {
  vUv = uv;
  vec3 p = position;
  p.z += sin(uv.x * 3.14159) * 0.035 * (0.35 + uv.y);
  vec4 world = modelViewMatrix * vec4(p, 1.0);
  vec3 viewDir = normalize(-world.xyz);
  vFresnel = pow(1.0 - max(dot(viewDir, vec3(0.0, 0.0, 1.0)), 0.0), 2.2);
  gl_Position = projectionMatrix * world;
}
