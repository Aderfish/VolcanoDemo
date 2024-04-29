export class TerrainParameters {
  constructor() {
    this.m_terrain_width = 3000;
    this.m_terrain_length = 3000;
  }
}

export class VolcanoParameters {
  constructor() {
    this.m_crater_radius = 70;
    this.m_crater_height = 50;
    this.m_volcano_max_height = 200;
    this.m_volcano_center = [0, 0];
    this.m_volcano_radius = 300;
    this.volcano_noise_freq = 3.0;
    this.volcano_transition_factor = 1.8;
    this.volcano_noise_prop = 0.2;
  }
}

export class IslandParameters {
  constructor() {
    this.m_island_radius = 700;
    this.m_island_height = 50;
    this.island_prop_flat = 0.2;
    this.island_noise_freq = 2.0;
    this.island_transition_factor = 1.2;
  }
}

export class GenerationParameters {
  constructor() {
    this.terrain = new TerrainParameters();
    this.volcano = new VolcanoParameters();
    this.island = new IslandParameters();
  }
}
