precision highp float;

attribute vec2 square_position;

uniform mat4 mat_mvp;

uniform vec3 camera_right_world;
uniform vec3 camera_up_world;

uniform vec2 billboard_size;
uniform vec3 billboard_center_worldspace;

void main(){
    vec3 vertex_position_worldspace =
        billboard_center_worldspace
        + camera_right_world * square_position.x * billboard_size.x
        + camera_up_world * square_position.y * billboard_size.y;

    //gl_Position = mat_mvp * vec4(vertex_position_worldspace, 1);
    gl_Position = mat_mvp * vec4(square_position, 0, 1.);
}