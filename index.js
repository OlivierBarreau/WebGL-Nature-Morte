"use strict"; // good practice - see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode

var axes = false;
// Position initiale de la bulle d'eau
var posX = -500;
var posY = 600;
var posZ = 900;
//Angle de rotation de la bulle d'eau et de la caméra
var angle = 0;
//
var pasRotation = 0.3;
// Variable booléenne pour gérer l'animation, la vue et la position de la caméra
var bulleView = false;
var animation = false;
var lookAt = true;
var wholeBubView = false;
var change = false;
var phongBalancedMaterial;
var clock = new THREE.Clock();
var loader = new THREE.OBJLoader();
const textureLoader = new THREE.TextureLoader();
var pecheMaterial, pommeMaterial, sprite, tableMaterial;
var refractor, bulle, stats, mirrorCam;
const WaterRefractionShader = THREE.WaterRefractionShader;
var ambientLight, light, light1, light2, spotLight, camera, scene, renderer, cameraControls, effectController;
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(1024, { format: THREE.RGBAFormat, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter });

// Initialisation
function init() {
    // Canvas
    var canvasWidth = 750;
    var canvasHeight = 450;
    var canvasRatio = canvasWidth / canvasHeight;
    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x808080, 3000, 6000); //Brouillard
    bulle = new THREE.SphereGeometry(200, 200); // BUlle d'eau
    // Light
    ambientLight = new THREE.AmbientLight(0xFFFFFF, 1);
    light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(0, 5000, 0);
    light1 = new THREE.DirectionalLight(0xffffff, 1);
    light1.position.set(0, -1, 0);
    light2 = new THREE.DirectionalLight(0xffffff, 1);
    light2.position.set(-1, 0, 0);
    // Spotlight
    spotLight = new THREE.SpotLight(0xFFFFFF, 1);
    spotLight.penumbra = 0.5;
    spotLight.angle = 40 * Math.PI / 180;
    spotLight.decay = 2;
    spotLight.distance = 2500;
    // Placement Spotlight
    var mtxTrans1 = new THREE.Matrix4();
    mtxTrans1.identity();
    mtxTrans1.makeTranslation(800, 350, 200);
    var rotationAxis1 = new THREE.Vector3();
    rotationAxis1.set(0, 1, 0);
    var rotation1 = new THREE.Matrix4();
    var theta1 = -60 * Math.PI / 180;
    rotation1.makeRotationAxis(rotationAxis1, theta1);
    rotation1.multiply(mtxTrans1);
    var mtxTrans2 = new THREE.Matrix4();
    mtxTrans2.identity();
    mtxTrans2.makeTranslation(0, 0, -600);
    rotation1.multiply(mtxTrans2);
    spotLight.matrixAutoUpdate = false;
    spotLight.matrix = rotation1;

    // Modification
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 512; //largeur de la map
    spotLight.shadow.mapSize.height = 512;
    // Hauteur de la map
    spotLight.shadow.camera.near = 0.5; // dimension near du Z-buffer
    spotLight.shadow.camera.far = 5000 // dimension far du Z-buffer
    spotLight.shadow.focus = 1;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.gammaInput = true;
    renderer.gammaOutput = true;
    renderer.shadowMap.enabled = true;
    renderer.setSize(canvasWidth, canvasHeight);
    renderer.setClearColor(0xAAAAAA, 1.0);

    // Camera
    camera = new THREE.PerspectiveCamera(45, canvasRatio, 1, 40000);
    camera.position.set(2000, 1000, 0);

    // Controls
    cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
    cameraControls.target.set(0, 301, 0);

    // Stats
    stats = new Stats();
    stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
    // document.getElementById('webGL').appendChild(stats.dom);

    // MAterials (Texture avec du bruit)
    var materialColor = new THREE.Color();
    materialColor.setRGB(1.0, 1.0, 1.0);
    phongBalancedMaterial = createShaderMaterial("phongBalanced", light, ambientLight);
    phongBalancedMaterial.uniforms.uMaterialColor.value.copy(materialColor);
    phongBalancedMaterial.side = THREE.DoubleSide;

    // Textures
    //Pomme
    let texture = textureLoader.load('./textures/textureObjet/pommeVerte.jpg');
    pommeMaterial = new THREE.MeshPhongMaterial({ map: texture, shininess: 100 });
    // Peche
    texture = textureLoader.load('./textures/textureObjet/pecheTexture.jpg');
    pecheMaterial = new THREE.MeshPhongMaterial({ map: texture, shininess: 100 });
    // Snow
    sprite = textureLoader.load('textures/sprites/snowflake2.png');
    //Bois pour la table
    texture = textureLoader.load('./textures/textureObjet/wood_old_0069_01_s.jpg');
    tableMaterial = new THREE.MeshPhongMaterial({ map: texture, color: 0xF60381F, shininess: 50 });
}

// Création de la table
function creerTable(autresElements) {
    var cube;
    cube = new THREE.Mesh(
        new THREE.BoxGeometry(1000, 100, 1000), tableMaterial);
    cube.receiveShadow = true;
    cube.position.x = 0;
    cube.position.y = 30 + 70;
    cube.position.z = 0;
    autresElements.add(cube);
    scene.add(cube);
}

