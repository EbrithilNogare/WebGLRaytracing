#version 300 es

precision highp float;

in vec2 coordinates;

uniform vec2 resolution;
uniform vec3 cameraPos;
uniform vec3 cameraLookAt;

out vec4 outColor;

// editable
#define SAMPLES 2
#define MAXBOUNCES 6


const float INFINITY = 1.0 / 0.0;
const float EPSILON = 0.0001; // todo better definition
const float PI = 3.1415926535897932384626433832795;

struct Ray {
	vec3 origin;
	vec3 direction;
};

struct Material{
	vec3 color;
	float reflection;
	float refraction;
	bool texture;
	bool emissive;
};

struct Sphere{
	vec3 center;
	float radius;
	Material material;
};

struct HitRecord {
    vec3 p;			// position
    vec3 normal;
    float t;		// distance
	float u;
	float v;
	bool frontFace;
	Material material;
};


bool hitSphere(Sphere sphere, Ray ray);
vec3 rayColor(Ray ray);

vec3 unitVector(vec3 v) {
    return v / length(v);
}

vec3 at(Ray ray, float t) {
	return ray.origin + t * ray.direction;
}

float rand(float seed){
    return fract(sin(dot(vec2(seed) * coordinates, vec2(12.9898, 78.233))) * 43758.5453);
}
float rand(float seed, float min, float max) { return min + (max - min) * rand(seed); }
vec2 rand2(float seed, float min, float max) { return vec2( rand(seed, min, max), rand(seed * 4793.0, min, max)); }
vec3 rand3(float seed, float min, float max) { return vec3(rand(seed, min, max), rand(seed + 4789.0, min, max), rand(seed + 7919.0, min, max)); }
vec2 rand2(float seed)                       { return rand2(seed, 0.0, 1.0); }
vec3 rand3(float seed)                       { return rand3(seed, 0.0, 1.0); }

vec3 random_in_unit_sphere(float seed) {
	vec3 rand = rand3(seed);
	float ang1 = (rand.x + 1.0) * PI; // [-1..1) -> [0..2*PI)
	float u = rand.y; // [-1..1), cos and acos(2v-1) cancel each other out, so we arrive at [-1..1)
	float u2 = u * u;
	float sqrt1MinusU2 = sqrt(1.0 - u2);
	float x = sqrt1MinusU2 * cos(ang1);
	float y = sqrt1MinusU2 * sin(ang1);
	float z = u;
	return vec3(x, y, z);
}

vec3 random_unit_vector(float seed) {
    return normalize(random_in_unit_sphere(seed));
}

vec3 random_in_hemisphere(vec3 normal, float seed) {
    vec3 in_unit_sphere = random_in_unit_sphere(seed);
    if (dot(in_unit_sphere, normal) > 0.0) // In the same hemisphere as the normal
        return in_unit_sphere;
    else
        return -in_unit_sphere;
}

//                                           R    G    B    Reflect Refract   Texture Emissive
const Material ground       = Material(vec3(0.3, 0.3, 0.3),   0.0,  0.0,       true,  false);
const Material glass        = Material(vec3(1.0, 1.0, 1.0),   1.0,  1.5,       false, false);
const Material metal        = Material(vec3(1.0, 1.0, 1.0),   1.0,  0.0,       false, false);
const Material roughtMetal  = Material(vec3(1.0, 1.0, 1.0),   0.3,  0.0,       false, false);

const Material solidIndigo  = Material(vec3(0.3, 0.0, 0.5),   0.0,  0.0,       false, false);
const Material solidGreen   = Material(vec3(0.0, 1.0, 0.0),   0.0,  0.0,       false, false);
const Material solidRed     = Material(vec3(1.0, 0.0, 0.0),   0.0,  0.0,       false, false);
const Material solidBlue    = Material(vec3(0.0, 0.0, 1.0),   0.0,  0.0,       false, false);
const Material solidYellow  = Material(vec3(1.0, 1.0, 0.0),   0.0,  0.0,       false, false);
const Material solidWhite   = Material(vec3(1.0, 1.0, 1.0),   0.0,  0.0,       false, false);
const Material cornellRed   = Material(vec3(1.0, 0.01, 0.01), 0.01, 0.0,       false, false);
const Material cornellGreen = Material(vec3(0.01, 1.0, 0.01), 0.01, 0.0,       false, false);
const Material cornellWhite = Material(vec3(0.9, 0.9, 0.9),   0.01, 0.0,       false, false);

const Material weakLight    = Material(vec3(  1.0,   1.0,   1.0 ), 0.0,  0.0,  false, true );
const Material light        = Material(vec3( 10.0,  10.0,  10.0 ), 0.0,  0.0,  false, true );
const Material strongLight  = Material(vec3(100.0, 100.0, 100.0 ), 0.0,  0.0,  false, true );
const Material glowOrange   = Material(vec3(  1.7,   0.6,   0.01), 0.0,  0.0,  false, true );

