precision highp float;

uniform float particle_temperature;
uniform vec3 particle_position;
uniform float seed;

varying vec3 v2f_dir_from_view;
varying vec3 v2f_dir_to_light;
varying vec3 v2f_normal;

varying vec2 v2f_tex_coords;


const vec3 light_color = vec3(1.0, 1.0, 1.0);

// ==============================================================
// "Rock" texture: Cellular noise (Voronoi)

//Generate a random number within [0,1] with a vec2
float rand(vec2 v) {
    return fract(sin(dot(v + vec2(-5.194756, 28.374658), vec2(8.3748, 80.37263))) * 743628.43792);
}

vec2 rand2(vec2 v) {
    return vec2(
        rand(v * vec2(1238.34782, 9834.23478) + vec2(23784.0, 9264.0)), 
        rand(v * vec2(5782.3478, 23874.456) + vec2(6427.38487, 7264.23748)));
}

#define NUM_GRADIENTS 12

// -- Gradient table --
vec2 gradients(int i) {
	if (i ==  0) return vec2( 1,  1);
	if (i ==  1) return vec2(-1,  1);
	if (i ==  2) return vec2( 1, -1);
	if (i ==  3) return vec2(-1, -1);
	if (i ==  4) return vec2( 1,  0);
	if (i ==  5) return vec2(-1,  0);
	if (i ==  6) return vec2( 1,  0);
	if (i ==  7) return vec2(-1,  0);
	if (i ==  8) return vec2( 0,  1);
	if (i ==  9) return vec2( 0, -1);
	if (i == 10) return vec2( 0,  1);
	if (i == 11) return vec2( 0, -1);
	return vec2(0, 0);
}

float hash_poly(float x) {
	return mod(((x*34.0)+1.0)*x, 289.0);
}

int hash_func(vec2 grid_point) {
	return int(mod(hash_poly(hash_poly(grid_point.x) + grid_point.y), float(NUM_GRADIENTS)));
}

float blending_weight_poly(float t) {
	return t*t*t*(t*(t*6.0 - 15.0)+10.0);
}

float perlin_noise(vec2 point) {
  // Determine the grid cell coordinates
  vec2 grid_point_0_0 = floor(point);
  vec2 grid_point_1_0 = grid_point_0_0 + vec2(1., 0.);
  vec2 grid_point_0_1 = grid_point_0_0 + vec2(0., 1.);
  vec2 grid_point_1_1 = grid_point_0_0 + vec2(1., 1.);

  // Compute the hashes
  int hash_0_0 = hash_func(grid_point_0_0);
  int hash_1_0 = hash_func(grid_point_1_0);
  int hash_0_1 = hash_func(grid_point_0_1);
  int hash_1_1 = hash_func(grid_point_1_1);

  // Compute the gradients
  vec2 grad_0_0 = gradients(hash_0_0);
  vec2 grad_1_0 = gradients(hash_1_0);
  vec2 grad_0_1 = gradients(hash_0_1);
  vec2 grad_1_1 = gradients(hash_1_1);

  // Compute the corner vectors
  vec2 corner_0_0 = point - grid_point_0_0;
  vec2 corner_1_0 = point - grid_point_1_0;
  vec2 corner_0_1 = point - grid_point_0_1;
  vec2 corner_1_1 = point - grid_point_1_1;

  // Compute the dot products
  float dot_0_0 = dot(grad_0_0, corner_0_0);
  float dot_1_0 = dot(grad_1_0, corner_1_0);
  float dot_0_1 = dot(grad_0_1, corner_0_1);
  float dot_1_1 = dot(grad_1_1, corner_1_1);

  // Compute the mixes
  float a = blending_weight_poly(point.x - grid_point_0_0.x);
  float mix_x_0 = mix(dot_0_0, dot_1_0, a);
  float mix_x_1 = mix(dot_0_1, dot_1_1, a);


  // Compute the final noise
  float b = blending_weight_poly(point.y - grid_point_0_0.y);
  float noise = mix(mix_x_0, mix_x_1, b);

	return noise;
}

const int num_octaves = 3;
const float freq_multiplier = 2.17;
const float ampl_multiplier = 0.5;

