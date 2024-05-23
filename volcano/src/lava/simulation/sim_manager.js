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

    const acquisition_rate = this.simulation_parameters.acquisition_rate;
    const timestep = this.simulation_parameters.timestep;

    const time_between_acquisitions = 1 / acquisition_rate;
    this.steps_between_acquisitions = Math.floor(
      Math.max(time_between_acquisitions / timestep, 1)
    );
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

    let steps_since_last_acquisition = 0;

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

      // Update the number of steps since the last acquisition
      steps_since_last_acquisition++;

      // Acquire the data if needed
      if (steps_since_last_acquisition >= this.steps_between_acquisitions) {
        const data = this.lava_simulation.get_particles_data();
        this.buffer.push(data);
        steps_since_last_acquisition = 0;
      }

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
    if (
      this.schedule_index >=
      this.simulation_parameters.new_particles_schedule.length
    ) {
      return 0;
    }

    const { start_time, duration, particles_per_second } =
      this.simulation_parameters.new_particles_schedule[this.schedule_index];

    if (duration != null && time < start_time) {
      return 0;
    }

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

    let index = Math.floor(
      time /
        (this.simulation_parameters.timestep * this.steps_between_acquisitions)
    );
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
      (time -
        index *
          this.simulation_parameters.timestep *
          this.steps_between_acquisitions) /
      (this.simulation_parameters.timestep * this.steps_between_acquisitions);
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

  get_buffer_array() {
    // Flatten the data and prepare metadata
    let flatData = [];
    let metadata = [];

    this.buffer.forEach((particleData) => {
      metadata.push(particleData.length); // Store number of particles in this timestep
      particleData.forEach((particle) => {
        flatData.push(...particle); // Flatten all particle properties into one array
      });
    });

    // Convert metadata to Uint32Array (assuming number of particles can be large)
    let metadataArray = new Uint32Array(metadata);
    let flatDataArray = new Float64Array(flatData);

    // Calculate total buffer size needed: metadata + data
    let totalBufferSize = metadataArray.byteLength + flatDataArray.byteLength;
    let buffer = new ArrayBuffer(totalBufferSize);
    let bufferView = new Uint8Array(buffer);

    // Copy metadata and data into the buffer
    bufferView.set(new Uint8Array(metadataArray.buffer), 0);
    bufferView.set(
      new Uint8Array(flatDataArray.buffer),
      metadataArray.byteLength
    );

    return buffer;
  }

  reconstructFromBuffer(buffer) {
    // First, determine where the data part starts by reading the first Uint32 value (length of metadata array)
    let metadataLength = new Uint32Array(buffer, 0, 1)[0];
    let metadataArray = new Uint32Array(
      buffer,
      Uint32Array.BYTES_PER_ELEMENT,
      metadataLength
    );

    // Calculate starting point of the data array
    let dataStart = Uint32Array.BYTES_PER_ELEMENT * (1 + metadataLength);

    // Extract the data part
    let dataBuffer = buffer.slice(dataStart);
    let dataView = new Float64Array(dataBuffer);

    // Initialize variables to reconstruct the nested array
    let nestedArray = [];
    let dataIndex = 0;

    // Reconstruct the structure using metadata
    metadataArray.forEach((numParticles) => {
      let timestepData = [];
      for (let i = 0; i < numParticles; i++) {
        // Each particle has 4 properties: x, y, z, temp
        let particle = [
          dataView[dataIndex++], // x
          dataView[dataIndex++], // y
          dataView[dataIndex++], // z
          dataView[dataIndex++], // temp
        ];
        timestepData.push(particle);
      }
      nestedArray.push(timestepData);
    });

    return nestedArray;
  }
}
