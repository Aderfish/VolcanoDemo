precision mediump float;

varying float alpha;

const vec3 grey = vec3(0.6, 0.6, 0.6);

varying vec2 frag_square_coords;

void main(){
    if(length(frag_square_coords) < 0.5) {
        gl_FragColor = vec4(grey * alpha, alpha);
    } else {
        gl_FragColor = vec4(1., 0., 0., 0.);
    }
}