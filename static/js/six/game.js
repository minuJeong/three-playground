
var renderer = null;
var scene = null;
var clock = null;
var camera = null;
var composer;

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
    renderer = new THREE.WebGLRenderer();
    clock = new THREE.Clock();
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 1000);
    camera.position.z = 10;

    composer = new POSTPROCESSING.EffectComposer(renderer);
    composer = new POSTPROCESSING.EffectComposer(renderer);
    composer.addPass(new POSTPROCESSING.RenderPass(scene, camera));
    stage.appendChild(renderer.domElement);
    readStageSize();

    let sphereGeo = new THREE.SphereGeometry(1.0, 12, 12);
    let mesh = new THREE.Mesh(sphereGeo, new THREE.MeshStandardMaterial());
    scene.add(mesh);
}

function render()
{
    requestAnimationFrame(render);
    composer.render();
}

(function()
{
    initThree();
    let pressedKeys = [];
    window.addEventListener("resize", (e)=>readStageSize());
})();
