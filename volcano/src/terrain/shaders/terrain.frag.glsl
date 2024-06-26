precision highp float;

varying float v2f_height;

/* Blinn-Phong shader setup from previous exercises */
varying vec3 v2f_dir_from_view;
varying vec3 v2f_dir_to_light;
varying vec3 v2f_normal;
varying vec2 v2f_uv;
varying float v2f_terrain_width;

varying float v2f_water_tex_scale;
varying float v2f_grass_tex_scale;
varying float v2f_mont_tex_scale;

varying float v2f_volcano_h;
varying float v2f_island_h;
varying vec3 v2f_water_col_dark;
varying vec3 v2f_water_col_light;

varying float v2f_water_f_m;
varying float v2f_water_a_m;

varying float v2f_water_noise_offset;

const vec3  light_color = vec3(1.0, 0.941, 0.898) * 1.0;
// Small perturbation to prevent "z-fighting" on the water on some machines...
const float terrain_water_level    = 0.01 + 1e-6;
const vec3  terrain_color_water    = vec3(0.29, 0.51, 0.62);
const vec3  terrain_color_mountain = vec3(0.8, 0.5, 0.4);
const vec3  terrain_color_grass    = vec3(0.36);



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

float voronoi(vec2 point) {
	const int N = 5;
	float m = 10000.0;
	const float space = 5.;
   
    vec2 uvi = vec2(floor(point / space)); // index of the square as integer
    vec2 p1 = uvi * space;
    vec2 p2 = (uvi + vec2(0, 1)) * space;
    vec2 p3 = (uvi + vec2(1, 0)) * space;
    vec2 p4 = (uvi + vec2(1, 1)) * space;
	vec2 p5 = (uvi + vec2(-1, 0)) * space;
    vec2 p6 = (uvi + vec2(-1, -1)) * space;
	vec2 p7 = (uvi + vec2(0, -1)) * space;

    vec2 rand_n1 = vec2(2.0, 0.5);
    vec2 rand_n2 = vec2(0.5, 1.6);

    for (int i = 0; i < N; i++) {
        p1 = (uvi + rand2(rand_n1 * p1 + rand_n2)) * space; // Random point inside selected square
        m = min(m, distance(p1, point));
        p2 = (uvi + vec2(0, 1) + rand2(rand_n1 * p2 + rand_n2)) * space; // Random point inside neighbor of the selected square
        m = min(m, distance(p2, point));
        p3 = (uvi + vec2(1, 0) + rand2(rand_n1 * p3 + rand_n2)) * space; // '* space' convert the axis back to the main square
        m = min(m, distance(p3, point));
        p4 = (uvi + vec2(1, 1) + rand2(rand_n1 * p4 + rand_n2)) * space;
        m = min(m, distance(p4, point));
		p5 = (uvi + vec2(-1, 1) + rand2(rand_n1 * p5 + rand_n2)) * space;
        m = min(m, distance(p5, point));
		p6 = (uvi + vec2(-1, -1) + rand2(rand_n1 * p6 + rand_n2)) * space;
        m = min(m, distance(p6, point));
		p7 = (uvi + vec2(0, -1) + rand2(rand_n1 * p7 + rand_n2)) * space;
        m = min(m, distance(p7, point));
    }
    return 1. - pow(m, 0.5) / space * sqrt(float(N)) * 1.;
}

float voronoi2(vec2 point) {
	const int N = 5;
	float m = 10000.0;
	float space = 10.;
   
    vec2 uvi = vec2(floor(point / space)); // index of the square as integer
    vec2 p1 = uvi * space;
    vec2 p2 = (uvi + vec2(0, 1)) * space;
    vec2 p3 = (uvi + vec2(1, 0)) * space;
    vec2 p4 = (uvi + vec2(1, 1)) * space;
	vec2 p5 = (uvi + vec2(-1, 0)) * space;
    vec2 p6 = (uvi + vec2(-1, -1)) * space;
	vec2 p7 = (uvi + vec2(0, -1)) * space;
	vec2 p8 = (uvi + vec2(-1, 0)) * space;
	vec2 p9 = (uvi + vec2(1, -1)) * space;

    vec2 rand_n1 = vec2(3.2, .5);
    vec2 rand_n2 = vec2(0.5, .6);

    for (int i = 0; i < N; i++) {
        p1 = (uvi + rand2(rand_n1 * p1 + rand_n2)) * space; // Random point inside selected square
        m = min(m, distance(p1, point));
        p2 = (uvi + vec2(0, 1) + rand2(rand_n1 * p2 + rand_n2)) * space; // Random point inside neighbor of the selected square
        m = min(m, distance(p2, point));
        p3 = (uvi + vec2(1, 0) + rand2(rand_n1 * p3 + rand_n2)) * space; // '* space' convert the axis back to the main square
        m = min(m, distance(p3, point));
        p4 = (uvi + vec2(1, 1) + rand2(rand_n1 * p4 + rand_n2)) * space;
        m = min(m, distance(p4, point));
		p5 = (uvi + vec2(-1, 1) + rand2(rand_n1 * p5 + rand_n2)) * space;
        m = min(m, distance(p5, point));
		p6 = (uvi + vec2(-1, -1) + rand2(rand_n1 * p6 + rand_n2)) * space;
        m = min(m, distance(p6, point));
		p7 = (uvi + vec2(0, -1) + rand2(rand_n1 * p7 + rand_n2)) * space;
        m = min(m, distance(p7, point));
		p8 = (uvi + vec2(-1, 0) + rand2(rand_n1 * p8 + rand_n2)) * space;
        m = min(m, distance(p8, point));
		p9 = (uvi + vec2(1, -1) + rand2(rand_n1 * p9 + rand_n2)) * space;
        m = min(m, distance(p9, point));
    }
    return 1. - pow(m, 0.5) / space * sqrt(float(N)) * 1.;
}

