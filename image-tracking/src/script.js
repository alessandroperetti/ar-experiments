import './style.css'
import * as THREE from 'three'
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';
import { GLTFLoader}  from 'three/examples/jsm/loaders/GLTFLoader';

setupMobileDebug()

function setupMobileDebug() {
  // for image tracking we need a mobile debug console as it only works on android
  // This library is very big so only use it while debugging - just comment it out when your app is done
  const containerEl = document.getElementById("console-ui");
  eruda.init({
    container: containerEl
  });
  const devToolEl = containerEl.shadowRoot.querySelector('.eruda-dev-tools');
  devToolEl.style.height = '40%'; // control the height of the dev tool panel
}

let camera, canvas, scene, renderer;
let mesh, mesh2;
let modelsPath = ['./backpack.glb', './scissors.glb'];

init();
animate();

async function init() {
  canvas = document.querySelector('canvas.webgl')

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(70,
    window.innerWidth / window.innerHeight,
    0.01,
    40
  );

  renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.xr.enabled = true;

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  light.position.set(0.5, 1, 0.25);
  scene.add(light);

  // setup a cone mesh to put on top of the image target when it is seen
  // const radius = 0.2;
  // const height = 0.3;
  // const geometry = new THREE.ConeGeometry(radius, height, 32);
  // //by defualt the image will be rendered in the middle, so we need to push half of the height up to be exactly on top of the img
  // geometry.translate(0, height / 2, 0);

  const material = new THREE.MeshNormalMaterial({
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  });

  // mesh = new THREE.Mesh(geometry, material);
  // mesh.matrixAutoUpdate = false; // important we have to set this to false because we'll update the position when we track an image
  // mesh.visible = false;
  // scene.add(mesh);
  const loader = new GLTFLoader();
  // let i;
  // for(i=0; i<2; i++){

    loader.load(
      modelsPath[0],
      (gltf) => {
        // The model has been loaded
        mesh = gltf.scene;
        mesh.visible = false;
        mesh.matrixAutoUpdate = false;
        mesh.scale.set(new THREE.Vector3( 0.1, 0.1, 0.1 ));
        scene.add(mesh);
      }, 
      // undefined,
      // (error) => {
      //   // Loading error callback
      //   console.error(`Error loading GLB model ${modelsPath[i]}`, error);
      // }
    );
    loader.load(
      modelsPath[1],
      (gltf) => {
        // The model has been loaded
       mesh2 = gltf.scene;
       mesh2.visible = false;
       mesh2.matrixAutoUpdate = false;
       mesh2.scale.set(new THREE.Vector3( 0.1, 0.1, 0.1 ));
      //  mesh2.translate(0, 0.2, 0)
       scene.add(mesh2);
      }, 
      // undefined,
      // (error) => {
      //   // Loading error callback
      //   console.error(`Error loading GLB model ${modelsPath[i]}`, error);
      // }
    );

  // }

  // setup the image target
  const img = document.getElementById('img');
  const imgBitmap = await createImageBitmap(img);

  const qr = document.getElementById('qr');
  const qrBitmap = await createImageBitmap(qr);

  //more on image-tracking feature: https://github.com/immersive-web/marker-tracking/blob/main/explainer.md
  const button = ARButton.createButton(renderer, {
    requiredFeatures: ["image-tracking"], // notice a new required feature
    trackedImages: [
      {
        image: imgBitmap, // tell webxr this is the image target we want to track
        widthInMeters: 0.5// in meters what the size of the PRINTED image in the real world
      },
      {
        image: qrBitmap, // tell webxr this is the image target we want to track
        widthInMeters: 1.5 // in meters what the size of the PRINTED image in the real world
      }
    ],
    //this is for the mobile debug
    optionalFeatures: ["dom-overlay", "dom-overlay-for-handheld-ar"],
    domOverlay: {
      root: document.body
    }
  });
  document.body.appendChild(button);

  window.addEventListener("resize", onWindowResize, false);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  console.log(mesh, mesh2);
 
  if (frame) {
    const results = frame.getImageTrackingResults(); //checking if there are any images we track
    console.log(results);

    //if we have more than one image the results are an array 
    for (const result of results) {
      // The result's index is the image's position in the trackedImages array specified at session creation
      const imageIndex = result.index;

      console.log("image index", imageIndex);

      // Get the pose of the image relative to a reference space.
      const referenceSpace = renderer.xr.getReferenceSpace();
      const pose = frame.getPose(result.imageSpace, referenceSpace);

      //checking the state of the tracking
      const state = result.trackingState;
      //console.log(state);

      if (state == "tracked") {
         // update the mesh when the image target is found
        if(imageIndex === 0){
          mesh.visible = true;
          mesh.matrix.fromArray(pose.transform.matrix);
        }else{
          mesh2.visible = true;
          mesh2.matrix.fromArray(pose.transform.matrix);
        }
       
      } else if (state == "emulated") {
        if(imageIndex === 0) mesh.visible = false;
        else mesh2.visible = false;
      }
    }
  }
  renderer.render(scene, camera);
}