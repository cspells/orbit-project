uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform sampler2D mapTexture;
uniform sampler2D cloudTexture;
uniform float opacity;
uniform vec3 sunDirection;
uniform vec3 atmosphereColor; 
uniform float flatten; 
uniform float time; 
varying vec2 vertexUV;
varying vec3 vectorNormal;

const float cloudCover = 0.5; // Controls amount of clouds (0-1)
const float cloudSharpness = 0.8; // Controls edge sharpness of clouds

const float PI = 3.141592653589793;
const float gridSize = 10.0;

float getGridLine(float coordinate) {
    
    // Get distance to nearest grid line with anti-aliasing
    float distanceToLine = abs(mod(coordinate, gridSize));
    distanceToLine = min(distanceToLine, gridSize - distanceToLine);
    
    // Use fwidth for screen-space derivative
    float pixelWidth = fwidth(coordinate);
    return 1.0 - smoothstep(0.0, pixelWidth * 2.0, distanceToLine);
}

vec3 blurSample(sampler2D tex, vec2 uv, float blur) {
    vec2 texelSize = 1.0 / vec2(textureSize(tex, 0));
    vec3 result = vec3(0.0);
    float total = 0.0;
    
    for(float x = -2.0; x <= 2.0; x++) {
        for(float y = -2.0; y <= 2.0; y++) {
            vec2 offset = vec2(x, y) * texelSize * blur;
            float weight = 1.0 - length(offset) * 0.5;
            if(weight <= 0.0) continue;
            result += texture2D(tex, uv + offset).rgb * weight;
            total += weight; 
        }
    }
    
    return result / total;
}

float rand(vec2 co) {
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

void main() {
    // Convert UV coordinates to degrees (0-1 to 0-360 for longitude, 0-180 for latitude)
    vec2 degrees = vec2(vertexUV.x * 360.0, vertexUV.y * 180.0);

    float longitudeGrid = getGridLine(degrees.x);
    float latitudeGrid = getGridLine(degrees.y);

    // Combine grids
    float gridStrength = max(longitudeGrid, latitudeGrid);
    gridStrength *= 0.3 * flatten; // Your original opacity adjustment
    
    // Sample equirectangular satellite maps 
    vec3 nightSample = texture2D(nightTexture, vertexUV).xyz;
    vec3 daySample = texture2D(dayTexture, vertexUV).xyz;
    vec3 mapSample = texture2D(mapTexture, vertexUV).xyz;
    // Calculate cloud UVs with rotation
    vec2 cloudUV = vertexUV;
    // Offset the U coordinate based on time
    cloudUV.x = fract(cloudUV.x + 0.0000015*time); // fract keeps it in 0-1 range
    vec3 cloudSample = blurSample(cloudTexture, cloudUV, 0.5); // texture2D(cloudTexture, cloudUV).xyz;
    
     
    // Add mixing for night time
    float angleToSun = dot(vectorNormal, sunDirection);
    angleToSun -= 0.25;
    float sunsetAngleToSun = clamp(5.0*angleToSun, -1.0, 1.0);
    float mixAmount = smoothstep(-.1, .1, angleToSun);  

    // Add shading for atmosphere  1.08  
    float intensity = 1.4 - dot(
        vectorNormal, vec3(0.0, 0.0, 1.0));
    vec3 atmosphere = (1.0 - 0.6*flatten) * atmosphereColor * smoothstep(0.2, 0.93, intensity);   //pow(intensity, 2.0); //0.58
    daySample += atmosphere;
    
    vec3 finalColor = mix(nightSample, daySample, mixAmount);
    
    float k = 1.8*1.1;
    float x0 = -0.5;
    float sunset = 1.0 / (1.0 + exp(-k*(sunsetAngleToSun - x0 + .2)));
    float sunset2 = 1.0 / (1.0 + exp(k*(sunsetAngleToSun + x0 - .2)));
    vec3 sunsetColor =  vec3(0.5, 0.3, 0.1) * pow(sunset * sunset2 , 2.0);
    // float sunset = smoothstep(-0.5,.05, -angleToSun); 
    // float sunset2 = smoothstep(-1.25,0.9, angleToSun); 
    // vec3 sunsetColor =  vec3(0.5, 0.3, 0.1) * pow(sunset * sunset2 , 2.0);

    float darken = 0.8; //mixAmount*0.9 + 0.1;
    vec3 temp = finalColor*darken + 0.85*sunsetColor;

    float cloudOpacity = 1.0 * ( 0.5 + mixAmount*0.5);
    float cloudAlpha = (cloudSample.r + cloudSample.g + cloudSample.b) / 3.0;
    cloudAlpha = smoothstep(0.2, 0.8, cloudAlpha);  // Only show moderately bright to bright areas
    // // cloudAlpha = pow(cloudAlpha, 2.0);  // Square it for sharper contrast
    // // Add clouds
    temp = mix(temp, clamp(mixAmount, 0.2, 1.0)*cloudSample.rgb, cloudAlpha);

    vec3 colorWithSVG = temp + mapSample;

    // Apply grid lines
    colorWithSVG = mix(colorWithSVG, vec3(1.0), gridStrength);

    // Dithering smooths out banding artifacts
    float dither = rand(gl_FragCoord.xy) * 0.015625; // 1.0/64.0
    colorWithSVG.rgb += dither;


    
    gl_FragColor = vec4(colorWithSVG, opacity);
    
}