/**/ // switch
const Sphere lights[] = Sphere[](
	Sphere(vec3( 0.5, 0.2, 1.5),  0.1, glowOrange),
	Sphere(vec3(-0.5, 0.2,-1.5),  0.1, glowOrange),
	Sphere(vec3( 0.0, 20,  0.0), 10.0, strongLight)
);
const Sphere spheres[] = Sphere[](
	Sphere(vec3(-1.2, 0.5, 0.0), 0.5, solidIndigo),
	Sphere(vec3( 0.0, 0.5, 0.0), 0.5, glass),
	Sphere(vec3( 1.2, 0.5, 0.0), 0.5, metal),
	Sphere(vec3( 2.4, 0.5, 0.0), 0.3, roughtMetal),

	Sphere(vec3( 1.0, 0.1, 1.0), 0.1, solidYellow),
	Sphere(vec3(-1.0, 0.1, 1.0), 0.1, solidGreen),
	Sphere(vec3( 2.0, 0.2, 1.0), 0.2, solidRed),
	Sphere(vec3(-2.0, 0.1, 1.0), 0.1, glass),
	Sphere(vec3( 0.0, 0.1, 1.0), 0.1, glass),

	Sphere(vec3( 1.0, 0.2, 2.0), 0.2, solidWhite),
	Sphere(vec3(-1.0, 0.2, 2.0), 0.2, glass),
	Sphere(vec3( 2.0, 0.1, 2.0), 0.1, solidYellow),
	Sphere(vec3(-2.0, 0.1, 2.0), 0.1, solidGreen),
	Sphere(vec3( 0.0, 0.1, 2.0), 0.1, solidBlue),

	Sphere(vec3( 1.0, 0.1,-1.0), 0.1, glass),
	Sphere(vec3(-1.0, 0.1,-1.0), 0.1, solidBlue),
	Sphere(vec3( 2.0, 0.1,-1.0), 0.1, solidYellow),
	Sphere(vec3(-2.0, 0.1,-1.0), 0.1, solidGreen),
	Sphere(vec3( 0.0, 0.2,-1.0), 0.2, solidRed),

	Sphere(vec3( 1.0, 0.1,-2.0), 0.1, solidYellow),
	Sphere(vec3(-1.0, 0.1,-2.0), 0.1, solidGreen),
	Sphere(vec3( 2.0, 0.2,-2.0), 0.2, metal),
	Sphere(vec3(-2.0, 0.1,-2.0), 0.1, solidBlue),
	Sphere(vec3( 0.0, 0.1,-2.0), 0.1, glass),

	Sphere(vec3( 0.0,-255, 0.0), 255.0, ground) // ground
);
/*/
const Sphere lights[] = Sphere[](
	Sphere(vec3( 0.0, 1.8, 0.0), 0.5, weakLight)
);
const Sphere spheres[] = Sphere[](
	Sphere(vec3(-251.0, 0.0, 0.0), 250.0, cornellRed),
	Sphere(vec3( 251.0, 0.0, 0.0), 250.0, cornellGreen),
	Sphere(vec3( 0.0, 0.0,-251.0), 250.0, cornellWhite),
	Sphere(vec3(0.0, 251.5, 0.0), 250.0, cornellWhite),
	Sphere(vec3(0.0,-250.5, 0.0), 250.0, cornellWhite),

	Sphere(vec3( -0.3, 0.0, 0.0), 0.5, metal),
	Sphere(vec3( 0.5, -0.2, 0.6), 0.3, glass)
);
/**/


void main() {
	vec3 tmpColor = vec3(0.0);

	vec3 lookfrom = cameraPos;
	vec3 lookat = cameraLookAt;
	vec3 vup = vec3(0, 1, 0);
	float vfov = 60.0;
	float aspect_ratio = resolution.x / resolution.y;
	float aperture = 0.1;
	float focus_dist = 10.0;

	float theta = radians(vfov);
	float h = tan(theta / 2.);
	float viewport_height = 2.0 * h;
	float viewport_width = aspect_ratio * viewport_height;

	vec3 w = normalize(lookfrom - lookat);
	vec3 u = normalize(cross(vup, w));
	vec3 v = cross(w, u);

	vec3 origin = lookfrom;
	vec3 horizontal = focus_dist * viewport_width * u;
	vec3 vertical = focus_dist * viewport_height * v;
	vec3 lower_left_corner = origin - horizontal / 2. - vertical / 2. - focus_dist * w;

	for(int sampleI = 0; sampleI < SAMPLES; sampleI++){
		vec2 randomOffset = rand2(1.11 * float(sampleI)) / resolution;
		randomOffset += (coordinates + 1.0) / 2.0;

		Ray ray = Ray(cameraPos, lower_left_corner + randomOffset.x * horizontal + randomOffset.y * vertical - cameraPos);
		tmpColor += rayColor(ray);
	}

	float gamma = 2.2;

	outColor = vec4(pow(tmpColor / float(SAMPLES), vec3(1.0 / gamma)), 1.0);
	//outColor = vec4(vec3(rand(1.2)), 1.0); // rand test
}

