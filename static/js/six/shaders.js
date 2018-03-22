commonVertexShader = `
uniform float T;
varying vec3 N;
varying vec2 UV;
void main()
{
    N = normalMatrix * normal;
    vec3 pos = position;
    vec4 wpos = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_Position = wpos;
}
`;

commonFragmentShader = `
uniform vec3 L;
uniform vec3 V;
varying vec3 N;
varying vec2 UV;
void main()
{
    vec3 H = (L - V) * 0.5;
    float ndl = max(dot(N, L), 0.0);
    float ndh = max(dot(N, H), 0.0);
    vec3 difspc = vec3(0.7, 0.5, 0.3) * (ndl + pow(ndh, 2.5));
    vec3 ambient = vec3(UV * 0.2, 0.18);
    gl_FragColor = vec4(max(difspc, ambient), 1.0);
}
`;
