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
    this.temperature = 0;

    // Simulation metrics
    this.temp_grad = [0, 0, 0];

    // Constant characteristics
    this.mass = 0;
    this.radius = 0;

    // Forces
    this.pressure_force = [0, 0, 0];
    this.viscosity_force = [0, 0, 0];

    // Neighbors
    this.neighbors = [];
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

  clone_without_neighbors() {
    const clone = new LavaParticle(this.x, this.y, this.z);
    clone.vx = this.vx;
    clone.vy = this.vy;
    clone.vz = this.vz;

    clone.pressure = this.pressure;
    clone.density = this.density;
    clone.temperature = this.temperature;

    clone.temp_grad = this.temp_grad;

    clone.mass = this.mass;
    clone.radius = this.radius;

    clone.pressure_force = this.pressure_force;
    clone.viscosity_force = this.viscosity_force;

    clone.neighbors = [];

    return clone;
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

    // The density of the lava at rest
    this.density_at_rest = 2500; // In kg/m^3
    this.incompressibility_factor_k = 90000;

    // The mass and radius of the particles (constant throughout the simulation)
    this.particle_mass = 1; // In kg
    this.particle_radius = Math.pow(
      (3 / (4 * Math.PI)) * (this.particle_mass / this.density_at_rest),
      1 / 3
    ); // In m

    // The initial temperature of the lava particles
    this.initial_temperature = 1200 + 273.15; // In Kelvin

    // The timestep of the simulation
    this.timestep = 0.1; // In seconds
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

    // Set the constant characteristics of the particle
    particle.mass = this.particle_mass;
    particle.radius = this.particle_radius;
    particle.temperature = this.initial_temperature;

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
   * @returns the gradient of the temperature of the particle
   */
  temperature_gradient(particle, neighbors) {
    let grad = [0, 0, 0];

    for (neigh_particle in neighbors) {
      const kernel_grad = this.kernel_gradient(particle, neigh_particle);

      const d_temp = particle.temperature - neigh_particle.temperature;

      const norm_factor = neigh_particle.mass / neigh_particle.density;

      grad[0] += d_temp * kernel_grad[0] * norm_factor;
      grad[1] += d_temp * kernel_grad[1] * norm_factor;
      grad[2] += d_temp * kernel_grad[2] * norm_factor;
    }

    return grad;
  }

  /**
   * Compute the density of a particle
   *
   * @param {LavaParticle} particle The particle for which to compute the density
   * @param {Array<LavaParticle>} neightbors The list of neighbors of the particle
   * @returns the density of the particle
   */
  particle_density(particle, neightbors) {
    let density = 0;

    for (neigh_particle in neightbors) {
      const kernel_value = this.kernel(particle, neigh_particle);
      density += neigh_particle.mass * kernel_value;
    }

    return density;
  }

  /**
   * Compute the temperature laplacian of a particle
   *
   * @param {LavaParticle} particle The particle for which to compute the temperature laplacian
   * @param {Array<LavaParticle>} neighbors The list of neighbors of the particle
   * @returns the temperature laplacian of the particle
   */
  temperature_laplacian(particle, neighbors) {
    let laplacian = 0;

    for (neigh_particle in neighbors) {
      const kernel_grad = this.kernel_gradient(particle, neigh_particle);
      const temp_grad = neigh_particle.temp_grad;

      const kernel_grad_dot_prod =
        kernel_grad[0] * temp_grad[0] +
        kernel_grad[1] * temp_grad[1] +
        kernel_grad[2] * temp_grad[2];

      const norm_factor = neigh_particle.mass / neigh_particle.density;

      laplacian += kernel_grad_dot_prod * norm_factor;
    }

    return laplacian;
  }

  // --- Set methods for the simulation parameters

  /**
   * Set the temperature gradient of a particle
   *
   * @param {LavaParticle} particle The particle for which to set the temperature gradient
   * @param {Array<LavaParticle>} neighbors The list of neighbors of the particle
   */
  set_temperature_gradient(particle, neighbors) {
    particle.temp_grad = this.temperature_gradient(particle, neighbors);
  }

  /**
   * Set the pressure force that is exerted a particle
   *
   * @param {LavaParticle} particle The particle for which to set the pressure force
   * @param {Array<LavaParticle>} neighbors The list of neighbors of the particle
   */
  set_pressure_force(particle, neighbors) {
    particle.pressure = this.pressure_force(particle, neighbors);
  }

  /**
   * Set the viscosity force that is exerted a particle
   * @param {LavaParticle} particle The particle for which to set the viscosity force
   * @param {Array<LavaParticle>} neighbors The list of neighbors of the particle
   */
  set_viscosity_force(particle, neighbors) {
    particle.viscosity_force = this.viscosity_force(particle, neighbors);
  }

  /**
   * Set the density of a particle
   * @param {LavaParticle} particle The particle for which to set the density
   * @param {Array<LavaParticle>} neighbors The list of neighbors of the particle
   */
  set_particle_density(particle, neighbors) {
    particle.density = this.particle_density(particle, neighbors);
  }

  /**
   * Clone a list of particles
   *
   * @param {Array<LavaParticle>} particles The list of particles to clone
   * @returns the cloned list of particles
   */
  clone_particles_without_neighbors(particles) {
    const clone = [];
    for (p in particles) {
      clone.push(p.clone_without_neighbors());
    }

    return clone;
  }

  // --- Simulation methods
  euler_explicit(step) {
    // Compute the list of neightbors of each particle
    for (particle in this.particles) {
      particle.neighbors = this.get_neighbors(particle);
    }

    // Compute the density of each particle
    for (particle in this.particles) {
      this.set_particle_density(particle, particle.neighbors);
    }

    // Compute the pressure and viscosity forces of each particle
    for (particle in this.particles) {
      this.set_pressure_force(particle, particle.neighbors);
      this.set_viscosity_force(particle, particle.neighbors);
    }

    // Create an updated list of particles
    const updated_particles = this.clone_particles_without_neighbors(
      this.particles
    );

    // Compute the new position of each particle
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];

      const pressure = particle.pressure_force;
      const viscosity = particle.viscosity_force;

      const new_x = particle.x + step * particle.vx;
      const new_y = particle.y + step * particle.vy;
      const new_z = particle.z + step * particle.vz;

      const new_vx = particle.vx + step * (pressure[0] + viscosity[0]);
      const new_vy = particle.vy + step * (pressure[1] + viscosity[1]);
      const new_vz = particle.vz + step * (pressure[2] + viscosity[2]);

      updated_particles[i].x = new_x;
      updated_particles[i].y = new_y;
      updated_particles[i].z = new_z;

      updated_particles[i].vx = new_vx;
      updated_particles[i].vy = new_vy;
      updated_particles[i].vz = new_vz;
    }

    // Update the list of particles
    this.particles = updated_particles;
  }

  do_one_step() {
    this.euler_explicit(this.timestep);
  }
}
