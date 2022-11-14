// Bloch simulator written with THREE.js
// Mark Chiew (mark.chiew@ndcn.ox.ac.uk)
// v1.0 - 29/11/2019 Initial version
// v1.1 - 02/12/2019 Added underlay options, binomial pulses

var camera, scene, renderer, lines, controls, marker, bottom, light

renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize( window.innerWidth*0.8, window.innerHeight*0.8 );
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('bloch').appendChild( renderer.domElement );
window.addEventListener( 'resize', onWindowResize, false );

camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 1, 500 );
camera.position.set( 0, -16, 8 );
camera.up.set(0,0,1);

controls = new THREE.OrbitControls( camera, renderer.domElement );
controls.minDistance = 10;
controls.maxDistance = 30;
controls.maxPolarAngle = Math.PI/2;
controls.enableDamping = true;
controls.dampingFactor = 0.05;

let clock = new THREE.Clock();
let delta = 0;

var z = new THREE.Vector3(0,0,0);

var z0 = 7,
    z1 = 4;

var t = 0,
    T = 1.5,
    h = 1E-4,
    mode =  0;
    offset_x = 0;
    offset_y = 0;

var RFp, FA

var params = {N: 24,
              speed: 50,
              fps: 60,
              flip: 90,
              slice: 5,
              flow: 10,
              trans: 0,
              bipolar: false,
              adiab: '0',
              T1: 1500,
              T2: 50,
              B1: 10,
              gap: 2,
              localisation: '0',
              type: '0',
              underlay: '2',
              TR: 1,
              RFphase: 180,
              NetGrad: 0,
              play: function () {
              }};

var t, T, d, h, N

var M

var g = [];
var gui = new dat.GUI();
gui.add( params, 'N' ).min(1).max(32).step(1).onChange( () => {t=0;init();} );
gui.add( params, 'speed' ).min(1).max(100).step(1);
gui.add( params, 'fps' ).min(12).max(60).step(1);
gui.add( params, 'underlay' , {'none':0, 'shadow':1, 'colors':2}).onChange( setUnderlay );
gui.add( params, 'T1' ).min(5).max(3000).step(5).listen().onFinishChange( (value) => {
    if (value < params.T2) {
        params.T2 = value;
    }
});
gui.add( params, 'T2' ).min(1).max(100).step(1).listen().onFinishChange( (value) => {
    if (value > params.T1) {
        params.T1 = 5*Math.ceil(value/5);
    }
});


g.push(gui.addFolder('Sinc RF'));
g[0].add( params, 'flip' ).min(1).max(180).step(1);
g[0].add( params, 'slice' , 'slice thickness').min(1).max(10).step(1);
g[0].add( params, 'play' ).onFinishChange( () => {
    T = 1.5;
    offset_x = 0;
    offset_y = 0;
    reset(0);
});
g[0].open();
g.push(gui.addFolder('Sinc MB RF'));
g[1].add( params, 'flip' ).min(1).max(180).step(1);
g[1].add( params, 'slice' , 'slice thickness').min(1).max(10).step(1);
g[1].add( params, 'play' ).onFinishChange( () => {
    T = 1.5;
    offset_x = 0;
    offset_y = 0;
    reset(1);
});
g.push(gui.addFolder('PCASL'));
g[2].add( params, 'flow' ).min(1).max(100).step(1);
g[2].add( params, 'trans', 'transverse gradient').min(0).max(10).step(0.1);
g[2].add( params, 'bipolar');
g[2].add( params, 'play' ).onFinishChange( () => {
    T = 30;
    offset_x = -Math.floor(params.N/2);
    offset_y = 0;
    reset(2);
});
g.push(gui.addFolder('2D RF'));
g[3].add( params, 'flip' ).min(1).max(180).step(1);
g[3].add( params, 'play' ).onFinishChange( () => {
    T = 10;
    offset_x = 0;
    offset_y = 0;
    reset(3);
});
g.push(gui.addFolder('Adiabatic'));
g[4].add( params, 'adiab', {'HS':0, 'Chirp':1});
g[4].add( params, 'B1').min(0).max(50).step(1);
g[4].add( params, 'play' ).onFinishChange( () => {
    T = 5;
    offset_x = 0;
    offset_y = 0;
    reset(4);
});
g.push(gui.addFolder('Binomial'));
g[5].add( params, 'type', {'1-1':0, '1-2-1':1, '1-3-3-1':2});
g[5].add( params, 'gap').min(0.5).max(5).step(0.1);
g[5].add( params, 'play' ).onFinishChange( () => {
    T = (Number(params.type)+2)*(1+params.gap)-params.gap+0.5;
    offset_x = 0;
    offset_y = 0;
    reset(5);
});
g.push(gui.addFolder('SSFP'));
g[6].add( params, 'flip').min(1).max(90).step(1);
g[6].add( params, 'TR').min(0.5).max(5).step(0.1);
g[6].add( params, 'RFphase').min(0).max(180).step(1);
g[6].add( params, 'NetGrad').min(0).max(1).step(0.1);
g[6].add( params, 'play' ).onFinishChange( () => {
    T = 1000;
    offset_x = 0;
    offset_y = 0;
    FA = Math.PI*params.flip/180;
    RFp = Math.PI*params.RFphase/180;
    reset(6);
});


