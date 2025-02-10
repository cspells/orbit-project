uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform sampler2D mapTexture;
uniform float opacity;
uniform vec3 sunDirection;
uniform vec3 atmosphereColor; 
uniform float flatten; 
varying vec2 vertexUV;
varying vec3 vectorNormal;

void main() {
    // Sample equirectangular satellite maps 
    vec3 nightSample = texture2D(nightTexture, vertexUV).xyz;
    vec3 daySample = texture2D(dayTexture, vertexUV).xyz;
    vec3 mapSample = texture2D(mapTexture, vertexUV).xyz;

    // Add mixing for night time
    float angleToSun = dot(vectorNormal, sunDirection);
    angleToSun -= 0.2;
    angleToSun = clamp(9.0*angleToSun, -1.0, 1.0);
    float mixAmount = angleToSun*0.5 + 0.5; 
    mixAmount *= 0.8;
    mixAmount += 0.15;

    // Add shading for atmosphere  1.08  
    float intensity = 1.01 - dot(
        vectorNormal, vec3(0.0, 0.0, 1.0));
    vec3 atmosphere = (1.0 - flatten) * atmosphereColor * pow(intensity, 0.6); //0.58
    daySample += atmosphere;
    
    vec3 finalColor = mix(nightSample, daySample, mixAmount);
    
    float k = 1.8;
    float x0 = -0.5;
    float sunset = 1.0 / (1.0 + exp(-k*(angleToSun - x0)));
    float sunset2 = 1.0 / (1.0 + exp(k*(angleToSun + x0)));
    vec3 sunsetColor =  vec3(0.5, 0.3, 0.1) * pow(sunset * sunset2, 2.4);

    float darken = 0.8; //mixAmount*0.9 + 0.1;
    vec3 temp = finalColor*darken + 0.85*sunsetColor;

    vec3 colorWithSVG = temp + mapSample;


    gl_FragColor = vec4(colorWithSVG, opacity);
    
}