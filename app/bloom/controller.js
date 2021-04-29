import Controller from '@ember/controller';
import { action } from '@ember/object';
import three, { BufferGeometry, Float32BufferAttribute, DynamicDrawUsage, Points, PointsMaterial, LineSegments, LineBasicMaterial} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import * as d3 from 'd3';
import _ from 'lodash-es';
import data from './data';
import Stats from 'stats.js';
import Tween from '@tweenjs/tween.js';

function getPositions(nodes) {
    return _.flatten(nodes.map(node => [node.x, node.y, node.z]))
}
      
function getLinkPositions(links) {
    return _.flatten(links.map(({source, target}) => {
        return [source.x, source.y, source.z, target.x, target.y, target.z]
    }))
}

function lerpPoints(nodesStart, nodesEnd, pct) {
    nodesStart.forEach((node, index) => {
        node.x = three.MathUtils.lerp(node.x, nodesEnd[index].x, pct);
        node.y = three.MathUtils.lerp(node.y, nodesEnd[index].y, pct);
        node.z = three.MathUtils.lerp(node.z, nodesEnd[index].z, pct);
    });
}

function generate (count = 1000, distance = 1000, createLinks = false) {
    const nodes = _.range(count).map(id => {
        return {
            x: Math.random()*distance - distance/2,
            y: Math.random()*distance - distance/2,
            z: Math.random()*distance - distance/2
        };
    });

    const links = [];

    if (createLinks) {
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const nodeOuter = nodes[i]
                const nodeInner = nodes[j]

                const rand = Math.random();

                if (j % Math.floor(nodes.length / 4) == 0) {
                    links.push(Object.create({
                        source: nodeOuter,
                        target: nodeInner
                    }));
                }
            }
        }
    }

    return {
        nodes,
        links
    }
}

const numNodes = 10000;

export default class BloomController extends Controller {
    renderer = null;
    scene = null;
    camera = null;
    composer = null;
    simulation = null;
    nodeGeometry = null;
    stats = null;
    group = new three.Group();
    lastTime = 0

    setupScene (scene) {
        const procedural = generate(numNodes, undefined, true);
        const links = procedural.links
        const nodes = procedural.nodes

        console.log('Number of nodes: ', nodes.length);
        console.log('Number of links: ', links.length);

        this.nodeGeometry = new BufferGeometry();
        this.nodeGeometry.setAttribute('position', new Float32BufferAttribute(getPositions(nodes), 3).setUsage(DynamicDrawUsage));

        this.linkGeometry = new BufferGeometry();
        this.linkGeometry.setAttribute('position', new Float32BufferAttribute(getLinkPositions(links), 3).setUsage(DynamicDrawUsage));
        
        this.camera.position.set(1, 0, 1000);
        const points = new Points(this.nodeGeometry, new PointsMaterial({size: 5, color: 0x00ffff, transparent: true, depthTest: false}));
        points.renderOrder = 0;
        points.frustumCulled = false;

        const lines = new LineSegments(this.linkGeometry, new LineBasicMaterial({color: 0x232323}));
        lines.renderOrder = 1;
        lines.frustumCulled = false;

        this.group.add(points);
        this.group.add(lines);
        scene.add(this.group);

        let nextPositions = generate(numNodes);

        const lerp = {x: 0}
        const tween = new Tween.Tween(lerp)
            .to({x: 1.0}, 5000)
            .onUpdate(() => {
                lerpPoints(nodes, nextPositions.nodes, lerp.x)
                this.nodeGeometry.attributes.position.set(getPositions(nodes));
                this.nodeGeometry.attributes.position.needsUpdate = true;

                this.linkGeometry.attributes.position.set(getLinkPositions(links));
                this.linkGeometry.attributes.position.needsUpdate = true;
            })
            .start()
            .repeat(Infinity)
            .onRepeat(() => {
                nextPositions = generate(numNodes);
            })
        

    }

    @action
    animate(time = 0) {
        const elapsed = time - this.lastTime;
        this.lastTime = time;

        requestAnimationFrame(this.animate)

        this.stats.begin();        

        Tween.update();

        this.group.rotation.y += Math.PI/12 * elapsed/1000;
        this.controls.update();
        this.composer.render();
        this.stats.end();
    }

    @action
    onRendererInit(renderer) {
        const stats = new Stats();
        document.body.appendChild(stats.dom);

        const viewport = new three.Vector4();
        renderer.getViewport(viewport);
        const scene = new three.Scene();
        const camera = new three.PerspectiveCamera(75, viewport.width/viewport.height, .1, 5000);
        const controls = new OrbitControls(camera, renderer.domElement);

        const renderPass = new RenderPass(scene, camera);
        const bloomPass = new UnrealBloomPass(new three.Vector2(window.innerWidth, window.innerHeight), 1, 0.1, 0.5);
        const composer = new EffectComposer(renderer);

        composer.addPass(renderPass);
        composer.addPass(bloomPass);

        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.controls = controls;
        this.composer = composer;
        this.stats = stats;

        this.setupScene(scene);
        this.animate();
    }
}
