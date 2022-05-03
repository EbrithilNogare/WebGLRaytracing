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

	canvas.addEventListener("webglcontextlost", function(event) {
		document.getElementById("errorLog").innerHTML += "<br/>webglcontextlost";
		event.preventDefault();
	}, false);

	if(!gl){
		document.getElementById("errorLog").innerHTML += "<br/>no webgl 2";
		throw("no webgl 2");
	}

	gl.imageSmoothingEnabled = false;

	document.body.onkeydown = function(e) {
		if (e.key == " " ||
			e.code == "Space"    
		)
		loop = !loop
	}
	

	await initProgram()

	renderLoop()
	render()
}

async function initProgram(){
	
	document.getElementById("errorLog").innerHTML += "Downloading vertex shader ... ";
	let vertexShaderText = await fetch("main.vert")
		.then(response => response.text())
		.catch(()=>{throw("cannot load main.vert")});
	document.getElementById("errorLog").innerHTML += "DONE<br/>";

	document.getElementById("errorLog").innerHTML += "Downloading fragment shader ... ";
	let fragmentShaderText = await fetch("main.frag")
		.then(response => response.text())
		.catch(()=>{throw("cannot load main.frag")});
	document.getElementById("errorLog").innerHTML += "DONE<br/>";

	let stopwatch = Date.now();

	let vertexShader = gl.createShader(gl.VERTEX_SHADER);
	let fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);

	gl.shaderSource(vertexShader, vertexShaderText);
	gl.shaderSource(fragmentShader, fragmentShaderText);

	document.getElementById("errorLog").innerHTML += "Compiling vertex shader ... ";
	gl.compileShader(vertexShader);
	if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
		console.error(`ERROR compiling vertex shader! \n ${gl.getShaderInfoLog(vertexShader)}`);
	}
	document.getElementById("errorLog").innerHTML += "DONE<br/>";

	document.getElementById("errorLog").innerHTML += "Compiling fragment shader ... ";
	gl.compileShader(fragmentShader);
	if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
		console.error(`ERROR compiling fragment shader! \n ${gl.getShaderInfoLog(fragmentShader)}`);
	}
	document.getElementById("errorLog").innerHTML += "DONE<br/>";

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
	let positions = [-1,  3, -1, -1, 3, -1];
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

	gl.bindVertexArray(vao);

	gl.drawArrays(
		gl.TRIANGLES,	// primitive type
		0,				// offset
		3				// count
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