function reset(idx) {
    for (var i = 0;i < g.length;i++){
        if (i != idx ) {
            g[i].close();
        }
    }
    mode = idx;
    t = 0;
    gui.updateDisplay();
    scene.dispose();
    camera.position.set( 0, -16, 8 );
    init();
    animate();
}

var manager = new THREE.LoadingManager();
manager.onLoad = function() {
    init();
    animate();
};
        

var loader = new THREE.FontLoader(manager);
var font;
loader.load('include/helvetiker_regular.typeface.json', f => font=f);
var textMat = new THREE.LineBasicMaterial( {
    color: 0x004477,
    transparent: true,
    opacity: 0.75,
    side: THREE.DoubleSide});

function setUnderlay() {
    scene.remove(bottom);
    switch (params.underlay) {
        case '0':
            renderer.shadowMap.enabled = false;
            var geom = new THREE.PlaneBufferGeometry(params.N,params.N);
            var material = new THREE.ShadowMaterial( {opacity:0.5} );
            bottom = new THREE.Mesh( geom, material );
            bottom.position.z = -2;
            bottom.receiveShadow = false;
            break;
        case '1':
            renderer.shadowMap.enabled = true;
            var geom = new THREE.PlaneBufferGeometry(params.N,params.N);
            var material = new THREE.ShadowMaterial( {opacity:0.5} );
            bottom = new THREE.Mesh( geom, material );
            bottom.position.z = -2;
            bottom.receiveShadow = true;
            break;
        case '2':
            renderer.shadowMap.enabled = false;
            var geom = new THREE.PlaneBufferGeometry(params.N,params.N,params.N-1,params.N-1);
            var colors = [];
            for (var i = 0; i < M.length; i++) { 
                colors.push(1, 2/3, 0);
            }
            geom.setAttribute('color', new THREE.Float32BufferAttribute( colors, 3 ));
            var material = new THREE.MeshBasicMaterial( {vertexColors: THREE.VertexColors, opacity:0.5, side: THREE.DoubleSide} );
            bottom = new THREE.Mesh( geom, material );
            bottom.position.z = 0.5;
            bottom.receiveShadow = false;
            bottom.material.transparent = true;
            bottom.rotateZ(Math.PI/2);
            break;
    }
    scene.add(bottom);
}


function drawText(msg, pos, rot) {

    var shapes = font.generateShapes( msg, 0.75);
    var lineText = new THREE.Object3D();
    var geometry = new THREE.ShapeBufferGeometry( shapes );
    geometry.computeBoundingBox();

    xMid = -0.5*(geometry.boundingBox.max.x - geometry.boundingBox.min.x);
    yMid = -0.5*(geometry.boundingBox.max.y - geometry.boundingBox.min.y);
    geometry.translate(pos[0]+xMid, pos[1]+yMid, pos[2]);
    text = new THREE.Mesh( geometry, textMat);
    text.rotateX(rot);
    scene.add(text);
}

