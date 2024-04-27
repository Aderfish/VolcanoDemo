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



float volcano_height(vec2 pos) {
  // Convert the position to the terrain size
  pos = pos * vec2(m_terrain_width / 2.0, m_terrain_length / 2.0);

  // Calculate the distance to the center of the volcano
  float m_dist_to_center = distance(pos, m_volcano_center);

  // Calculate the scaling factor relative to the terrain
  float kappa = m_volcano_max_height / m_terrain_height;

  // When the point is inside the crater
  float inside_scaling = exp(-(2.0 * m_dist_to_center / m_crater_radius) * (2.0 * m_dist_to_center / m_crater_radius));

  if (m_dist_to_center < m_crater_radius) {
    return (1.0 - inside_scaling) * kappa + inside_scaling * m_crater_height;
  }

  // When the point is outside the crater
  float outside_scaling = (2.0 * (m_dist_to_center - m_crater_radius) ) / ( m_volcano_radius);
    
  return exp(- outside_scaling * outside_scaling ) * kappa ;
}

// ---

varying vec2 v2f_tex_coords;

void main() {
	float height = volcano_height(v2f_tex_coords);

	gl_FragColor = vec4(vec3(height), 1.0);
} 