import {
  vec2,
  vec3,
  vec4,
  mat2,
  mat3,
  mat4,
} from "../../lib/gl-matrix_3.3.0/esm/index.js";
import { TerrainParameters } from "../noise/generation_parameters.js";
import { mat4_matmul_many } from "../utils/icg_math.js";

export class BufferData {
  constructor(regl, buffer) {
    this.width = buffer.width;
    this.height = buffer.height;
    this.data = regl.read({ framebuffer: buffer });

    // this can read both float and uint8 buffers
    if (this.data instanceof Uint8Array) {
      // uint8 array is in range 0...255
      this.scale = 1 / 255;
    } else {
      this.scale = 1;
    }
  }

  get(x, y) {
    x = Math.min(Math.max(x, 0), this.width - 1);
    y = Math.min(Math.max(y, 0), this.height - 1);

    return this.data[(x + y * this.width) << 2] * this.scale;
  }
}

/**
 *
 * @param {*} height_map
 * @param {TerrainParameters} terrain_parameters
 * @returns
 */
function terrain_build_mesh(height_map, terrain_parameters) {
  const grid_width = height_map.width;
  const grid_height = height_map.height;

  const WATER_LEVEL = 0.01;

  const vertices = [];
  const normals = [];
  const faces = [];

  // Map a 2D grid index (x, y) into a 1D index into the output vertex array.
  function xy_to_v_index(x, y) {
    return x + y * grid_width;
  }

  for (let gy = 0; gy < grid_height; gy++) {
    for (let gx = 0; gx < grid_width; gx++) {
      const idx = xy_to_v_index(gx, gy);
      let elevation = height_map.get(gx, gy); // we put the value between 0...1 so that it could be stored in a non-float texture on older browsers/GLES3, the -0.5 brings it back to -0.5 ... 0.5

      // normal as finite difference of the height map
      // dz/dx = (h(x+dx) - h(x-dx)) / (2 dx)
      normals[idx] = vec3.normalize(
        [0, 0, 0],
        [
          -(height_map.get(gx + 1, gy) - height_map.get(gx - 1, gy)) /
            (2 / grid_width),
          -(height_map.get(gx, gy + 1) - height_map.get(gx, gy - 1)) /
            (2 / grid_height),
          1,
        ]
      );

      /*
			Generate the displaced terrain vertex corresponding to integer grid location (gx, gy). 
			The height (Z coordinate) of this vertex is determined by height_map.
			If the point falls below WATER_LEVEL:
			* it should be clamped back to WATER_LEVEL.
			* the normal should be [0, 0, 1]
			The XY coordinates are calculated so that the full grid covers the square [-0.5, 0.5]^2 in the XY plane.
			*/

      const map_width = terrain_parameters.m_terrain_width;
      const map_height = terrain_parameters.m_terrain_length;
      const tile_width = map_width / (grid_width - 1);
      const tile_height = map_height / (grid_height - 1);
      const map_start_x = -map_width / 2;
      const map_start_y = -map_height / 2;

      const point_x = map_start_x + gx * tile_width;
      const point_y = map_start_y + gy * tile_height;

      if (elevation < WATER_LEVEL) {
        elevation = WATER_LEVEL;
        normals[idx] = [0, 0, 1];
      }

      vertices[idx] = [point_x, point_y, elevation];
    }
  }

  for (let gy = 0; gy < grid_height - 1; gy += 1) {
    for (let gx = 0; gx < grid_width - 1; gx += 1) {
      /* #TODO PG1.6.1
			Triangulate the grid cell whose lower lefthand corner is grid index (gx, gy).
			You will need to create two triangles to fill each square.
			*/

      let v00 = xy_to_v_index(gx, gy);
      let v01 = xy_to_v_index(gx, gy + 1);
      let v10 = xy_to_v_index(gx + 1, gy);
      let v11 = xy_to_v_index(gx + 1, gy + 1);

      faces.push([v01, v00, v10]);
      faces.push([v10, v11, v01]);

      // faces.push([v1, v2, v3]) // adds a triangle on vertex indices v1, v2, v3
    }
  }

  return {
    vertex_positions: vertices,
    vertex_normals: normals,
    faces: faces,
  };
}

function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');

  var bigint = parseInt(hex, 16);

  var r = (bigint >> 16) & 255;
  var g = (bigint >> 8) & 255;
  var b = bigint & 255;

  return [r, g, b];
}
/**
 *
 * @param {*} regl
 * @param {*} resources
 * @param {*} height_map_buffer
 * @param {TerrainParameters} terrain_parameters
 * @returns
 */
export function init_terrain_actor(
  regl,
  resources,
  height_map_buffer,
  terrain_parameters
) {
  const terrain_mesh = terrain_build_mesh(
    new BufferData(regl, height_map_buffer),
    terrain_parameters.terrain
  );

  const pipeline_draw_terrain = regl({
    attributes: {
      position: {
        buffer: regl.buffer(terrain_mesh.vertex_positions),
        size: terrain_mesh.vertex_positions[0].length,
      },
      normal: terrain_mesh.vertex_normals,
    },
    uniforms: {
      mat_mvp: regl.prop("mat_mvp"),
      mat_model_view: regl.prop("mat_model_view"),
      mat_normals: regl.prop("mat_normals"),

      light_position: regl.prop("light_position"),
      terrain_width: terrain_parameters.terrain.m_terrain_width,
      water_tex_scale: terrain_parameters.terrain.water_tex_scale,
      grass_tex_scale: terrain_parameters.terrain.grass_tex_scale,
      mont_tex_scale: terrain_parameters.terrain.mont_tex_scale,
      volcano_h: terrain_parameters.volcano.m_volcano_max_height,
      water_col_dark: hexToRgb(terrain_parameters.terrain.water_col_dark),
      water_col_light: hexToRgb(terrain_parameters.terrain.water_col_light),
      water_f_m: terrain_parameters.terrain.water_f_m,
      water_a_m: terrain_parameters.terrain.water_a_m,    
    },
    elements: terrain_mesh.faces,

    vert: resources["terrain/shaders/terrain.vert.glsl"],
    frag: resources["terrain/shaders/terrain.frag.glsl"],
  });

  class TerrainActor {
    constructor() {
      this.mat_mvp = mat4.create();
      this.mat_model_view = mat4.create();
      this.mat_normals = mat3.create();
      this.mat_model_to_world = mat4.create();
    }

    draw({ mat_projection, mat_view, light_position_cam }) {
      mat4_matmul_many(this.mat_model_view, mat_view, this.mat_model_to_world);
      mat4_matmul_many(this.mat_mvp, mat_projection, this.mat_model_view);

      mat3.fromMat4(this.mat_normals, this.mat_model_view);
      mat3.transpose(this.mat_normals, this.mat_normals);
      mat3.invert(this.mat_normals, this.mat_normals);
      
      pipeline_draw_terrain({
        mat_mvp: this.mat_mvp,
        mat_model_view: this.mat_model_view,
        mat_normals: this.mat_normals,

        light_position: light_position_cam,
      });
    }
  }

  return new TerrainActor();
}
