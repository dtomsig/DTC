// render.js is an ES module. Therefore, strict mode is enabled without including 'use strict;'.

import {camera, circle, compile_shader, create_program, create_texture, model, square, static_cr_sim, url_file_to_str}
       from './lib/gl_util.js';

const MAX_SAMPLES = 15, SENSITIVITY = 1.35;
let rotate = false;
let cur_m_x = 0, cur_m_y = 0, prev_m_x = 0, prev_m_y = 0;
let canvas, cur_time, fps, fire, gl, fr_idx, fr_sum, fr_times, main_camera, prev_time, sh1_program, tex_fire;

// This file is loaded as a module in the associated HTML. Therefore, all HTML elements are loaded prior to this
// JavaScript file being loaded. Event attributes can safely be defined as done below.
window.onload = init_web_gl;
document.getElementById('id_canvas_main').onpointermove = on_canvas_move;
document.getElementById('id_canvas_main').onpointerleave = on_canvas_leave;


function init_web_gl()
{
    canvas = document.getElementById('id_canvas_main');
    gl = canvas.getContext('webgl2');

    // Test for success.
    if(!gl)
        throw('Unable to initialize WebGL. Your browser may not support it.');
    
    // Set up camera.
    main_camera = new camera(gl);
    main_camera.set_eye_pos(0.0, 0.0, -1.0);
    main_camera.set_targ_pos(0.0, 0.0, 0.0);
    main_camera.set_up_vec(0.0, 1.0, 0.0);

    // Set up FPS moving average counter.
    fps = 0, fr_idx = 0, fr_sum = 0, prev_time = 0;
    fr_times = Array(MAX_SAMPLES).fill(0);

    // Compile shaders and create programs. URLs are relative to the location of graphics.html, not render.js.
    let sh1_v_shader = compile_shader(gl, url_file_to_str('shdr/sh_1_fire_part_system.vert'), gl.VERTEX_SHADER);
    let sh1_f_shader = compile_shader(gl, url_file_to_str('shdr/sh_1_fire_part_system.frag'), gl.FRAGMENT_SHADER);
    sh1_program = create_program(gl, sh1_v_shader, sh1_f_shader);

    // Create objects.
    let crcl_particle = new circle(gl, 100) ;     // (gl, num_segs)
    fire              = new static_cr_sim(gl, 10);   // (gl, num_particles)
    fire.set_ref_particle(crcl_particle);
    crcl_particle.mesh.free();

    fire.init_particles();
    fire.set_camera(main_camera);

    // Get all pointers to supply attribute data.
    let mdl_mtx_attrib_ptr_0 = gl.getAttribLocation(sh1_program, 'a_mdl_mtx_pt_0');
    let mdl_mtx_attrib_ptr_1 = gl.getAttribLocation(sh1_program, 'a_mdl_mtx_pt_1');
    let mdl_mtx_attrib_ptr_2 = gl.getAttribLocation(sh1_program, 'a_mdl_mtx_pt_2');
    let mdl_mtx_attrib_ptr_3 = gl.getAttribLocation(sh1_program, 'a_mdl_mtx_pt_3');
    let st_coords_attrib_ptr = gl.getAttribLocation(sh1_program, 'a_st_coords');
    let v_pos_attrib_ptr     = gl.getAttribLocation(sh1_program, 'a_pos');
    
    // Set data sources for attribute variables. The binding gets stored in the Vertex Array. Therefore, the call isn't
    // required on each render pass. 
    // The arguments are (target, vbo_idx, attrib_ptr, size, type, normalize, stride, offset, divisor).
    let fire_mesh = fire.mesh;
    fire_mesh.set_attrib_ptr(gl.ARRAY_BUFFER, 0, v_pos_attrib_ptr, 3, gl.FLOAT, false, 0, 0, 0);  // Vertex
    fire_mesh.set_attrib_ptr(gl.ARRAY_BUFFER, 2, st_coords_attrib_ptr, 2, gl.FLOAT, false, 0, 0, 0);  // ST
                                                                                // Texture Coordinate Buffer
    fire_mesh.set_attrib_ptr(gl.ARRAY_BUFFER, 3, mdl_mtx_attrib_ptr_0, 4, gl.FLOAT, false, 64, 0, 1);  // Model
    fire_mesh.set_attrib_ptr(gl.ARRAY_BUFFER, 3, mdl_mtx_attrib_ptr_1, 4, gl.FLOAT, false, 64, 16, 1); // Matrix
    fire_mesh.set_attrib_ptr(gl.ARRAY_BUFFER, 3, mdl_mtx_attrib_ptr_2, 4, gl.FLOAT, false, 64, 32, 1);
    fire_mesh.set_attrib_ptr(gl.ARRAY_BUFFER, 3, mdl_mtx_attrib_ptr_3, 4, gl.FLOAT, false, 64, 48, 1);

    // Create textures. URLs are relative to the location of graphics.html, not render.js.
    tex_fire = create_texture(gl, 'img/tex_fire.png');

    // Set initial OpenGL states.
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Set clear color to black, fully opaque.
    gl.enable(gl.CULL_FACE);            // Turn on culling. By default, back-facing triangles will be culled.
    gl.cullFace(gl.BACK);               // Setting here is not strictly required as it is a default.
    gl.frontFace(gl.CCW);               // Setting here is not strictly required as it is a default.
    gl.enable(gl.DEPTH_TEST);
    // Branch the program to the render loop.
    requestAnimationFrame(update);
}


