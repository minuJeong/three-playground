
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
    camera.position.y = 8;
    camera.position.z = 15;
    camera.rotation.x = -Math.atan2(camera.position.y - 4.5, camera.position.z);
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
    // base light
    light = new THREE.PointLight(0xffe0b0, 1.5);
    light.decay = 2.0;
    light.castShadow = true;
    light.shadow.bias = 0.0001;
    light.shadow.mapSize.Width = 1024;
    light.shadow.mapSize.Height = 1024;
    light.position.x = 10;
    light.position.y = 15;
    light.position.z = 20;
    scene.add(light);

    // ambient light
    scene.add(new THREE.AmbientLight(0x404040, 1.5));

    // floor
    let floorMaterial = new THREE.MeshLambertMaterial({ color: 0x252525 });
    let floorView = new THREE.Mesh(new THREE.PlaneGeometry(15, 15), floorMaterial);
    floorView.position.y = 1.0;
    floorView.rotation.x = - Math.PI * 0.5;
    floorView.receiveShadow = true;
    let floor = new THREE.Object3D();
    floor.add(floorView);
    addBody(
        floor,
        new Ammo.btBoxShape(new Ammo.btVector3(7.5, 1, 7.5)),
        pos=new THREE.Vector3(0, 0, 0),
        quat=null,
        mass=0,
    );
    scene.add(floor);
    
    // ammo
    let rotation = new THREE.Quaternion();
    const X = 8, Y = 6, Z = 8;
    for (var x = 0; x < X; x++)
    {
        for (var y = 0; y < Y; y++)
        {
            for (var z = 0; z < Z; z++)
            {
                let geom = null;
                let shape = null;
                let size = 0.4 + Math.random() * 1.0
                if (Math.random() < 0.85)
                {
                    geom = new THREE.BoxGeometry(size, size, size, 4, 4, 4);
                    shape = new Ammo.btBoxShape(new Ammo.btVector3(size * .5, size * .5, size * .5));
                } else
                {
                    geom = new THREE.SphereGeometry(radius=size * 0.5, widthSegments=12, heightSegments=12);
                    shape = new Ammo.btSphereShape(size * 0.5);
                }

                let v = Math.random();
                let color = (x / X) * 0xff << 16 | (y / Y) * 0xff << 8 | (z / Z) * 0xff << 0;
                let boxMat = new THREE.MeshStandardMaterial({
                    color: color,
                    roughness: v > 0.5 ? 0.8 : 0.2
                });

                let mesh = new THREE.Mesh(geom, boxMat);
                if (v > 0.5)
                {
                    let boxMatWire = new THREE.MeshBasicMaterial(
                    {
                        color: 0x000000,
                        wireframe: true,
                        wireframeLinewidth: 0.125,
                        opacity: 0.15,
                        transparent: true,
                    });
                    mesh.add(new THREE.Mesh(geom, boxMatWire));
                }

                rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * (Math.random() * 0.5));
                mesh.castShadow = true;
                addBody(mesh, shape,
                    pos=new THREE.Vector3(
                        x + Math.random() * 0.4 - 0.2 - (X * 0.5),
                        y + Math.random() * 0.2 - 0.1 + 10,
                        z + Math.random() * 0.4 - 0.2 - (Z * 0.5)),
                    quat=rotation,
                    mass=size*size*size,
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

            if (pos.y() < -5)
            {
                trans.setOrigin(new Ammo.btVector3(
                    Math.random() * 4 - 2,
                    15,
                    Math.random() * 4 - 2));
                body.setWorldTransform(trans);
            }

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

window.addEventListener("resize", (e)=>
{
    W = stage.clientWidth;
    H = stage.clientHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
});

Ammo().then(()=>
{
    initThree();
    initAmmo();
    initScene();
    animate();
});