//Ajouter la nappe sur la table
function ajouterNappe(autresElements) {
    var material = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
    // Charger le fichier
    loader.load(
        './obj/tableCloth.obj',
        function(object) {
            object.traverse(function(child) {
                if (child instanceof THREE.Mesh) {
                    child.material = material;
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            var tablecloth = new THREE.Object3D();
            tablecloth.add(object);

            var rotationAxis = new THREE.Vector3();
            rotationAxis.set(0, 1, 0);
            var rotation = new THREE.Matrix4();
            var theta = 90 * Math.PI / 180;
            rotation.makeRotationAxis(rotationAxis, theta);

            var mtxTrans = new THREE.Matrix4();
            mtxTrans.identity();
            mtxTrans.makeTranslation(130, -203, -125);
            mtxTrans.multiply(rotation);

            var mtxScale = new THREE.Matrix4();
            mtxScale.identity();
            mtxScale.makeScale(100, 100, 100);
            mtxTrans.multiply(mtxScale);

            tablecloth.matrixAutoUpdate = false;
            tablecloth.matrix = mtxTrans;

            autresElements.add(tablecloth);
            scene.add(tablecloth);
        }
    );
}

//Création du verre d'eau
function creerVerreEau(autresElements) {
    var glassMaterial = new THREE.MeshPhongMaterial({ color: 0xFFFFFF, side: THREE.DoubleSide, specular: 0xFFFFFF, shininess: 100, opacity: 0.3, transparent: true });
    var waterMaterial = new THREE.MeshPhongMaterial({ shininess: 50, opacity: 0.3 });
    waterMaterial.color.setRGB(31 / 255, 86 / 255, 169 / 255);
    waterMaterial.specular.setRGB(0.5, 0.5, 0.5);

    var verre = new THREE.Object3D();

    //Cyclindre base verre
    var radiusTop = 100;
    var radiusBottom = radiusTop;
    var height = 10;
    var cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(radiusTop, radiusBottom,
            height, 32), glassMaterial);
    cylinder.position.x = -100;
    cylinder.position.y = 50 + 100 + height / 2;
    cylinder.position.z = -170;
    verre.add(cylinder);

    // Cyclindre pieds inferieur verre
    var radiusTop = 12;
    var radiusBottom = 25;
    var height = 100;
    var cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(radiusTop, radiusBottom,
            height, 32), glassMaterial);
    cylinder.position.x = -100;
    cylinder.position.y = 50 + 100 + height / 2 + 10 / 2;
    cylinder.position.z = -170;
    verre.add(cylinder);

    //Cylindre liaison entre pieds inferieur et superieur
    var radiusTop = 21;
    var radiusBottom = radiusTop;
    var height = 10;
    var cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(radiusTop, radiusBottom,
            height, 32), glassMaterial);
    cylinder.position.x = -100;
    cylinder.position.y = 50 + 100 + 10 + 100;
    cylinder.position.z = -170;
    verre.add(cylinder);

    //Cyclindre pieds superieur verre
    var radiusTop = 25;
    var radiusBottom = 12;
    var height = 50;
    var cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(radiusTop, radiusBottom,
            height, 32), glassMaterial);
    cylinder.position.x = -100;
    cylinder.position.y = 50 + 100 + 10 + 100 + 5 + height / 2;
    cylinder.position.z = -170;
    verre.add(cylinder);

    //Sphere corps inferieur
    var sphere = new THREE.Mesh(
        new THREE.SphereGeometry(80, 32, 16, 100, Math.PI * 2, Math.PI / 2, Math.PI / 2), glassMaterial);
    sphere.position.x = -100;
    sphere.position.y = 50 + 100 + 10 + 100 + 5 + 50 + 80 - 5;
    sphere.position.z = -170;
    verre.add(sphere);

    //Cylindre corps superieur
    var radiusTop = 90 + 5;
    var radiusBottom = 80;
    var height = 120;
    var cylinder = new THREE.Mesh(
        new THREE.CylinderGeometry(radiusTop, radiusBottom,
            height, 32, 2, true), glassMaterial);
    cylinder.position.x = -100;
    cylinder.position.y = 50 + 100 + 10 + 100 + 5 + 50 + 80 - 5 + height / 2;
    cylinder.position.z = -170;
    verre.add(cylinder);
    verre.traverse(function(object) {
        if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });
    // Water option 1
    // var sphere = new THREE.SphereGeometry(75, 32, 16, 100, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    // var water = new THREE.Reflector(sphere, {
    //     textureWidth: 1024,
    //     textureHeight: 1024,
    //     color: 0x999999,
    //     clipBias: clipBias,
    //     shader: WaterRefractionShader
    // });
    // water.position.set(-100, 390, -170);
    // var cylinder = new THREE.CylinderGeometry(75, 75, 0, 32);
    // var cap = new THREE.Refractor(cylinder, {
    //     textureWidth: 512,
    //     textureHeight: 512,
    //     color: 0x999999,
    //     clipBias: clipBias,
    //     shader: WaterRefractionShader
    // });
    // cap.position.set(-100, 390, -170);
    // verre.add(water);
    // verre.add(cap);

    //water option 2
    //Body
    var sphere = new THREE.SphereGeometry(75, 32, 16, 100, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    var water = new THREE.Mesh(sphere, waterMaterial);
    water.position.set(-100, 390, -170);
    //Water cap
    var cylinder = new THREE.CylinderGeometry(75, 75, 0, 32);
    var cap = new THREE.Mesh(cylinder, waterMaterial);
    cap.position.set(-100, 390, -170);
    verre.add(water);
    verre.add(cap);

    autresElements.add(verre);
    scene.add(verre);
}