// Prevents a large arcball rotation when the mouse initially enters the canvas. The "rotate" flag is set to true
// only after one movement in the canvas has been made.
function on_canvas_leave(event)
{
    rotate = false;
}


function on_canvas_move(event)
{
    cur_m_x = event.clientX;
    cur_m_y = event.clientY;

    let delta_x = cur_m_x - prev_m_x;
    let delta_y = cur_m_y - prev_m_y;

    prev_m_x = cur_m_x;
    prev_m_y = cur_m_y;

    // "pct_x" and "pct_y" are used incase the canvas size changes (happens when the viewport width is below 600px).
    // This allows the amount of camera rotation to be based on the percentage of the canvas traversed, not the number
    // of  pixels traversed. Without this, on small canvases it would be difficult to rotate the camera.
    let pct_x = delta_x / canvas.clientWidth;
    let pct_y = delta_y / canvas.clientHeight;

    // When "SENSITIVTY" is equal to 1, moving the mouse across the entire screen means "rads_x" or "rads_y" will be
    // equal to 2 PI radians. This means the camera is rotated in a full circle.
    let rads_x = pct_x * (2 * Math.PI);
    let rads_y = pct_y * (2 * Math.PI);

    if(rotate === true)
        main_camera.traverse_arcball(rads_x * SENSITIVITY, rads_y * SENSITIVITY);
    rotate = true;
}


function update(cur_time)
{
    // On each loop, requestAnimationFrame() sets the value of cur_time to the current time.
    let fr_delta = cur_time - prev_time;
    prev_time = cur_time;

    fr_sum = fr_sum - fr_times[fr_idx];    // Subtract value falling off.
    fr_sum = fr_sum + fr_delta;            // Add new value.
    fr_times[fr_idx] = fr_delta;           // Save new value so it can be subtracted later.
    fr_idx = (fr_idx + 1) % MAX_SAMPLES;   // Increase buffer index. Wraps back to index 0.

    fps = Math.round((1000 / (fr_sum / MAX_SAMPLES)));
    // Update the FPS display. Variable "fps" is converted to a string automatically prior to concatenation.
    document.getElementById('id_p_fps_counter').innerHTML = `<strong> FPS: ${fps} </strong>`;

    // Rendering commands begin here.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Update the fire particle system.
    fire.update(fr_delta);

    // Render the fire particle system.
    gl.useProgram(sh1_program);

    // Disable face culling so both faces of the fire can be seen from both sides.
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE); // The most aggressive additive blend
    gl.blendEquation(gl.FUNC_ADD);
    gl.depthMask(false);

    // Get all pointers to supply uniform data.
    let fr_time_uni_ptr      = gl.getUniformLocation(sh1_program, 'u_fr_time');
    let proj_mtx_uni_ptr     = gl.getUniformLocation(sh1_program, 'u_proj_mtx');
    let sim_time_uni_ptr     = gl.getUniformLocation(sh1_program, 'u_sim_time');
    let size_uni_ptr         = gl.getUniformLocation(sh1_program, 'u_size');
    let view_mtx_uni_ptr     = gl.getUniformLocation(sh1_program, 'u_view_mtx');

    // Set data sources for uniform variables.
    gl.uniform1f(fr_time_uni_ptr, 28);          // The amount of time for each frame is in milliseconds.
    gl.uniform1f(sim_time_uni_ptr, cur_time);   // The amount of simulation time in milliseconds.
    gl.uniform2i(size_uni_ptr, 5, 5);           // "tex_fire.jpg" is a 5 by 5 texture sheet.
    gl.uniformMatrix4fv(proj_mtx_uni_ptr, false, main_camera.compute_proj_mtx());
    gl.uniformMatrix4fv(view_mtx_uni_ptr, false, main_camera.compute_view_mtx());

    // Set texture data.
    gl.activeTexture(gl.TEXTURE0 + 0);
    gl.bindTexture(gl.TEXTURE_2D, tex_fire);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Render object with active shader program.
    fire.render();

    // Set face culling and blending parameters back to their default states.
    gl.enable(gl.CULL_FACE);
    gl.disable(gl.BLEND);
    gl.depthMask(true);

    requestAnimationFrame(update);
}