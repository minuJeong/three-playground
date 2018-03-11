
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

const uniform = {
    time: {
        value: 0.0
    },
    mainlightpos: {
        type: 'v3',
        value: new THREE.Vector3(0, 1, 0)
    },
};

const vs_SCALE = `
varying vec3 v_pos;
varying vec3 v_norm;
void main()
{
    v_norm = (modelViewMatrix * vec4(normal, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    v_pos = gl_Position.xyz;
}`;

const fs_FLATCOLOR = `
uniform vec3 mainlightpos;
varying vec3 v_pos;
varying vec3 v_norm;
void main()
{
    vec3 L = mainlightpos - v_pos;
    vec3 N = normalize(v_norm);
    vec3 H = (reflect(N, L) + normalize(v_pos - cameraPosition)) / 2.0;

    float ndl = dot(N, normalize(L));
    float ndh = dot(N, normalize(H));
    float r = floor(ndl * 24.0) / 24.0;

    gl_FragColor = vec4(
        r, r, r, 1.0
    );
}`;

const vs_NORMALCOLOR = `
varying vec3 v_normal;
void main()
{
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    v_normal = normalize(gl_Position.xyz);
}`;

const fs_NORMALCOLOR = `
varying vec3 v_normal;
void main()
{
    gl_FragColor = vec4(v_normal * 1.0, 1.0);
}
`;

const vs_YPOSCOLOR = `
varying float v_ypos;
varying vec2 v_uv;
void main()
{
    v_uv = uv;
    v_ypos = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const fs_YPOSCOLOR = `
