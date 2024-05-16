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
    const n_particles = 100;

    let positions = [];
    let faces = [];
    let start_time = [];
    let time_to_live = [];
    let billboard_sizes = [];
    let billboard_centers_worldspace = [];

    for (let i = 0; i < n_particles; i++) {
        // randomize the billboard size between 5 and 15 in both dimensions
        let billboard_size = [5. + Math.random()*10., 5. + Math.random()*10.];
        // randomize the billboard position around (0, 0, 100) with a radius of 10
        let billboard_center_worldspace = [Math.random()*20.-10., Math.random()*20.-10., 50.];

        for(let dx = -1; dx <= 1; dx += 2) {
            for(let dy = -1; dy <= 1; dy += 2) {
                positions.push([dx*0.5, dy*0.5]);
                start_time.push(0.);
                time_to_live.push(10.);

                billboard_sizes.push(billboard_size);
                billboard_centers_worldspace.push(billboard_center_worldspace);
            }
        }
        faces.push([4*i, 4*i+1, 4*i+2]);
        faces.push([4*i+2, 4*i+3, 4*i+1]);
    }

    const pipeline_draw_billboard = regl({
        attributes: {
            square_position : {
                buffer: regl.buffer(positions),
                size: positions[0].length,
              },
            start_time: {
                buffer: regl.buffer(start_time),
                size: 1,
            },
            time_to_live: {
                buffer: regl.buffer(time_to_live),
                size: 1,
            },
            billboard_size: {
                buffer: regl.buffer(billboard_sizes),
                size: 2,
            },
            billboard_center_worldspace: {
                buffer: regl.buffer(billboard_centers_worldspace),
                size: 3,
            },
        },
        uniforms: {
            mat_mvp: regl.prop("mat_mvp"),
            camera_right_world: regl.prop("camera_right_world"),
            camera_up_world: regl.prop("camera_up_world"),
        
            time: regl.prop("time"),
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

        draw({ mat_projection, mat_view, time}) {
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
                
                time: time,
            });
        }
    }

    return new BillboardActor();
}