function init() {

    M = [];
    for (var i = -Math.floor(params.N/2);i < Math.floor((params.N+1)/2);i++) {
    for (var j = -Math.floor(params.N/2);j < Math.floor((params.N+1)/2);j++) {
        M.push({p: new THREE.Vector3(i+offset_x,j+offset_y,0),
                v: new THREE.Vector3(0,0,1)});
    }}

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xffffff );

    light = new THREE.DirectionalLight( 0xff0000, 1 );
    light.position.set( 0, 0, 2);
    light.rotateX(Math.PI/2);
    light.castShadow = true;
    light.shadow = new THREE.LightShadow( new THREE.OrthographicCamera(-20,20,20,-20,1,4) );
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    scene.add( light );
    
    var geom = new THREE.BufferGeometry();
    var vert = [];
    var colors = [];
    for (var i = 0; i < M.length; i++) { 
        vert.push(M[i].p.x, M[i].p.y, M[i].p.z);
        vert.push(M[i].p.x + M[i].v.x, M[i].p.y + M[i].v.y, M[i].p.z + M[i].v.z);
        colors.push(1, 2/3, 0);
        colors.push(1, 2/3, 0);
    }
    geom.setAttribute('position', new THREE.Float32BufferAttribute( vert, 3 ));
    geom.setAttribute('color', new THREE.Float32BufferAttribute( colors, 3 ));
    var material = new THREE.LineBasicMaterial( {vertexColors: THREE.VertexColors});
    lines = new THREE.LineSegments( geom, material );
    lines.castShadow = true;
    scene.add( lines );

    var geom = new THREE.PlaneBufferGeometry(0.25,6);
    var material = new THREE.MeshBasicMaterial( {color:0xff4400, side:THREE.DoubleSide} );
    marker = new THREE.Mesh( geom, material );
    marker.material.opacity = 0.05;
    marker.rotateX(Math.PI/2);
    marker.position.y = params.N/2;
    marker.position.z = z0-2;
    scene.add(marker);
    
    setUnderlay();

    var helper = new THREE.GridHelper(1.5*params.N, 1.5*params.N);
    helper.position.z = -1.99;
    helper.material.opacity = 0.15;
    helper.material.transparent = true;
    helper.rotateX(Math.PI/2);
    scene.add( helper );

    var vert1 = [];
    var vert2 = [];
    switch (mode) {
        case 0:
            for (var i = 0; i < 100; i++) {
                var tmp = B1_Sinc(M[0].p, T*i/100);
                vert1.push(-params.N/2 + params.N*i/100);
                vert1.push(params.N/2);
                vert1.push(-10*tmp.y/params.flip + z0);
                vert2.push(-params.N/2 + params.N*i/100);
                vert2.push(params.N/2);
                vert2.push(tmp.z/M[0].p.x/10 + z1);
            }
            drawText('Sinc RF', [0, z0+3, -params.N/2], Math.PI/2);
            drawText('RF', [-params.N/2-1, z0, -params.N/2], Math.PI/2);
            drawText('Gx', [-params.N/2-1, z1, -params.N/2], Math.PI/2);
            drawText('x', [-params.N/2, -params.N/2-1, -1], 0);
            drawText('y', [-params.N/2-1, -params.N/2, -1], 0);

            break;
        case 1:
            for (var i = 0; i < 100; i++) {
                var tmp = B1_MB(M[0].p, T*i/100);
                vert1.push(-params.N/2 + params.N*i/100);
                vert1.push(params.N/2);
                vert1.push(-10*tmp.y/params.flip + z0);
                vert2.push(-params.N/2 + params.N*i/100);
                vert2.push(params.N/2);
                vert2.push(tmp.z/M[0].p.x/10 + z1);
            }
            drawText('Sinc MB RF', [0, z0+3, -params.N/2], Math.PI/2);
            drawText('RF', [-params.N/2-1, z0, -params.N/2], Math.PI/2);
            drawText('Gx', [-params.N/2-1, z1, -params.N/2], Math.PI/2);
            drawText('x', [-params.N/2, -params.N/2-1, -1], 0);
            drawText('y', [-params.N/2-1, -params.N/2, -1], 0);
            
            break;

        case 2:
            for (var i = 0; i < 500; i++) {
                var tmp = B1_PCASL(M[0].p, i/500);
                vert1.push(-params.N + 2*params.N*i/500);
                vert1.push(params.N/2);
                vert1.push((-1/20)*tmp.y + z0);
                vert2.push(-params.N + 2*params.N*i/500);
                vert2.push(params.N/2);
                vert2.push(tmp.z/M[0].p.x/100 + z1);
            }
            drawText('PCASL', [0, z0+3, -params.N/2], Math.PI/2);
            drawText('RF', [-params.N-1, z0, -params.N/2], Math.PI/2);
            drawText('Gx', [-params.N-1, z1, -params.N/2], Math.PI/2);
            drawText('x', [-params.N/2, -params.N/2-1, -1], 0);
            drawText('y', [-params.N/2-1, -params.N/2, -1], 0);
            drawText('labelling plane', [0, -params.N/2-1, -1], 0);

            break;
        case 3:
            for (var i = 0; i < 100; i++) {
                var tmp = B1_2D(M[0].p, T*i/100);
                vert1.push(-params.N/2 + params.N*i/100);
                vert1.push(params.N/2);
                vert1.push(90*tmp.y/params.flip + z0);
                vert2.push(-params.N/2 + params.N*i/100);
                vert2.push(params.N/2);
                vert2.push(tmp.z/M[0].p.x/10 + z1);
            }
            drawText('2D RF', [0, z0+3, -params.N/2], Math.PI/2);
            drawText('RF', [-params.N/2-1, z0, -params.N/2], Math.PI/2);
            drawText('Gx', [-params.N/2-1, z1, -params.N/2], Math.PI/2);
            drawText('x', [-params.N/2, -params.N/2-1, -1], 0);
            drawText('y', [-params.N/2-1, -params.N/2, -1], 0);

            break;
        case 4:
            for (var i = 0; i < 100; i++) {
                var tmp = B1_Adiabatic(M[0].p, T*i/100);
                vert1.push(-params.N/2 + params.N*i/100);
                vert1.push(params.N/2);
                vert1.push(-0.1*tmp.y + z0);
                vert2.push(-params.N/2 + params.N*i/100);
                vert2.push(params.N/2);
                vert2.push(tmp.z/M[0].p.x + z1);
            }
            drawText('Adiabatic', [0, z0+3, -params.N/2], Math.PI/2);
            drawText('B1 Amplitude', [-params.N/2-4, z0, -params.N/2], Math.PI/2);
            drawText('B1 Frequency', [-params.N/2-4, z1, -params.N/2], Math.PI/2);
            drawText('x', [-params.N/2, -params.N/2-1, -1], 0);
            drawText('y', [-params.N/2-1, -params.N/2, -1], 0);

            break;
        case 5:
            for (var i = 0; i < 200; i++) {
                var tmp = B1_Binomial(M[0].p, T*i/200);
                vert1.push(-params.N/2 + params.N*i/200);
                vert1.push(params.N/2);
                vert1.push(-0.2*tmp.y + z0);
                vert2.push(-params.N/2 + params.N*i/200);
                vert2.push(params.N/2);
                vert2.push(4*tmp.z/M[0].p.x/params.N/2 + z1);
            }
            drawText('Binomial', [0, z0+3, -params.N/2], Math.PI/2);
            drawText('RF', [-params.N/2-1, z0, -params.N/2], Math.PI/2);
            drawText('Gx', [-params.N/2-1, z1, -params.N/2], Math.PI/2);
            drawText('x', [-params.N/2, -params.N/2-1, -1], 0);
            drawText('f', [-params.N/2-1, -params.N/2, -1], 0);

            break;
        case 6:
            for (var i = 0; i < 100; i++) {
                var tmp = B1_SSFP(M[0].p, 2*params.TR*i/100);
                vert1.push(-params.N/2 + params.N*i/100);
                vert1.push(params.N/2);
                vert1.push(-1*tmp.y + z0);
                vert2.push(-params.N/2 + params.N*i/100);
                vert2.push(params.N/2);
                vert2.push(tmp.z/M[0].p.x -1 + z1);
            }
            drawText('SSFP', [0, z0+3, -params.N/2], Math.PI/2);
            drawText('RF', [-params.N/2-1, z0, -params.N/2], Math.PI/2);
            drawText('Gx', [-params.N/2-1, z1, -params.N/2], Math.PI/2);
            drawText('off-resonance', [-params.N/2, -params.N/2-1, -1], 0);
            drawText('y', [-params.N/2-1, -params.N/2, -1], 0);

            break;
    }
    var vert3 = [-params.N/2,params.N/2,z0,params.N/2,params.N/2,z0];
    var vert4 = [-params.N/2,params.N/2,z1,params.N/2,params.N/2,z1];

    var geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute( vert1, 3));
    var material = new THREE.LineBasicMaterial( {color:0x000000 });
    scene.add(new THREE.Line( geom, material));
    var geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute( vert2, 3));
    var material = new THREE.LineBasicMaterial( {color:0x000000 });
    scene.add(new THREE.Line( geom, material));
    var geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute( vert3, 3));
    var material = new THREE.LineBasicMaterial( {color:0xcccccc });
    scene.add(new THREE.Line( geom, material));
    var geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute( vert4, 3));
    var material = new THREE.LineBasicMaterial( {color:0xcccccc });
    scene.add(new THREE.Line( geom, material));
                                  
    renderer.render( scene, camera );

};

