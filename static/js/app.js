
let W = stage.clientWidth;
let H = stage.clientHeight;
let VIEW_ANGLE = 45;
let ASPECT_RATIO = W / H;
let NEAR = 0.1;
let FAR = 10000;

const renderer = new THREE.WebGLRenderer({ alpha: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera()
{
    VIEW_ANGLE, ASPECT_RATIO, NEAR, FAR
};
camera.position.y = 15;
camera.position.z = 30;
camera.rotation.x = -0.5;
scene.add(camera);

let geom = new THREE.BoxGeometry(12, 12, 12);
let material = new THREE.MeshPhongMaterial({ color: 0xffff00 });
let entity = new THREE.Mesh(geom, material);
scene.add(entity);

let sunLight = new THREE.DirectionalLight(0xccddbb);
sunLight.position.x = 0;
sunLight.position.y = 5;
sunLight.position.z = -5;
scene.add(sunLight);

let ambientLight = new THREE.AmbientLight(0x301030);
scene.add(ambientLight);

renderer.setSize(W, H);
stage.appendChild(renderer.domElement);

function update()
{
    renderer.render(scene, camera);
    requestAnimationFrame(update);

    entity.rotateY(0.025);
}
requestAnimationFrame(update);