//Création de la coupe à fruits
function creerCoupeAFruits(autresElements) {
    var sphere = new THREE.Mesh(
        new THREE.SphereGeometry(200, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), phongBalancedMaterial);
    sphere.position.x = -100;
    sphere.position.y = 392.5;
    sphere.position.z = 200;
    autresElements.add(sphere);
    scene.add(sphere);

    const points = [];
    for (let i = 0; i < 30; i++) {
        points.push(new THREE.Vector2(Math.sin(i * 0.2) * Math.sin(i * 0.1) * 15 + 80, (i - 5) * 2));
    }
    var pieds = new THREE.Mesh(new THREE.LatheGeometry(points, 20), phongBalancedMaterial);
    pieds.position.set(-100, 50 + 100 + 10, 200);

    autresElements.add(pieds);
    scene.add(pieds);
}

// Création mur
function creerMurFond(autresElements) {
    var crateTxr = new THREE.TextureLoader().load('./textures/textureObjet/backgroundTexture1.jpg');
    var material = new THREE.MeshPhongMaterial({ map: crateTxr, shininess: 30 });

    // Mur du fond
    var cube;
    cube = new THREE.Mesh(
        new THREE.BoxGeometry(10, 1000, 1000), material);
    cube.position.x = -500;
    cube.position.y = 500;
    cube.position.z = 0;
    autresElements.add(cube);
    scene.add(cube);
}

// Couteau
function ajouterCouteau(autresElements) {
    let texture = new THREE.TextureLoader().load('./textures/textureObjet/couteau.jpg');
    let couteauMaterial = new THREE.MeshPhongMaterial({ map: texture, shininess: 100 });

    var loader = new THREE.OBJLoader();
    loader.load(
        './obj/Knife.obj',
        function(object) {
            var couteau = new THREE.Object3D();
            couteau.add(object);
            // Application de la texture
            couteau.traverse(function(child) {
                if (child instanceof THREE.Mesh) {
                    child.material = couteauMaterial;
                }
            });
            couteau.rotation.x = 90 * Math.PI / 180;
            couteau.rotation.z = -50 * Math.PI / 180;

            couteau.scale.x = 15;
            couteau.scale.y = 15;
            couteau.scale.z = 15;

            couteau.position.y = 165;
            couteau.position.z = -290;
            couteau.position.x = 360;
            couteau.material = couteauMaterial;

            autresElements.add(couteau);
            scene.add(couteau);
        }
    );
}

//Pomme 1
function ajouterPomme1(fruit) {
    // Charger le fichier
    loader.load(
        './obj/apple.obj',
        function(object) {
            object.traverse(function(child) {
                if (child instanceof THREE.Mesh) {
                    child.material = pommeMaterial;
                }
            });

            object.position.y = 300;
            object.position.z = -180;
            object.position.x = 220;

            var pomme = new THREE.Object3D();
            pomme.add(object);

            pomme.scale.x = 0.5;
            pomme.scale.y = 0.5;
            pomme.scale.z = 0.5;

            fruit.add(pomme);
            scene.add(pomme);
        }
    );

}

//Pomme 2
function ajouterPomme2(fruit) {
    // Charger le fichier
    loader.load(
        './obj/apple.obj',
        function(object) {
            object.traverse(function(child) {
                if (child instanceof THREE.Mesh) {
                    child.material = pommeMaterial;
                }
            });

            var pomme = new THREE.Object3D();
            pomme.add(object);

            var rotationAxis = new THREE.Vector3();
            rotationAxis.set(0, 0, 1);
            var rotation = new THREE.Matrix4();
            var theta = 150 * Math.PI / 180;
            rotation.makeRotationAxis(rotationAxis, theta);

            var rotationAxis2 = new THREE.Vector3();
            rotationAxis2.set(1, 0, 0);
            var rotation2 = new THREE.Matrix4();
            var theta2 = 20 * Math.PI / 180;
            rotation2.makeRotationAxis(rotationAxis2, theta2);

            var mtxTrans = new THREE.Matrix4();
            mtxTrans.identity();
            mtxTrans.makeTranslation(250, 260, 250);
            mtxTrans.multiply(rotation);
            mtxTrans.multiply(rotation2);

            var mtxScale = new THREE.Matrix4();
            mtxScale.identity();
            mtxScale.makeScale(0.5, 0.5, 0.5);
            mtxTrans.multiply(mtxScale);

            pomme.matrixAutoUpdate = false;
            pomme.matrix = mtxTrans;

            fruit.add(pomme);
            scene.add(pomme);
        }
    );
}

//Pomme 3
function ajouterPomme3(fruit) {
    // Charger le fichier
    loader.load(
        './obj/apple.obj',
        function(object) {
            object.traverse(function(child) {
                if (child instanceof THREE.Mesh) {
                    child.material = pommeMaterial;
                }
            });

            var pomme = new THREE.Object3D();
            pomme.add(object);

            var rotationAxis = new THREE.Vector3();
            rotationAxis.set(1, 0, 0);
            var rotation = new THREE.Matrix4();
            var theta = -90 * Math.PI / 180;
            rotation.makeRotationAxis(rotationAxis, theta);

            var mtxTrans = new THREE.Matrix4();
            mtxTrans.identity();
            mtxTrans.makeTranslation(-170, 340, 220);
            mtxTrans.multiply(rotation);

            var mtxScale = new THREE.Matrix4();
            mtxScale.identity();
            mtxScale.makeScale(0.4, 0.4, 0.4);
            mtxTrans.multiply(mtxScale);

            pomme.matrixAutoUpdate = false;
            pomme.matrix = mtxTrans;

            fruit.add(pomme);
            scene.add(pomme);
        }
    );
}

