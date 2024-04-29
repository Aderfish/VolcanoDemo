import { GenerationParameters } from "./generation_parameters.js";

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
 * @param {GenerationParameters} generation_parameters
 */
export function init_volcano_heightmap(regl, resources, generation_parameters) {
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
      m_terrain_width: regl.prop("m_terrain_width"),
      m_terrain_length: regl.prop("m_terrain_length"),
      m_volcano_center: regl.prop("m_volcano_center"),
      m_volcano_radius: regl.prop("m_volcano_radius"),
      m_crater_radius: regl.prop("m_crater_radius"),
      m_crater_height: regl.prop("m_crater_height"),
      m_volcano_max_height: regl.prop("m_volcano_max_height"),
      volcano_noise_freq: regl.prop("volcano_noise_freq"),
      volcano_transition_factor: regl.prop("volcano_transition_factor"),
      volcano_noise_prop: regl.prop("volcano_noise_prop"),
      volcano_noise_offset: regl.prop("volcano_noise_offset"),
      m_island_radius: regl.prop("m_island_radius"),
      m_island_height: regl.prop("m_island_height"),
      island_prop_flat: regl.prop("island_prop_flat"),
      island_noise_freq: regl.prop("island_noise_freq"),
      island_transition_factor: regl.prop("island_transition_factor"),
      island_noise_offset: regl.prop("island_noise_offset"),
    },

    vert: resources["noise/shaders/volcano_heightmap.vert.glsl"],
    frag: frag_shader,

    framebuffer: noise_buffer,
  });

  class HeightMap {
    constructor(generation_parameters) {
      this.generation_parameters = generation_parameters;
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
        m_terrain_width: this.generation_parameters.terrain.m_terrain_width,
        m_terrain_length: this.generation_parameters.terrain.m_terrain_length,
        m_volcano_center: this.generation_parameters.volcano.m_volcano_center,
        m_volcano_radius: this.generation_parameters.volcano.m_volcano_radius,
        m_crater_radius: this.generation_parameters.volcano.m_crater_radius,
        m_crater_height: this.generation_parameters.volcano.m_crater_height,
        m_volcano_max_height:
          this.generation_parameters.volcano.m_volcano_max_height,
        volcano_noise_freq:
          this.generation_parameters.volcano.volcano_noise_freq,
        volcano_transition_factor:
          this.generation_parameters.volcano.volcano_transition_factor,
        volcano_noise_prop:
          this.generation_parameters.volcano.volcano_noise_prop,
        volcano_noise_offset:
          this.generation_parameters.volcano.volcano_noise_offset,
        m_island_radius: this.generation_parameters.island.m_island_radius,
        m_island_height: this.generation_parameters.island.m_island_height,
        island_prop_flat: this.generation_parameters.island.island_prop_flat,
        island_noise_freq: this.generation_parameters.island.island_noise_freq,
        island_transition_factor:
          this.generation_parameters.island.island_transition_factor,
        island_noise_offset:
          this.generation_parameters.island.island_noise_offset,
      });
    }
  }

  return new HeightMap(generation_parameters);
}
