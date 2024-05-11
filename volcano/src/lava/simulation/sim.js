import { vec2, vec3 } from "../../../lib/gl-matrix_3.3.0/esm/index.js";
import { GenerationParameters } from "../../noise/generation_parameters.js";
import { SimulationParameters } from "./sim_parameters.js";
import { TerrainHeighmap } from "./terrain_heighmap.js";

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
    this.temp_laplacian = 0;
    this.temp_dt = 0;

    // Constant characteristics
    this.mass = 0;
    this.radius = 0;

    // Forces
    this.pressure_force = [0, 0, 0];
    this.viscosity_force = [0, 0, 0];
    this.gravity_force = [0, 0, 0];

    // Neighbors
    this.neighbors = [];

    // Position in the grid
    this.grid_x = 0;
    this.grid_y = 0;

    // Surface
    this.is_on_surface = false;
    this.is_on_ground = false;
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

// The evolution that a particle undergoes
// This is used to store the forces acting on the particle
// in the Runge-Kutta 2 method
class Evolution {
  constructor() {
    this.force = [0, 0, 0];
    this.temp_dt = 0;
  }
}

export class LavaSimulation {
  /**
   * Create a new lava simulation
   *
   * @param {*} regl
   * @param {*} terrain_heightmap_buffer The buffer containing the heightmap of the terrain
   * @param {GenerationParameters} generation_parameters The generation parameters of the terrain
   * @param {SimulationParameters } simulation_parameters The simulation parameters
   */
  constructor(
    regl,
    terrain_heightmap_buffer,
    generation_parameters,
    simulation_parameters
  ) {
    this.particles = [];
    this.terrain_heightmap = new TerrainHeighmap(
      regl,
      terrain_heightmap_buffer,
      generation_parameters.terrain
    );
    this.generation_parameters = generation_parameters;

    // ---- Simulation parameters

    // Evolution of the viscosity of the lava with temperature
    this.max_viscosity = simulation_parameters.max_viscosity; // The maximum viscosity of the lava
    this.viscosity_evolution_factor =
      simulation_parameters.viscosity_evolution_factor; // The factor of the viscosity evolution

    // The density of the lava at rest
    this.density_at_rest = simulation_parameters.density_at_rest; // In kg/m^3
    this.incompressibility_factor_k =
      simulation_parameters.incompressibility_factor_k;

    // The mass and radius of the particles (constant throughout the simulation)
    this.particle_radius = simulation_parameters.particle_radius; // In m
    this.particle_radius2 = this.particle_radius * this.particle_radius;

    this.particle_mass =
      (4 / 3) *
      Math.PI *
      Math.pow(this.particle_radius, 3) *
      this.density_at_rest; // In kg

    // ---- Smoothing kernel parameters
    // This is the kernel radius of action
    this.m_kernel_h = this.particle_radius * Math.pow(5 / 2, 1 / 3);
    //this.m_kernel_h = this.particle_radius / 3;
    this.m_kernel_h2 = this.m_kernel_h * this.m_kernel_h;
    this.m_kernel_h3 = this.m_kernel_h2 * this.m_kernel_h;

    this.kernel_alpha_factor = 15 / (Math.PI * 64 * this.m_kernel_h3);

    // The initial temperature of the lava particles
    this.initial_temperature = simulation_parameters.initial_temperature; // In Kelvin

    // Other temperatures
    this.temp_ground = simulation_parameters.temp_ground;
    this.temp_surface = simulation_parameters.temp_surface; // Temperature of the air

    // The temperature transfer coefficient
    this.temp_transfer_coeff_internal =
      simulation_parameters.temp_transfer_coeff_internal;
    this.temp_transfer_coeff_surface =
      simulation_parameters.temp_transfer_coeff_surface;
    this.temp_transfer_coeff_ground =
      simulation_parameters.temp_transfer_coeff_ground;

    // The timestep of the simulation
    this.timestep = simulation_parameters.timestep; // In seconds

    // The current time and iteration of the simulation
    this.current_time = 0;
    this.current_it = 0;

    // How many iterations to wait before recomputing the neighbors
    // We can do this because the particles are not moving that fast
    this.recompute_neighbors_every =
      simulation_parameters.recompute_neighbors_every;

    // Create the grid of particles
    this.terrain_width = this.generation_parameters.terrain.m_terrain_width;
    this.terrain_length = this.generation_parameters.terrain.m_terrain_length;

    this.cell_size = 2 * this.m_kernel_h;
    this.particles_grid_length = Math.ceil(
      this.terrain_length / this.cell_size
    );
    this.particles_grid_width = Math.ceil(this.terrain_width / this.cell_size);

    this.particles_grid = [];

    // Use the Runge-Kutta 2 method for the simulation
    // If false, use the Euler explicit method is used
    // (faster but less stable)
    this.use_runge_kutta = simulation_parameters.use_runge_kutta;

    for (let i = 0; i < this.particles_grid_length; i++) {
      this.particles_grid.push([]);
      for (let j = 0; j < this.particles_grid_width; j++) {
        this.particles_grid[i].push([]);
      }
    }
  }

