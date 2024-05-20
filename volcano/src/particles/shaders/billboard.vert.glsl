precision mediump float;

attribute vec2 square_position;
attribute float start_time;
attribute float time_to_live;
attribute vec2 billboard_size;
attribute vec3 billboard_center_worldspace;

varying float alpha;
varying vec2 frag_square_coords;

uniform mat4 mat_mvp;
uniform vec3 camera_right_world, camera_up_world;
uniform float time;

void main(){
    float lived = time - start_time;

    vec3 vertex_position_worldspace = billboard_center_worldspace
        + square_position.x * billboard_size.x * camera_right_world
        + square_position.y * billboard_size.y * camera_up_world
        + 1. * vec3(0, 0, billboard_size.y) * lived;

    gl_Position = mat_mvp * vec4(vertex_position_worldspace, 1);

    alpha = 1. - (lived / time_to_live);

    if (alpha < 0.){
        alpha = 0.; // dead
    }

    frag_square_coords = square_position;
}