// the size of UV textures: width = lon, height = lat*lev
uniform sampler2D U; // eastward wind
uniform sampler2D V; // northward wind

uniform sampler2D currentParticlesPosition; // (lon, lat, lev)

uniform vec3 dimension; // (lon, lat, lev)
uniform vec3 minimum; // minimum of each dimension
uniform vec3 maximum; // maximum of each dimension
uniform vec3 interval; // interval of each dimension

varying vec2 v_textureCoordinates;

vec2 mapPositionToNormalizedIndex2D(vec3 lonLatLev) {
    // ensure the range of longitude and latitude
    lonLatLev.x = mod(lonLatLev.x, 360.0);
    lonLatLev.y = clamp(lonLatLev.y, -90.0, 90.0);

    vec3 index3D = vec3(0.0);
    index3D.x = (lonLatLev.x - minimum.x) / interval.x;
    index3D.y = (lonLatLev.y - minimum.y) / interval.y;
    index3D.z = (lonLatLev.z - minimum.z) / interval.z;

    // the st texture coordinate corresponding to (col, row) index
    // example
    // data array is [0, 1, 2, 3, 4, 5], width = 3, height = 2
    // the content of texture will be
    // t 1.0
    //    |  3 4 5
    //    |
    //    |  0 1 2
    //   0.0------1.0 s

    vec2 index2D = vec2(index3D.x, index3D.z * dimension.y + index3D.y);
    vec2 normalizedIndex2D = vec2(index2D.x / dimension.x, index2D.y / (dimension.y * dimension.z));
    return normalizedIndex2D;
}

float getWind(sampler2D windTexture, vec3 lonLatLev) {
    vec2 normalizedIndex2D = mapPositionToNormalizedIndex2D(lonLatLev);
    float result = texture2D(windTexture, normalizedIndex2D).r;
    return result;
}

const mat4 kernelMatrix = mat4(
    0.0, -1.0, 2.0, -1.0, // first column
    2.0, 0.0, -5.0, 3.0, // second column
    0.0, 1.0, 4.0, -3.0, // third column
    0.0, 0.0, -1.0, 1.0 // fourth column
);
float oneDimensionInterpolation(float t, float p0, float p1, float p2, float p3) {
    vec4 tVec4 = vec4(1.0, t, t * t, t * t * t);
    tVec4 = tVec4 / 2.0;
    vec4 pVec4 = vec4(p0, p1, p2, p3);
    return dot((tVec4 * kernelMatrix), pVec4);
}

float calculateB(sampler2D windTexture, float t, float lon, float lat, float lev) {
    float lon0 = floor(lon) - 1.0 * interval.x;
    float lon1 = floor(lon);
    float lon2 = floor(lon) + 1.0 * interval.x;
    float lon3 = floor(lon) + 2.0 * interval.x;

    float p0 = getWind(windTexture, vec3(lon0, lat, lev));
    float p1 = getWind(windTexture, vec3(lon1, lat, lev));
    float p2 = getWind(windTexture, vec3(lon2, lat, lev));
    float p3 = getWind(windTexture, vec3(lon3, lat, lev));

    return oneDimensionInterpolation(t, p0, p1, p2, p3);
}

float interpolateOneTexture(sampler2D windTexture, vec3 lonLatLev) {
    float lon = lonLatLev.x;
    float lat = lonLatLev.y;
    float lev = lonLatLev.z;

    float lon0 = floor(lon);
    float lon1 = ceil(lon);
    float lat0 = floor(lat);
    float lat1 = ceil(lat);

    float u = lon - lon0;
    float v = lat - lat0;

    float b00 = getWind(windTexture, vec3(lon0, lat0, lev));
    float b10 = getWind(windTexture, vec3(lon1, lat0, lev));
    float b01 = getWind(windTexture, vec3(lon0, lat1, lev));
    float b11 = getWind(windTexture, vec3(lon1, lat1, lev));

    return mix(mix(b00, b10, u), mix(b01, b11, u), v);
}


vec3 bicubic(vec3 lonLatLev) {
    // https://en.wikipedia.org/wiki/Bicubic_interpolation#Bicubic_convolution_algorithm
    float u = interpolateOneTexture(U, lonLatLev);
    float v = interpolateOneTexture(V, lonLatLev);
    float w = 0.0;
    return vec3(u, v, w);
}
bool isUV(float num) {
    return num == 0.0;
}
void main() {
    // texture coordinate must be normalized
    vec3 lonLatLev = texture2D(currentParticlesPosition, v_textureCoordinates).rgb;
    vec3 windVector = bicubic(lonLatLev);
    float u = interpolateOneTexture(U, lonLatLev);
    float v = interpolateOneTexture(V, lonLatLev);
    if(isUV(u) || isUV(v)) {
      discard;
    }else{
      gl_FragColor = vec4(windVector, 0.0);
    }

}
