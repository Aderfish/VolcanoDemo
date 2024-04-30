precision highp float;

varying float v2f_height;

/* Blinn-Phong shader setup from previous exercises */
varying vec3 v2f_dir_from_view;
varying vec3 v2f_dir_to_light;
varying vec3 v2f_normal;
varying vec2 v2f_uv;

const vec3  light_color = vec3(1.0, 0.941, 0.898) * 1.0;
// Small perturbation to prevent "z-fighting" on the water on some machines...
const float terrain_water_level    = -0.03125 + 1e-6;
const vec3  terrain_color_water    = vec3(0.29, 0.51, 0.62);
const vec3  terrain_color_mountain = vec3(0.8, 0.5, 0.4);
const vec3  terrain_color_grass    = vec3(0.33, 0.43, 0.18);


// ==============================================================
// "Rock" texture2: Cellular noise (Voronoi)

float rand(vec2 v) {
    return fract(sin(dot(v + vec2(-8.5123, 23.2156), vec2(12.9898, 59.233))) * 4758.5453123);
}

vec2 rand2(vec2 v) {
    return vec2(
        rand(v * vec2(4562.223, 1232.465) + vec2(1122.0, 8325.0)), 
        rand(v * vec2(2312.843, 8621.456) + vec2(5133.2, 2462.7)));
}

float noise(vec2 uv) {
    vec2 f = fract(uv);
    vec2 i = floor(uv);
    
    float a = rand(i);
    float b = rand(i + vec2(0.0, 1.0));
    float c = rand(i + vec2(1.0, 0.0));
    float d = rand(i + vec2(1.0, 1.0));
    
    vec2 u = -2. * f * f * f + 3. * f * f;
    return mix(mix(a, b, u.y), mix(c, d, u.y), u.x);
}

float fbm2(vec2 uv) {
    float sum = 0.0;
    float amp = 0.0;
    float persistence = 0.8;
    vec2 st = uv;
    
    for (int i = 0; i < 6; ++i) {
        amp = amp / persistence + noise(st);
        sum = sum / persistence + 1.;
        st *= 2.;
    }
    return amp / sum;
}

float voronoi(vec2 point) {
	const int N = 8;
	float m = 10000.0;
	const float space = 0.4;
    // split in squares
	
    vec2 rf = vec2(2.0, 0.5);
    vec2 rs = vec2(0.5, 1.6);
   
    // take n sample in each square
    vec2 uvi = vec2(floor(point / space - 0.5));
    vec2 p1 = uvi * space;
    vec2 p2 = (uvi + vec2(0, 1)) * space;
    vec2 p3 = (uvi + vec2(1, 0)) * space;
    vec2 p4 = (uvi + vec2(1, 1)) * space;
    
    for (int i = 0; i < N; i++) {
        p1 = (uvi + rand2(p1 * rf + rs)) * space;
        m = min(m, distance(p1, point));
        p2 = (uvi + vec2(0, 1) + rand2(p2 * rf + rs)) * space;
        m = min(m, distance(p2, point));
        p3 = (uvi + vec2(1, 0) + rand2(p3 * rf + rs)) * space;
        m = min(m, distance(p3, point));
        p4 = (uvi + vec2(1, 1) + rand2(p4 * rf + rs)) * space;
        m = min(m, distance(p4, point));
    }
    return 1. - pow(m, 0.5) / space * sqrt(float(N)) * 0.1;
}

vec3 tex_rock2(vec2 point){
  vec2 m = vec2(fbm2(point), fbm2(point + vec2(5.)));
  vec3 rock_color = vec3(voronoi(point + (m - 0.5)));
  rock_color *= fbm2(point);
  return rock_color;
}

// ==============================================================
// "Rock" texture1

vec2 m = vec2(.07,.08);

float hash(vec2 p) 
{
    return fract(sin(p.x*.1532+p.y*.578) * 43758.236237153);
}

float iqnoisep(vec2 x)
{
    vec2 p = floor(x);
    vec2 f = fract(x);
	
	float va = 0.0;
	float wt = 0.0;
    for( int j=-1; j<=1; j++ )//kernel limitations to increase performances :
    for( int i=-1; i<=1; i++ )//3x3 instead of 5x5
    {
        vec2 g = vec2( float(i),float(j) )+.5;
		float o = hash( p + g );
		vec2 r = g - f ;
		float d = dot(r,r)*(.4+m.x*.4);
        d=smoothstep(0.0,1.,d);//d=smoothstep(0.0,1.,sqrt(d));
        //d = d*d*d*(d*(d*6. - 15.) + 10.);
		float ww = 1.0-d;
		va += o*ww;
		wt += ww;
    }
    return 2.*va/wt-1.;
}

float fbmabs(vec2 p) {
	
	float f=1.;
   
	float r = 0.0;	
    for(int i = 0;i<7;i++){	
		r += abs(iqnoisep(p*f))/f;       
	    f *=2.;
        p-=vec2(-.1,.7)*r;
	}
	return r;
}

float map(vec2 p){
    return 2.*fbmabs(p);
}

vec3 nor(vec2 p)
{
	const vec2 e = vec2(0.002, 0.0);
	return normalize(vec3(
		map(p + e.xy) - map(p - e.xy),
		map(p + e.yx) - map(p - e.yx),
		-.2));
}

vec3 tex_rock(vec2 point){	
	float r;
	r = (iqnoisep(point*10.));
    vec3 light = normalize(vec3(4., 2., -1.));
    r = max(dot(nor(point), light),0.1);
    float k=map(point);
    vec3 rock_color = clamp(vec3(r, r, r),0.,1.);
	return rock_color*3.;
}
// ==============================================================

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
		float weight = 2. * (height - terrain_water_level) * 0.001;
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

	if(height > terrain_water_level){
	vec3 rock_tex1 = tex_rock2(v2f_uv/10.);
	vec3 rock_tex2 = tex_rock(v2f_uv/300.);

	//float weight = 2. * (height - terrain_water_level) * 0.0013;
	//vec3 terrain_tex = pow(weight, 2.) * rock_tex + (1.-pow(weight, 2.)) * 1.;
	float ratio = 0.7;
	color *= (rock_tex1 * (1. - ratio)  + rock_tex2 * ratio) * 0.9; 
	}

	gl_FragColor = vec4(color, 1.); // output: RGBA in 0..1 range

}
