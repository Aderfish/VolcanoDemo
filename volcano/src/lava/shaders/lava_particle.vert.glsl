attribute vec3 position;
attribute vec3 normal;

uniform vec3 particle_position;
uniform float particle_radius;

varying vec3 v2f_dir_from_view;
varying vec3 v2f_dir_to_light;
varying vec3 v2f_normal;


uniform mat4 mat_mvp;
uniform mat3 mat_normals;

uniform vec4 light_position;

void main() {

  vec4 position_v4 = vec4((particle_radius * position) + particle_position, 1);

  vec4 vertex_position_in_view = mat_mvp * position_v4;
  v2f_dir_from_view = normalize(-vertex_position_in_view.xyz);

  // direction to light source
  v2f_dir_to_light = normalize(light_position.xyz - vertex_position_in_view.xyz);

  // transform normal to view space
  v2f_normal = normalize(mat_normals * normal);


  gl_Position = mat_mvp * position_v4;
}