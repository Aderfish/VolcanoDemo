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
    const positions = [[-0.5, -0.5], [-0.5, 0.5], [0.5, -0.5], [0.5, 0.5]];
    const faces = [[0, 1, 2], [2, 3, 1]];

    const pipeline_draw_billboard = regl({
        attributes: {
            square_position : {
                buffer: regl.buffer(positions),
                size: positions[0].length,
              },
        },
        uniforms: {
            mat_mvp: regl.prop("mat_mvp"),
            camera_right_world: regl.prop("camera_right_world"),
            camera_up_world: regl.prop("camera_up_world"),
            billboard_size: regl.prop("billboard_size"),
            billboard_center_worldspace: regl.prop("billboard_center_worldspace"),
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
            
            this.mat_view_to_model = mat3.create();

            this.camera_right_world = vec3.create();
            this.camera_up_world =   vec3.create();
        }

        draw({ mat_projection, mat_view, light_position_cam }) {
            mat4_matmul_many(this.mat_model_view, mat_view, this.mat_model_to_world);
            mat4_matmul_many(this.mat_mvp, mat_projection, this.mat_model_view);

            mat3.fromMat4(this.mat_normals, this.mat_model_view);
            mat3.transpose(this.mat_normals, this.mat_normals);
            mat3.invert(this.mat_normals, this.mat_normals);

            mat3.fromMat4(this.mat_view_to_model, this.mat_model_view);
            mat3.invert(this.mat_view_to_model, this.mat_view_to_model);

            vec3.transformMat3(this.camera_right_world, [1., 0., 0.], this.mat_view_to_model);
            vec3.transformMat3(this.camera_up_world, [0., 1., 0.], this.mat_view_to_model);
        
            pipeline_draw_billboard({
                mat_mvp: this.mat_mvp,
                
                camera_right_world: this.camera_right_world,
                camera_up_world: this.camera_up_world,

                billboard_size: vec2.fromValues(30., 10.),
                billboard_center_worldspace: vec3.fromValues(0., 0., 50.),
            });
        }
    }

    return new BillboardActor();
}
