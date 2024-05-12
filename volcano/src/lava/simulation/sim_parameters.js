export class SimulationParameters {
  constructor() {
    // The density of the lava at rest
    this.density_at_rest = 2500; // In kg/m^3

    // The incompressibility factor of the lava
    // Setting a higher value will make the lava less compressible
    // leading to a more realistic behavior
    // However, this leads to a more unstable simulation and requires a smaller timestep
    // to avoid instabilities (thus making the simulation slower)
    this.incompressibility_factor_k = 100;

    // Evolution of the viscosity of the lava with temperature
    this.max_viscosity = 1000000; // The maximum viscosity of the lava
    this.viscosity_evolution_factor = 1.5; // The factor of the viscosity evolution

    // The radius of the particles in the simulation
    this.particle_radius = 0.15; // In m

    // --- Temperature parameters ---
    // The initial temperature of the lava particles when they are emitted
    this.initial_temperature = 1200 + 273.15; // In Kelvin

    // Exterior elements temperature
    this.temp_ground = 20 + 273.15; // Temperature of the ground in Kelvin
    this.temp_surface = 20 + 273.15; // Temperature of the air in Kelvin

    // Transfer coefficients
    // Those coefficients are used to calculate the heat transfer between the particles and their environment
    // They do not correspond to real physical values but are used to control the simulation
    // /!\ In particular the internal and eternal transfer coefficients are not in the same unit
    // and thus should not be compared directly /!\

    // The internal transfer coefficient is the coefficient of heat transfer between particles
    this.temp_transfer_coeff_internal = 0.1;

    // The surface transfer coefficient is the coefficient of heat transfer between the particles and the air
    this.temp_transfer_coeff_surface = 400;

    // The ground transfer coefficient is the coefficient of heat transfer between the particles and the ground
    this.temp_transfer_coeff_ground = 1000;

    // --- Runnings parameters ---

    // The timestep of the simulation
    // The smaller the timestep, the more accurate the simulation but the slower
    // it is crucial to set it to a value that is small enough to avoid instabilities
    this.timestep = 0.01; // In seconds

    // How many iterations to wait before recomputing the neighbors
    // of the particles
    // We can do this because the particles are not moving that fast
    // Setting this value to a lower value will make the simulation more accurate
    // but slower
    this.recompute_neighbors_every = 10;

    // --- Integration method ---

    // The integration method used to compute the new position of the particles
    // The two methods are:
    // - Euler explicit: a simple method that is fast but not very accurate (makes the simulation unstable)
    // - Runge-Kutta second order: a more complex method that is slower but more accurate
    // Setting this value to true will use the Runge-Kutta method and false the Euler explicit method
    this.use_runge_kutta = true;

    // --- Simulation parameters ---

    // The schedule of the emission of new particles
    // The schedule is an array of objects with the following properties:
    // - start_time: the time at which the emission starts
    // - duration: the duration of the emission in seconds
    // - particles_per_second: the number of particles emitted per second
    // The schedule MUST be sorted by start_time
    // If two emissions overlap, the emission with the highest start_time will be used
    // If the duration is null, the emission will last until the end of the simulation
    this.new_particles_schedule = [
      { start_time: 0, duration: 10, particles_per_second: 100 },
      { start_time: 10, duration: 5, particles_per_second: 300 },
      { start_time: 15, duration: 15, particles_per_second: 200 },
      // { start_time: 11, duration: 2, particles_per_second: 2000 },
      // { start_time: 13, duration: 10, particles_per_second: 100 },
      // { start_time: 23, duration: 3, particles_per_second: 300 },
      // { start_time: 26, duration: 10, particles_per_second: 200 },
      // { start_time: 36, duration: 30, particles_per_second: 100 },
    ];

    // The maximum number of particles in the simulation
    // After this number is reached, no more particles are emitted whatever the schedule
    // You can set this value to null to have an infinite maximum number of particles
    // However, this is not recommended as it can lead to performance issues and potential crashes
    this.max_num_particles = 20000;

    // The total duration of the simulation in seconds
    this.simulation_duration = 30;

    // --- Visualization parameters ---
    // The rate at which the simulation data is acquired (per second)
    // A higher value will make the visualization smoother but
    // it consumes more memory
    this.acquisition_rate = 500;
  }
}
