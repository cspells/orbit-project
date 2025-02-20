varying vec2 vertexUV;
varying vec3 vectorNormal;
uniform float flatten; 
uniform float EARTH_SCALED_RADIUS; 

const float PI = 3.141592653589793;

void main() {
    vertexUV = uv;
    vectorNormal = normalize(normalMatrix * normal);
    vec3 goalPosition =  
        PI * EARTH_SCALED_RADIUS * (vec3( 0, uv.y, -2.0*uv.x ) + vec3(0.0, -0.5, 1.0)) 
        + vec3(EARTH_SCALED_RADIUS, 0.0, 0.0);
    vec3 newPosition =  mix( position, goalPosition, flatten );;
    gl_Position =  projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0);
}