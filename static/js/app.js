
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

const vs_DEFAULT = `
varying vec3 E;
varying vec3 v_pos;
varying vec3 v_worldNorm;
varying float v_fresnel;
void main()
{
    vec3 worldpos = (modelMatrix * vec4(position, 1.0)).xyz;
    vec3 E = normalize(worldpos - cameraPosition);
    mat3 modelMat3 = mat3(modelMatrix[0].xyz,
                          modelMatrix[1].xyz,
                          modelMatrix[2].xyz);
    v_worldNorm = normalize(modelMat3 * normal);
    v_fresnel = min(dot(E, v_worldNorm), 1.0) * 2.0;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    v_pos = (modelMatrix * vec4(position, 1.0)).xyz;
}`;

const fs_FLATCOLOR = `
uniform vec3 mainlightpos;
varying vec3 E;
varying vec3 v_pos;
varying vec3 v_worldNorm;
varying float v_fresnel;
void main()
{
    vec3 L = mainlightpos - v_pos;
    vec3 H = (normalize(reflect(v_worldNorm, L)) + E) / 2.0;

    float ndl = dot(v_worldNorm, normalize(L));
    float ndh = dot(v_worldNorm, normalize(H));
    float fresnel = dot(v_worldNorm, normalize(E));

    vec3 diffuse = mix(vec3(0.6, 0.8, 0.9), vec3(0.9, 0.1, 0.4), 1.0 - ndl);
    vec3 fresnelColor = mix(vec3(0.0, 0.0, 0.0), vec3(1.0, 0.1, 0.1), v_fresnel);

    gl_FragColor = vec4(diffuse + fresnelColor, 1.0);
}`;

const vs_NORMALCOLOR = `
varying vec3 v_worldNorm;
varying vec2 v_uv;
void main()
{
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    mat3 modelMat3 = mat3(modelMatrix[0].xyz,
                          modelMatrix[1].xyz,
                          modelMatrix[2].xyz);
    v_worldNorm = normalize(modelMat3 * normal);
    v_uv = uv;
}`;