function animate() {
        requestAnimationFrame( animate );
        controls.update();
        delta += clock.getDelta();
        if (delta > 1/params.fps) {
            render();
            delta = delta % 1/params.fps;
        }
};

function render() {
    renderer.render( scene, camera );
    if (t < T) {
        switch (mode) {
            case 0: //Sinc
                rk(B1_Sinc,[0,0,0]);
                marker.position.x = -params.N/2 + (t/T)*params.N;
                break;
            case 1: //SincMB
                rk(B1_MB,[0,0,0]);
                marker.position.x = -params.N/2 + (t/T)*params.N;
                break;
            case 2: //PCASL
                rk(B1_PCASL,[params.flow/10,0,0]);
                marker.position.x = -params.N + 2*(t%1)*params.N;
                break;
            case 3: //SpiralRF
                rk(B1_2D,[0,0,0]);
                marker.position.x = -params.N/2 + (t/T)*params.N;
                break;
            case 4: //Adiabatic
                rk(B1_Adiabatic,[0,0,0]);
                marker.position.x = -params.N/2 + (t/T)*params.N;
                break;
            case 5: //Binomial
                rk(B1_Binomial,[0,0,0]);
                marker.position.x = -params.N/2 + (t/T)*params.N;
                break;
            case 6: //SSFP
                rk(B1_SSFP,[0,0,0]);
                marker.position.x = -params.N/2 + ((t%(2*params.TR))/(2*params.TR))*params.N;
                break;
        }
    } else {
        rk((a,b) => {return z;},[0,0,0]);
    }

    var pos = lines.geometry.getAttribute('position');
    var col = lines.geometry.getAttribute('color');
    pos.needsUpdate = true;
    col.needsUpdate = true;
    for (var i = 0; i < M.length; i++) { 
        pos.array[6*i+0] = M[i].p.x;
        pos.array[6*i+1] = M[i].p.y;
        pos.array[6*i+2] = M[i].p.z;
        pos.array[6*i+3] = M[i].p.x + M[i].v.x;
        pos.array[6*i+4] = M[i].p.y + M[i].v.y;
        pos.array[6*i+5] = M[i].p.z + M[i].v.z;
        col.array[6*i+0] = (1 + pos.array[6*i+5])/2;
        col.array[6*i+2] = (1 - pos.array[6*i+5])/2;
        col.array[6*i+3] = (1 + pos.array[6*i+5])/2;
        col.array[6*i+5] = (1 - pos.array[6*i+5])/2;
    }
    lines.geometry.setAttribute('position', pos);
    lines.geometry.setAttribute('color', col);
    
    if (params.underlay == '2') {
        var pos2 = bottom.geometry.getAttribute('position');
        var col2 = bottom.geometry.getAttribute('color');
        pos2.needsUpdate = true;
        col2.needsUpdate = true;
        for (var i = 0; i < M.length; i++) { 
            pos2.array[3*i+1] = -M[i].p.x;
            pos2.array[3*i+2] = M[i].v.z/2 - 1.5;
            col2.array[3*i+0] = (1 + M[i].v.z)/2;
            col2.array[3*i+1] = 2/3;
            col2.array[3*i+2] = (1 - M[i].v.z)/2;
        }
        bottom.geometry.setAttribute('position', pos2);
        bottom.geometry.setAttribute('color',col2);
    }
};


