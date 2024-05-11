import { mat3, mat4 } from "../../lib/gl-matrix_3.3.0/esm/index.js";
import { mat4_matmul_many } from "../utils/icg_math.js";
import { icg_mesh_make_uv_sphere } from "../utils/icg_mesh.js";

export class LavaRenderingActor {
  constructor(regl, resources, simulation_parameters) {
    this.particle_radius = simulation_parameters.particle_radius;

    const mesh_uvsphere = icg_mesh_make_uv_sphere(15);
    this.resources = resources;

    this.pipeline = regl({
      attributes: {
        position: mesh_uvsphere.vertex_positions,
        normal: mesh_uvsphere.vertex_normals,
      },
      // Faces, as triplets of vertex indices
      elements: mesh_uvsphere.faces,

      // Uniforms: global data available to the shader
      uniforms: {
        mat_mvp: regl.prop("mat_mvp"),
        mat_normals: regl.prop("mat_normals"),

        light_position: regl.prop("light_position"),

        particle_position: regl.prop("particle_position"),
        particle_radius: regl.prop("particle_radius"),
        particle_temperature: regl.prop("particle_temperature"),
      },

      vert: resources["lava/shaders/lava_particle.vert.glsl"],
      frag: resources["lava/shaders/lava_particle.frag.glsl"],
    });
  }

  draw(scene_info) {
    const { mat_projection, mat_view, light_position_cam, particles_data } =
      scene_info;
    const mat_mvp = mat4.create();
    const mat_normals = mat3.create();

    mat4_matmul_many(mat_mvp, mat_projection, mat_view);

    mat3.fromMat4(mat_normals, mat_view);
    mat3.transpose(mat_normals, mat_normals);
    mat3.invert(mat_normals, mat_normals);

    const particles_to_draw = [];

    for (const particle of particles_data) {
      const particle_position = particle.slice(0, 3);
      const particle_temperature = particle[3];

      particles_to_draw.push({
        mat_mvp: mat_mvp,
        mat_normals: mat_normals,

        light_position: light_position_cam,

        particle_position: particle_position,
        particle_radius: this.particle_radius,
        particle_temperature: particle_temperature,
      });
    }

    this.pipeline(particles_to_draw);
  }
}