uniform float time;
varying float v_ypos;
varying vec2 v_uv;
void main()
{
    float delt = cos(time * 3.0) * 8.0 + 10.0;
    gl_FragColor = vec4(
        cos(v_ypos) * 0.5 + 0.5,
        0.15 + floor(v_uv.x * delt) / delt,
        0.15 + floor(v_uv.y * delt) / delt,
        1
    );
}`;

function getRandomMaterial(color)
{
    let shaderSet =
    [{
        vert: vs_SCALE,
        frag: fs_FLATCOLOR,
    },
    {
        vert: vs_NORMALCOLOR,
        frag: fs_NORMALCOLOR,
    },
    {
        vert: vs_YPOSCOLOR,
        frag: fs_YPOSCOLOR,
    }];

    const SHADER_COUNT = shaderSet.length;
    let material = null;
    let i = Math.floor(Math.random() * (SHADER_COUNT));
    if(i >= SHADER_COUNT)
    {
        material = new THREE.MeshStandardMaterial({ color: color, });
    } else {
        let targetSet = shaderSet[i];
        material = new THREE.ShaderMaterial(
        {
            uniforms: uniform,
            vertexShader: targetSet.vert,
            fragmentShader: targetSet.frag,
            // transparent: true,
        });
    }
    return material;
}

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
    camera.position.y = 4;
    camera.position.z = 10;
    camera.rotation.x = -Math.atan2(camera.position.y - 2.75, camera.position.z);
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

async function initScene()
{
    // base light
    light = new THREE.PointLight(0xffe0b0, 1.5);
    light.decay = 2.0;
    light.castShadow = false;
    light.shadow.bias = 0.00001;
    light.shadow.mapSize.Width = 1024;
    light.shadow.mapSize.Height = 1024;
    let lightPos = new THREE.Vector3(10, 15, 20);
    light.position.copy(lightPos);
    lightPos.normalize();
    uniform.mainlightpos.value = lightPos;
    scene.add(light);
    scene.add(new THREE.PointLightHelper(light));

    // ambient light
    scene.add(new THREE.AmbientLight(0x404040, 2.0));

    // floor
    const FLOOR_SIZE = 7.75;
    let floorMaterial = new THREE.MeshLambertMaterial({ color: 0x808080 });
    let floorView = new THREE.Mesh(new THREE.PlaneGeometry(FLOOR_SIZE, FLOOR_SIZE), floorMaterial);
    floorView.position.y = 1.0;
    floorView.rotation.x = - Math.PI * 0.5;
    floorView.receiveShadow = true;
    let floor = new THREE.Object3D();
    floor.add(floorView);
    addBody(
        floor,
        new Ammo.btBoxShape(new Ammo.btVector3(FLOOR_SIZE * 0.5, 1, FLOOR_SIZE * 0.5)),
        pos=new THREE.Vector3(0, 0, 0),
        quat=null,
        mass=0,
    );
    scene.add(floor);
    
    // ammo
    let addToScene = (mesh, shape, mass, pos)=>
    {
        let x = pos.x, y = pos.y, z = pos.z;
        rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * (Math.random() * 0.5));
        mesh.castShadow = true;
        let body = addBody(mesh, shape,
            pos=new THREE.Vector3(
                x + Math.random() * 1 - 0.5 - (X * 0.5),
                y + Math.random() * 0.2 - 0.1 + 1.5,
                z + Math.random() * 1 - 0.5 - (Z * 0.5)),
            quat=rotation,
            mass=mass,
        );
        body.setRestitution(0.25);
        scene.add(mesh);
    }

    let addRandomBox = async (size, material, shape, pos)=>
    {
        let l = Math.floor(Math.random() * 3.0);
        switch (l)
        {
            case 0:
                let fontloader = new THREE.FontLoader();
                let chrFrom = "A".charCodeAt(0);
                let chrTo = "z".charCodeAt(0);
                let charCode = Math.floor(Math.random() * (chrTo - chrFrom)) + chrFrom;
                await fontloader.load("static/fonts/Ubuntu_Bold.json",
                    (loadedFont)=>
                    {
                        let font = loadedFont;
                        let geom = new THREE.TextGeometry(String.fromCharCode(charCode),
                        {
                            size: size, height: size * 0.85,
                            curveSegments: 12,
                            font: font,
                            bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.01,
                        });

                        let center = new THREE.Object3D();
                        let mesh = new THREE.Mesh(geom, material);
                        mesh.position.copy(new THREE.Vector3(size * -0.5, size * -0.5, size * -0.5));
                        center.add(mesh);
                        addToScene(center, shape, size * size * size, pos);
                    });
                break;

            default:
                addToScene(
                    new THREE.Mesh(
                        new THREE.BoxGeometry(size, size, size, 4, 4, 4),
                        material),
                    shape, size * size * size, pos);
        }
    };

    let rotation = new THREE.Quaternion();
    const X = 4, Y = 8, Z = 4;
    for (var x = 0; x < X; x++)
    {
        for (var y = 0; y < Y; y++)
        {
            for (var z = 0; z < Z; z++)
            {
                let geom = null;
                let shape = null;
                let size = 0.7 + Math.random() * 0.4;
                let pos = new THREE.Vector3(x, y, z);
                let color = (x / X) * 0xff << 16 | (y / Y) * 0xff << 8 | (z / Z) * 0xff << 0;
                let material = getRandomMaterial(color);

                if (Math.random() < 0.5)
                {
                    shape = new Ammo.btBoxShape(new Ammo.btVector3(size * .5, size * .5, size * .5));
                    addRandomBox(size, material, shape, pos);
                }
                else
                {
                    shape = new Ammo.btSphereShape(size * 0.5);
                    geom = new THREE.SphereGeometry(radius=size * 0.5, widthSegments=12, heightSegments=12);
                    addToScene(new THREE.Mesh(geom, material), shape, size * size * size, pos);
                }                
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
    uniform.time.value += deltaTime;

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

            if (pos.y() < -7 || Math.abs(pos.x()) > 10 || Math.abs(pos.z()) > 10)
            {
                trans.setOrigin(new Ammo.btVector3(
                    Math.random() * 1 - 0.5,
                    10,
                    Math.random() * 1 - 0.5));
                body.setWorldTransform(trans);
                body.setLinearVelocity(new Ammo.btVector3(0, 0, 0));
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