  // --- Grid methods ---

  /**
   * Get the grid index of a particle
   * /!\ The grid index might be outside the grid
   *
   * @param {LavaParticle} particle the particle for which to get the grid index
   * @returns the grid index of the particle (they might be outside the grid)
   */
  get_grid_index(particle) {
    const grid_x = Math.floor(
      (particle.x + this.terrain_width / 2) / this.cell_size
    );
    const grid_y = Math.floor(
      (particle.y + this.terrain_length / 2) / this.cell_size
    );
    return [grid_x, grid_y];
  }

  /**
   * Add a particle to the grid
   *
   * @param {LavaParticle} particle The particle to add to the grid
   * @returns true if the particle was added to the grid (i.e is inside the terrain), false otherwise
   */
  add_particle_to_grid(particle) {
    const grid_indexes = this.get_grid_index(particle);

    const grid_x = grid_indexes[0];
    const grid_y = grid_indexes[1];

    if (
      grid_x < 0 ||
      grid_x >= this.particles_grid.length ||
      grid_y < 0 ||
      grid_y >= this.particles_grid[0].length
    ) {
      return false;
    }

    particle.grid_x = grid_x;
    particle.grid_y = grid_y;

    this.particles_grid[grid_x][grid_y].push(particle);
    return true;
  }

  /**
   * Remove a particle from the grid
   * @param {LavaParticle} particle The particle to remove from the grid
   * @returns true if the particle was removed from the grid, false otherwise
   */
  remove_particle_from_grid(particle) {
    const grid_x = particle.grid_x;
    const grid_y = particle.grid_y;

    if (
      grid_x < 0 ||
      grid_x >= this.particles_grid.length ||
      grid_y < 0 ||
      grid_y >= this.particles_grid[0].length
    ) {
      return false;
    }

    const index = this.particles_grid[grid_x][grid_y].indexOf(particle);
    if (index != -1) {
      this.particles_grid[grid_x][grid_y].splice(index, 1);
    }

    return true;
  }

  /**
   * Update the grid position of a particle
   *
   * @param {LavaParticle} particle The particle for which to update the grid position
   * @returns true is the particle is still inside the grid, false otherwise
   */
  update_grid_position(particle) {
    const new_grid_indexes = this.get_grid_index(particle);

    const new_grid_x = new_grid_indexes[0];
    const new_grid_y = new_grid_indexes[1];

    if (
      new_grid_x < 0 ||
      new_grid_x >= this.particles_grid.length ||
      new_grid_y < 0 ||
      new_grid_y >= this.particles_grid[0].length
    ) {
      return false;
    }

    if (new_grid_x != particle.grid_x || new_grid_y != particle.grid_y) {
      this.remove_particle_from_grid(particle);
      particle.grid_x = new_grid_x;
      particle.grid_y = new_grid_y;
      this.add_particle_to_grid(particle);
    }

    return true;
  }

