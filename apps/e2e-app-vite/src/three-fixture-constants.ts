export const THREE_AMBIENT_LIGHT_INTENSITY = 1.5;
export const THREE_BOX_SIZE_UNITS = 1.4;
export const THREE_CAMERA_FOV_DEGREES = 45;
export const THREE_CAMERA_POSITION_Z_UNITS = 5;
export const THREE_DEVICE_PIXEL_RATIO = 1;
export const THREE_DIRECTIONAL_LIGHT_INTENSITY = 2;
export const THREE_DIRECTIONAL_LIGHT_POSITION = [3, 4, 5] satisfies [number, number, number];
export const THREE_LEFT_BOX_POSITION = [-1.1, 0, 0] satisfies [number, number, number];
export const THREE_RIGHT_BOX_POSITION = [1.1, 0, 0] satisfies [number, number, number];
export const THREE_SHADER_POINT_COLOR = "#c084fc";
export const THREE_SHADER_POINT_FRAGMENT_SHADER = `
uniform vec3 uColor;

void main() {
  if (distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;
  gl_FragColor = vec4(uColor, 1.0);
}
`;
export const THREE_SHADER_POINT_POSITION = [0, 0, 0] satisfies [number, number, number];
export const THREE_SHADER_POINT_SIZE_PX = 64;
export const THREE_SHADER_POINT_VERTEX_SHADER = `
uniform float uPointSize;

void main() {
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uPointSize;
}
`;