function ajouterPomme4(fruit) {
    loader.load(
        './obj/apple.obj',
        function(object) {
            object.traverse(function(child) {
                if (child instanceof THREE.Mesh) {
                    child.material = pommeMaterial;
                }
            });

            var pomme = new THREE.Object3D();
            pomme.add(object);

            var rotationAxis = new THREE.Vector3();
            rotationAxis.set(1, 0, 0);
            var rotation = new THREE.Matrix4();
            var theta = 90 * Math.PI / 180;
            rotation.makeRotationAxis(rotationAxis, theta);

            var rotationAxis2 = new THREE.Vector3();
            rotationAxis2.set(0, 0, 1);
            var rotation2 = new THREE.Matrix4();
            var theta2 = 50 * Math.PI / 180;
            rotation2.makeRotationAxis(rotationAxis2, theta2);

            var mtxTrans = new THREE.Matrix4();
            mtxTrans.identity();
            mtxTrans.makeTranslation(210, 300, -80);
            mtxTrans.multiply(rotation);
            mtxTrans.multiply(rotation2);

            var mtxScale = new THREE.Matrix4();
            mtxScale.identity();
            mtxScale.makeScale(0.5, 0.5, 0.5);
            mtxTrans.multiply(mtxScale);

            pomme.matrixAutoUpdate = false;
            pomme.matrix = mtxTrans;

            fruit.add(pomme);
            scene.add(pomme);
        }
    );
}

//Grappe
function ajouterGrappe(fruit) {
    var pommeMaterial = new THREE.MeshPhongMaterial({
        color: 0x34c924,
        shininess: 100,
    });

    // Charger le fichier
    loader.load(
        './obj/grappe.obj',
        function(object) {
            object.traverse(function(child) {
                if (child instanceof THREE.Mesh) {
                    child.material = pommeMaterial;
                }
            });

            var grappe = new THREE.Object3D();
            grappe.add(object);

            var mtx = new THREE.Matrix4();
            mtx.identity();

            var rotationAxis = new THREE.Vector3();
            rotationAxis.set(1, 0, 0);
            var rotation = new THREE.Matrix4();
            var theta = -90 * Math.PI / 180;
            rotation.makeRotationAxis(rotationAxis, theta);

            var mtxTrans = new THREE.Matrix4();
            mtxTrans.identity();
            mtxTrans.makeTranslation(-100, 400, 185);
            mtxTrans.multiply(rotation);

            var mtxScale = new THREE.Matrix4();
            mtxScale.identity();
            mtxScale.makeScale(25, 25, 25);
            mtxTrans.multiply(mtxScale);

            grappe.matrixAutoUpdate = false;
            grappe.matrix = mtxTrans;

            fruit.add(grappe);
            scene.add(grappe);
        }
    );

    var sphere = new THREE.Mesh(
        new THREE.SphereGeometry(20, 20), pommeMaterial);
    sphere.position.x = 42;
    sphere.position.y = 420;
    sphere.position.z = 430;
    scene.add(sphere);
    var cylinder = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 150, 32), pommeMaterial);
    cylinder.position.x = -20;
    cylinder.position.y = 400;
    cylinder.position.z = 370;
    // cylinder.rotation.x = 50 * Math.PI / 180;
    cylinder.rotation.y = -50 * Math.PI / 180;
    cylinder.rotation.z = -70 * Math.PI / 180;
    scene.add(sphere);
    scene.add(cylinder)

    // Valeurs fixes
    var curr = { x: 42, y: 420, z: 430 };
    var targ = { x: 42, y: 170, z: 430 };
    //Valeur à modifier
    var current = { x: 42, y: 420, z: 430 };
    var target = { x: 42, y: 170, z: 430 };
    // DOWN
    var tweenDown = new TWEEN.Tween(current)
        .to(targ, 5000);
    tweenDown.onUpdate(function() {
        sphere.position.x = current.x;
        sphere.position.y = current.y;
        sphere.position.z = current.z;
    });
    tweenDown.delay(6000);
    tweenDown.easing(TWEEN.Easing.Bounce.Out);
    //UP
    var tweenUp = new TWEEN.Tween(target)
        .to(curr, 5000);
    tweenUp.onUpdate(function() {
        sphere.position.x = target.x;
        sphere.position.y = target.y;
        sphere.position.z = target.z;
    });
    tweenUp.delay(6000);
    tweenUp.easing(TWEEN.Easing.Bounce.In);

    tweenDown.chain(tweenUp);
    tweenUp.chain(tweenDown);
    tweenDown.start();
}