vec3 tex_rock(vec2 point){
  vec3 rock_color = vec3(voronoi(point));
  rock_color *= clamp(fbm2(point), 0., 1.);
  return rock_color;
}

// ==============================================================
// "Mountain" texture

float hash(vec2 p) 
{
    return fract(sin(p.x * .1532 + p.y * .578) * 43758.236237153);
}

float iqnoisep(vec2 x)
{
    vec2 p = floor(x);
    vec2 f = fract(x);
	
	//Initiate the weighted sum and sum of weight
	float va = 0.0;
	float wt = 0.0;

	// Calculate the weighted sum of a 3X3 kernel around floor(x)
    for( int j = -1; j <= 1; j++ ){
      for( int i = -1; i <= 1; i++ )
    	{
		// The displacement w.r.t each cell of the kernel, ranging from [-0.5, 0.5]
          vec2 g = vec2(float(i), float(j))+ .5;
		  // Evaluate the noise at each cell of the kernel 
	      float o = hash( p + g );
		  // Calculate the displacement between each cell of the kernel with the actual point
		  vec2 r = g - f ;
		  // Evaluate the distance and smoothly map it to the range of [0, 1]
		  float d = dot(r, r)* 0.5;
       	  d = smoothstep(0., 1., d);
		  // The nearer the point, the higher the weight
		  float ww = 1.0 - d;
		  // Calculate the weighted sum and keep record of the sum of weight
		  va += o * ww;
		  wt += ww;
    	}
	}
	// Map the weighted sum to the range [-1, 1]
    return 2.* va/wt - 1.;
}

float fbmabs_9(vec2 p) {
	// Initial frequency and frequency multiplier
	float f = 1.;
	float a = 1.;
    const float f_m = 2.;
	const float a_m = 0.5;
	const int num_oct = 9;

	float r = 0.0;	
    for(int i = 0; i < num_oct ; i++){	
		r += abs(iqnoisep(p*f))* a;       
	    f *= f_m;
		a *= a_m;
		// Displace vector p along the direction of (-.1, .7) with a distance of r
        p -= vec2(-.1, .7) * r;
	}
	return r;
}

float fbmabs_2(vec2 p) {
	// Initial frequency and frequency multiplier
	float f = 1.;
	float a = 1.;
	float f_m = v2f_water_f_m;
	float a_m = v2f_water_a_m;

	float r = 0.0;	
    for(int i = 0; i < 3; i++){	
		r += abs(iqnoisep(p*f))* a;       
	    f *= f_m;
		a *= a_m;
		p -= vec2(-.1, .7) * r;
	}
	return r;
}

// Evaluate the derivatives of fbmabs function along xyz directions
vec3 nor_9(vec2 p)
{
	const vec2 e = vec2(0.002, 0.0);
	return normalize(vec3(
		fbmabs_9(p + e.xy) - fbmabs_9(p - e.xy),
		fbmabs_9(p + e.yx) - fbmabs_9(p - e.yx),
		-.1));
}

vec3 nor_2(vec2 p)
{
	const vec2 e = vec2(0.002, 0.0);
	return normalize(vec3(
		fbmabs_2(p + e.xy) - fbmabs_2(p - e.xy),
		fbmabs_2(p + e.yx) - fbmabs_2(p - e.yx),
		-.1));
}

vec3 tex_mont(vec2 point){	
	float r;
    vec3 light = normalize(vec3(1., 1., -1.));
    r = max(dot(nor_9(point), light), 0.1);
    vec3 mont_color = clamp(vec3(r, r, r), 0., 1.);
	return mont_color;
}

float find_k(vec2 point, vec2 col){
	float k = (col.y - col.x)/pow(point.y - point.x, 3.);
	return k;
}

vec3 rgb_nor(vec3 col_rgb){
	float r_nor = col_rgb.x / 255.;
	float g_nor = col_rgb.y / 255.;
	float b_nor = col_rgb.z / 255.;
	return vec3(r_nor, g_nor, b_nor);
}

