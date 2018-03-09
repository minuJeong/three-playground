
const W = stage.clientWidth;
const H = stage.clientHeight;
let renderer = null;
let scene = null;
let camera = null;
let entity = null;
let light = null;

const defaultVertexShader = `

void main()
{
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const defaultFragShader = `
void main()
{
    gl_FragColor = vec4(1, 1, 1, 1);
}
`;

function init()
{
    renderer = new THREE.WebGLRenderer({ alpha: true });
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        55, W / H, 0.1, 10000
    );
    camera.position.y = 15;
    camera.position.z = 30;
    camera.rotation.x = -Math.atan2(camera.position.y, camera.position.z);
    scene.add(camera);

    entity = new THREE.Object3D();
    scene.add(entity);

    let fontloader = new THREE.FontLoader();
    fontloader.load("static/fonts/Ubuntu_Bold.json", function(font)
        {
            let geom = new THREE.TextGeometry(
                "Abstract", {
                    size: 2, height: 0.1, curveSegments: 5,
                    font: font,
                });
            let material = new THREE.MeshStandardMaterial();
            let subentity = new THREE.Mesh(geom, material);
            subentity.position.x = -5;
            entity.add(subentity);
        });

    light = new THREE.PointLight(0xffffff, 1.0);
    light.position.y = 6;
    light.position.z = 6;
    scene.add(light);

    let ambientLight = new THREE.AmbientLight(0x403080);
    scene.add(ambientLight);

    renderer.setSize(W, H);
    stage.appendChild(renderer.domElement);
}

function update()
{
    renderer.render(scene, camera);
    entity.rotateY(0.0125);

    requestAnimationFrame(update);
}

stage.onmousemove = function(e)
{
    light.position.x = -20 + (e.clientX / W) * 40;
    light.position.y = 20 - (e.clientY / H) * 40;
    light.position.z = -light.position.y;
}

stage.onmousedown = function(e)
{
    
}

stage.onmouseup = function(e)
{
    
}

stage.onmouseleave = function(e)
{
    stage.onmouseup(e);
}

init();
requestAnimationFrame(update);
