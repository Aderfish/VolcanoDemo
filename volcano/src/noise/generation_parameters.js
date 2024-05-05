export class TerrainParameters {
  constructor() {
    this.m_terrain_width = 300;
    this.m_terrain_length = 300;
    this.side_resolution = 512;
    this.water_tex_scale = 10.0;
  }
}

export class VolcanoParameters {
  constructor() {
    this.m_crater_radius = 10;
    this.m_crater_height = 20;
    this.m_volcano_max_height = 50;
    this.m_volcano_center = [0, 0];
    this.m_volcano_radius = 50;
    // Advanced parameters
    this.volcano_noise_freq = 3.0;
    this.volcano_transition_factor = 1.8;
    this.volcano_noise_prop = 0.1;
    this.volcano_noise_offset = [-2, 0];
  }
}

export class IslandParameters {
  constructor() {
    this.m_island_radius = 100;
    this.m_island_height = 10;
    // Advanced parameters
    this.island_prop_flat = 0.2;
    this.island_noise_freq = 2.0;
    this.island_transition_factor = 1.2;
    this.island_noise_offset = [600, 4];
  }
}

export class GenerationParameters {
  constructor() {
    this.terrain = new TerrainParameters();
    this.volcano = new VolcanoParameters();
    this.island = new IslandParameters();
  }
}