// Pêche
function ajouterPeche(fruit) {
    // Charger le fichier
    loader.load(
        './obj/peche.obj',
        function(object) {
            object.traverse(function(child) {
                if (child instanceof THREE.Mesh) {
                    child.material = pecheMaterial;
                }
            });

            var poire = new THREE.Object3D();
            poire.add(object);

            var mtx = new THREE.Matrix4();
            mtx.identity();

            var rotationAxis = new THREE.Vector3();
            rotationAxis.set(1, 0, 0);
            var rotation = new THREE.Matrix4();
            var theta = -90 * Math.PI / 180;
            rotation.makeRotationAxis(rotationAxis, theta);

            var mtxTrans = new THREE.Matrix4();
            mtxTrans.identity();
            mtx.makeTranslation(-155, 360, 270);
            mtx.multiply(rotation);

            var mtxScale = new THREE.Matrix4();
            mtxScale.identity();
            mtxScale.makeScale(15, 15, 15);
            mtx.multiply(mtxScale);

            poire.matrixAutoUpdate = false;
            poire.matrix = mtx;

            fruit.add(poire);
            scene.add(poire);
        }
    );
}

// Pêche
function ajouterPeche1(fruit) {
    // Charger le fichier
    loader.load(
        './obj/peche.obj',
        function(object) {
            object.traverse(function(child) {
                if (child instanceof THREE.Mesh) {
                    child.material = pecheMaterial;
                }
            });

            var poire = new THREE.Object3D();
            poire.add(object);

            var mtx = new THREE.Matrix4();
            mtx.identity();

            var rotationAxis = new THREE.Vector3();
            rotationAxis.set(1, 0, 0);
            var rotation = new THREE.Matrix4();
            var theta = -90 * Math.PI / 180;
            rotation.makeRotationAxis(rotationAxis, theta);

            var mtxTrans = new THREE.Matrix4();
            mtxTrans.identity();
            mtx.makeTranslation(-155, 360, 100);
            mtx.multiply(rotation);

            var mtxScale = new THREE.Matrix4();
            mtxScale.identity();
            mtxScale.makeScale(12, 12, 12);
            mtx.multiply(mtxScale);

            poire.matrixAutoUpdate = false;
            poire.matrix = mtx;

            fruit.add(poire);
            scene.add(poire);
        }
    );
}

// Pêche
function ajouterPeche2(fruit) {
    // Charger le fichier
    loader.load(
        './obj/peche.obj',
        function(object) {
            object.traverse(function(child) {
                if (child instanceof THREE.Mesh) {
                    child.material = pecheMaterial;
                }
            });

            var poire = new THREE.Object3D();
            poire.add(object);

            var mtx = new THREE.Matrix4();
            mtx.identity();

            var rotationAxis = new THREE.Vector3();
            rotationAxis.set(1, 0, 0);
            var rotation = new THREE.Matrix4();
            var theta = -90 * Math.PI / 180;
            rotation.makeRotationAxis(rotationAxis, theta);

            var mtxTrans = new THREE.Matrix4();
            mtxTrans.identity();
            mtx.makeTranslation(-245, 382, 200);
            mtx.multiply(rotation);

            var mtxScale = new THREE.Matrix4();
            mtxScale.identity();
            mtxScale.makeScale(15, 15, 15);
            mtx.multiply(mtxScale);

            poire.matrixAutoUpdate = false;
            poire.matrix = mtx;

            fruit.add(poire);
            scene.add(poire);
        }
    );
}

// Pêche
function ajouterPecheTableMilieu(fruit) {
    // Charger le fichier
    loader.load(
        './obj/peche.obj',
        function(object) {
            object.traverse(function(child) {
                if (child instanceof THREE.Mesh) {
                    child.material = pecheMaterial;
                }
            });

            var poire = new THREE.Object3D();
            poire.add(object);

            var mtx = new THREE.Matrix4();
            mtx.identity();

            var rotationAxis = new THREE.Vector3();
            rotationAxis.set(0, 1, 0);
            var rotation = new THREE.Matrix4();
            var theta = -90 * Math.PI / 180;
            rotation.makeRotationAxis(rotationAxis, theta);

            var mtxTrans = new THREE.Matrix4();
            mtxTrans.identity();
            mtx.makeTranslation(230, 210, -40);
            mtx.multiply(rotation);

            var mtxScale = new THREE.Matrix4();
            mtxScale.identity();
            mtxScale.makeScale(16, 16, 16);
            mtx.multiply(mtxScale);

            poire.matrixAutoUpdate = false;
            poire.matrix = mtx;
            fruit.add(poire);

            scene.add(poire);
        }
    );
}

// Pêche
function ajouterPecheTableGauche(fruit) {
    // Charger le fichier
    loader.load(
        './obj/peche.obj',
        function(object) {
            object.traverse(function(child) {
                if (child instanceof THREE.Mesh) {
                    child.material = pecheMaterial;
                }
            });

            var poire = new THREE.Object3D();
            poire.add(object);

            var mtx = new THREE.Matrix4();
            mtx.identity();

            var rotationAxis = new THREE.Vector3();
            rotationAxis.set(0, 1, 0);
            var rotation = new THREE.Matrix4();
            var theta = -40 * Math.PI / 180;
            rotation.makeRotationAxis(rotationAxis, theta);

            var mtxTrans = new THREE.Matrix4();
            mtxTrans.identity();
            mtx.makeTranslation(140, 210, 40);
            mtx.multiply(rotation);

            var mtxScale = new THREE.Matrix4();
            mtxScale.identity();
            mtxScale.makeScale(18, 18, 18);
            mtx.multiply(mtxScale);

            poire.matrixAutoUpdate = false;
            poire.matrix = mtx;
            fruit.add(poire);

            scene.add(poire);
        }
    );
}

