import { GenerationParameters } from "../../noise/generation_parameters.js";
import { LavaSimulation } from "./sim.js";
import { SimulationParameters } from "./sim_parameters.js";

export class SimulationManager {
  constructor(regl) {
    this.regl = regl;
    this.buffer = [];
  }

  /**
   * Set the simulation parameters and reset the simulation
   *
   * @param {*} height_map_buffer The height map buffer of the terrain
   * @param {GenerationParameters} generation_parameters The generation parameters
   * @param {SimulationParameters} simulation_parameters The simulation parameters
   */
  set_simulation(
    height_map_buffer,
    generation_parameters,
    simulation_parameters
  ) {
    this.lava_simulation = new LavaSimulation(
      this.regl,
      height_map_buffer,
      generation_parameters,
      simulation_parameters
    );

    this.simulation_parameters = simulation_parameters;
    this.generation_parameters = generation_parameters;

    this.buffer = [];
    this.schedule_index = 0;
  }

  /**
   * Perform the whole simulation and store the result in the buffer
   * This can take a long time depending on the simulation parameters
   * and the hardware used
   * (can take from a few minutes to a few hours on a normal computer)
   */
  bake_sim() {
    const timestep = this.simulation_parameters.timestep;

    let sim_time = 0;
    let steps = this.simulation_parameters.simulation_duration / timestep;

    let total_particles = 0;
    let emission_in_current_second = 0;
    let last_second = 0;

    for (let i = 0; i < steps; i++) {
      // Get the duration of the current schedule
      const rate = this.get_particle_rate(sim_time);
      const new_particles_per_step = Math.ceil(rate * timestep);

      // Add new particles to the simulation
      if (
        emission_in_current_second < rate &&
        total_particles < this.simulation_parameters.max_num_particles
      ) {
        const new_particles = Math.min(
          new_particles_per_step,
          rate - emission_in_current_second,
          this.simulation_parameters.max_num_particles - total_particles
        );
        this.lava_simulation.add_n_particles(new_particles);
        emission_in_current_second += new_particles;
      }

      // Do one simulation step
      this.lava_simulation.do_one_step();

      const data = this.lava_simulation.get_particles_data();
      this.buffer.push(data);

      // Update the current second
      const current_second = Math.floor(sim_time);
      if (current_second > last_second) {
        last_second = current_second;
        emission_in_current_second = 0;
      }

      // Log the percentage done
      console.log(
        "Percentage done: ",
        (((i + 1) / steps) * 100).toFixed(2),
        "%"
      );

      console.log(emission_in_current_second);
      sim_time += timestep;
    }
  }

  /**
   * Get the particles data at the given time from the schedule
   *
   * @param {number} time The time to get the particles data at
   * @returns {number} The rate of particles at the given time
   */
  get_particle_rate(time) {
    const { start_time, duration, particles_per_second } =
      this.simulation_parameters.new_particles_schedule[this.schedule_index];

    if (duration != null && time >= start_time + duration) {
      this.schedule_index++;
    }

    return particles_per_second;
  }

  /**
   * Get the particles data at the given time from the buffer
   * This must be used after the bake_sim method has been called
   *
   * @param {number} time The time to get the particles data at
   * @returns {Array<["x", "y", "z", "temp"]>} The particles data at the given time
   */
  get_particles_at(time) {
    if (this.buffer.length == 0) {
      return [];
    }

    let index = Math.floor(time / this.simulation_parameters.timestep);
    if (index >= this.buffer.length) {
      index = this.buffer.length - 1;
    }
    if (index < 0) {
      index = 0;
    }

    if (index == this.buffer.length - 1) {
      return this.buffer[index];
    }

    // Perform linear interpolation between the two closest buffers
    const t =
      (time - index * this.simulation_parameters.timestep) /
      this.simulation_parameters.timestep;

    const before_data = this.buffer[index];
    const after_data = this.buffer[index + 1];

    const interpolated_data = [];

    for (let i = 0; i < before_data.length; i++) {
      const x = before_data[i][0] * (1 - t) + after_data[i][0] * t;
      const y = before_data[i][1] * (1 - t) + after_data[i][1] * t;
      const z = before_data[i][2] * (1 - t) + after_data[i][2] * t;

      const temp = before_data[i][3] * (1 - t) + after_data[i][3] * t;

      interpolated_data.push([x, y, z, temp]);
    }

    return interpolated_data;
  }
}