bool hitSphere(Sphere sphere, Ray ray, float tMin, float tMax, inout HitRecord rec) {
    vec3 oc = ray.origin - sphere.center;
    float a = dot(ray.direction, ray.direction);
    float half_b = dot(oc, ray.direction);
    float c = dot(oc, oc) - sphere.radius * sphere.radius;
    float discriminant = half_b * half_b - a * c;
	
	if (discriminant < 0.0)
        return false;

	float sqrtd = sqrt(discriminant);
	float root = (-half_b - sqrtd) / a;
    if (root < tMin || tMax < root) {
        root = (-half_b + sqrtd) / a;
        if (root < tMin || tMax < root)
            return false;
    }

	rec.t = root;
	rec.p = at(ray, rec.t);

	vec3 outward_normal = (rec.p - sphere.center) / sphere.radius;
	rec.frontFace = dot(ray.direction, outward_normal) < 0.;
	rec.normal = rec.frontFace ? outward_normal : - outward_normal;
	rec.material = sphere.material;

	float theta = acos(-rec.p.y);
	float phi = atan(-rec.p.z, rec.p.x) + PI;
	rec.u = phi / (2.0 * PI);
	rec.v = theta / PI;

	return true;
}

HitRecord WorldHit(Ray ray){
	HitRecord rec = HitRecord(vec3(0.0),vec3(0.0), INFINITY, 0.0, 0.0, false, ground);

	for(int i = 0; i < spheres.length(); i++)
		hitSphere(spheres[i], ray, EPSILON, rec.t, rec);
		
	for(int i = 0; i < lights.length(); i++)
		hitSphere(lights[i], ray, EPSILON, rec.t, rec);
		
	return rec;	
}

vec3 directionToLight(Sphere light, vec3 point){
	return normalize(light.center + light.radius * random_in_unit_sphere(point.x) - point);
}

vec3 LightHit(vec3 point, vec3 normal){
	vec3 lightColor = vec3(0);
	HitRecord rec = HitRecord(vec3(0.0),vec3(0.0), INFINITY, 0.0, 0.0, false, ground);
	for(int i = 0; i < lights.length(); i++){
		
		Ray ray = Ray(point, directionToLight(lights[i], point));
		
		if(dot(normal, ray.direction) <= 0.0)
			continue;
		
		rec = WorldHit(ray);
		lightColor += float(rec.material.emissive) * rec.material.color / pow(rec.t, 3.0);
	}
	return lightColor;	
}


vec3 rayColor(Ray ray){
	vec3 rayColor = vec3(1.0);
	vec3 lightAdditive = vec3(0.0);
	float totalDistance = 0.0;
	int depth = 0;

	for(; depth < MAXBOUNCES; depth++){

		HitRecord rec = WorldHit(ray);

		vec3 materialColor = rec.material.color;
		if(rec.material.texture && sin(16.0 * rec.p.x) * sin(16.0 * rec.p.z) < -0.015)
			materialColor /= 8.0;

		totalDistance += rec.t;

		if(rec.material.emissive){ // light
			rayColor *= materialColor / pow(totalDistance, 3.0);
			lightAdditive += rayColor;
			break;
		}

		vec3 light = LightHit(rec.p, rec.normal);

		if(rec.material.refraction == 0.0){ // light on solid
			lightAdditive += rayColor * light * materialColor * (1.0 - rec.material.reflection);
		}

		if(rec.t >= INFINITY){ // nothing hitted
			rayColor = vec3(0);
			break;
		}

		vec3 target;
		if(rec.material.refraction > 0.0){ // glass
			float refraction_ratio = rec.frontFace ? (1.0 / rec.material.refraction) : rec.material.refraction;
			vec3 unit_direction = normalize(ray.direction);
			target = refract(unit_direction, rec.normal, refraction_ratio);
		} else{
			// mirror
			vec3 targetReflect = reflect(ray.direction, rec.normal);
			// diffuse
			vec3 targetDiffuse = rec.normal + random_in_hemisphere(rec.normal, rec.t + float(depth));
			target = mix(targetDiffuse, targetReflect, rec.material.reflection);
		}
		ray = Ray(rec.p, target);

		rayColor *= materialColor;
	}
	return lightAdditive;
}
