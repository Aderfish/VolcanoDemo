attribute vec2 position;

varying vec2 v2f_tex_coords;

void main(){
  v2f_tex_coords = position;

	gl_Position = vec4(position, 0.0, 1.0);
}