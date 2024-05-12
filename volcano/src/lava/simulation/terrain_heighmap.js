export class TerrainHeighmap {
  constructor(regl, buffer, terrain_parameters) {
    this.buffer_width = buffer.width;
    this.buffer_height = buffer.height;
    this.data = regl.read({ framebuffer: buffer });

    this.terrain_width = terrain_parameters.m_terrain_width;
    this.terrain_length = terrain_parameters.m_terrain_length;
  }

  /**
   * Get the height of the terrain at the given coordinates
   *
   * @param {number} x the x coordinate
   * @param {number} y the y coordinate
   * @returns the height of the terrain at the given coordinates
   */
  get_height(x, y) {
    // Check if the coordinates are outside the terrain
    if (
      x < -this.terrain_width / 2 ||
      x > this.terrain_width / 2 ||
      y < -this.terrain_length / 2 ||
      y > this.terrain_length / 2
    ) {
      return 0;
    }

    // Normalize the x and y coordinates to the buffer size
    x =
      ((x + this.terrain_width / 2) / this.terrain_width) *
      (this.buffer_width - 1);
    y =
      ((y + this.terrain_length / 2) / this.terrain_length) *
      (this.buffer_height - 1);

    // Clamp the coordinates to the buffer size
    x = Math.min(Math.max(x, 0), this.buffer_width - 1);
    y = Math.min(Math.max(y, 0), this.buffer_height - 1);

    const x0 = Math.floor(x);
    const y0 = Math.floor(y);

    const x1 = x0 + 1;
    const y1 = y0 + 1;

    const h00 = this.data[(x0 + y0 * this.buffer_width) << 2];
    const h01 = this.data[(x0 + y1 * this.buffer_width) << 2];
    const h10 = this.data[(x1 + y0 * this.buffer_width) << 2];
    const h11 = this.data[(x1 + y1 * this.buffer_width) << 2];

    const dx = x - x0;
    const dy = y - y0;

    // Interpolate the height on the triangle faces
    if (dx + dy < 1) {
      const h0 = h00 * (1 - dx) + h10 * dx;
      const h1 = h01 * (1 - dx) + h10 * dx;

      return h0 * (1 - dy / (1 - dx)) + (h1 * dy) / (1 - dx);
    } else {
      if (dy === 0) {
        return h01;
      }

      const h0 = h10 * (1 - dy) + h11 * dy;
      const h1 = h10 * (1 - dy) + h01 * dy;

      return (h0 * (dx - (1 - dy))) / dy + (h1 * (1 - dx)) / dy;
    }
  }
}
