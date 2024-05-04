import { TerrainParameters } from "../../noise/generation_parameters";
import { BufferData } from "../../terrain/terrain_actor";

class LavaParticle {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
  }
}

class LavaSimulation {
  constructor(terrain_heightmap_buffer, generation_parameters) {
    this.particles = [];
    this.terrain_heightmap = new BufferData(terrain_heightmap_buffer);
    this.generation_parameters = generation_parameters;
  }

  add_particle() {
    let x = this.generation_parameters.volcano.m_volcano_center[0];
    let y = this.generation_parameters.volcano.m_volcano_center[1];

    const volcano_height =
      this.generation_parameters.volcano.m_volcano_max_height;
    const crater_height = this.generation_parameters.volcano.m_crater_height;

    // The particles are generated inside the crater
    const z = (volcano_height + crater_height) / 2;

    // The radius of the crater is divided by 2 to get the radius at z
    const radius_at_z = this.generation_parameters.volcano.m_crater_radius / 2;

    // Add a random offset to the spawn position
    x += Math.random() * radius_at_z;
    y += Math.random() * radius_at_z;

    // Create the particle
    const particle = new LavaParticle(x, y, z);

    // Add the particle to the simulation
    this.particles.push(particle);
  }
}