// Pêche
function ajouterPecheTableDroite(fruit) {
    // Charger le fichier
    loader.load(
        './obj/peche.obj',
        function(object) {
            object.traverse(function(child) {
                if (child instanceof THREE.Mesh) {
                    child.material = pecheMaterial;
                }
            });

            var poire = new THREE.Object3D();
            poire.add(object);

            var mtx = new THREE.Matrix4();
            mtx.identity();

            var rotationAxis = new THREE.Vector3();
            rotationAxis.set(1, 0, 0);
            var rotation = new THREE.Matrix4();
            var theta = -65 * Math.PI / 180;
            rotation.makeRotationAxis(rotationAxis, theta);

            var mtxTrans = new THREE.Matrix4();
            mtxTrans.identity();
            mtx.makeTranslation(155, 210, -250);
            mtx.multiply(rotation);

            var mtxScale = new THREE.Matrix4();
            mtxScale.identity();
            mtxScale.makeScale(17, 17, 17);
            mtx.multiply(mtxScale);

            poire.matrixAutoUpdate = false;
            poire.matrix = mtx;
            fruit.add(poire);
            scene.add(poire);
        }
    );
}

// Mirroir
function ajouterMirroir() {
    var cubeGeom = new THREE.BoxGeometry(400, 500, 0.01);
    mirrorCam = new THREE.CubeCamera(250, 500, cubeRenderTarget);
    mirrorCam.position.set(-500, 400, -150);
    scene.add(mirrorCam);

    var mirrorCubeMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff, envMap: cubeRenderTarget.texture });
    var mirrorCube = new THREE.Mesh(cubeGeom, mirrorCubeMaterial);
    mirrorCube.position.set(-490, 400, -100);
    mirrorCube.rotation.y = 90 * Math.PI / 180;
    scene.add(mirrorCube);
}

// Sprite : Neige
function ajouterNeige() {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];

    for (let i = 0; i < 1000; i++) {
        vertices.push(THREE.MathUtils.randFloatSpread(6000)); // x
        vertices.push(THREE.MathUtils.randFloatSpread(6000)); // y
        vertices.push(THREE.MathUtils.randFloatSpread(6000)); // z
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    var snowMaterial = new THREE.PointsMaterial({ size: 40, map: sprite, blending: THREE.AdditiveBlending, depthTest: false, transparent: true })
    const particles = new THREE.Points(geometry, snowMaterial);
    scene.add(particles);
}

//Création de la peinture en appelant toutes les méthodes ci-dessus
function peinture() {
    var fruit = new THREE.Object3D();
    var autresElements = new THREE.Object3D();
    creerMurFond(autresElements); // Mur du fond
    creerTable(autresElements); // Table
    ajouterNappe(autresElements); // Nappe qui est une la table
    creerCoupeAFruits(autresElements); // Coupe à fruits
    // Ajout Pomme
    ajouterPomme1(fruit);
    ajouterPomme2(fruit);
    ajouterPomme3(fruit);
    ajouterPomme4(fruit);
    // Ajout Peche
    ajouterPeche(fruit);
    ajouterPeche1(fruit);
    ajouterPeche2(fruit);
    ajouterPecheTableMilieu(fruit);
    ajouterPecheTableGauche(fruit);
    ajouterPecheTableDroite(fruit);
    ajouterGrappe(fruit); // Grappe
    ajouterCouteau(autresElements); // Couteau
    creerVerreEau(autresElements); // Verre d'eau
    ajouterMirroir(); // Mirroir
    ajouterNeige(); // Sprite snow 

    fruit.traverse(function(object) {
        if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });
    autresElements.traverse(function(object) {
        if (object instanceof THREE.Mesh) {
            object.castShadow = true;
            object.receiveShadow = true;
        }
    });
}

// Bulle d'eau. Cette méthode est a
function bulleEau() {
    refractor = new THREE.Refractor(bulle, {
        textureWidth: 1024,
        textureHeight: 1024,
        color: 0x999999,
        clipBias: 0,
        shader: WaterRefractionShader
    });
    refractor.position.set(posX, posY, posZ);
    const dudvMap = new THREE.TextureLoader().load('textures/water/waterdudv.jpg', function() {
        animate();
    });
    dudvMap.wrapS = dudvMap.wrapT = THREE.RepeatWrapping;
    refractor.material.uniforms.tDudv.value = dudvMap;
    scene.add(refractor);
}

// Télécharger le shader
function loadShader(shadertype) {
    return document.getElementById(shadertype).textContent;
}

// Création de la texture du shader
function createShaderMaterial(id, light, ambientLight) {

    var shaderTypes = {

        'phongBalanced': {

            uniforms: {

                "uDirLightPos": { type: "v3", value: new THREE.Vector3() },
                "uDirLightColor": { type: "c", value: new THREE.Color(0xffffff) },

                "uAmbientLightColor": { type: "c", value: new THREE.Color(0xcccccc, 0.4) },

                "uMaterialColor": { type: "c", value: new THREE.Color(0xffffff) },
                "uSpecularColor": { type: "c", value: new THREE.Color(0xffffff) },

                uKd: {
                    type: "f",
                    value: 0.7
                },
                uKs: {
                    type: "f",
                    value: 0.3
                },
                shininess: {
                    type: "f",
                    value: 100.0
                },
                uWrap: {
                    type: "f",
                    value: 0.5
                },
                k1: {
                    type: "f",
                    value: 0.5
                },
                k2: {
                    type: "f",
                    value: 0.001
                }
            }
        }

    };

    var shader = shaderTypes[id];

    var u = THREE.UniformsUtils.clone(shader.uniforms);

    // this line will load a shader that has an id of "vertex" from the .html file
    var vs = loadShader("vertex");
    // this line will load a shader that has an id of "fragment" from the .html file
    var fs = loadShader("fragment");

    var material = new THREE.ShaderMaterial({ uniforms: u, vertexShader: vs, fragmentShader: fs });

    material.uniforms.uDirLightPos.value = light.position;
    material.uniforms.uDirLightColor.value = light.color;

    material.uniforms.uAmbientLightColor.value = ambientLight.color;

    return material;

}

