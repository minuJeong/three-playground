
let renderer = null;
let scene = null;
let clock = null;
let camera = null;
let composer = null;
let sun = null;
let uniforms =
{
    T:
    {
        value: 0.0,
    },

    L:
    {
        type: 'v3',
        value: new THREE.Vector3(0, 1, 0),
    },

    V:
    {
        type: 'v3',
        value: new THREE.Vector3(0, 0, -1),
    }
};

var W = stage.clientWidth;
var H = stage.clientHeight;

function readStageSize()
{
    W = stage.clientWidth;
    H = stage.clientHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
}

function initThree()
{
    renderer = new THREE.WebGLRenderer({
        alpha: true,
    });

    clock = new THREE.Clock();
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 10000);
    camera.position.y = 1;
    camera.position.z = 10;
    uniforms.V.value = camera.getWorldDirection();

    var angle = 0;
    anime({
        loop: -1,
        update: ()=>
        {
            angle += 0.02;
            angle %= Math.PI * 2.0;

            camera.position.x = Math.cos(angle) * 10.0;
            camera.position.z = Math.sin(angle) * 10.0;

            camera.lookAt(0, 0, 0);
        },
    });
    readStageSize();

    composer = new POSTPROCESSING.EffectComposer(renderer);
    composer.addPass(new POSTPROCESSING.RenderPass(scene, camera));
    let bloom = new POSTPROCESSING.BloomPass();
    bloom.renderToScreen = true;
    composer.addPass(bloom);

    let sphereGeo = new THREE.SphereGeometry(0.25, 12, 12);
    let commonMaterial = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: commonVertexShader,
        fragmentShader: commonFragmentShader,
    });
    let mesh = new THREE.Mesh(sphereGeo, commonMaterial);
    scene.add(mesh);

    sun = new THREE.PointLight();
    sun.position.x = -7;
    sun.position.y = 12;
    sun.position.z = 10;
    uniforms.L.value.copy(sun.position);
    uniforms.L.value.normalize();
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0x404040, 2.0));
    stage.appendChild(renderer.domElement);
}

function render()
{
    requestAnimationFrame(render);
    composer.render(scene, camera);

    let deltaTime = clock.getDelta();
    uniforms.T.value += deltaTime;
}

(function()
{
    initThree();
    render();
    let pressedKeys = [];
    window.addEventListener("resize", (e)=>readStageSize());
})();
