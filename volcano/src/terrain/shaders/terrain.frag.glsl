precision highp float;

varying float v2f_height;

/* Blinn-Phong shader setup from previous exercises */
varying vec3 v2f_dir_from_view;
varying vec3 v2f_dir_to_light;
varying vec3 v2f_normal;


const vec3  light_color = vec3(1.0, 0.941, 0.898);
// Small perturbation to prevent "z-fighting" on the water on some machines...
const float terrain_water_level    = -0.03125 + 1e-6;
const vec3  terrain_color_water    = vec3(0.29, 0.51, 0.62);
const vec3  terrain_color_mountain = vec3(0.8, 0.5, 0.4);
const vec3  terrain_color_grass    = vec3(0.33, 0.43, 0.18);

void main()
{
	float material_ambient = 0.1; // Ambient light coefficient
	float height = v2f_height;

	/* 
	Compute the terrain color ("material") and shininess based on the height as
	described in the handout. `v2f_height` may be useful.
	
	Water:
			color = terrain_color_water
			shininess = 30.
	Ground:
			color = interpolate between terrain_color_grass and terrain_color_mountain, weight is (height - terrain_water_level)*2
	 		shininess = 2.
	*/
	vec3 material_color = terrain_color_water;
	float shininess = 30.0;

	if(height > terrain_water_level){
		shininess = 2.0;
		float weight = 2. * (height - terrain_water_level);
		material_color = weight * terrain_color_mountain + (1.-weight) * terrain_color_grass;
	}

	/* apply the Blinn-Phong lighting model*/

	vec3 normal = normalize(v2f_normal);
	vec3 direction_to_light = normalize(v2f_dir_to_light);
	vec3 direction_to_camera = normalize(v2f_dir_from_view);

	vec3 halfway = normalize(direction_to_camera + direction_to_light);

	vec3 mat_ambient = material_color * light_color * material_ambient;

	vec3 color = mat_ambient;

	if(dot(direction_to_light, normal) > 0.){
		color += material_color * light_color * dot(normal, direction_to_light);
	}

	if(dot(normal, direction_to_light) > 0. && dot(halfway, normal) > 0.){
		color += material_color * light_color * pow(dot(halfway, normal), shininess);
	}

	gl_FragColor = vec4(color, 1.); // output: RGBA in 0..1 range

}