function fillScene() {
    //Background skybox
    const cubeTextureLoader = new THREE.CubeTextureLoader();
    cubeTextureLoader.setPath('images/cube/');
    const cubeTexture = cubeTextureLoader.load([
        'px.jpg', 'nx.jpg',
        'py.jpg', 'ny.jpg',
        'pz.jpg', 'nz.jpg'
    ]);
    scene.background = cubeTexture;
    scene.add(light);
    scene.add(light1);
    scene.add(light2);
    scene.add(ambientLight);
    scene.add(spotLight);
    peinture();
}

function addToDOM() {
    var container = document.getElementById('webGL');
    var canvas = container.getElementsByTagName('canvas');
    if (canvas.length > 0) {
        container.removeChild(canvas[0]);
    }
    container.appendChild(stats.dom);
    container.appendChild(renderer.domElement);
}

function animate() {
    window.requestAnimationFrame(animate);
    stats.update();
    TWEEN.update();
    render();
}

function render() {
    var delta = clock.getDelta();
    cameraControls.update(delta);

    // Test pour vérifier lorsqu'il y a eu un changement du paramètre bulleView pour remettre la caméra au milieu de la scène
    // Cela permet aussi de manipuler la caméra. Sans on ne pourra pas manipuler la caméra après l'avoir remise à sa position intiale
    if (effectController.bulleV !== bulleView) {
        change = true;
    }
    //Test pour mettre à jour les variables liées au GUI
    if (effectController.newAxes !== axes || effectController.bulleV !== bulleView || effectController.anim !== animation ||
        effectController.lookat !== lookAt || effectController.wholeBubbleView !== wholeBubView) {
        axes = effectController.newAxes;
        bulleView = effectController.bulleV;
        animation = effectController.anim;
        lookAt = effectController.lookat;
        wholeBubView = effectController.wholeBubbleView;
    }
    // Axes
    if (axes) {
        Coordinates.drawAllAxes({ axisLength: 500, axisRadius: 2, axisTess: 50 });
    }

    phongBalancedMaterial.uniforms.uWrap.value = effectController.wrap;
    phongBalancedMaterial.uniforms.k1.value = effectController.k1;
    phongBalancedMaterial.uniforms.k2.value = effectController.k2;
    phongBalancedMaterial.uniforms.shininess.value = effectController.shininess;
    phongBalancedMaterial.uniforms.uKd.value = effectController.kd;
    phongBalancedMaterial.uniforms.uKs.value = effectController.ks;

    var materialColor = new THREE.Color();
    materialColor.setHSL(effectController.hue, effectController.saturation, effectController.lightness);
    phongBalancedMaterial.uniforms.uMaterialColor.value.copy(materialColor);

    // Configuration de la lumière
    // Ambient : material's color times ka
    ambientLight.color.setHSL(effectController.hue, effectController.saturation, effectController.lightness * effectController.ka);
    light.position.set(effectController.lx, effectController.ly, effectController.lz);
    light.color.setHSL(effectController.lhue, effectController.lsaturation, effectController.llightness);

    //Refractor
    const time = clock.getElapsedTime();
    refractor.material.uniforms.time.value = time;
    if (animation == true) { // Rotation de la bulle autour de l'axe y
        if (angle <= 0 * Math.PI / 180) {
            pasRotation = Math.abs(pasRotation);
        }
        if (angle > 265 * Math.PI / 180) {
            pasRotation = -pasRotation;
        }
        angle += pasRotation * Math.PI / 180;
        let x = posX * Math.cos(angle) + posZ * Math.sin(angle);
        let z = posX * -Math.sin(angle) + posZ * Math.cos(angle);
        refractor.rotation.y = angle;
        refractor.position.set(x, posY, z);
    }

    if (bulleView) { // La caméra se place devant la bulle d'eau 
        if (wholeBubView) { // La bulle recouvre l'objectif de la caméra
            //Rotation autour de l 'axe Y sans fixe la table
            var mat = new THREE.Matrix4();
            mat.identity();
            mat.makeTranslation(-500, posY, (posZ + 260));

            var rotationAxis = new THREE.Vector3();
            rotationAxis.set(0, 1, 0);
            var rotation = new THREE.Matrix4();
            rotation.makeRotationAxis(rotationAxis, angle);
            rotation.multiply(mat);
            camera.matrixAutoUpdate = false;
            camera.matrix = rotation;
        } else { // La bulle occupe qu'une partie de l'objectif de la caméra
            camera.matrixAutoUpdate = true;
            if (lookAt) { //Rotation autour de l'axe Y en fixant la table
                let x = -500 * Math.cos(angle) + (posZ + 260) * Math.sin(angle);
                let y = posY;
                let z = 500 * Math.sin(angle) + (posZ + 260) * Math.cos(angle);
                camera.position.set(x, y, z);
                camera.lookAt(0, 500, 0);
            } else { //Rotation autour de l'axe Y en fixant la table avec les paramètres initiales (cameraControls.target.set(0, 301, 0);)
                let x = -500 * Math.cos(angle) + (posZ + 260) * Math.sin(angle);
                let y = posY;
                let z = 500 * Math.sin(angle) + (posZ + 260) * Math.cos(angle);
                camera.position.set(x, y, z);
            }
        }
    }
    // Remettre la caméra à sa position initiale
    if (!bulleView && change) {
        camera.position.set(2000, 1000, 0);
        // Controls
        cameraControls.target.set(0, 301, 0);
        change = false;
    }
    // Gestion camera du mirroir
    mirrorCam.visible = false;
    mirrorCam.update(renderer, scene);
    mirrorCam.visible = true;
    renderer.render(scene, camera);
}