function B1_PCASL(p,t) {
    if ((t % 1E-1) < 5E-2) {
        return new THREE.Vector3(0, -24*(0.5+0.5*Math.cos(20*2*Math.PI*((t % 1E-1)-2.5E-2))),  60*p.x);
    } else {
        if (params.bipolar) {
            return new THREE.Vector3(0, 0, -44*p.x + Math.sign(t%2E-1 - 1E-1)*2*params.trans*p.y);
        }
        else {
            return new THREE.Vector3(0, 0, -44*p.x + 2*params.trans*p.y);
        }
    }
};

function B1_Sinc(p,t) {
    if (t < 1) {
        return new THREE.Vector3(0, -(0.1*params.flip)*sinc(6*(t-0.5)), (30/params.slice)*p.x);
    } else if (t < 1.5) {
        return new THREE.Vector3(0, 0, -(30/params.slice)*p.x);
    } else {
        return new THREE.Vector3(0, 0, 0);
    }
};

function B1_MB(p,t) {
    if (t < 1) {
        return new THREE.Vector3(0, -(0.2*params.flip)*sinc(6*(t-0.5))*Math.cos(30*t), (30/params.slice)*p.x);
    } else if (t < 1.5) {
        return new THREE.Vector3(0, 0, -(30/params.slice)*p.x);
    } else {
        return new THREE.Vector3(0, 0, 0);
    }
};

