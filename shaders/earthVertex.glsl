varying vec2 vertexUV;
varying vec3 vectorNormal;
uniform float flatten; 

void main() {
    vertexUV = uv;
    vectorNormal = normalize(normalMatrix * normal);
    vec3 goalPosition = 2.0*6.3781 * (vec3( 0, uv.y, -2.0*uv.x ) + vec3(0.5, -0.5, 1.0));
    vec3 newPosition =  mix( position, goalPosition, flatten );;
    // if (flatten < 0.99)
    // {
    //     newPosition =  mix( position, goalPosition, flatten );
    // }
    // else
    // {
    //     newPosition = goalPosition;
    // }
    gl_Position =  projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0);
}