  /**
   * Get the neighbors of a particle from the grid
   * (Two particles are neighbors if they are at a distance less than 2 * kernel_h
   * <=> dist^2 < 4 * kernel_h^2)
   *
   * @param {LavaParticle} particle The particle for which to get the neighbors
   * @returns the list of neighbors of the input particle
   */
  get_neighbors_from_grid(particle) {
    const grid_x = particle.grid_x;
    const grid_y = particle.grid_y;

    const neighbors = [];

    for (let i = grid_x - 1; i <= grid_x + 1; i++) {
      for (let j = grid_y - 1; j <= grid_y + 1; j++) {
        if (
          i >= 0 &&
          i < this.particles_grid.length &&
          j >= 0 &&
          j < this.particles_grid[0].length
        ) {
          for (let p of this.particles_grid[i][j]) {
            if (
              p != particle &&
              p.distance_square_with(particle) < 4 * this.m_kernel_h2
            ) {
              neighbors.push(p);
            }
          }
        }
      }
    }

    return neighbors;
  }

  /**
   * Compute the kernel function
   * The kernel is taken from the alternative kernel proposed in the paper
   * "Smoothed Particles : A new paradigm for animating highly deformable bodies"
   * [http://www.geometry.caltech.edu/pubs/DC_EW96.pdf]
   * @param {number} r the distance at which to compute the kernel
   * @returns the value of the kernel at distance r
   */
  kernel_function(r) {
    if (r < 0) {
      // Should not happen
      console.error("r should be positive");
      return 0;
    }

    if (r > 2 * this.m_kernel_h) {
      return 0;
    }

    const pow_factor = 2 - r / this.m_kernel_h;

    return this.kernel_alpha_factor * Math.pow(pow_factor, 3);
  }

  /**
   * Compute the gradient of the kernel function with respect to dx, dy, dz
   * where dx, dy, dz are the differences of the coordinates of two particles
   *
   * @param {LavaParticle} particle_i the particle for which to compute the gradient
   * @param {LavaParticle} particle_j the particle to compute the gradient with
   * @returns the gradient of the kernel function between the two particles
   */
  kernel_function_gradient(particle_i, particle_j) {
    const dist2 = particle_i.distance_square_with(particle_j);

    const dist = Math.sqrt(dist2);

    if (dist > 2 * this.m_kernel_h) {
      return [0, 0, 0];
    }

    const pow_factor = 2 - dist / this.m_kernel_h;

    const derivative_factor =
      -this.kernel_alpha_factor *
      Math.pow(pow_factor, 2) *
      (2 / (this.m_kernel_h * dist));

    const dx = particle_i.x - particle_j.x;
    const dy = particle_i.y - particle_j.y;
    const dz = particle_i.z - particle_j.z;

    return [
      derivative_factor * dx,
      derivative_factor * dy,
      derivative_factor * dz,
    ];
  }

  /**
   * Compute the kernel value between two particles
   *
   * @param {LavaParticle} particle_i the particle for which to compute the kernel
   * @param {LavaParticle} particle_j the particle to compute the kernel with
   * @returns the kernel value between the two particles
   */
  kernel_between(particle_i, particle_j) {
    const dist2 = particle_i.distance_square_with(particle_j);

    return this.kernel_function(Math.sqrt(dist2));
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
    const z =
      this.terrain_heightmap.get_height(x, y) +
      (volcano_height - crater_height) / 2;

    // The radius of the crater is divided by 2 to get an approximation of the radius at z
    const radius_at_z = this.generation_parameters.volcano.m_crater_radius / 2;

    // Add a random offset to the spawn position
    const random_radius = Math.random() * radius_at_z * 0.9;
    const random_angle = Math.random() * 2 * Math.PI;

    x += random_radius * Math.cos(random_angle);
    y += random_radius * Math.sin(random_angle);

    // Create the particle
    const particle = new LavaParticle(x, y, z);

    // Set the constant characteristics of the particle
    particle.mass = this.particle_mass;
    particle.radius = this.particle_radius;
    particle.temperature = this.initial_temperature;

    // Add the particle to the simulation
    this.particles.push(particle);

    // Add the particle to the grid
    this.add_particle_to_grid(particle);
  }

  // --- Forces computation ---

