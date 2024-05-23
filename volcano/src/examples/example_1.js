import { SimulationParameters } from "../lava/simulation/sim_parameters.js";
import {
  GenerationParameters,
  IslandParameters,
  TerrainParameters,
  VolcanoParameters,
} from "../noise/generation_parameters.js";

// Terrain

const terrain_parameters = new TerrainParameters();

terrain_parameters.m_terrain_width = 500;
terrain_parameters.m_terrain_length = 500;
terrain_parameters.side_resolution = 512;
terrain_parameters.water_tex_scale = 8.0;
terrain_parameters.grass_tex_scale = 2.0;
terrain_parameters.mont_tex_scale = 1.0;
terrain_parameters.water_col_dark = "#1D3B54";
terrain_parameters.water_col_light = "#5A7082";
terrain_parameters.water_f_m = 3.0;
terrain_parameters.water_a_m = 0.2;

// Volcano

const volcano_parameters = new VolcanoParameters();

volcano_parameters.m_crater_radius = 8;
volcano_parameters.m_crater_height = 34;
volcano_parameters.m_volcano_max_height = 43;
volcano_parameters.m_volcano_center = [-7, 7];
volcano_parameters.m_volcano_radius = 59;

volcano_parameters.volcano_noise_freq = 3.0;
volcano_parameters.volcano_transition_factor = 1.8;
volcano_parameters.volcano_noise_prop = 0.1;
volcano_parameters.volcano_noise_offset = [-3, 0];

// Island

const island_parameters = new IslandParameters();

island_parameters.m_island_radius = 135;
island_parameters.m_island_height = 30;

island_parameters.island_prop_flat = 0.2;
island_parameters.island_noise_freq = 2.0;
island_parameters.island_transition_factor = 1.2;
island_parameters.island_noise_offset = [600, 1];

// Generation

const generation_parameters = new GenerationParameters();

generation_parameters.terrain = terrain_parameters;
generation_parameters.volcano = volcano_parameters;
generation_parameters.island = island_parameters;

// Simulation

const simulation_parameters = new SimulationParameters();

simulation_parameters.density_at_rest = 2500;
simulation_parameters.incompressibility_factor_k = 200;

simulation_parameters.max_viscosity = 1000000;
simulation_parameters.viscosity_evolution_factor = 1.5;

simulation_parameters.particle_radius = 0.3;

simulation_parameters.initial_temperature = 1200 + 273.15;
simulation_parameters.temp_ground = 20 + 273.15;
simulation_parameters.temp_surface = 20 + 273.15;

simulation_parameters.temp_transfer_coeff_internal = 0.02;
simulation_parameters.temp_transfer_coeff_surface = 200;
simulation_parameters.temp_transfer_coeff_ground = 500;

simulation_parameters.timestep = 0.01;
simulation_parameters.recompute_neighbors_every = 20;
simulation_parameters.use_runge_kutta = true;

simulation_parameters.new_particles_schedule = [
  { start_time: 0, duration: 1, particles_per_second: 3000 },
  { start_time: 1, duration: 10, particles_per_second: 300 },
  { start_time: 11, duration: 1, particles_per_second: 2000 },
  { start_time: 12, duration: 10, particles_per_second: 300 },
  { start_time: 22, duration: 20, particles_per_second: 200 },

  //{ start_time: 10, duration: 1, particles_per_second: 10000 },
];

simulation_parameters.max_num_particles = 20000;

simulation_parameters.simulation_duration = 90;

simulation_parameters.acquisition_rate = 20;

export {
  generation_parameters as generation_parameters_1,
  simulation_parameters as simulation_parameters_1,
};
