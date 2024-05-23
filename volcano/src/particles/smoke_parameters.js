export class SmokeParameters {
    constructor() {
      this.spawn_center = [0., 0., 50.];
      this.spawn_radius = 10.;
      this.n_particles = 100.;
      this.time_to_live_low = 5.;
      this.time_to_live_high = 10.;

      // min x and y size
      this.size_range_x = [5. , 15.];
      this.size_range_y = [2. , 8.];
    }
  }