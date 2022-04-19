let canvas, gl, program, tick = 0, loop = false
let frameTimes = []
let camera = {
	x: () => 4 * Math.sin(tick / 100),
	y: () => .9,
	z: () => 4 * Math.cos(tick / 100),
}


async function init(){
	canvas = document.getElementById("canvas");
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;	
	
	gl = canvas.getContext('webgl2');
	gl.imageSmoothingEnabled = false;

	if(!gl)
		throw("no webgl 2")

	document.body.onkeydown = function(e) {
		if (e.key == " " ||
			e.code == "Space" ||      
			e.keyCode == 32      
		)
		loop = !loop
	}

	await initProgram()

	renderLoop()
	render()
}

async function initProgram(){
	let vertexShaderText = await fetch("main.vert")
		.then(response => response.text())
		.catch(()=>{throw("cannot load main.vert")});

	let fragmentShaderText = await fetch("main.frag")
		.then(response => response.text())
		.catch(()=>{throw("cannot load main.frag")});

	let stopwatch = Date.now();

	let vertexShader = gl.createShader(gl.VERTEX_SHADER);
	let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

	gl.shaderSource(vertexShader, vertexShaderText);
	gl.shaderSource(fragmentShader, fragmentShaderText);

	gl.compileShader(vertexShader);
	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
		console.error(`ERROR compiling vertex shader! \n ${gl.getShaderInfoLog(vertexShader)}`);
	}

	gl.compileShader(fragmentShader);
	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
		console.error(`ERROR compiling fragment shader! \n ${gl.getShaderInfoLog(fragmentShader)}`);
	}

	program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
		console.error('ERROR linking program!', gl.getProgramInfoLog(program));
	}

	console.log(`Time to compile: ${Date.now() - stopwatch} ms`);
}

function render(){	
	tick += .5;

	gl.clearColor(0.9, 0.9, 0.9, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.useProgram(program);

	let resolutionLoc = gl.getUniformLocation(program, "resolution");
	gl.uniform2f(resolutionLoc, canvas.width, canvas.height);

	let cameraPosLoc = gl.getUniformLocation(program, "cameraPos");
	gl.uniform3f(cameraPosLoc, camera.x(), camera.y(), camera.z());

	let cameraLookAtLoc = gl.getUniformLocation(program, "cameraLookAt");
	gl.uniform3f(cameraLookAtLoc, 0, 0, 0);


	let positionAttributeLocation = gl.getAttribLocation(program, "vertPosition");

	let positionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	let positions = [
		1, 1,
		1, -1,
		-1, -1,

		-1, -1,
		-1, 1,
		1, 1,
	];
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

	let vao = gl.createVertexArray();
	gl.bindVertexArray(vao);

	gl.enableVertexAttribArray(positionAttributeLocation);
	gl.vertexAttribPointer(
		positionAttributeLocation, 			// Attribute location
		2, 									// Number of elements per attribute
		gl.FLOAT, 							// Type of elements
		gl.FALSE, 							// Normalize
		2 * Float32Array.BYTES_PER_ELEMENT,	// Size of an individual vertex
		0 									// Offset
	);

	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT);

	gl.bindVertexArray(vao);

	gl.drawArrays(
		gl.TRIANGLES,	// primitive type
		0,				// offset
		6				// count
	);

}

function renderLoop(){
	if(loop){
		tickFPSMeter()
		render()
	}
	requestAnimationFrame(renderLoop)
}

function tickFPSMeter(){
	let now = Date.now() * 0.001;
	const deltaTime = now - (frameTimes[0] || now);
	const fps = 1 / deltaTime * frameTimes.length;
	frameTimes.push(now);
	if(frameTimes.length > 60)
		frameTimes.shift();
	document.getElementById("fpsMeter").textContent = `${fps.toFixed(2)} fps`;
}