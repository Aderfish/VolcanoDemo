precision highp float;

//---- Terrain ----

// The terrain width and length in meters
uniform float m_terrain_width;
uniform float m_terrain_length;



//--- Volcano ---

// The center of the volcano in meters
uniform vec2 m_volcano_center;

// The radius of the volcano in meters
uniform float m_volcano_radius;

// The radius of the volcano crater in meters
uniform float m_crater_radius;
uniform float m_crater_height;

// The maximum height of the volcano in meters
uniform float m_volcano_max_height;

// The base frequency of the noise added to the volcano
uniform float volcano_noise_freq;

// The transition proportion on which the noise is removed (with respect to the volcano radius)
uniform float volcano_transition_factor;

// The proportion of noise that constitutes the final volcano shape
uniform float volcano_noise_prop;

// The offset of the noise added to the volcano (used to create variation between volcanos)
uniform vec2 volcano_noise_offset;


//--- Island ---

// The radius of the island in meters
uniform float m_island_radius;

// The height of the island in meters
uniform float m_island_height;

// The proportion of the island that is "flat" meaning that the average height is the same (with respect to the island radius)
// Concretely, when the distance to the center of the island is less than "island_prop_flat * m_island_radius",
// the height of the island is "m_island_height" + noise
// When we leave this area, the height of the island gradually decreases to 0
uniform float island_prop_flat;

// The base noise frequency for the island
uniform float island_noise_freq;

// The transition proportion between the island and the sea
uniform float island_transition_factor;

// The offset of the noise added to the island (used to create variation between islands)
uniform vec2 island_noise_offset;



// Functions from the "noise.frag.glsl" file
float perlin_noise(vec2 pos);
float perlin_fbm(vec2 point);
float turbulence(vec2 point);

float volcano_shape(vec2 real_pos) {
  // Calculate the distance to the center of the volcano
  float m_dist_to_center = distance(real_pos, m_volcano_center);

  // When the point is inside the crater
  if (m_dist_to_center < m_crater_radius) {
    float a = smoothstep(0.0, m_crater_radius, m_dist_to_center);
    return m_crater_height * (1.0 - a) + a * m_volcano_max_height;
  }

  // When the point is outside the crater
  float outside_scaling = (2.0 * (m_dist_to_center - m_crater_radius) ) / ( m_volcano_radius);
    
  return exp(- outside_scaling * outside_scaling ) * m_volcano_max_height ;
}


float volcano_height(vec2 real_pos){
  // The base frequency for the noise generation
  float base_noise_freq = volcano_noise_freq;

  // The transition proportion on which the noise is removed (with respect to the volcano radius)
  float m_transition_dist_end = volcano_transition_factor * m_volcano_radius;

  // The proportion of noise that constitutes the final volcano shape
  float noise_prop = volcano_noise_prop;

  float m_dist_to_center = distance(real_pos, m_volcano_center);

  float initial_volcano_height =  volcano_shape(real_pos);

  // We scale the position to have consitent noise accross volcanos of different sizes
  vec2 noise_pos = real_pos / m_volcano_radius + volcano_noise_offset;

  // Generate the noise added to the volcano
  float volcano_height = initial_volcano_height * (1.0 - noise_prop) + noise_prop * perlin_fbm(base_noise_freq * noise_pos) * initial_volcano_height;
  volcano_height = volcano_height * (1.0 - noise_prop) + noise_prop * perlin_fbm(base_noise_freq * noise_pos * 2.0) * volcano_height * 0.5;
  volcano_height = volcano_height * (1.0 - noise_prop) + noise_prop * turbulence(base_noise_freq * noise_pos) * volcano_height;

  float total_noise_added = volcano_height - initial_volcano_height;

  if(m_dist_to_center < m_volcano_radius) {
    // The volcano already has all the noise
  }
  else if(m_dist_to_center < m_transition_dist_end) {
    // We gradually remove the noise
    volcano_height = initial_volcano_height + total_noise_added * (1.0 - smoothstep(m_volcano_radius, m_transition_dist_end, m_dist_to_center));
  }
  else {
    // The volcano has no noise
    volcano_height = initial_volcano_height;
  }

  return volcano_height;
}



float island(vec2 real_pos) {
  // The proportion of the island that is "flat" meaning that the average height is the same
  float m_inner_radius = island_prop_flat * m_island_radius;

  // The base noise frequency for the island
  float base_noise_freq = island_noise_freq;

  // The transition proportion between the island and the sea
  float m_transition_dist_end = island_transition_factor * m_island_radius;

  float dist_to_center = distance(real_pos, vec2(0.0, 0.0));

  // We scale the position to have consitent noise accross islands of different sizes
  vec2 noise_pos = real_pos / m_island_radius + island_noise_offset;

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
  vec2 real_pos = pos * vec2(m_terrain_width / 2.0, m_terrain_length / 2.0);
  return island(real_pos) + volcano_height(real_pos);
}


// ---

varying vec2 v2f_tex_coords;

void main() {
	float height = height(v2f_tex_coords);

	gl_FragColor = vec4(vec3(height), 1.0);
} 