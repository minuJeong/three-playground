
(function ()
{
    var W = profile_stage.clientWidth;
    var H = profile_stage.clientHeight;
    let renderer = new THREE.WebGLRenderer(
    {
        alpha: true,
        antialias: true,
    });

    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera(
        55, W / H, 0.1, 1000
    );
    camera.position.y = -1.75;
    camera.position.z = 7;
    window.addEventListener("resize", (e)=>
    {
        W = profile_stage.clientWidth;
        H = profile_stage.clientHeight;
        camera.aspect = W / H;
        camera.updateProjectionMatrix();
        renderer.setSize(W, H);
    });

    scene.add(new THREE.PointLight(0xffe0b0, 1.25));
    scene.add(new THREE.AmbientLight(0x404040, 1.5));

    // anime js text
    let rotator = new THREE.Object3D();
    rotator.position.y = -0.5;
    rotator.position.z = -5;
    rotator.rotation.y = -Math.PI * 0.05;
    scene.add(rotator);

    (async function()
    {
        await new THREE.FontLoader().load("static/fonts/Ubuntu_Bold.json", function(font)
        {
            let textGeom = new THREE.TextGeometry(
                "contact", {
                    size: 1.2, height: 0.1, curveSegments: 12,
                    font: font,
                    bevelEnabled: true,
                    bevelThickness: 0.03,
                    bevelSize: 0.01,
                });
            let material = new THREE.MeshStandardMaterial(
                {
                    color: 0xffdd77,
                    emissive: 0x303030,
                });
            let textMesh = new THREE.Mesh(textGeom, material);
            let width = Math.max(...textGeom.vertices.map((v)=>v.x));
            textMesh.position.x = - width * 0.5;
            textMesh.position.y = -6;
            textMesh.castShadow = true;
            textMesh.receiveShadow = false;
            rotator.add(textMesh);
        });
    }());

    (async function ()
    {
        await new THREE.TextureLoader().load("static/imgs/profile.jpg", (texture)=>
        {
            let quadGeom = new THREE.PlaneGeometry(9, 9, 7, 7);
            let quadMaterial = new THREE.MeshBasicMaterial(
            {
                map: texture,
                side: THREE.DoubleSide,
            });

            // smooth profile image edge
            quadGeom.vertices[0].x += 0.5;
            quadGeom.vertices[0].y -= 0.5;
            quadGeom.vertices[7].x -= 0.5;
            quadGeom.vertices[7].y -= 0.5;
            quadGeom.vertices[56].x += 0.5;
            quadGeom.vertices[56].y += 0.5;
            quadGeom.vertices[63].x -= 0.5;
            quadGeom.vertices[63].y += 0.5;

            let quadMesh = new THREE.Mesh(quadGeom, quadMaterial);
            quadMesh.rotation.x = 0;
            quadMesh.position.y = 0;
            quadMesh.position.z = 0;
            quadMesh.receiveShadow = true;
            rotator.add(quadMesh);
        });
    }());

    // instead of simple loop, this reevaluates randoms
    function rotate()
    {
        anime.remove(rotator.rotation);
        anime({
            targets: rotator.rotation,
            y: -Math.PI * 0.05 + Math.random() * 0.2 - 0.1,
            duration: 1000,
            delay: Math.random() * 500,
            complete: ()=>rotate()
        });
    }
    rotate();

    profile_stage.appendChild(renderer.domElement);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';

    function animate()
    {
        requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();

}());
