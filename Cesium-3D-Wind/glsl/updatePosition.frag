uniform sampler2D currentParticlesPosition; // (lon, lat, lev)
uniform sampler2D currentParticlesSpeed; // (u, v, w, normalization)

uniform float minLon; // 最小经度值
uniform float maxLon; // 最大经度值
uniform float maxLat; // 最大纬度值
uniform float minLat; // 最小纬度值

varying vec2 v_textureCoordinates;

vec2 lengthOfLonLat(vec3 lonLatLev) {
    // unit conversion: meters -> longitude latitude degrees
    // see https://en.wikipedia.org/wiki/Geographic_coordinate_system#Length_of_a_degree for detail

    // Calculate the length of a degree of latitude and longitude in meters
    float latitude = radians(lonLatLev.y);

    float term1 = 111132.92;
    float term2 = 559.82 * cos(2.0 * latitude);
    float term3 = 1.175 * cos(4.0 * latitude);
    float term4 = 0.0023 * cos(6.0 * latitude);
    float latLength = term1 - term2 + term3 - term4;

    float term5 = 111412.84 * cos(latitude);
    float term6 = 93.5 * cos(3.0 * latitude);
    float term7 = 0.118 * cos(5.0 * latitude);
    float longLength = term5 - term6 + term7;

    return vec2(longLength, latLength);
}
bool isInsideRectangle(vec3 lonLatLev) {
    // 判断经纬度是否在矩形内部
    bool isLonInside = lonLatLev.x >= minLon && lonLatLev.x <= maxLon;
    bool isLatInside = lonLatLev.y >= minLat && lonLatLev.y <= maxLat;
    return isLonInside && isLatInside;
}
void updatePosition(vec3 lonLatLev, vec3 speed) {
    vec2 lonlatLengthgth = lengthOfLonLat(lonLatLev);
    if(lonLatLev.x!=0.0 || lonLatLev.y!=0.0){
        float u = speed.x / lonlatLengthgth.x;
        float v = speed.y / lonlatLengthgth.y;
        float w = 0.0;
        vec3 windVectorInLonLatLev = vec3(u, v, w);

        vec3 nextParticle = lonLatLev + windVectorInLonLatLev;
        if(isInsideRectangle(nextParticle)) {
            gl_FragColor = vec4(nextParticle, 0.0);
        }else {
            gl_FragColor = vec4(lonLatLev, 0.0);
        }
    }else{
        gl_FragColor = vec4(lonLatLev, 0.0);
    }


}


void main() {
    // texture coordinate must be normalized
    vec3 lonLatLev = texture2D(currentParticlesPosition, v_textureCoordinates).rgb;
    vec3 speed = texture2D(currentParticlesSpeed, v_textureCoordinates).rgb;

    updatePosition(lonLatLev, speed);
}
