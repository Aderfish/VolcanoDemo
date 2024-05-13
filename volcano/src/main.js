import { DOM_loaded_promise, load_text } from "./utils/icg_web.js";
import { createREGL } from "../lib/regljs_2.1.0/regl.module.js";
import { mat4, vec2, vec4 } from "../lib/gl-matrix_3.3.0/esm/index.js";
import { deg_to_rad, mat4_matmul_many } from "./utils/icg_math.js";
import { init_noise } from "./noise/noise.js";
import { init_terrain_actor } from "./terrain/terrain_actor.js";
import { init_volcano_heightmap } from "./noise/volcano_heightmap.js";
import { GenerationParameters } from "./noise/generation_parameters.js";
import { link_generation_parameters_menu } from "./ui/generation_parameters_menu.js";
import { init_billboard_actor } from "./particles/billboard_actor.js";

async function main() {
  // Create the regl canvas
  const regl = createREGL({
    profile: true, // if we want to measure the size of buffers/textures in memory
    extensions: ["OES_texture_float", "OES_element_index_uint"], // enable float textures
  });

  // The <canvas> (HTML element for drawing graphics) was created by REGL, lets take a handle to it.
  const canvas_elem = document.getElementsByTagName("canvas")[0];

  let update_needed = true;

  {
    // Resize canvas to fit the window, but keep it square.
    function resize_canvas() {
      canvas_elem.width = window.innerWidth;
      canvas_elem.height = window.innerHeight;

      update_needed = true;
    }
    resize_canvas();
    window.addEventListener("resize", resize_canvas);
  }

  /*---------------------------------------------------------------
		Resource loading
	---------------------------------------------------------------*/
  const resources = [];

  // Start downloads in parallel
  [
    "noise/shaders/noise.frag.glsl",
    "noise/shaders/display.vert.glsl",

    "terrain/shaders/terrain.vert.glsl",
    "terrain/shaders/terrain.frag.glsl",

    "noise/shaders/buffer_to_screen.vert.glsl",
    "noise/shaders/buffer_to_screen.frag.glsl",

    "noise/shaders/volcano_heightmap.vert.glsl",
    "noise/shaders/volcano_heightmap.frag.glsl",

    "particles/shaders/billboard.vert.glsl",
    "particles/shaders/billboard.frag.glsl",
  ].forEach((shader_filename) => {
    resources[`${shader_filename}`] = load_text(`./src/${shader_filename}`);
  });

  // Wait for all downloads to complete
  for (const key of Object.keys(resources)) {
    resources[key] = await resources[key];
  }

  /*---------------------------------------------------------------
		Camera
	---------------------------------------------------------------*/
  const mat_turntable = mat4.create();
  const cam_distance_base = 0.75;

  let cam_angle_z = -0.5; // in radians!
  let cam_angle_y = -0.42; // in radians!
  let cam_distance_factor = 300;

  let cam_target = [0, 0, 0];

  function update_cam_transform() {
    let M_yrot = mat4.fromYRotation(mat4.create(), cam_angle_y);
    let M_zrot = mat4.fromZRotation(mat4.create(), cam_angle_z);

    // Example camera matrix, looking along forward-X, edit this
    const look_at = mat4.lookAt(
      mat4.create(),
      [-cam_distance_base * cam_distance_factor, 0, 0], // camera position in world coord
      [0, 0, 0], // view target point
      [0, 0, 1] // up vector
    );
    // Store the combined transform in mat_turntable
    // mat_turntable = A * B * ...
    mat4_matmul_many(mat_turntable, look_at, M_yrot, M_zrot); // edit this
  }

  update_cam_transform();

  // Prevent clicking and dragging from selecting the GUI text.
  canvas_elem.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  // Rotate camera position by dragging with the mouse
  window.addEventListener("mousemove", (event) => {
    // if left or middle button is pressed
    if (event.buttons & 1 || event.buttons & 4) {
      if (event.shiftKey) {
        const r = mat2.fromRotation(mat2.create(), -cam_angle_z);
        const offset = vec2.transformMat2(
          [0, 0],
          [event.movementY, event.movementX],
          r
        );
        vec2.scale(offset, offset, -0.01);
        cam_target[0] += offset[0];
        cam_target[1] += offset[1];
      } else {
        cam_angle_z += event.movementX * 0.005;
        cam_angle_y += -event.movementY * 0.005;
      }
      update_cam_transform();
      update_needed = true;
    }
  });

  window.addEventListener("wheel", (event) => {
    // scroll wheel to zoom in or out
    const factor_mul_base = 1.08;
    const factor_mul = event.deltaY > 0 ? factor_mul_base : 1 / factor_mul_base;
    cam_distance_factor *= factor_mul;
    cam_distance_factor = Math.max(0.1, Math.min(cam_distance_factor, 4000));
    // console.log('wheel', event.deltaY, event.deltaMode)
    event.preventDefault(); // don't scroll the page too...
    update_cam_transform();
    update_needed = true;
  });

  let regenerate_terrain_needed = true;
  let generation_parameters = new GenerationParameters();

  link_generation_parameters_menu(
    generation_parameters,
    (generationParameters) => {
      generation_parameters = generationParameters;
      regenerate_terrain_needed = true;
      update_needed = true;
    }
  );

  /*---------------------------------------------------------------
		Actors
	---------------------------------------------------------------*/

  const volcano_heightmap = init_volcano_heightmap(regl, resources);
  let terrain_actor;

  const billboard_actor = init_billboard_actor(regl, resources);

  /*---------------------------------------------------------------
		Frame render
	---------------------------------------------------------------*/
  const mat_projection = mat4.create();
  const mat_view = mat4.create();

  let light_position_world = [-800, -800, 800, 1.0];

  const light_position_cam = [0, 0, 0, 0];

  regl.frame((frame) => {
    if (regenerate_terrain_needed) {
      regenerate_terrain_needed = false;
      console.log("Regenerating terrain");
      volcano_heightmap.draw_heightmap_to_buffer({
        generation_parameters: generation_parameters,
      });
      terrain_actor = init_terrain_actor(
        regl,
        resources,
        volcano_heightmap.get_buffer(),
        generation_parameters.terrain
      );
      console.log("Terrain regenerated");
    }

    if (update_needed) {
      update_needed = false; // do this *before* running the drawing code so we don't keep updating if drawing throws an error.

      mat4.perspective(
        mat_projection,
        deg_to_rad * 60, // fov y
        frame.framebufferWidth / frame.framebufferHeight, // aspect ratio
        0.01, // near
        4000 // far
      );

      mat4.copy(mat_view, mat_turntable);

      // Calculate light position in camera frame
      vec4.transformMat4(light_position_cam, light_position_world, mat_view);

      const scene_info = {
        mat_view: mat_view,
        mat_projection: mat_projection,
        light_position_cam: light_position_cam,
      };

      // Set the whole image to black
      regl.clear({ color: [0.9, 0.9, 1, 1] });

      terrain_actor.draw(scene_info);
    
      const time = frame.time * 0.001; // time in seconds
      billboard_actor.draw(mat_view, mat_projection, time);
    }
  });
}

DOM_loaded_promise.then(main);
