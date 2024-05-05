import { exp } from "../../../lib/gl-matrix_3.3.0/esm/quat";
import { BufferData } from "../../terrain/terrain_actor";

class LavaParticle {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;

    // Physics characteristics
    this.pressure = 0;
    this.density = 0;
    this.mass = 0;
    this.temperature = 0;

    // Simulation metrics
    this.temp_grad = [0, 0, 0];
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

    // ---- Simulation parameters

    // Evolution of the viscosity of the lava with temperature
    // See section 2.3 of the paper "Animating Lava Flows" (http://www-evasion.imag.fr/Publications/1999/SACNG99/gi99.pdf)
    this.visc_a_factor = 220;
    this.visc_b_factor = 0.5;
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
   * Compute the kernel value between two particles
   *
   * @param {LavaParticle} particle_i the particle for which to compute the kernel
   * @param {LavaParticle} particle_j the particle to compute the kernel with
   * @returns the kernel value between the two particles
   */
  kernel(particle_i, particle_j) {
    const dist2 = particle_i.distance_square_with(particle_j);
    return this.kernel(Math.sqrt(dist2));
  }

  /**
   * Compute the gradient of the kernel between two particles
   * with respect to the position of the first particle [particle_i]
   *
   * @param {LavaParticle} particle_i the particle for which to compute the gradient
   * @param {LavaParticle} particle_j the particle to compute the gradient with
   * @returns the gradient of the kernel between the two particles
   */
  kernel_gradient(particle_i, particle_j) {
    const kernel_value_factor =
      (-2 * this.kernel(particle_i, particle_j)) / this.m_kernel_h2;

    const dx = particle_i.x - particle_j.x;
    const dy = particle_i.y - particle_j.y;
    const dz = particle_i.z - particle_j.z;

    return [
      kernel_value_factor * dx,
      kernel_value_factor * dy,
      kernel_value_factor * dz,
    ];
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
  // - The pressure force F_Pi [done]
  // - The viscosity force F_vi
  // - The gravity force F_g [done]
  // - The collision force F_ci
  // We also need to compute the density and pressure of the particles (see section 2.2 for initial values)
  // as well as the temperature of the particles

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
   * The pressure force is computed according to the formula on the paper
   * "Animating Lava Flows" (http://www-evasion.imag.fr/Publications/1999/SACNG99/gi99.pdf)
   * on section 2.2
   *
   * @param {LavaParticle} particle The particle for which to compute the pressure force
   * @param {Array<LavaParticle>} neighbors The list of neighbors of the particle
   * @returns the pressure force acting on the particle
   */
  pressure_force(particle, neighbors) {
    let force = [0, 0, 0];

    for (neigh_particle in neighbors) {
      // Compute the kernel gradient between the particle and its neighbor
      const kernel_grad = this.kernel_gradient(particle, neigh_particle);

      // Compute the pressure force
      const pressure =
        particle.mass *
        neigh_particle.mass *
        (particle.pressure / particle.density ** 2 +
          neigh_particle.pressure / particle.density ** 2);

      force[0] -= pressure * kernel_grad[0];
      force[1] -= pressure * kernel_grad[1];
      force[2] -= pressure * kernel_grad[2];
    }

    return force;
  }

  /**
   * Compute the viscosity force acting on a particle
   * The viscosity force is computed according to the formula on the paper
   * "Animating Lava Flows" (http://www-evasion.imag.fr/Publications/1999/SACNG99/gi99.pdf)
   * on section 2.3
   *
   * @param {LavaParticle} particle The particle for which to compute the viscosity force
   * @param {Array<LavaParticle>} neighbors The list of neighbors of the particle
   * @returns the viscosity force acting on the particle
   */
  viscosity_force(particle, neighbors) {
    const visc_factor =
      this.visc_b_factor * exp(-this.visc_a_factor * particle.temperature);
    const global_factor = (visc_factor * particle.mass) / particle.density;

    let force = [0, 0, 0];

    for (neigh_particle in neighbors) {
      const d_vx = particle.vx - neigh_particle.vx;
      const d_vy = particle.vy - neigh_particle.vy;
      const d_vz = particle.vz - neigh_particle.vz;

      const kernel_value = this.kernel(particle, neigh_particle);

      const norm_factor = neigh_particle.mass / neigh_particle.density;

      force[0] += global_factor * d_vx * kernel_value * norm_factor;
      force[1] += global_factor * d_vy * kernel_value * norm_factor;
      force[2] += global_factor * d_vz * kernel_value * norm_factor;
    }

    return force;
  }

  /**
   * Compute the gradient of the temperature of a particle and set it
   * into the particle's temp_grad attribute
   *
   * @param {LavaParticle} particle The particle for which to compute the temperature gradient
   * @param {Array<LavaParticle>} neighbors The list of neighbors of the particle
   */
  set_temperature_gradient(particle, neighbors) {
    let grad = [0, 0, 0];

    for (neigh_particle in neighbors) {
      const kernel_grad = this.kernel_gradient(particle, neigh_particle);

      const d_temp = particle.temperature - neigh_particle.temperature;

      const norm_factor = neigh_particle.mass / neigh_particle.density;

      grad[0] += d_temp * kernel_grad[0] * norm_factor;
      grad[1] += d_temp * kernel_grad[1] * norm_factor;
      grad[2] += d_temp * kernel_grad[2] * norm_factor;
    }

    particle.temp_grad = grad;
  }
}
