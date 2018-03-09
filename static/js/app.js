
var W = stage.clientWidth;
var H = stage.clientHeight;

function toThreeVec3(ammoVec3)
{
    return new THREE.Vector3(ammoVec3.x, ammoVec3.y, ammoVec3.z);
}

function toAmmoVec3(threeVec3)
{
    return new Ammo.btVector3(threeVec3.x, threeVec3.y, threeVec3.z);
}

function toAmmoQuat(threeQuat)
{
    return new Ammo.btQuaternion(threeQuat.x, threeQuat.y, threeQuat.z, threeQuat.w);
}

let renderer = null;
let clock = null;
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

let rigidBodyObjs = [];
let collisionConfiguration = null;
let dispatcher = null;
let broadphase = null;
let solver = null;
let ammoWorld = null;

function initThree()
{
    renderer = new THREE.WebGLRenderer(
    {
        alpha: true,
        antialias: true,
    });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    clock = new THREE.Clock();
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

    let rotator = new THREE.Object3D();
    rotator.position.x = 3;
    rotator.rotation.y = Math.PI * 0.15;
    rotator.position.z = 2;
    scene.add(rotator);
    let fontloader = new THREE.FontLoader();
    fontloader.load("static/fonts/Ubuntu_Bold.json", function(font)
    {
        let geom = new THREE.TextGeometry(
            "Minu", {
                size: 2, height: 0.5, curveSegments: 5,
                font: font,
            });

        let material = new THREE.MeshStandardMaterial({ color: 0xffdd77 });
        let subentity = new THREE.Mesh(geom, material);
        subentity.position.x = -3.5;
        rotator.add(subentity);

        anime({
            targets: rotator.rotation,
            y: -Math.PI * 1.85,
            duration: 2000,
            loop: true,
            delay: 500,
        });
    });

    light = new THREE.PointLight(0xffffff, 2.0);
    light.castShadow = true;
    light.position.x = 2;
    light.position.y = 5;
    light.position.z = 10;
    scene.add(light);

    let ambientLight = new THREE.AmbientLight(0x403080);
    scene.add(ambientLight);

    renderer.setSize(W, H);
    stage.appendChild(renderer.domElement);
}

function initAmmo()
{
    collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
    broadphase = new Ammo.btDbvtBroadphase();
    solver = new Ammo.btSequentialImpulseConstraintSolver();
    ammoWorld = new Ammo.btDiscreteDynamicsWorld(
        dispatcher, broadphase, solver, collisionConfiguration
    );

    ammoWorld.setGravity(new Ammo.btVector3(0, -9.82, 0));
}

function initScene()
{
    addBody(new THREE.Object3D(),
        new Ammo.btBoxShape(new Ammo.btVector3(20, 1, 20)),
        pos=new THREE.Vector3(0, -2.0, 0),
        quat=null,
        mass=0,
    );

    let boxGeom = new THREE.BoxGeometry(1, 1, 1);
    let boxMat = new THREE.MeshStandardMaterial({ color: 0x3388ff });
    let rotation = new THREE.Quaternion();
    for (var x = 0; x < 4; x++)
    {
        for (var y = 0; y < 4; y++)
        {
            rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * (Math.random() * 0.5));
            addBody(new THREE.Mesh(boxGeom, boxMat),
                new Ammo.btBoxShape(new Ammo.btVector3(.5, .5, .5)),
                pos=new THREE.Vector3(-8 + x, 5 + y, 2.5),
                quat=rotation
            );
        }
    }
}

function animate()
{
    requestAnimationFrame(animate);
    renderer.render(scene, camera);

    let deltaTime = clock.getDelta();
    ammoWorld.stepSimulation(deltaTime, 10);

    let trans = new Ammo.btTransform();
    rigidBodyObjs.map((threeObj)=>
    {
        let body = threeObj.userData.ammoBody;
        let state = body.getMotionState();
        if(state)
        {
            state.getWorldTransform(trans);
            let pos = trans.getOrigin();
            let quat = trans.getRotation();
            threeObj.position.set(pos.x(), pos.y(), pos.z());
            threeObj.quaternion.set(quat.x(), quat.y(), quat.z(), quat.w());
        }
    });
}

function addBody(threeObj, ammoShape, pos=null, quat=null, mass=1)
{
    if (pos == null) { pos = new THREE.Vector3(0, 0, 0); }
    if (quat == null)
    {
        quat = new THREE.Quaternion();
        quat.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI >> 1);
    }

    threeObj.position.copy(pos);
    threeObj.quaternion.copy(quat);

    let transform = new Ammo.btTransform();
    transform.setIdentity();
    transform.setOrigin(toAmmoVec3(pos));
    transform.setRotation(toAmmoQuat(quat));
    let motionState = new Ammo.btDefaultMotionState(transform);
    var localInertia = new Ammo.btVector3(0, 0, 0);
    ammoShape.calculateLocalInertia(mass, localInertia);

    var body = new Ammo.btRigidBody(
        new Ammo.btRigidBodyConstructionInfo(mass, motionState, ammoShape, localInertia)
    );

    threeObj.userData.ammoBody = body;
    scene.add(threeObj);

    if (mass > 0 || true)
    {
        // DISABLE_DEACTIVATION
        body.setActivationState(4);
    }
    
    rigidBodyObjs.push(threeObj);
    ammoWorld.addRigidBody(body);
}

stage.onmousemove = function(e)
{

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

stage.onclick = function(e)
{

}

window.onresize = function(e)
{
    W = stage.clientWidth;
    H = stage.clientHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
}

Ammo().then(()=>
{
    initThree();
    initAmmo();
    initScene();
    animate();
});

