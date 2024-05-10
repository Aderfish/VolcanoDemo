precision mediump float;

uniform vec3 particle_position;
uniform float particle_radius;
uniform float particle_temperature;

varying vec3 v2f_dir_from_view;
varying vec3 v2f_dir_to_light;
varying vec3 v2f_normal;


uniform vec4 light_position;


const vec3 light_color = vec3(1.0, 1.0, 1.0);


const float hot_lava_temp = 1200.0 + 273.15;
const float middle_lava_temp = 1100.0 + 273.15;
const float cold_lava_temp = 900.0 + 273.15;

const vec3 lava_hot_color = vec3(1.0, 1.0, 0.0);
const vec3 lava_middle_color = vec3(0.8, 0.0, 0.0);
const vec3 lava_cold_color = vec3(0.13);


void main(){
  float material_ambient_factor = 0.1;
	float shininess = 30.0;

  vec3 material_color = vec3(0.0);

  if(particle_temperature < middle_lava_temp){
    material_color = mix(lava_cold_color, lava_middle_color, clamp((particle_temperature - cold_lava_temp) / (middle_lava_temp - cold_lava_temp), 0.0, 1.0));
  }
  else {
    material_color = mix(lava_middle_color, lava_hot_color, clamp((particle_temperature - middle_lava_temp) / (hot_lava_temp - middle_lava_temp), 0.0, 1.0));
  }


  vec3 normal = normalize(v2f_normal);
  vec3 direction_to_light = normalize(v2f_dir_to_light);
  vec3 direction_from_ccamera = normalize(v2f_dir_from_view);

  vec3 halfway = normalize(direction_to_light + direction_from_ccamera);

  vec3 mat_ambient = material_color * light_color * material_ambient_factor;

  vec3 color = mat_ambient;


	if(dot(direction_to_light, normal) > 0.){
		color += material_color * light_color * dot(normal, direction_to_light);
	}

	if(dot(normal, direction_to_light) > 0. && dot(halfway, normal) > 0.){
		color += material_color * light_color * pow(dot(halfway, normal), shininess);
	}

  gl_FragColor = vec4(color, 1.0);
}