float fbm2(vec2 point) {
  // Initialize the noise value
  float noise = 0.0;

  // Initialize the frequency and amplitude
  float freq = 1.0;
  float ampl = 1.0;

  for(int i = 0; i < num_octaves; i++) {
    // Add the noise
	
    noise += ampl * perlin_noise(point * freq);

    // Compute the frequency and amplitude for the next iteration
    freq *= freq_multiplier;
    ampl *= ampl_multiplier;
  }
	return noise;
}
// ==============================================================
// "Lava" texture

mat2 makem2(float theta){
  float c = cos(theta);
  float s = sin(theta);
  return mat2(c,-s,s,c);
  }

vec2 gradn(vec2 p)
{
	float ep = .09;
	float gradx = fbm2(vec2(p.x+ep, p.y)) - fbm2(vec2(p.x-ep, p.y));
	float grady = fbm2(vec2(p.x, p.y+ep)) - fbm2(vec2(p.x, p.y-ep));
	return vec2(gradx,grady);
}

float flow(vec2 p)
{
	float z=2.;
	float rz = 0.;
	vec2 bp = p;
	for (float i= 1.;i < 7.;i++ )
	{
		//primary flow speed
		p += .6;
		
		//secondary flow speed (speed of the perceived flow)
		bp += 1.9;
		
		//displacement field (try changing time multiplier)
		vec2 gr = gradn(i*p*.34);
		
		//rotation of the displacement field
		gr *= makem2(6.-(0.05*p.x+0.03*p.y)*40.);
		
		//displace the system
		p += gr*.5;
		
		//add noise octave
		rz += (sin(fbm2(p)*7.)*0.5+0.5)/z;
		
		//blend factor (blending displaced system with base system)
		//advection factor (.5 being low, .95 being high)
		p = mix(bp,p,.77);
		
		//intensity scaling
		z *= 1.4;
		//octave scaling
		p *= 2.;
		bp *= 1.9;
	}
	return rz;	
}

vec3 tex_lava(vec3 mat_col, vec2 point){
  float rz = flow(point);
	//vec3 col_temp = vec3(.2,0.07,0.01)/rz;
  vec3 col_temp = mat_col / rz;
	vec3 lava_color = pow(col_temp, vec3(1.4));
  return lava_color;
}

vec3 rgb_nor(vec3 col_rgb){
	float r_nor = col_rgb.x / 255.;
	float g_nor = col_rgb.y / 255.;
	float b_nor = col_rgb.z / 255.;
	return vec3(r_nor, g_nor, b_nor);
}

void main(){
  float material_ambient_factor = 0.1;
	float shininess = 30.0;

  vec3 material_color = vec3(0.0);

  const float hot_lava_temp = 1200.0 + 273.15;
  const float middle_lava_temp = 900.0 + 273.15;
  const float cold_lava_temp = 500.0 + 273.15;

  const vec3 lava_hot_color_rgb = vec3(219., 177., 56.);
  vec3 lava_hot_color = rgb_nor(lava_hot_color_rgb);
  const vec3 lava_middle_color_rgb = vec3(130., 26., 5.);
  vec3 lava_middle_color = rgb_nor(lava_middle_color_rgb);
  const vec3 lava_cold_color_rgb = vec3(33., 28., 28.);
  vec3 lava_cold_color = rgb_nor(lava_cold_color_rgb);

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

  if(particle_temperature < cold_lava_temp + 50.){
	if(dot(direction_to_light, normal) > 0.){
		color += light_color * dot(normal, direction_to_light);
    //color += material_color * light_color;
	}

	if(dot(normal, direction_to_light) > 0. && dot(halfway, normal) > 0.){
		color += light_color * pow(dot(halfway, normal), shininess);
    //color += material_color * light_color;
	}
  }
  else{
    color = vec3(1.);
  }

  color *= tex_lava(material_color, (v2f_tex_coords + rand2(vec2(seed, seed + 4653.123))) * .3);
  //material_color = rgb_nor(vec3(64., 27., 12.));
  //color = tex_lava(material_color, particle_position.xy);
  gl_FragColor = vec4(color, 1.0);
}