precision mediump float;

varying float alpha;

const vec3 grey = vec3(0.6, 0.6, 0.6);

void main(){
    gl_FragColor = vec4(grey * alpha, alpha);
}