const fs_NORMALCOLOR = `
uniform float time;
varying vec3 v_worldNorm;
varying vec2 v_uv;
void main()
{
    vec3 nc = normalize(v_worldNorm) * 0.55;
    vec2 dd = abs(vec2(0.5, 0.5) - v_uv.xy);
    dd = dd - mod(dd, abs(cos(time) * 0.2));
    float dp = length(pow(dd, vec2(4.0, 4.0)));
    vec3 dclr = vec3(dp, dp * 0.5, dp) * 12.5;
    gl_FragColor = vec4(nc + dclr, 1.0);
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

const vs_Floor = `
varying vec3 v_pos;
varying vec3 v_worldNorm;
varying vec2 v_uv;
void main()
{
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    mat3 modelMat3 = mat3(modelMatrix[0].xyz,
                          modelMatrix[1].xyz,
                          modelMatrix[2].xyz);
    v_worldNorm = normalize(modelMat3 * normal);
    v_pos = (modelMatrix * gl_Position).xyz;
    v_uv = uv;
}`;

const fs_Floor = `
uniform float time;
varying vec3 v_pos;
varying vec3 v_worldNorm;
varying vec2 v_uv;
void main()
{
    vec3 L = vec3(0.0, 10.0, 35.0) - v_pos;
    float ndl = dot(v_worldNorm, normalize(L));
    float distance = length(L) / 40.0;
    float slicer = 16.0;
    float v = (floor((1.0 / distance) * slicer) / slicer) * 0.95;
    vec3 c1 = vec3(0.66, 0.66, 0.66) * v;

    vec2 d = abs(v_uv - vec2(0.5, 0.5));
    d = floor(d / vec2(0.465, 0.465));
    d = max(vec2(d.x, d.x), vec2(d.y, d.y));
    vec3 c2 = vec3(0.11, 0.11, 0.12) * (d.x + d.y);

    gl_FragColor = vec4((c1 + c2) * pow(ndl * 1.5, 1.25), 1.0);
}`;

function getRandomMaterial(color)
{
    let shaderSet =
    [{
        vert: vs_DEFAULT,
        frag: fs_FLATCOLOR,
    },
    {
        vert: vs_NORMALCOLOR,
        frag: fs_NORMALCOLOR,
    },
    // {
    //     vert: vs_YPOSCOLOR,
    //     frag: fs_YPOSCOLOR,
    // }
    ];

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
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(
        55, W / H, 0.1, 10000
    );
    camera.position.y = 4;
    camera.position.z = 9;
    camera.rotation.x = -Math.atan2(camera.position.y - 0.85, camera.position.z);
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
    // abstract light
    let lightPos = new THREE.Vector3(-5, 15, 10);
    uniform.mainlightpos.value = lightPos;

    // ambient light
    scene.add(new THREE.AmbientLight(0x404040, 2.0));

    // floor
    const FLOOR_SIZE = 5.5;
    const FLOOR_HEIGHT = 5.0;
    let floorMaterial = new THREE.ShaderMaterial(
    {
        uniforms: uniform,
        vertexShader: vs_Floor,
        fragmentShader: fs_Floor,
    });
    let floorView = new THREE.Mesh(
        new THREE.BoxGeometry(FLOOR_SIZE, FLOOR_HEIGHT, FLOOR_SIZE),
        floorMaterial
    );

    let floor = new THREE.Object3D();
    floor.add(floorView);
    addBody(
        floor,
        new Ammo.btBoxShape(new Ammo.btVector3(FLOOR_SIZE * 0.5, FLOOR_HEIGHT * 0.5, FLOOR_SIZE * 0.5)),
        pos=new THREE.Vector3(0, -FLOOR_HEIGHT * 0.5, 0),
        quat=null,
        mass=0,
    );
    scene.add(floor);
    
    // ammo
    let addToScene = (mesh, shape, mass, pos)=>
    {
        let x = pos.x, y = pos.y, z = pos.z;
        rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI * (Math.random() * 0.5));
        let body = addBody(mesh, shape,
            pos=new THREE.Vector3(
                x + Math.random() * 1 - 0.5 - (X * 0.5),
                y + Math.random() * 0.2 - 0.1 + 1.5,
                z + Math.random() * 1 - 0.5 - (Z * 0.5)),
            quat=rotation,
            mass=mass,
        );
        body.setRestitution(0.45);
        scene.add(mesh);
    }

    let addRandomBox = async (size, material, shape, pos)=>
    {
        let l = Math.floor(Math.random() * 3.0);
        switch (l)
        {
            case 0:
                let fontloader = new THREE.FontLoader();
                let characters = "ABCDEFGHKMNOQRSTUVWXYZ";
                let charIdx = Math.floor(Math.random() * characters.length);
                await fontloader.load("static/fonts/Ubuntu_Bold.json",
                    (loadedFont)=>
                    {
                        let font = loadedFont;
                        let geom = new THREE.TextGeometry(characters[charIdx],
                        {
                            size: size, height: size * 0.25,
                            curveSegments: 12,
                            font: font,
                            bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.01,
                        });

                        let center = new THREE.Object3D();
                        let mesh = new THREE.Mesh(geom, material);
                        mesh.position.copy(new THREE.Vector3(size * -0.5, size * -0.5, size * -0.125));
                        center.add(mesh);
                        shape = new Ammo.btBoxShape(new Ammo.btVector3(size * .5, size * .5, size * .125,  25));
                        addToScene(center, shape, size * size * size, pos);
                    });
                break;

            default:
                shape = new Ammo.btBoxShape(new Ammo.btVector3(size * .5, size * .5, size * .5));
                addToScene(
                    new THREE.Mesh(
                        new THREE.BoxGeometry(size, size, size, 4, 4, 4),
                        material),
                    shape, size * size * size, pos);
        }
    };

    let rotation = new THREE.Quaternion();
    const X = 5, Y = 8, Z = 5;
    for (var x = 0; x < X; x++)
    {
        for (var y = 0; y < Y; y++)
        {
            for (var z = 0; z < Z; z++)
            {
                let geom = null;
                let shape = null;
                let size = 0.45 + Math.random() * 0.45;
                let pos = new THREE.Vector3(x, y, z);
                let color = (x / X) * 0xff << 16 | (y / Y) * 0xff << 8 | (z / Z) * 0xff << 0;
                let material = getRandomMaterial(color);

                if (Math.random() < 0.5)
                {
                    addRandomBox(size, material, shape, pos);
                }
                else
                {
                    shape = new Ammo.btSphereShape(size * 0.5);
                    geom = new THREE.SphereGeometry(radius=size * 0.5, widthSegments=24, heightSegments=24);
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