  /**
   * Compute the gravity force acting on a particle
   *
   * @param {LavaParticle} particle The particle for which to compute the gravity force
   * @returns the gravity force acting on the particle
   */
  gravity_force(particle) {
    // We use gravity as a force of -9.81 m/s^2 in the z direction
    return [0, 0, -9.81 * particle.mass];
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

    for (let neigh_particle of neighbors) {
      // Compute the kernel gradient between the particle and its neighbor
      const kernel_grad = this.kernel_function_gradient(
        particle,
        neigh_particle
      );
      // console.log("Kernel grad");
      // console.log(kernel_grad);

      // Compute the pressure force
      const pressure =
        particle.mass *
        neigh_particle.mass *
        (particle.pressure / particle.density ** 2 +
          neigh_particle.pressure / neigh_particle.density ** 2);

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
      this.max_viscosity *
      Math.exp(
        (-this.viscosity_evolution_factor * particle.temperature) /
          this.initial_temperature
      );

    const global_factor = (visc_factor * particle.mass) / particle.density;

    let force = [0, 0, 0];

    for (let neigh_particle of neighbors) {
      const d_vx = neigh_particle.vx - particle.vx;
      const d_vy = neigh_particle.vy - particle.vy;
      const d_vz = neigh_particle.vz - particle.vz;

      const kernel_value = this.kernel_between(particle, neigh_particle);

      const norm_factor = neigh_particle.mass / neigh_particle.density;

      force[0] += global_factor * d_vx * kernel_value * norm_factor;
      force[1] += global_factor * d_vy * kernel_value * norm_factor;
      force[2] += global_factor * d_vz * kernel_value * norm_factor;
    }

    return force;
  }

  // --- Physics characteristics computation ---

  /**
   * Compute the density of a particle
   *
   * @param {LavaParticle} particle The particle for which to compute the density
   * @param {Array<LavaParticle>} neighbors The list of neighbors of the particle
   * @returns the density of the particle
   */
  particle_density(particle, neighbors) {
    let density = 0;

    for (const neigh_particle of neighbors) {
      const kernel_value = this.kernel_between(particle, neigh_particle);
      density += neigh_particle.mass * kernel_value;
    }

    density += particle.mass * this.kernel_function(0);

    return density;
  }

  /**
   * The pressure of a particle
   *
   * @param {LavaParticle} particle The particle for which to compute the particle pressure
   * @returns the pressure of the particle
   */
  particle_pressure(particle) {
    return (
      this.incompressibility_factor_k *
      (particle.density - this.density_at_rest)
    );
  }

  /**
   * Compute the gradient of the temperature of a particle
   *
   * @param {LavaParticle} particle The particle for which to compute the temperature gradient
   * @param {Array<LavaParticle>} neighbors The list of neighbors of the particle
   * @returns the gradient of the temperature of the particle
   */
  temperature_gradient(particle, neighbors) {
    let grad = [0, 0, 0];

    for (let neigh_particle of neighbors) {
      const kernel_grad = this.kernel_function_gradient(
        particle,
        neigh_particle
      );

      const d_temp = particle.temperature - neigh_particle.temperature;

      const norm_factor = neigh_particle.mass / neigh_particle.density;

      grad[0] += d_temp * kernel_grad[0] * norm_factor;
      grad[1] += d_temp * kernel_grad[1] * norm_factor;
      grad[2] += d_temp * kernel_grad[2] * norm_factor;
    }

    return grad;
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

    for (let neigh_particle of neighbors) {
      const kernel_grad = this.kernel_function_gradient(
        particle,
        neigh_particle
      );
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

  /**
   * Compute the internal temperature transfer of a particle (inside the lava)
   *
   * @param {LavaParticle} particle The particle for which to compute the internal temperature transfer
   * @returns the internal temperature transfer of the particle
   */
  temperature_dt_internal(particle) {
    return this.temp_transfer_coeff_internal * particle.temp_laplacian;
  }

  /**
   * Compute the temperature transfer coefficient between a particle and the surface of the lava
   *
   * @param {LavaParticle} particle The particle for which to compute the temperature transfer coefficient
   * @returns the temperature transfer coefficient between the particle and the surface of the lava
   */
  temperature_dt_surface(particle) {
    return (
      this.temp_transfer_coeff_surface *
      (particle.temperature - this.temp_surface) *
      (this.particle_radius2 / particle.density)
    );
  }

  /**
   * Compute the temperature transfer coefficient between a particle and the ground
   *
   * @param {LavaParticle} particle The particle for which to compute the temperature transfer coefficient
   * @returns the temperature transfer coefficient between the particle and the ground
   */
  temperature_dt_ground(particle) {
    return (
      this.temp_transfer_coeff_ground *
      (particle.temperature - this.temp_ground) *
      (this.particle_radius2 / particle.density)
    );
  }

  /**
   * Compute the total temperature transfer of a particle
   *
   * @param {LavaParticle} particle The particle for which to compute the total temperature transfer
   * @returns the total temperature transfer of the particle
   */
  temperature_dt_total(particle) {
    let ground = 0;
    let surface = 0;

    if (particle.is_on_ground) {
      ground = this.temperature_dt_ground(particle);
    }

    if (particle.is_on_surface) {
      surface = this.temperature_dt_surface(particle);
    }

    const internal = this.temperature_dt_internal(particle);

    return internal + surface + ground;
  }

  /**
   * Check if a particle is at the surface of the lava
   *
   * @param {LavaParticle} particle The particle for which we check if it is at the surface
   * @param {Array<LavaParticle>} neighbors The list of neighbors of the particle
   * @returns true if the particle is at the surface, false otherwise
   */
  is_particle_at_surface(particle, neighbors) {
    for (let neigh_particle of neighbors) {
      if (neigh_particle.z > particle.z) {
        const neigh_post_2d = vec2.fromValues(
          neigh_particle.x,
          neigh_particle.y
        );
        const particle_pos_2d = vec2.fromValues(particle.x, particle.y);
        const dist_2d = vec2.dist(neigh_post_2d, particle_pos_2d);

        if (dist_2d < this.particle_radius) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Check if a particle is on the ground
   *
   * @param {LavaParticle} particle The particle for which to check if it is on the ground
   * @returns true if the particle is on the ground, false otherwise
   */
  is_particle_on_ground(particle) {
    return (
      particle.z - this.particle_radius <
      this.terrain_heightmap.get_height(particle.x, particle.y)
    );
  }

  // --- Setter methods for the simulation parameters

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
   * Set the temperature laplacian of a particle
   *
   * @param {LavaParticle} particle The particle for which to set the temperature laplacian
   * @param {Array<LavaParticle>} neighbors The list of neighbors of the particle
   */
  set_temperature_laplacian(particle, neighbors) {
    particle.temp_laplacian = this.temperature_laplacian(particle, neighbors);
  }

  /**
   * Set the temperature dt total of a particle
   *
   * @param {LavaParticle} particle The particle for which to set the temperature dt total
   */
  set_temperature_dt_total(particle) {
    particle.temp_dt = this.temperature_dt_total(particle);
  }

  /**
   * Set the gravity force that is exerted a particle
   *
   * @param {LavaParticle} particle The particle for which to set the gravity force
   */
  set_gravity_force(particle) {
    particle.gravity_force = this.gravity_force(particle);
  }

  /**
   * Set the pressure force that is exerted a particle
   *
   * @param {LavaParticle} particle The particle for which to set the pressure force
   * @param {Array<LavaParticle>} neighbors The list of neighbors of the particle
   */
  set_pressure_force(particle, neighbors) {
    particle.pressure_force = this.pressure_force(particle, neighbors);
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
   * Set the pressure of a particle
   * @param {LavaParticle} particle The particle for which to set the pressure
   * @returns the pressure of the particle
   */
  set_particle_pressure(particle) {
    particle.pressure = this.particle_pressure(particle);
  }

  /**
   * Set the is_on_surface attribute of a particle
   *
   * @param {LavaParticle} particle The particle for which to set the is_on_surface attribute
   * @param {Array<LavaParticle>} neighbors The list of neighbors of the particle
   */
  set_particle_is_on_surface(particle, neighbors) {
    particle.is_on_surface = this.is_particle_at_surface(particle, neighbors);
  }

  /**
   * Set the is_on_ground attribute of a particle
   *
   * @param {LavaParticle} particle The particle for which to set the is_on_ground attribute
   */
  set_particle_is_on_ground(particle) {
    particle.is_on_ground = this.is_particle_on_ground(particle);
  }

  // --- Simulation methods ---

  /**
   * Get the evolution of the particles
   *
   * @param {Array<LavaParticle>} particles The list of particles to evolve
   * @param {number} step The timestep of the simulation
   * @param {boolean} recompute_neighbors If true, recompute the neighbors of the particles
   *
   * @returns {Array<Evolution>} the evolution of the particles
   */
  get_evolution(particles, recompute_neighbors = false) {
    // Compute the list of neightbors of each particle
    // The modulo make the simulation faster (but the flow is less stable)
    if (recompute_neighbors) {
      for (let particle of particles) {
        particle.neighbors = this.get_neighbors_from_grid(particle);
      }
    }

    // Compute the density of each particle
    for (let particle of particles) {
      this.set_particle_density(particle, particle.neighbors);
    }

    // Compute the pressure of each particle
    for (let particle of particles) {
      this.set_particle_pressure(particle);
    }

    // Check if each particle is on the surface or on the ground
    for (let particle of particles) {
      this.set_particle_is_on_surface(particle, particle.neighbors);
      this.set_particle_is_on_ground(particle);
    }

    // Note: we cannot merge the following two loops because the temperature gradient
    // of the neighbors is needed to compute the temperature laplacian
    for (let particle of particles) {
      this.set_temperature_gradient(particle, particle.neighbors);
    }

    for (let particle of particles) {
      this.set_temperature_laplacian(particle, particle.neighbors);
    }

    for (let particle of particles) {
      this.set_temperature_dt_total(particle);
    }

    // Compute the pressure and viscosity forces of each particle
    for (let particle of particles) {
      this.set_pressure_force(particle, particle.neighbors);
      this.set_viscosity_force(particle, particle.neighbors);
      this.set_gravity_force(particle);
    }

    const evolution = [];

    // Return the evolution of the particles
    for (let particle of particles) {
      const evol = new Evolution();

      evol.force = [
        particle.pressure_force[0] +
          particle.viscosity_force[0] +
          particle.gravity_force[0],
        particle.pressure_force[1] +
          particle.viscosity_force[1] +
          particle.gravity_force[1],
        particle.pressure_force[2] +
          particle.viscosity_force[2] +
          particle.gravity_force[2],
      ];

      evol.temp_dt = particle.temp_dt;

      evolution.push(evol);
    }

    return evolution;
  }

  /**
   * Perform one step of the simulation using the Runge-Kutta 2 method
   *
   * @param {Array<LavaParticle>} particles The list of particles to evolve
   * @param {number} step The timestep of the simulation
   */
  runge_kutta_2(particles, step) {
    const recompute_neighbors =
      this.current_it % this.recompute_neighbors_every == 0;

    let init_positions = [];
    let init_velocities = [];
    let init_temperatures = [];

    for (let particle of particles) {
      init_positions.push([particle.x, particle.y, particle.z]);
      init_velocities.push([particle.vx, particle.vy, particle.vz]);
      init_temperatures.push(particle.temperature);
    }

    // The velocity at the beginning of the step
    let pos_k1 = [];
    for (let particle of particles) {
      pos_k1.push([particle.vx, particle.vy, particle.vz]);
    }

    // The evolutions at the beginning of the step
    const vel_temp_k1 = this.get_evolution(particles, recompute_neighbors);

    let pos_k2 = [];
    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      const evol = vel_temp_k1[i];

      particle.x += 0.5 * step * particle.vx;
      particle.y += 0.5 * step * particle.vy;
      particle.z += 0.5 * step * particle.vz;

      particle.vx += (0.5 * step * evol.force[0]) / particle.mass;
      particle.vy += (0.5 * step * evol.force[1]) / particle.mass;
      particle.vz += (0.5 * step * evol.force[2]) / particle.mass;

      particle.temperature -= 0.5 * step * evol.temp_dt;

      pos_k2.push([particle.vx, particle.vy, particle.vz]);
    }

    const vel_temp_k2 = this.get_evolution(particles, false);

    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];

      const dx_x = (step * (pos_k1[i][0] + pos_k2[i][0])) / 2;
      const dx_y = (step * (pos_k1[i][1] + pos_k2[i][1])) / 2;
      const dx_z = (step * (pos_k1[i][2] + pos_k2[i][2])) / 2;

      const dv_x =
        (step * (vel_temp_k1[i].force[0] + vel_temp_k2[i].force[0])) /
        (2 * particle.mass);
      const dv_y =
        (step * (vel_temp_k1[i].force[1] + vel_temp_k2[i].force[1])) /
        (2 * particle.mass);
      const dv_z =
        (step * (vel_temp_k1[i].force[2] + vel_temp_k2[i].force[2])) /
        (2 * particle.mass);

      const d_temp =
        (step * (vel_temp_k1[i].temp_dt + vel_temp_k2[i].temp_dt)) / 2;

      // Update the position and velocity of the particle
      particle.x = init_positions[i][0] + dx_x;
      particle.y = init_positions[i][1] + dx_y;
      particle.z = init_positions[i][2] + dx_z;

      particle.vx = init_velocities[i][0] + dv_x;
      particle.vy = init_velocities[i][1] + dv_y;
      particle.vz = init_velocities[i][2] + dv_z;

      particle.temperature = init_temperatures[i] - d_temp;
    }
  }

  /**
   * Perform one step of the simulation using the Euler explicit method
   * (Faster but less stable than the Runge-Kutta 2 method)
   *
   * @param {Array<LavaParticle>} particles The list of particles to evolve
   * @param {LavaParticle} step The timestep of the simulation
   */
  euler_explicit(particles, step) {
    const recompute_neighbors =
      this.current_it % this.recompute_neighbors_every == 0;

    // Compute the evolution of the particles
    const evolution = this.get_evolution(particles, recompute_neighbors);

    // Update the position and velocity of the particles
    for (let i = 0; i < particles.length; i++) {
      const particle = particles[i];
      const evol = evolution[i];

      particle.x += step * particle.vx;
      particle.y += step * particle.vy;
      particle.z += step * particle.vz;

      particle.vx += (step * evol.force[0]) / particle.mass;
      particle.vy += (step * evol.force[1]) / particle.mass;
      particle.vz += (step * evol.force[2]) / particle.mass;

      particle.temperature -= step * evol.temp_dt;
    }
  }

  /**
   * Update the particles of the simulation
   */
  update_particles() {
    if (this.use_runge_kutta) {
      this.runge_kutta_2(this.particles, this.timestep);
    } else {
      this.euler_explicit(this.particles, this.timestep);
    }

    // Check for collisions with the terrain
    for (let particle of this.particles) {
      const height = this.terrain_heightmap.get_height(particle.x, particle.y);

      // Check if the particle is under the terrain
      if (particle.z < height) {
        // If a particle is under the terrain, we set its velocity to 0 to represent
        // the fact that it is stuck to the terrain
        // This might not be physically accurate but it is a simple way to handle this case
        // and it gave convincing results after some experiments
        particle.vx = 0.0;
        particle.vy = 0.0;
        particle.vz = 0.0;

        particle.z = height;
      }
    }

    // Update the grid
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      this.update_grid_position(particle);
    }
  }

  add_n_particles(n) {
    for (let i = 0; i < n; i++) {
      this.add_particle();
    }
  }

  do_one_step() {
    this.update_particles(this.timestep);
    this.current_time += this.timestep;
    this.current_it++;

    const particles_per_second = 1;
    const particle_every_it = Math.floor(
      particles_per_second / (this.timestep * 10)
    );

    if (this.current_it % particle_every_it == 0) {
      this.add_n_particles(10);
    }
  }

  get_particles_data() {
    const data = [];
    for (let particle of this.particles) {
      data.push([particle.x, particle.y, particle.z, particle.temperature]);
    }

    return data;
  }
}
