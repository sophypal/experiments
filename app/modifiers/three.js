import { modifier } from 'ember-modifier';
import three from 'three';

export default modifier(function (element, [init, resize]) {
    const renderer = new three.WebGLRenderer();
    renderer.antialias = true;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    element.appendChild(renderer.domElement);

    function resizeHandler() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        if (resize) {
            resize(window.innerWidth, window.innerHeight);
        }
    }

    window.addEventListener('resize', resizeHandler);

    init(renderer);
    
    return () => {
        window.removeEventListener('resize', resizeHandler);
    };
});
