precision mediump float;

attribute vec2 square_position;
attribute float start_time;
attribute float time_to_live;

varying float alpha;

uniform mat4 mat_mvp;
uniform vec3 camera_right_world, camera_up_world, billboard_center_worldspace;
uniform vec2 billboard_size;
uniform float time;

void main(){
    float lived = time - start_time;

    vec3 vertex_position_worldspace = billboard_center_worldspace
        + square_position.x * billboard_size.x * camera_right_world
        + square_position.y * billboard_size.y * camera_up_world
        + 0.1 * vec3(0, 0, billboard_size.y) * lived;

    gl_Position = mat_mvp * vec4(vertex_position_worldspace, 1);

    alpha = 1. - (lived / time_to_live);

    if (alpha < 0.){
        alpha = 0.; // dead
    }
}