function setupGui() {
    effectController = {
        newAxes: axes,
        bulleV: bulleView,
        anim: animation,
        lookat: lookAt,
        wholeBubbleView: wholeBubView,

        shininess: 100.0,
        wrap: 0.5,
        ka: 0.01,
        kd: 1.0,
        ks: 0.01,

        hue: 0.09,
        saturation: 0.0,
        lightness: 1.0,
        k1: 1.0,
        k2: 0.1,

        lhue: 0.04,
        lsaturation: 0.0,
        llightness: 0.7,

        lx: 0.65,
        ly: 0.08,
        lz: 0.35,
    };

    var resetEveryThing = {
        reset: function() {
            effectController.wholeBubbleView = false;
            effectController.lookat = true;
            effectController.anim = false;
            effectController.bulleV = false;
            effectController.newAxes = false;

            effectController.shininess = 100.0;
            effectController.wrap = 0.5;
            effectController.ka = 0.01;
            effectController.kd = 1.0;
            effectController.ks = 0.01;

            effectController.hue = 0.09;
            effectController.saturation = 0.0;
            effectController.lightness = 1.0;
            effectController.k1 = 1.0;
            effectController.k2 = 0.1;

            effectController.lhue = 0.04;
            effectController.lsaturation = 0.0;
            effectController.llightness = 0.7;

            effectController.lx = 0.65;
            effectController.ly = 0.08;
            effectController.lz = 0.35;

            refractor.position.set(posX, posY, posZ);
            angle = 0;
        }
    };

    var gui = new dat.GUI();

    var axe = gui.addFolder("Axe");
    axe.add(effectController, "newAxes").name("Show axes").listen();

    var bulle = gui.addFolder("Bulle d'eau");
    var view = bulle.addFolder("View");
    view.add(effectController, 'lookat').name(" Lookat table center").listen();
    view.add(effectController, 'wholeBubbleView').name(" Whole bubble view").listen();
    bulle.add(effectController, "bulleV").name("Bulle View").listen();
    bulle.add(effectController, "anim").name("Run animation").listen();

    h = gui.addFolder("Material control");

    h.add(effectController, "wrap", 0.0, 1.0, 0.025).name("wrap").listen();
    h.add(effectController, "shininess", 1.0, 1000.0, 1.0).name("shininess").listen();
    h.add(effectController, "ka", 0.0, 1.0, 0.025).name("Ka").listen();
    h.add(effectController, "kd", 0.0, 1.0, 0.025).name("Kd").listen();
    h.add(effectController, "ks", 0.0, 1.0, 0.025).name("Ks").listen();

    // Coupe à fruits Materials (color)
    var h = gui.addFolder("Material color");
    h.add(effectController, "k1", 0.01, 1.0, 0.025).name("k1").listen();
    h.add(effectController, "k2", 0.001, 0.1, 0.020).name("k2").listen();
    h.add(effectController, "hue", 0.0, 1.0, 0.025).name("m_hue").listen();
    h.add(effectController, "saturation", 0.0, 1.0, 0.025).name("m_saturation").listen();
    h.add(effectController, "lightness", 0.0, 1.0, 0.025).name("m_lightness").listen();

    // light
    h = gui.addFolder("Light color");
    h.add(effectController, "lhue", 0.0, 1.0, 0.025).name("hue").listen();
    h.add(effectController, "lsaturation", 0.0, 1.0, 0.025).name("saturation").listen();
    h.add(effectController, "llightness", 0.0, 1.0, 0.025).name("lightness").listen();

    // light (directional)
    h = gui.addFolder("Light direction");
    h.add(effectController, "lx", -1.0, 1.0, 0.025).name("x").listen();
    h.add(effectController, "ly", -1.0, 1.0, 0.025).name("y").listen();
    h.add(effectController, "lz", -1.0, 1.0, 0.025).name("z").listen();

    gui.add(resetEveryThing, 'reset').name("Reset");
    bulle.open();
    view.open();
}

try {
    init(); // Initialisation
    fillScene(); // Remplissage de la scène
    setupGui(); // Configuration Gui
    addToDOM(); // Ajouter au Dom
    bulleEau(); // Création de la bulle d'eau et appel à la fonction animate()
} catch (e) {
    var errorReport = "Your program encountered an unrecoverable error, can not draw on canvas. Error was:<br/><br/>";
    $('#container').append(errorReport + e);
}