import {
    vec2,
    vec3,
    vec4,
    mat2,
    mat3,
    mat4,
} from "../../lib/gl-matrix_3.3.0/esm/index.js";
import { mat4_matmul_many } from "../utils/icg_math.js";


/**
 *
 * @param {*} regl
 * @param {*} resources
 * @returns
 */
export function init_billboard_actor(
    regl,
    resources,
) {
    const vertices = [[-0.5, -0.5], [-0.5, 0.5], [0.5, -0.5], [0.5, 0.5]];
    const faces = [[0, 2, 1], [2, 3, 1]];

    mat_model_view = regl.prop("mat_model_view");

    camera_right_world = {mat_model_view[0][0], mat_model_view[1][0], mat_model_view[2][0]};
    camera_up_world    = {mat_model_view[0][1], mat_model_view[1][1], mat_model_view[2][1]};

    const pipeline_draw_billboard = regl({
        attributes: {
            square_position : vertices,
        },
        uniforms: {
            mat_mvp: regl.prop("mat_mvp"),
            camera_right_world: camera_right_world,
            camera_up_world: camera_up_world,
            billboard_size: [10, 5],
            billboard_center_worldspace: [0, 0, 200],
        },
        elements: faces,

        vert: resources["particles/shaders/billboard.vert.glsl"],
        frag: resources["particles/shaders/billboard.frag.glsl"],
    });

    class BillboardActor {
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

            pipeline_draw_billboard({
                mat_mvp: this.mat_mvp,
                mat_model_view: this.mat_model_view,
                mat_normals: this.mat_normals,

                light_position: light_position_cam,
            });
        }
    }

    return new BillboardActor();
}
