#version 300 es

precision mediump float;

in vec2 vertPosition;
out vec2 coordinates;

void main()
{
	coordinates = vertPosition;
	gl_Position = vec4(vertPosition.x, vertPosition.y, 0, 1);
}
