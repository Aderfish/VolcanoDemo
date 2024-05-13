precision highp float;

attribute vec2 square_position;
attribute float life_in;

varying float life_out;

uniform mat4 mat_mvp;

uniform vec3 camera_right_world;
uniform vec3 camera_up_world;

uniform vec2 billboard_size;
uniform vec3 billboard_center_worldspace;

void main(){
    vec3 vertex_position_worldspace = billboard_center_worldspace
        + square_position.x * billboard_size.x * camera_right_world
        + square_position.y * billboard_size.y * camera_up_world;

    gl_Position = mat_mvp * vec4(vertex_position_worldspace, 1);

    const float dt = 1./30.;
    life_out -= life_in - dt;
}