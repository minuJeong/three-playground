
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
    // anime js text
    let rotator = new THREE.Object3D();
    rotator.position.x = 10;
    rotator.position.y = 5;
    rotator.position.z = 4;
    rotator.rotation.y = Math.PI * 3.85;
    scene.add(rotator);
    let fontloader = new THREE.FontLoader();
    fontloader.load("static/fonts/Ubuntu_Bold.json", function(font)
    {
        let textGeom = new THREE.TextGeometry(
            "anime js", {
                size: 2, height: 0.35, curveSegments: 12,
                font: font,
                bevelEnabled: true,
                bevelThickness: 0.03,
                bevelSize: 0.01,
            });

        let material = new THREE.MeshStandardMaterial({ color: 0xffdd77 });
        let mesh = new THREE.Mesh(textGeom, material);
        let width = Math.max(...textGeom.vertices.map((v)=>v.x));
        mesh.position.x = - width * 0.5;
        rotator.add(mesh);

        let circShadowGeom = new THREE.CircleGeometry(2.5, 24);
        let circShadowMesh = new THREE.Mesh(
            circShadowGeom, new THREE.MeshBasicMaterial({ color: 0x191919 }))
        circShadowMesh.position.copy(rotator.position);
        circShadowMesh.position.y = 0;
        circShadowMesh.rotation.x = - Math.PI * 0.5;
        scene.add(circShadowMesh);

        // instead of simple loop, this reevaluates randoms
        function rotate()
        {
            anime.remove(rotator.rotation);
            rotator.rotation.y %= Math.PI * 2;
            anime({
                targets: rotator.rotation,
                y: Math.PI * 3.85 + Math.random() * 0.1 - 0.05,
                duration: 2000,
                complete: ()=>rotate()
            });
        }
        rotate();
        anime({
            targets: rotator.position,
            y: 2.5,
            direction: "alternate",
            easing: "linear",
            duration: 2000,
            loop: true,
        });

        anime({
            targets: circShadowMesh.scale,
            x: 1.25,
            y: 1.25,
            z: 1.25,
            direction: "alternate",
            easing: "linear",
            duration: 2000,
            loop: true,
        });
    });

    // light
    light = new THREE.PointLight(0xffffff, 1.0);
    light.castShadow = true;
    light.position.x = 5;
    light.position.y = 5;
    light.position.z = 10;
    function blink()
    {
        anime({
            targets: light,
            intensity: 0.8 + Math.random() * 0.1,
            direction: 'alternate',
            duration: 1000 + Math.random() * 1000,
            complete: blink,
        });
    }
    blink();
    scene.add(light);

    let ambientLight = new THREE.AmbientLight(0x403080);
    scene.add(ambientLight);

    // floor
    addBody(new THREE.Object3D(),
        new Ammo.btBoxShape(new Ammo.btVector3(20, 1, 20)),
        pos=new THREE.Vector3(0, -0.5, 0),
        quat=null,
        mass=0,
    );
    
    // ammo
    let rotation = new THREE.Quaternion();
    for (var x = 0; x < 4; x++)
    {
        for (var y = 0; y < 4; y++)
        {
            for (var z = 0; z < 4; z++)
            {
                let geom = null;
                let shape = null;
                if (Math.random() < 0.9)
                {
                    geom = new THREE.BoxGeometry(1, 1, 1);
                    shape = new Ammo.btBoxShape(new Ammo.btVector3(.5, .5, .5));
                } else
                {
                    geom = new THREE.SphereGeometry(
                        radius=0.5, widthSegments=6, heightSegments=6
                    );
                    shape = new Ammo.btSphereShape(0.25);
                }

                let v = Math.pow(Math.random(), 2.0);
                let boxMat = new THREE.MeshStandardMaterial({
                    color: (x / 4) * 0xff << 16 | (y / 4) * 0xff << 8 | (z / 4) * 0xff << 0,
                    smoothness: v,
                    matalness: v,
                    wireframe: true,
                    wireframeLinewidth: 0.25,
                });

                rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * (Math.random() * 0.5));
                let mesh = new THREE.Mesh(geom, boxMat);
                addBody(
                    mesh,
                    shape,
                    pos=new THREE.Vector3(
                        -10 + x + Math.random() * 0.4 - 0.2,
                        5 + y + Math.random() * 0.2 - 0.1,
                        3 + z + Math.random() * 0.4 - 0.2),
                    quat=rotation
                );
                scene.add(mesh);
            }
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

    if (mass > 0 || true)
    {
        // DISABLE_DEACTIVATION
        body.setActivationState(4);
    }
    
    rigidBodyObjs.push(threeObj);
    ammoWorld.addRigidBody(body);
    return body;
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