function B1_2D(p,t) {
    return new THREE.Vector3(0, (params.flip/180)*(1-Math.exp(-t/T)),5*(1-Math.exp(-t/T))*(p.x*Math.cos(20*Math.PI*t/T)+p.y*Math.sin(20*Math.PI*t/T)));
};

function B1_Adiabatic(p,t) {
    switch (params.adiab) {
        case '0': // HS
            return new THREE.Vector3(0, -params.B1/Math.cosh(1.2*(t-T/2)), 10*Math.tanh(1.2*(t-T/2))/Math.tanh(1.2));
            break;
        case '1': // Chirp
            return new THREE.Vector3(0, -params.B1, 16*(t-T/2));
            break;
    }
};

function B1_Binomial(p,t) {
    var Gx= 4;
    var Gy= 0.1;
    switch (params.type) {
        case '0': // 1-1
            if (t < 1) {
                return new THREE.Vector3(0, -(9*1/2)*sinc(6*(t-0*(1+params.gap)-0.5)),  Gx*p.x + Gy*p.y);
            }
            else if (t < 1+params.gap) {
                return new THREE.Vector3(0, 0, Gy*p.y);
            }
            else if (t < 2+params.gap) {
                return new THREE.Vector3(0, -(9*1/2)*sinc(6*(t-1*(1+params.gap)-0.5)), -Gx*p.x + Gy*p.y);
            }
            else if (t < 2.5+1*params.gap) {
                return new THREE.Vector3(0, 0, Gx*p.x + Gy*p.y);
            }
            else {
                return new THREE.Vector3(0, 0, Gy*p.y);
            }
            break;
        case '1': // 1-2-1
            if (t < 1) {
                return new THREE.Vector3(0, -(9*1/4)*sinc(6*(t-0*(1+params.gap)-0.5)),  Gx*p.x + Gy*p.y);
            }
            else if (t < 1+params.gap) {
                return new THREE.Vector3(0, 0, Gy*p.y);
            }
            else if (t < 2+params.gap) {
                return new THREE.Vector3(0, -(9*2/4)*sinc(6*(t-1*(1+params.gap)-0.5)), -Gx*p.x + Gy*p.y);
            }
            else if (t < 2+2*params.gap) {
                return new THREE.Vector3(0, 0, Gy*p.y);
            }
            else if (t < 3+2*params.gap) {
                return new THREE.Vector3(0, -(9*1/4)*sinc(6*(t-2*(1+params.gap)-0.5)),  Gx*p.x + Gy*p.y);
            }
            else if (t < 3.5+2*params.gap) {
                return new THREE.Vector3(0, 0, -Gx*p.x + Gy*p.y);
            }
            else {
                return new THREE.Vector3(0, 0, Gy*p.y);
            }
            break;
        case '2': // 1-3-3-1
            if (t < 1) {
                return new THREE.Vector3(0, -(9*1/8)*sinc(6*(t-0*(1+params.gap)-0.5)),  Gx*p.x + Gy*p.y);
            }
            else if (t < 1+params.gap) {
                return new THREE.Vector3(0, 0, Gy*p.y);
            }
            else if (t < 2+params.gap) {
                return new THREE.Vector3(0, -(9*3/8)*sinc(6*(t-1*(1+params.gap)-0.5)), -Gx*p.x + Gy*p.y);
            }
            else if (t < 2+2*params.gap) {
                return new THREE.Vector3(0, 0, Gy*p.y);
            }
            else if (t < 3+2*params.gap) {
                return new THREE.Vector3(0, -(9*3/8)*sinc(6*(t-2*(1+params.gap)-0.5)),  Gx*p.x + Gy*p.y);
            }
            else if (t < 3+3*params.gap) {
                return new THREE.Vector3(0, 0, Gy*p.y);
            }
            else if (t < 4+3*params.gap) {
                return new THREE.Vector3(0, -(9*1/8)*sinc(6*(t-3*(1+params.gap)-0.5)), -Gx*p.x + Gy*p.y);
            }
            else if (t < 4.5+3*params.gap) {
                return new THREE.Vector3(0, 0, Gx*p.x + Gy*p.y);
            }
            else {
                return new THREE.Vector3(0, 0, Gy*p.y);
            }
            break;
    }
};
function B1_SSFP(p,t) {
    Gx = 1;
    B1 = 5*FA;
    if ((t%params.TR) < 0.2) {
        return new THREE.Vector3(B1*Math.sin((t/params.TR>>0)*RFp), -B1*Math.cos((t/params.TR>>0)*RFp), Gx*p.x); 
    } else {
        return new THREE.Vector3(0, 0, (Gx+params.NetGrad)*p.x); 
    }
};

