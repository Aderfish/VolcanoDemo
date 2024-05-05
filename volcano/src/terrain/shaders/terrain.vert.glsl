attribute vec3 position;
attribute vec3 normal;

varying float v2f_height;

/* #TODO PG1.6.1: Copy Blinn-Phong shader setup from previous exercises */
varying vec3 v2f_dir_from_view;
varying vec3 v2f_dir_to_light;
varying vec3 v2f_normal;
varying vec2 v2f_uv;
varying float v2f_water_tex_scale;
varying float v2f_volcano_h;
varying vec3 v2f_water_col_dark;
varying vec3 v2f_water_col_light;

uniform mat4 mat_mvp;
uniform mat4 mat_model_view;
uniform mat3 mat_normals; // mat3 not 4, because normals are only rotated and not translated
uniform float water_tex_scale;
uniform float volcano_h;
uniform vec3 water_col_dark;
uniform vec3 water_col_light;

uniform vec4 light_position; // in camera space coordinates already
void main()
{
    v2f_height = position.z;
	v2f_uv = position.xy;
	v2f_water_tex_scale = water_tex_scale;
	v2f_volcano_h = volcano_h;
	v2f_water_col_dark = water_col_dark;
	v2f_water_col_light = water_col_light;
	
    vec4 position_v4 = vec4(position, 1);

  /** 
	Setup all outgoing variables so that you can compute in the fragment shader
  the phong lighting. You will need to setup all the uniforms listed above, before you
  can start coding this shader.

  Hint: Compute the vertex position, normal and light_position in eye space.
  Hint: Write the final vertex position to gl_Position
  */

	// Setup Blinn-Phong varying variables
	vec4 vertex_position_in_view = mat_model_view * position_v4;
	v2f_dir_from_view = normalize(-vertex_position_in_view.xyz);
	// direction to light source
	v2f_dir_to_light = normalize(light_position.xyz - vertex_position_in_view.xyz);
	// transform normal to camera coordinates
	v2f_normal = normalize(mat_normals * normal);
	

	gl_Position = mat_mvp * position_v4;
}
