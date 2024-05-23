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

function random_in_range_list(list) {
    return random_in_range(list[0], list[1]);
}

function random_in_radius(center, radius) {
    return random_in_range(center - radius, center + radius);
}

function random_smoke_particle(smoke_parameters) {
    let size = [
        random_in_range_list(smoke_parameters.size_range_x),
        random_in_range_list(smoke_parameters.size_range_y)
    ];
    let center = [
        random_in_radius(smoke_parameters.spawn_center[0], smoke_parameters.spawn_radius),
        random_in_radius(smoke_parameters.spawn_center[1], smoke_parameters.spawn_radius),
        smoke_parameters.spawn_center[2],
    ];
    let time_to_live = random_in_range(smoke_parameters.time_to_live_low, smoke_parameters.time_to_live_high);

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
export function init_smoke_actor(
    regl,
    resources,
    smoke_parameters,
) {
    let positions = [];
    let faces = [];
    let start_time = [];
    let time_to_live = [];
    let billboard_size = [];
    let billboard_center_worldspace = [];

    for (let i = 0; i < smoke_parameters.n_particles; i++) {
        let particle = random_smoke_particle(smoke_parameters);

        let particle_start_time = -Math.random() * particle.time_to_live;

        for (let dx = -1; dx <= 1; dx += 2) {
            for (let dy = -1; dy <= 1; dy += 2) {
                positions.push([dx * 0.5, dy * 0.5]);
                start_time.push(particle_start_time);

                time_to_live.push(particle.time_to_live);
                billboard_center_worldspace.push(particle.center);
                billboard_size.push(particle.size);
            }
        }
        faces.push([4 * i, 4 * i + 1, 4 * i + 2]);
        faces.push([4 * i + 2, 4 * i + 3, 4 * i + 1]);
    }

    const pipeline_draw_smoke = regl({
        attributes: {
            square_position: {
                buffer: regl.buffer(positions),
                size: positions[0].length,
            },

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
        blend: {
            enable: true,
            func: {
                srcRGB: 'src alpha',
                srcAlpha: 'src alpha',
                dstRGB: 'one minus src alpha',
                dstAlpha: 'one minus src alpha',
            },
        },
        depth: {
            enable: true,
            mask: false,
        },

        vert: resources["particles/shaders/smoke.vert.glsl"],
        frag: resources["particles/shaders/smoke.frag.glsl"],
    });

    class SmokeActor {
        constructor() {
            this.mat_mvp = mat4.create();
            this.mat_model_view = mat4.create();
            this.mat_normals = mat3.create();
            this.mat_model_to_world = mat4.create();

            this.mat_view_to_model = mat3.create();

            this.camera_right_world = vec3.create();
            this.camera_up_world = vec3.create();

            this.start_time = start_time;
            this.time_to_live = time_to_live;
            this.billboard_center_worldspace = billboard_center_worldspace;
            this.billboard_size = billboard_size;

            this.smoke_parameters = smoke_parameters;
        }

        draw({ mat_projection, mat_view, time }) {
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
            for (let i = 0; i < this.smoke_parameters.n_particles; i++) {
                if (time - this.start_time[4 * i] > this.time_to_live[4 * i]) {
                    let new_particle = random_smoke_particle(this.smoke_parameters);

                    for (let j = 0; j < 4; j++) {
                        let vertex_index = 4 * i + j;

                        this.start_time[vertex_index] = time;
                        this.time_to_live[vertex_index] = new_particle.time_to_live;
                        this.billboard_center_worldspace[vertex_index] = new_particle.center;
                        this.billboard_size[vertex_index] = new_particle.size;
                    }
                }
            }


            pipeline_draw_smoke({
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

    return new SmokeActor();
}
