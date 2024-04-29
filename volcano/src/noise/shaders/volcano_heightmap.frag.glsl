precision highp float;

// The radius of the volcano crater in meters
uniform float m_crater_radius;
uniform float m_crater_height;

// The maximum height of the volcano in meters
uniform float m_volcano_max_height;

// The center of the volcano in meters
uniform vec2 m_volcano_center;

// The radius of the volcano in meters
uniform float m_volcano_radius;

// The height of the terrain in meters
uniform float m_terrain_height;

// The terrain width and length in meters
uniform float m_terrain_width;
uniform float m_terrain_length;

// Functions from the "noise.frag.glsl" file
float perlin_noise(vec2 pos);
float perlin_fbm(vec2 point);
float turbulence(vec2 point);

float volcano_shape(vec2 pos) {
  // Convert the position to the terrain size
  vec2 real_pos = pos * vec2(m_terrain_width / 2.0, m_terrain_length / 2.0);

  // Calculate the distance to the center of the volcano
  float m_dist_to_center = distance(real_pos, m_volcano_center);

  // Calculate the scaling factor relative to the terrain
  float kappa = m_volcano_max_height;

  // When the point is inside the crater
  if (m_dist_to_center < m_crater_radius) {
    float a = smoothstep(0.0, m_crater_radius, m_dist_to_center);
    return m_crater_height * (1.0 - a) + a * m_volcano_max_height;
  }

  // When the point is outside the crater
  float outside_scaling = (2.0 * (m_dist_to_center - m_crater_radius) ) / ( m_volcano_radius);
    
  return exp(- outside_scaling * outside_scaling ) * kappa ;
}


float volcano_height(vec2 pos) {
  // Convert the position to the terrain size
  vec2 real_pos = pos * vec2(m_terrain_width / 2.0, m_terrain_length / 2.0);

  float dist_to_center = distance(real_pos, m_volcano_center);


  float perlin_fbm_freq = 5.0;
  float perlin_fbm_amp = 40.0;
  float perlin_fbm_comp = perlin_fbm(pos * perlin_fbm_freq) * perlin_fbm_amp;
  float perlin_fbm_comp2 = perlin_fbm(pos * perlin_fbm_freq * 2.0) * perlin_fbm_amp * 0.5;

  float perlin_noise_freq = 0.5;
  float perlin_noise_amp = 0.5;
  float perlin_noise_comp = perlin_noise(pos * perlin_noise_freq) * perlin_noise_amp;

  float turbulence_freq = 0.5;
  float turbulence_amp = 20.0;
  float turbulence_comp = turbulence(pos * turbulence_freq) * turbulence_amp;

  float volcano_noise_comp = perlin_fbm_comp + perlin_fbm_comp2 + perlin_noise_comp + turbulence_comp;

  if(dist_to_center < m_volcano_radius) {
    return volcano_shape(pos) + volcano_noise_comp + m_terrain_height;
  }

  float transition_dist = 0.25 * m_volcano_radius;
  
  float terrain_noise_comp = perlin_fbm(pos*2.0) * 100.0;

  if(dist_to_center < m_volcano_radius + transition_dist) {
    float transition_factor = (dist_to_center - m_volcano_radius) / transition_dist;
    return volcano_shape(pos) + m_terrain_height + volcano_noise_comp * (1.0 - transition_factor) + transition_factor * terrain_noise_comp;
  }
  

  return volcano_shape(pos) +  m_terrain_height + terrain_noise_comp;

  float turbulence_factor = 0.2;
  return volcano_shape(pos) * (turbulence(pos * 4.0)*turbulence_factor + (1.0 - turbulence_factor)) + perlin_fbm(pos * 3.0) * 20.0 - turbulence(pos * 3.0) * 1.0;
}


float island(vec2 pos) {
  // The radius of the island
  const float m_island_radius = 700.0;

  // The height of the island
  const float m_island_height = 50.0;

  // The proportion of the island that is "flat" meaning that the average height is the same
  const float prop_flat = 0.2;
  const float m_inner_radius = prop_flat * m_island_radius;

  // The base noise frequency for the island
  const float base_noise_freq = 2.0;

  // The transition proportion between the island and the sea
  const float transition_factor = 1.2;
  float m_transition_dist_end = transition_factor * m_island_radius;


  vec2 real_pos = pos * vec2(m_terrain_width / 2.0, m_terrain_length / 2.0);
  float dist_to_center = distance(real_pos, vec2(0.0, 0.0));

  // We scale the position to have consitent noise accross islands of different sizes
  vec2 noise_pos = real_pos / m_island_radius;

  // The height of the current point on the island
  float curr_height = 0.0;

  // Base noise added to the island
  float base_height_noise = m_island_height * perlin_fbm(base_noise_freq * noise_pos);

  // Inside the "flat" part of the island
  if(dist_to_center < m_inner_radius) {
    return m_island_height + base_height_noise;
  }

  // Transition of the height of the island from the "island_height" to the sea level (0)
  else if(dist_to_center < m_island_radius) {
    float a = (dist_to_center - m_inner_radius) / (m_island_radius - m_inner_radius);

    curr_height = (1.0 - smoothstep(0.0, 1.0, a)) * m_island_height + base_height_noise;
  }

  // Transition of the noise from the island to the sea
  // We are basically gradually decreasing the amplitude of the noise
  // to make the transition to the sea smoother
  else if(dist_to_center < m_transition_dist_end) {
    // Base noise
    curr_height =  base_height_noise ;

    // Add higher frequency and "more rare" noise to have little island/rocks on the sea
    float higher_freq_noise = m_island_height * (perlin_fbm( 2.0 * base_noise_freq * noise_pos) - 0.3);
    curr_height += higher_freq_noise * smoothstep(m_island_radius, m_transition_dist_end, dist_to_center);

    // Smooth the transition
    curr_height *= (1.0 - smoothstep(m_island_radius, m_transition_dist_end, dist_to_center));
  }

  // The sea
  else {
    curr_height = 0.0;
  }


  return curr_height;
}



float height(vec2 pos) {
  return island(pos);
}


// ---

varying vec2 v2f_tex_coords;

void main() {
	float height = height(v2f_tex_coords);

	gl_FragColor = vec4(vec3(height), 1.0);
} 