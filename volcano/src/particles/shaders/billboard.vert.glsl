precision highp float;

attribute vec2 square_position;

uniform mat4 mat_mvp;

uniform vec3 camera_right_world;
uniform vec3 camera_up_world;

uniform vec2 billboard_size;
uniform vec3 billboard_center_worldspace;

void main(){
        // vec3 vertex_position_worldspace =
        //     billboard_center_worldspace
        //     + square_position.x * billboard_size.x * camera_right_world
        //     + square_position.y * billboard_size.y * camera_up_world;

    vec3 vertex_position_worldspace = billboard_center_worldspace
        + square_position.x * billboard_size.x * vec3(1., 0., 0.)
        + square_position.y * vec3(0., 1., 0.);

    //vec3 vertex_position_worldspace = vec3(square_position.x, square_position.y, 0.);
    //vec3 vertex_position_worldspace = square_position.x * vec3(1., 0., 0.) + square_position.y * vec3(0., 1., 0.);
    //vertex_position_worldspace += square_position.y * vec3(0., 1., 0.);
    

    //vec3 vertex_position_worldspace = vec3(square_position, 0);

    gl_Position = mat_mvp * vec4(vertex_position_worldspace, 1);
    //gl_Position = mat_mvp * vec4(square_position, 0, 1.);
}