vec3 tex_water(vec2 point){	
	float r;
	vec3 wa_col_dark = rgb_nor(v2f_water_col_dark);
	vec3 wa_col_light = rgb_nor(v2f_water_col_light);
	vec2 wa_tex_range = vec2(0.67, 0.7);
	float coef_r = find_k(wa_tex_range, vec2(wa_col_dark.x, wa_col_light.x));
	float coef_g = find_k(wa_tex_range, vec2(wa_col_dark.y, wa_col_light.y));
	float coef_b = find_k(wa_tex_range, vec2(wa_col_dark.z, wa_col_light.z));

    vec3 light = normalize(vec3(1., 1., -0.5));
    r = max(dot(nor_2(point), light), 0.1);
    vec3 water_tex = vec3(1.) - clamp(vec3(r, r, r), 0.295, 0.33);
	vec3 water_color = vec3(coef_r * pow(water_tex.x - wa_tex_range.x, 3.) + wa_col_dark.x, coef_g * pow(water_tex.x - wa_tex_range.x, 3.) + wa_col_dark.y, coef_b * pow(water_tex.x - wa_tex_range.x, 3.) + wa_col_dark.z);
	return water_color;
}



// Procedural water height function
float get_water_height(vec2 uv) {
    return fbmabs_2(uv * v2f_water_tex_scale / 60.0);
}

// Function to compute normal from height map
vec3 compute_normal_from_height(vec2 uv) {
    float h = get_water_height(uv);
    float epsilon = 1.0;
    
    float hx = get_water_height(uv + vec2(epsilon, 0.0)) - h;
    float hy = get_water_height(uv + vec2(0.0, epsilon)) - h;
    
    vec3 normal = normalize(vec3(-hx, -hy, 1.0));
    return normal;
}

// Procedural volcano height function
float get_volcano_height(vec2 uv) {
    return fbmabs_9(uv * v2f_mont_tex_scale / 100.0);
}

// Function to compute normal from height map for volcano
vec3 compute_volcano_normal_from_height(vec2 uv) {
    float h = get_volcano_height(uv);
    float epsilon = 1.0;
    
    float hx = get_volcano_height(uv + vec2(epsilon, 0.0)) - h;
    float hy = get_volcano_height(uv + vec2(0.0, epsilon)) - h;
    
    vec3 normal = normalize(vec3(-hx, -hy, 1.0));
    return normal;
}


// ==============================================================

void main()
{
	float material_ambient = 0.4; // Ambient light coefficient
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
	float shininess_water = 30.0;
  float shininess_ground = 100.0;

	if(height > terrain_water_level){
		shininess_water = 2.0;
		float weight = (height - terrain_water_level) / (v2f_volcano_h + v2f_island_h - terrain_water_level);
		material_color = weight * terrain_color_mountain + (1. - weight) * terrain_color_grass;
	}

	/* apply the Blinn-Phong lighting model*/

	vec3 normal = normalize(v2f_normal);
  if(height <= terrain_water_level){
    normal = compute_normal_from_height(v2f_uv + v2f_water_noise_offset*2.0);
  }
  else {
    normal = compute_volcano_normal_from_height(v2f_uv);
  }


	vec3 direction_to_light = normalize(v2f_dir_to_light);
	vec3 direction_to_camera = normalize(v2f_dir_from_view);

	vec3 halfway = normalize(direction_to_camera + direction_to_light);


	if(height > terrain_water_level){
    vec3 rock_tex = (tex_rock(v2f_uv * v2f_grass_tex_scale/10.));
    vec3 mont_tex = tex_mont(v2f_uv * v2f_mont_tex_scale/100.);
    float ratio = smoothstep(0., v2f_volcano_h + v2f_island_h - terrain_water_level, height);
    material_color *= (rock_tex * (1. - ratio)  + mont_tex * ratio) * 3.; 
	}else{
		material_color = tex_water((v2f_uv + v2f_water_noise_offset*2.0) * v2f_water_tex_scale / 60.);
		vec3 regional_color = vec3(clamp(voronoi2(v2f_uv * 30. / v2f_terrain_width), 0.1, 1.));
	  material_color *= regional_color * 2.; 
	}

	vec3 mat_ambient = material_color *  material_ambient;

	vec3 color = mat_ambient;

	if(dot(direction_to_light, normal) > 0.){
		color += material_color * light_color * dot(normal, direction_to_light);
	}

	if(dot(normal, direction_to_light) > 0. && dot(halfway, normal) > 0.){
    float shininess = height > terrain_water_level ? shininess_ground : shininess_water;
		color += material_color * light_color * pow(dot(halfway, normal), shininess);
	}
	

	// vec3 normal_color_rgb = normal * 0.5 + 0.5; // Calculate the false color
	// float normal_color_grey = normal_color_rgb.x * 0.2126 + normal_color_rgb.y * 0.7152 + normal_color_rgb.y * 0.0722; // Convert rgb to grey-scale
	// color *= normal_color_grey;
	gl_FragColor = vec4(color, 1.); // output: RGBA in 0..1 range
}