function rk(B1,V) { //4th order Runge-Kutta Finite Difference ODE Solver
                    //B1 is a function that returns effective B-vector as a function of space,time
                    //V is the velocity of the Magnetization [vx, vy, vz]
    var t_step = t + params.speed*h;
    var v = new THREE.Vector3(V[0]*h, V[1]*h, V[2]*h);
    while (t < t_step) {
        t = t + h;
        M.forEach( x => {
            x.p.add(v);
            var B1x = B1(x.p,t+h/2);
            var k1 = bloch(x.v,B1(x.p,t)).multiplyScalar(h);
            var k2 = bloch(x.v.clone().add(k1.clone().multiplyScalar(1/2)),B1x).multiplyScalar(h);
            var k3 = bloch(x.v.clone().add(k2.clone().multiplyScalar(1/2)),B1x).multiplyScalar(h);
            var k4 = bloch(x.v.clone().add(k3),B1(x.p,t+h)).multiplyScalar(h);
            x.v.add( k1.add(k2.multiplyScalar(2)).add(k3.multiplyScalar(2)).add(k4).multiplyScalar(1/6));
        });
    }
};

function bloch(Q,b) {
    var W = Q.clone().cross(b);
    W.x -= Q.x/params.T2;
    W.y -= Q.y/params.T2;
    W.z -= (Q.z-1)/params.T1;
    return W;
}

function sinc(x) {
    if (x != 0) {
        return Math.sin(Math.PI*x)/(Math.PI*x);
    } else {
        return 1;
    }
};

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
};
