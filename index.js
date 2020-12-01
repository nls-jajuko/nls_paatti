import * as THREE from 'three';

import { OrbitControls } from './OrbitControls.js';
import { LDrawLoader } from './LDrawLoader.js';
import { Water } from './Water.js';
import { Sky } from './Sky.js';
import { OBJLoader } from './OBJLoader.js';
import mapboxgl from 'mapbox-gl';

let container;

let camera, scene, renderer, controls;
let water, sun, sky;

let mesh, model, textureCube;
let rotdir = 1;
let envMapActivated = false;
let logo_mesh;
let pmremGenerator ;


/* API-KEY - get one free at maanmittauslaitos.fi */
const  apiKey = '7cd2ddae-9f2e-481c-99d0-404e7bc7a0b2',
    vecMapStylePath = 'https://avoin-karttakuva.maanmittauslaitos.fi/vectortiles/stylejson/v20/hobby.json?api-key=' + apiKey;

/* Some online resources */
/* maybe these could be inlined - don't have the time now to figure out */
const ldrawPath = 'https://beta-karttakuva.maanmittauslaitos.fi/model/',
    waterNormalsPath = 'https://beta-karttakuva.maanmittauslaitos.fi/model/waternormals.jpg',
    logoPath = 'https://beta-karttakuva.maanmittauslaitos.fi/model/mml-logo-fi.png';

const modelFileList = {
    'Lighthouse': '30023-1-Lighthouse.ldr_Packed.mpd'
};

const parameters = {
    inclination: 0.50,
    azimuth: -0.2
};


init();
animate();


function init() {

    container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(1000, 600, -1000);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xdeebed);

    const ambientLight = new THREE.AmbientLight(0xdeebed, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(- 1000, 1200, 1500);
    scene.add(directionalLight);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);

    window.addEventListener('resize', onWindowResize, false);

    addSun();
    addOcean();
    addLogo();
    addSky();


    addVecMap();
    addLDrawObject(modelFileList['Lighthouse']);

    addVessel();
    updateSun();

    window.setTimeout(() => {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.0;

    }, 30000);
}

function addSky() {
    sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    const skyUniforms = sky.material.uniforms;

    skyUniforms['turbidity'].value = 10;
    skyUniforms['rayleigh'].value = 2;
    skyUniforms['mieCoefficient'].value = 0.005;
    skyUniforms['mieDirectionalG'].value = 0.8;

}

function addSun() {
    sun = new THREE.Vector3();
    pmremGenerator = new THREE.PMREMGenerator(renderer);

}

function updateSun() {

    const theta = Math.PI * (parameters.inclination - 0.5);
    const phi = 2 * Math.PI * (parameters.azimuth - 0.5);

    sun.x = Math.cos(phi);
    sun.y = Math.sin(phi) * Math.sin(theta);
    sun.z = Math.sin(phi) * Math.cos(theta);

    sky.material.uniforms['sunPosition'].value.copy(sun);
    water.material.uniforms['sunDirection'].value.copy(sun).normalize();

    scene.environment = pmremGenerator.fromScene(sky).texture;

}

function addLogo() {

    // Logo
    const logo_geometry = new THREE.BoxBufferGeometry(400, 400, 400);

    new THREE.TextureLoader().load(logoPath, function (texture) {
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        const material = new THREE.MeshBasicMaterial({ color: 0xffffff, map: texture });
        logo_mesh = new THREE.Mesh(logo_geometry, material);
        logo_mesh.position.set(-1000, 500, 3000);
        scene.add(logo_mesh);
    });    
}

function addOcean() {
    const waterGeometry = new THREE.PlaneBufferGeometry(10000, 10000);
    water = new Water(
        waterGeometry,
        {
            textureWidth: 512,
            textureHeight: 512,
            waterNormals: new THREE.TextureLoader().load(waterNormalsPath, function (texture) {

                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

            }),
            alpha: 1.0,
            sunDirection: new THREE.Vector3(),
            sunColor: 0xffffff,
            waterColor: 0x001e0f,
            distortionScale: 3.7,
            fog: scene.fog !== undefined
        }
    );
    water.rotation.x = - Math.PI / 2;
    scene.add(water);


}

function addVessel() {
    // load a resource
    const loader = new OBJLoader();
    loader.load(
        // resource URL
        ldrawPath + //'Cruisership_2012/Cruiser_2012.txt',
            'ShipsByQuaternius/OBJ/CruiseShip.txt',
        // called when resource is loaded
        function (object) {
            const material = new THREE.MeshStandardMaterial({ color: 0xD00000, metalness: 0.9, roughness: 0.5 });
            object.traverse(function (child) {
                if (child instanceof THREE.Mesh) {
                    child.material = material;
                    child.material.needsUpdate = true;
//                    child.material.ambient.setHex(0xFF0000);
//                    child.material.color.setHex(0xC00000);
                }
            });


            object.scale.set(50,50,50);
            object.rotation.y = Math.PI * 1.0 +0.3;
            object.position.x = 300;
            object.position.z = 400;

            scene.add(object);
            mesh = object

        },
        // called when loading is in progresses
        function (xhr) {

        },
        // called when loading has errors
        function (error) {

            console.log('An error happened');

        }
    );

}

function addVecMap() {

    /* VECTOR TILE MAP */

    var map = new mapboxgl.Map({
        container: 'map', // container id
        hash: true,
        style: vecMapStylePath,
        center: [19.13196, 60.29986], // starting position [lng, lat]
        zoom: 14.39 // starting zoom
    });
}


function addLDrawObject(ldrawModelPath) {

    if (model) {

        mesh = null;
        scene.remove(model);

    }

    model = null;


    const lDrawLoader = new LDrawLoader();
    lDrawLoader.separateObjects = false;
    lDrawLoader.smoothNormals = true;
    lDrawLoader
        .setPath(ldrawPath)
        .load(ldrawModelPath, function (group2) {

            if (model) {

                scene.remove(model);

            }

            model = group2;
            model.rotation.x = Math.PI;

            scene.add(model);


        }, onProgress, onError);

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}


//

function animate() {

    requestAnimationFrame(animate);
    controls.update();
    const time = performance.now() * 0.001;

    if (mesh) {
        mesh.position.y = Math.sin(time) * 0.001 - 60;
        mesh.rotation.x = Math.cos(time) * 0.02;
        mesh.rotation.z = time * Math.sin(time) * 0.002;
    }
    if (logo_mesh) {
        logo_mesh.rotation.y = Math.cos(time);
        logo_mesh.rotation.x = Math.sin(time) * 0.01;
    }
    water.material.uniforms['time'].value += 1.0 / 60.0;

    render();

}

function render() {

    renderer.render(scene, camera);

}

function onProgress(xhr) {

    if (xhr.lengthComputable) {

        console.log(Math.round(xhr.loaded / xhr.total * 100, 2) + '% downloaded');

    }

}

function onError() {

    const message = "Error loading model";
    console.log(message);

}


