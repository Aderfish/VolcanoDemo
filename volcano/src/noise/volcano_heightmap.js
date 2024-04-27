// Represents the characteristics of the terrain
export class TerrainCharacteristics {
  constructor() {
    this.m_crater_radius = 20;
    this.m_crater_height = 20;
    this.m_volcano_max_height = 50;
    this.m_volcano_center = [0, 0];
    this.m_volcano_radius = 50;
    this.m_terrain_height = 1;
    this.m_terrain_width = 200;
    this.m_terrain_length = 200;
  }
}

const mesh_quad_2d = {
  position: [
    // 4 vertices with 2 coordinates each
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ],
  faces: [
    [0, 1, 2], // top right
    [0, 2, 3], // bottom left
  ],
};

/**
 *
 * @param {*} regl
 * @param {*} resources
 * @param {TerrainCharacteristics} terrain_characteristics
 */
export function init_volcano_heightmap(
  regl,
  resources,
  terrain_characteristics
) {
  // shared buffer to which the texture are rendered
  const noise_buffer = regl.framebuffer({
    width: 256,
    height: 256,
    colorFormat: "rgba",
    colorType: "float",
    stencil: false,
    depth: false,
    mag: "linear",
    min: "linear",
  });

  const noise_library_code = resources["noise/shaders/noise.frag.glsl"];
  const heightmap_code = resources["noise/shaders/volcano_heightmap.frag.glsl"];

  const frag_shader = `${heightmap_code}\n${noise_library_code}`;

  const pipeline_generate_texture = regl({
    attributes: { position: mesh_quad_2d.position },
    elements: mesh_quad_2d.faces,

    uniforms: {
      m_crater_radius: regl.prop("m_crater_radius"),
      m_crater_height: regl.prop("m_crater_height"),
      m_volcano_max_height: regl.prop("m_volcano_max_height"),
      m_volcano_center: regl.prop("m_volcano_center"),
      m_volcano_radius: regl.prop("m_volcano_radius"),
      m_terrain_height: regl.prop("m_terrain_height"),
      m_terrain_width: regl.prop("m_terrain_width"),
      m_terrain_length: regl.prop("m_terrain_length"),
    },

    vert: resources["noise/shaders/volcano_heightmap.vert.glsl"],
    frag: frag_shader,

    framebuffer: noise_buffer,
  });

  class VolcanoHeightMap {
    constructor(terrain_characteristics) {
      this.terrain_characteristics = terrain_characteristics;
    }

    // Get the buffer that contains the heightmap
    get_buffer() {
      return noise_buffer;
    }

    // Draw the heightmap to the buffer
    draw_heightmap_to_buffer({ width = 256, height = 256 }) {
      // Resize the buffer if needed
      if (noise_buffer.width !== width || noise_buffer.height !== height) {
        noise_buffer.resize(width, height);
      }

      // Clear the buffer
      regl.clear({
        color: [0, 0, 0, 1],
        framebuffer: noise_buffer,
      });

      // Render the heightmap to the buffer
      pipeline_generate_texture({
        m_crater_radius: this.terrain_characteristics.m_crater_radius,
        m_crater_height: this.terrain_characteristics.m_crater_height,
        m_volcano_max_height: this.terrain_characteristics.m_volcano_max_height,
        m_volcano_center: this.terrain_characteristics.m_volcano_center,
        m_volcano_radius: this.terrain_characteristics.m_volcano_radius,
        m_terrain_height: this.terrain_characteristics.m_terrain_height,
        m_terrain_width: this.terrain_characteristics.m_terrain_width,
        m_terrain_length: this.terrain_characteristics.m_terrain_length,
      });
    }
  }

  return new VolcanoHeightMap(terrain_characteristics);
}
