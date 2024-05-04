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

  /**
   * Compute the squared distance between this particle and another particle
   *
   * @param {LavaParticle} other_particle
   * @returns the square of the distance between this particle and another particle
   */
  distance_square_with(other_particle) {
    const dx = this.x - other_particle.x;
    const dy = this.y - other_particle.y;
    const dz = this.z - other_particle.z;

    return dx * dx + dy * dy + dz * dz;
  }
}

class LavaSimulation {
  constructor(terrain_heightmap_buffer, generation_parameters) {
    this.particles = [];
    this.terrain_heightmap = new BufferData(terrain_heightmap_buffer);
    this.generation_parameters = generation_parameters;

    // ---- Smoothing kernel parameters
    // This is the kernel radius of action
    this.m_kernel_h = 1.0;
    this.m_kernel_h2 = this.m_kernel_h * this.m_kernel_h;

    // This is the normalisation factor of the kernel
    this.m_kernel_alpha =
      15 / (Math.PI * this.m_kernel_h * this.m_kernel_h * this.m_kernel_h);
  }

  /**
   * Compute the gaussian kernel value at distance d from the center
   *
   * @param {number} d The distance from the center of the kernel
   */
  gaussian_kernel(d) {
    return this.m_kernel_alpha * Math.exp((-d * d) / this.m_kernel_h2);
  }

  /**
   * Add a new particle to the simulation
   * The particle is spawned at the center of the volcano
   * and has a random offset
   */
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

  /**
   * Get the list of neighbors of a particle
   * A neighbor is a particle different from the input particle
   * such that the distance between the two particles is less than the 2 times the kernel radius
   * (dist < 2 * h <=> dist^2 < 4 * h^2)
   *
   * @param {LavaParticle} particle
   * @returns the list of neighbors of the input particle
   */
  get_neighbors(particle) {
    const neighbors = [];
    const neighbors_radius = 4 * particle.m_kernel_h2;

    for (p in this.particles) {
      if (p != particle) {
        const dist2 = particle.distance_square_with(p);
        if (dist2 < neighbors_radius) {
          neighbors.push(p);
        }
      }
    }

    return neighbors;
  }

  // TODO: We need to compute the forces acting on the particles that are:
  // - The pressure force F_Pi
  // - The viscosity force F_vi
  // - The gravity force F_g
  // - The collision force F_ci

  /**
   * Compute the gravity force acting on a particle
   *
   * @param {LavaParticle} particle The particle for which to compute the gravity force
   * @returns the gravity force acting on the particle
   */
  gravity_force(particle) {
    // We use gravity as a force of -9.81 m/s^2 in the z direction
    return [0, 0, -9.81];
  }

  /**
   * Compute the pressure force acting on a particle
   *
   * @param {LavaParticle} particle The particle for which to compute the pressure force
   * @param {Array<LavaParticle>} neighbors The list of neighbors of the particle
   * @returns the pressure force acting on the particle
   */
  pressure_force(particle, neighbors) {
    return 0;
  }
}
