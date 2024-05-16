import {
    vec2,
    vec3,
    vec4,
    mat2,
    mat3,
    mat4,
} from "../../lib/gl-matrix_3.3.0/esm/index.js";
import { mat4_matmul_many } from "../utils/icg_math.js";

function random_in_range(min, max) {
    return Math.random() * (max - min) + min;
}

function random_smoke_particle(){
    let size = [random_in_range(5., 15.), random_in_range(2., 8.)];
    let center = [random_in_range(-10., 10.), random_in_range(-10., 10.), 50.];
    let time_to_live = random_in_range(5., 10.);
    return {
        size: size,
        center: center,
        time_to_live: time_to_live,
    };
}

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
    let billboard_size = [];
    let billboard_center_worldspace = [];

    for (let i = 0; i < n_particles; i++) {
        let particle = random_smoke_particle();

        for(let dx = -1; dx <= 1; dx += 2) {
            for(let dy = -1; dy <= 1; dy += 2) {
                positions.push([dx*0.5, dy*0.5]);
                start_time.push(0.);

                time_to_live.push(particle.time_to_live);
                billboard_center_worldspace.push(particle.center);
                billboard_size.push(particle.size);
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
            /*start_time: {
                buffer: regl.buffer(start_time),
                size: 1,
            },
            time_to_live: {
                buffer: regl.buffer(time_to_live),
                size: 1,
            },
            billboard_size: {
                buffer: regl.buffer(billboard_size),
                size: 2,
            },
            billboard_center_worldspace: {
                buffer: regl.buffer(billboard_center_worldspace),
                size: 3,
            },*/

            start_time: regl.prop("start_time"),
            time_to_live: regl.prop("time_to_live"),
            billboard_size: regl.prop("billboard_size"),
            billboard_center_worldspace: regl.prop("billboard_center_worldspace"),
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

            this.start_time = start_time;
            this.time_to_live = time_to_live;
            this.billboard_center_worldspace = billboard_center_worldspace;
            this.billboard_size = billboard_size;
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

            // iterate over all particles and respawn them if they are dead
            for (let i = 0; i < n_particles; i++) {
                if (time - this.start_time[4*i] > this.time_to_live[4*i]) {
                    let new_particle = random_smoke_particle();
                
                    for(let j = 0; j < 4; j++) {
                        let vertex_index = 4*i + j;
                    
                        this.start_time[vertex_index] = time;
                        this.time_to_live[vertex_index] = new_particle.time_to_live;
                        this.billboard_center_worldspace[vertex_index] = new_particle.center;
                        this.billboard_size[vertex_index] = new_particle.size;
                    }
                }
            } 


            pipeline_draw_billboard({
                mat_mvp: this.mat_mvp,
                
                camera_right_world: this.camera_right_world,
                camera_up_world: this.camera_up_world,

                billboard_size: vec2.fromValues(30., 10.),
                billboard_center_worldspace: vec3.fromValues(0., 0., 50.),
                
                time: time,

                start_time: this.start_time,
                time_to_live: this.time_to_live,
                billboard_center_worldspace: this.billboard_center_worldspace,
                billboard_size: this.billboard_size,
            });
        }
    }

    return new BillboardActor();
}
