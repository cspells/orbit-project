uniform float opacity;
uniform vec3 sunDirection;
uniform vec3 atmosphereColor; 
varying vec3 vectorNormal;

void main() {

    // Add mixing for night time
    float angleToSun = dot(vectorNormal, sunDirection);
    angleToSun -= 0.12;
    angleToSun = clamp(10.0*angleToSun, -1.0, 1.0);
    float mixAmount = angleToSun*0.5 + 0.5; 
    mixAmount *= 0.9;
    mixAmount += 0.08;
    // mixAmount *= 0.8;
    // mixAmount += 0.15;
    // vec3 finalColor = mix(nightSample, daySample, mixAmount);

    // float k = 2.0;
    // float x0 = -0.2;
    // float sunset = 1.0 / (1.0 + exp(-k*(angleToSun - x0)));
    // float sunset2 = 1.0 / (1.0 + exp(k*(angleToSun - x0)));
    // vec3 sunsetColor = vec3(0.5, 0.3, 0.1) * pow(sunset * sunset2, 0.2);
    float k = 2.2;
    float x0 = -0.6;
    float sunset = 1.0 / (1.0 + exp(-k*(angleToSun - x0)));
    float sunset2 = 1.0 / (1.0 + exp(k*(angleToSun + x0)));
    vec3 sunsetColor =  vec3(1.0, 0.3, 0.1) * pow(sunset * sunset2, 2.4);

 // 1.25 1.35
    float intensity = pow(1.4 - dot(vectorNormal, vec3(0.0, 0.0, 1.0)), 2.0);
    gl_FragColor = vec4(atmosphereColor + sunsetColor, mixAmount*opacity) * intensity;
}