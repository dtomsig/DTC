// gl_util.js is an ES module. Therefore, strict mode is enabled without including 'use strict;'.

import './gl-matrix.js';
// The above import statement creates an object called "glMatrix". The object destructuring below allows for properties
// to be referenced directly. For example, vec3.create() instead of glMatrix.vec3.create(). The file imported uses
// UMD (Universal Module Definition).
let {mat2, mat2d, mat3, mat4, quat, quat2, vec3, vec4} = glMatrix;
import {gen_rand_gaussian} from './gaussian.js';
export {camera, circle, compile_shader, create_program, create_texture, instanced_mesh, mesh, model, particle,
        particle_system, rising_sim, square, static_cr_sim, url_file_to_str};


class camera
{
    // Camera Projection:
    aspect         = 1.0;                                  // The camera's aspect ratio.
    fov            = (95 * 2 * Math.PI) / 360;             // The field of view in radians. Set to a gaming FOV.
    z_far          = 100;                                  // The far value in glMatrix's perspective() function.
    z_near         = 0.1;                                  // The near value in glMatrix's perspective() function.

    // Camera Orientation:
    eye_pos        = vec3.fromValues(0.0, 0.0,  0.0);      // The current position of the eye.
    eye_radius     = 1.0;                                  // The distance from the eye to the target.
    targ_pos       = vec3.fromValues(0.0, 0.0, -1.0);      // The point being looked at by the camera.
    up_vec         = vec3.fromValues(0.0, 1.0,  0.0);      // The up vector of the camera(normalized).

    constructor(gl)
    {
        this.aspect = gl.canvas.width / gl.canvas.height;
    }

    compute_proj_mtx()
    {
        let proj_mtx = mat4.create();
        
        mat4.perspective(proj_mtx, this.fov, this.aspect, this.z_near, this.z_far);
        return proj_mtx;
    }

    compute_view_mtx()
    {
        let view_mtx = mat4.create();

        mat4.lookAt(view_mtx, this.eye_pos, this.targ_pos, this.up_vec);
        return view_mtx;
    }

    set_eye_pos(x, y, z)
    {
        vec3.set(this.eye_pos, x, y, z);

        // "eye_radius" is needed in traverse_arcball().
        let x1 =                x, y1 =                y, z1 =                z;
        let x2 = this.targ_pos[0], y2 = this.targ_pos[1], z2 = this.targ_pos[2];
        this.eye_radius = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) + Math.pow(z1 - z2, 2));
    }

    set_targ_pos(x, y, z)
    {
        vec3.set(this.targ_pos, x, y, z);

        // "eye_radius" is needed in traverse_arcball().
        let x1 = this.eye_pos[0], y1 = this.eye_pos[1], z1 = this.eye_pos[2];
        let x2 =                x, y2 =                y, z2 =                z;
        this.eye_radius = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) + Math.pow(z1 - z2, 2));
    }

    set_up_vec(x, y, z)
    {
        vec3.set(this.up_vec, x, y, z);
        vec3.normalize(this.up_vec, this.up_vec);
    }

    traverse_arcball(rads_x, rads_y)
    {
        // 1. Prepare data and storage needed for Steps 2 and 3 to use the Rodrigues Rotation Formula.
        let fwd_vec = vec3.fromValues(0.0, 0.0, 0.0), right_vec   = vec3.fromValues(0.0, 0.0, 0.0);
        let k_cr_v  = vec3.fromValues(0.0, 0.0, 0.0), k_cr_k_cr_v = vec3.fromValues(0.0, 0.0, 0.0);
        let c_x = Math.cos(-rads_x), c_y = Math.cos(-rads_y), s_x = Math.sin(-rads_x), s_y = Math.sin(-rads_y);
        vec3.subtract(fwd_vec, this.targ_pos, this.eye_pos);   // target position - eye position


        // 2. Moving the mouse left and right rotates the forward vector and right vector across the up camera axis.
        vec3.cross(k_cr_v, this.up_vec, fwd_vec);   // Rotate the forward vector across the up camera axis.
        vec3.cross(k_cr_k_cr_v, this.up_vec, k_cr_v); 
        for(let i = 0; i < 3; i++)
            fwd_vec[i] = fwd_vec[i] + (1 - c_x) * k_cr_k_cr_v[i] + s_x * k_cr_v[i];

        vec3.normalize(fwd_vec, fwd_vec);   // Normalize because a unit vector is needed in step 4.
        vec3.cross(right_vec, fwd_vec, this.up_vec);   // Calculate the right vector.
        vec3.normalize(right_vec, right_vec);   // Normalize because a unit vector is needed in step 3.

        // 3. Moving the mouse up and down rotates the forward vector and up vector across the right camera axis.
        vec3.cross(k_cr_v, right_vec, fwd_vec);   // Rotate the forward vector across the right camera axis.
        vec3.cross(k_cr_k_cr_v, right_vec, k_cr_v);
        for(let i = 0; i < 3; i++)
            fwd_vec[i] = fwd_vec[i] + (1 - c_y) * k_cr_k_cr_v[i] + s_y * k_cr_v[i];

        vec3.cross(this.up_vec, right_vec, fwd_vec);   // Calculate the new up vector.
        vec3.normalize(this.up_vec, this.up_vec);      // This class stores the up vector in normalized form.

        // 4. Scale the forward vector and calculate the new eye position.
        vec3.scale(fwd_vec, fwd_vec, this.eye_radius);
        vec3.subtract(this.eye_pos, this.targ_pos, fwd_vec);   // target position - forward vector
    }
};


class mesh
{
        gl_context = null;                                 // Stores the OpenGL context so it can be accessed later.

        // Rendering Parameters:
        idx_count  = 0;                                    // A GLintptr specifying the number of indices to render.
        mode       = 0;                                    // A GLenum specifying the drawing mode(example gl.TRANGLES).
        offset     = 0;                                    // A GLintptr specifying the starting index to be rendered.
                                                           // Must be a valid multiple of the size of the given type.
        type       = 0;                                    // A GLenum specifying type of data in the element array 
                                                           // buffer (example gl.UNSIGNED_SHORT).

        // Rendering Data Storage:
        vao        = null;                                 // The vertex array object containing all rendering state.
        vbo_list   = [null, null, null];                   // The list of VBOs in the mesh. Initially set to null.
                                                           // Index 0 is the vertex buffer.
                                                           // Index 1 is the index buffer.
                                                           // Index 2 is the ST texture coordinate buffer.

    constructor(gl)
    {
        this.gl_context = gl;
        this.vao        = gl.createVertexArray()
    }

    draw()
    {
        let gl = this.gl_context;

        gl.bindVertexArray(this.vao);
        gl.drawElements(this.mode, this.idx_count, this.type, this.offset);
    }

    free()
    {
        let gl = this.gl_context;

        for(let i = 0; i < this.vbo_list.length; i++)
        {
            gl.deleteBuffer(this.vbo_list[i]);
            this.vbo_list[i] = null;
        }

        gl.deleteVertexArray(this.vao);
    }

    // "target"     - The OpenGL buffer to bind to.
    // "vbo_idx"    - The index of the vbo to allocate and write to. Must be either 0, 1, or 2 for a mesh.
    // "attrib_ptr" - The GLuint that identifies the index of the vertex attribute to be modified.
    // "size"       - The number of elements (not bytes) associated with the attribute. Between 1 and 4.
    // "type"       - A GLenum specifying the data type of the element array buffer (example gl.UNSIGNED_SHORT).
    // "normalize"  - A GLboolean specifying whether integer data values should be normalized into a certain range 
    //                when being cast to a float.
    // "stride"     - A GLsizei specifying the offset in bytes between the beginning of consecutive vertex attributes.
    //                Between 0 and 255 (inclusive).
    // "offset"     - A GLintptr specifying an offset in bytes of the first component in the vertex attribute array.
    // "divisor"    - How many times the attribute advances for each instanced draw call. 0 means the attribute advances
    //                once per vertex. An attribute is only "instanced" when the divisor value is non-zero.
    set_attrib_ptr(target, vbo_idx, attrib_ptr, size, type, normalize, stride, offset, divisor)
    {
        let gl = this.gl_context;
 
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(target, this.vbo_list[vbo_idx]);
        gl.enableVertexAttribArray(attrib_ptr);
        gl.vertexAttribPointer(attrib_ptr, size, type, normalize, stride, offset);
        gl.vertexAttribDivisor(attrib_ptr, divisor);
    }

    // "mode"      - A GLenum specifying mode to draw (example gl.TRANGLES).
    // "count"     - A GLintptr specifying the  number of indices to be rendered.
    // "type"      - A GLenum specifying the data type for the element array buffer if used(example gl.UNSIGNED_SHORT).
    // "offset"    - A GLintptr specifying the starting index to be rendered.
    set_render_params(mode, count, type, offset)
    {
        this.mode      = mode;
        this.idx_count = count;
        this.type      = type;
        this.offset    = offset;
    }

    // "target"      - The OpenGL buffer to bind to.
    // "vbo_idx"     - The index of the VBO to allocate and write to. Must be either 0, 1, or 2 for a mesh.
    // "size_or_ptr" - Two options are possible. The bufferData() openGL command in WebGL2 can work in two ways.
    //                  1. Pass the number of bytes to allocate as a GLintptr (JavaScript number).
    //                     The buffer's data is not initialized.
    //                  2. Alternatively, pass a ArrayBuffer, SharedArrayBuffer, a TypedArray, or a DataView containing
    //                     data for anOpenGL buffer such as vertices, colors, indices, etc.
    // "usage"       - A GLenum specifying the intended usage pattern of the data store for optimization purposes.
    vbo_alloc(target, vbo_idx, size_or_ptr, usage)
    {
        let gl = this.gl_context;

        gl.bindVertexArray(this.vao);
        let vbo = gl.createBuffer();
        gl.bindBuffer(target, vbo);
        gl.bufferData(target, size_or_ptr, usage);

        this.vbo_list[vbo_idx] = vbo;
    }

    // Copy and recreate as many VBOs as possible from a source mesh.
    vbo_copy(src_mesh)
    {
        let gl = this.gl_context;

        // 1. Copy rendering parameters from the source mesh.
        this.idx_count = src_mesh.idx_count; this.mode = src_mesh.mode;
        this.offset    = src_mesh.offset   ; this.type = src_mesh.type;

        // 2. Measure the number of VBOs in the source and target meshes. The smaller number is used for iteration.
        let src_list = src_mesh.vbo_list;
        let num_src  = src_list.length;
        let num_targ = this.vbo_list.length;
        let num_iter = Math.min(num_src, num_targ);

        // 3.  Create copies of VBOs from the source mesh and associate the copies to the target mesh's VAO.
        for(let i = 0; i < num_iter; i++)
        {
            // The VBO reference can be null because an uninitialized reference can be present in the source.
            let src_bfr = src_list[i];
            if(src_bfr === null) continue;

            // Index 1 is the index buffer so the type is gl.ELEMENT_ARRAY_BUFFER. All others use type gl.ARRAY_BUFFER.
            let target = (i === 1) ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;

            // Get the usage and  size parameters from the source buffer.
            gl.bindBuffer(target, src_bfr);
            let usage = gl.getBufferParameter(target, gl.BUFFER_USAGE);
            let size = gl.getBufferParameter(target, gl.BUFFER_SIZE);

            // Allocate the target VBO and place its reference in the VBO list.
            this.vbo_alloc(target, i, size, usage);
            // Transfer data from the source VBO to the target VBO.
            gl.bindBuffer(gl.COPY_READ_BUFFER, src_bfr); gl.bindBuffer(gl.COPY_WRITE_BUFFER, this.vbo_list[i]);
            gl.copyBufferSubData(gl.COPY_READ_BUFFER, gl.COPY_WRITE_BUFFER, 0, 0, size);
        }
    }

    // "target"    - The OpenGL buffer to bind to.
    // "vbo_idx"   - The index of the VBO to allocate and write to. Must be either 0, 1, or 2 for a mesh.
    // "offset"    - The starting index of the VBO where updating begins.
    // "data"      - Must be an ArrayBuffer, SharedArrayBuffer, a TypedArray, or a DataView containing data for an
    //               OpenGL buffer such as vertices, colors, indices, etc.
    // "src_offset"- A GLuint specifying the element index offset where to start reading the buffer.
    // "length"    - Number of elements in the data buffer.
    vbo_update(target, vbo_idx, offset, data, src_offset, length)
    {
        let gl = this.gl_context;

        gl.bindVertexArray(this.vao);
        gl.bindBuffer(target, this.vbo_list[vbo_idx]);
        gl.bufferSubData(target, offset, data, src_offset, length);
    }
};


class instanced_mesh extends mesh
{
    inst_count     = 0;                                    // The number of instances.

    constructor(gl)
    {
        // The super constructor creates a VBO list with 3 elements. This constructor adds buffers 3 and 4 to the list.
        super(gl);
                                                           // Index 0 is the vertex buffer.
                                                           // Index 1 is the index buffer.
                                                           // Index 2 is the ST texture coordinate buffer.
        this.vbo_list[3] = null;                           // Index 3 is the buffer of model matrices for each instance.
    }

    draw()
    {
        let gl = this.gl_context;

        gl.bindVertexArray(this.vao);
        gl.drawElementsInstanced(this.mode, this.idx_count, this.type, this.offset, this.inst_count);
    }

    set_num_instances(num)
    {
        this.inst_count = num;
    }
};


class model
{
    gl_context     = null;                                 // Stores the OpenGL context so it can be accessed later.
    
    accel          = vec3.fromValues(0.0, 0.0,  0.0);      // The acceleration of the object.
    mesh           = null;                                 // The mesh associated with the object.
    pos            = vec3.fromValues(0.0, 0.0,  0.0);      // The position of the object.
    scale          = vec3.fromValues(1.0, 1.0,  1.0);      // The scaling (1.0 means object is not scaled).
    st_coords      = new Float32Array();                   // The ST texture coordinates of the object.
    targ_pos       = vec3.fromValues(0.0, 0.0, -1.0);      // The point being looked at by the object.
    up_vec         = vec3.fromValues(0.0, 1.0,  0.0);      // The up vector of the object (normalized).
    velocity       = vec3.fromValues(0.0, 0.0,  0.0);      // The velocity of the object.
    
    constructor(gl)
    {
        this.gl_context = gl;
    }

    compute_mdl_mtx()
    {
        let mdl_mtx = mat4.create(), fwd_vec = vec3.create(), right_vec = vec3.create();;
        vec3.subtract(fwd_vec, this.targ_pos, this.pos);   // target position - current position
        vec3.normalize(fwd_vec, fwd_vec);
        vec3.cross(right_vec, this.up_vec, fwd_vec);
        vec3.normalize(right_vec, right_vec);   // All three vectors are normalized by this point. The up vector is
                                                // normalized in set_up_vec().
        mat4.identity(mdl_mtx);
        // Fill the rotation matrix in the model matrix with data from the right vector, up vector, and forward vector.
        mdl_mtx[0]  = right_vec[0]   * this.scale[0];   // Right Vector With Scaling
        mdl_mtx[1]  = right_vec[1]   * this.scale[0];
        mdl_mtx[2]  = right_vec[2]   * this.scale[0];
        mdl_mtx[4]  = this.up_vec[0] * this.scale[1];   // Up Vector With Scaling
        mdl_mtx[5]  = this.up_vec[1] * this.scale[1];
        mdl_mtx[6]  = this.up_vec[2] * this.scale[1];
        mdl_mtx[8]  = fwd_vec[0]     * this.scale[2];   // Forward Vector With Scaling
        mdl_mtx[9]  = fwd_vec[1]     * this.scale[2];
        mdl_mtx[10] = fwd_vec[2]     * this.scale[2];
        mat4.translate(mdl_mtx, mdl_mtx, this.pos);

        return mdl_mtx;
    }

    render()
    {
        this.mesh.draw();
    }

    set_accel(x, y, z)
    {
        vec3.set(this.accel, x, y , z);
    }

    set_mesh(mesh)
    {
        this.mesh = mesh;
    }

    set_pos(x, y, z)
    {
        vec3.set(this.pos, x, y, z);
    }

    set_scale(x, y, z)
    {
        vec3.set(this.scale, x, y, z);
    }

    set_targ_pos(x, y, z)
    {
        vec3.set(this.targ_pos, x, y, z);
    }

    set_up_vec(x, y, z)
    {
        vec3.set(this.up_vec, x, y, z);
        vec3.normalize(this.up_vec, this.up_vec);
    }

    set_st_coords(coords)
    {
        this.st_coords = coords;
    }

    set_velocity(x, y, z)
    {
        vec3.set(this.velocity, x, y, z);
    }

    // dt is the amount of simulation time that has passed in miliseconds.
    update(dt)
    {
        let frac_sec = dt/1000;
        vec3.scaleAndAdd(this.velocity, this.velocity, this.accel, frac_sec);
        vec3.scaleAndAdd(this.pos, this.pos, this.velocity, frac_sec);
    }
};


class particle extends model
{
    born_timestmp  = Date.now();                             // The time the particle is born (ms).
    life           = -1;                                     // The amount of life (ms) remaining.
                                                             //  0 represents a dead particle.
                                                             // -1 represents an infiniely-lived particle.
    constructor(gl)
    {
        super(gl);
    }

    get_life()
    {
        return this.life;
    }

    get_time_elpsd()
    {
        return Date.now() - born_timestmp;
    }

    reset(life)
    {
        this.born_timestmp = Date.now();
        this.life = life;
    }

    update(dt)
    {
        // Life > 0 means the particle is neither dead nor infinitely-lived. Its life value should be updated.
        if(this.life > 0.0)
        {
            this.life -= dt;

            if(this.life < 0.0)
                this.life = 0;
        }
        super.update(dt);
    }
};


class particle_system extends model
{
    camera          = null;                                // A reference to a camera used for billboarding.
    life_span       = 0;                                   // The mean life for particles (ms).
    life_std_dev    = 0;                                   // The standard deviation of "life_span" (ms).
    max_particles   = 0;                                   // The maximum number of particles (dead or alive).
    mdl_arr         = null;                                // The model matrix data array for particles.
    particles       = [];                                  // The array that holds all particle references.
    r_prob          = 1.0;                                 // The chance of respawning per second dead (0.0 - 1.0).
    
    constructor(gl, num, life_span, life_std_dev, r_prob)
    {
        super(gl);

        this.mdl_arr       = new Float32Array(num * 16);
        this.max_particles = num;
        this.life_span     = life_span;
        this.life_std_dev  = life_std_dev;
        this.r_prob        = r_prob;
        // Associate an instanced mesh for the particle system.
        this.set_mesh(new instanced_mesh(gl));
        // Allocate the model matrix array. Setting a reference particle will create the other buffers (indices 0 - 2).
        this.mesh.vbo_alloc(gl.ARRAY_BUFFER, 3, this.mdl_arr, gl.DYNAMIC_DRAW);
        this.mesh.set_num_instances(this.max_particles);
    }

    // If necessary, modify this function in subclasses to change how particles are initialized.
    init_particles()
    {
        let gl = this.gl_context;

        // Create the initial particles for the system.
        for(let i = 0; i < this.max_particles; i++)
            this.particles[i] = new particle();
    }

    respawn_particle(particle)
    {
        // 1. Restore the particle's life.
        let life = gen_rand_gaussian(this.life_span, this.life_std_dev);
        particle.reset(life);

        // 2. Place the particle at the location of the particle system.
        let pos = this.get_pos();
        particle.set_pos(pos[0], pos[1], pos[2]);
        particle.set_velocity(0.0, this.up_velocity, 0.0);
        particle.set_accel(0.0, 0.0, 0.0);
    }

    // Set a reference to a camera. Particles will look at this camera when billboarding is enabled.
    set_camera(camera)
    {
        this.camera = camera;
    }

    set_pos(x, y, z)
    {
        // 1. Set the position of the particle system itself.
        super.set_pos(x, y, z);

        // 2. Set the positions of the particles inside the particle system.
        for(let i = 0; i < this.max_particles; i++)
            this.particles[i].set_pos(x, y, z);
    }

    // "particle"  - A model that will be used to construct the particle system.
    set_ref_particle(particle)
    {
        let gl = this.gl_context;

        // Copy VBO references from the reference particle.
        this.mesh.vbo_copy(particle.mesh);
    }

    set_scale(x, y, z)
    {
        // 1. Set the scale of the particle system itself.
        super.set_scale(x, y, z);

        // 2. Set the scale of the particles inside the particle system.
        for(let i = 0; i < this.max_particles; i++)
            this.particles[i].set_scale(x, y, z);
    }

    set_targ_pos(x, y, z)
    {
        super.set_targ_pos(x, y, z);

        for(let i = 0; i < this.max_particles; i++)
            this.particles[i].set_targ_pos(x, y, z);
    }

    update(dt)
    {
        let gl = this.gl_context;

        let num_alive = 0;
        // 1. Cycle through each particle slot. Attempt to respawn dead particles. Copy data from alive particles.
        for(let i = 0; i < this.max_particles; i++)
        {
            // 1A. The particle is alive and should be updated for the full update time.
            if(this.particles[i].get_life() - dt > 0.0 || this.particles[i].get_life() === -1)   // -1 indicates an 
               this.particles[i].update(dt);                                                 // infinite-lived particle.
            // 1B. The particle died and can respawn. Update the particle if it respawns.
            else
            {                
                // The particle can respawn based on how much time it was dead this update.
                let time_dead = dt + this.particles[i].get_life();
                if((1 - Math.pow(1 - this.r_prob, time_dead/1000)) > Math.random())
                {
                    this.respawn_particle(this.particles[i]);
                    // The particle is assumed to have respawned at a random point while dead. Update the particle
                    // for a random time between 0 and dt to account for this. 0 is inclusive and dt is exlusive.
                    this.particles[i].update(dt * Math.random());
                }
                else continue;   // The particle did not respawn. Stop processing the particle.
            }

            // 1C. The particle is alive. Transfer data from the particle's model matrix to the model matrix buffer.
            num_alive += 1
            let mdl_idx = (num_alive - 1)* 16;
            let mdl_mtx = this.particles[i].compute_mdl_mtx();
            for(let j = 0; j < 16; j++)
                this.mdl_arr[mdl_idx + j] = mdl_mtx[j];
        }
        // 2. Copy the data for alive particles from the buffers into the corresponding VBO.
        this.mesh.vbo_update(gl.ARRAY_BUFFER, 3, 0, this.mdl_arr, 0, num_alive * 16);    // Model Matrices Array
        this.mesh.set_num_instances(num_alive);
        // 3. Lastly, call the superclass' update function.
        super.update(dt);
    }
};


class rising_sim extends particle_system
{
    bot_rad        = 0.0;                                  // The radius of the circle where particles spawn.
    top_rad        = 0.0;                                  // The radius of the circle, above, where particles move to.
    up_velocity    = 0.0;                                  // The upwards velocity for particles per second.

    constructor(gl, num, life_span, life_std_dev, r_prob, bot_rad, top_rad)
    {
        super(gl, num, life_span, life_std_dev, r_prob);
        this.bot_rad = bot_rad;
        this.top_rad = top_rad;
    }

    respawn_particle(particle)
    {
        // 1. Restore the particle's life.
        let life = gen_rand_gaussian(this.life_span, this.life_std_dev);
        particle.reset(life);

        // 2. Place the particle in a circle in the XZ plane at the location of the particle system.
        let pos = this.get_pos();
        // Area varies by the square of radius. Adjust the random value so that particles spawn uniformly in the circle
        // (in the XZ plane) at the base of the particle system.
        let dist  = Math.sqrt(Math.random() * this.bot_rad);
        let ang   = Math.random() * 2 * Math.PI;    // Generate a random angle.
        let x_pos = Math.cos(ang) * dist;
        let z_pos = Math.sin(ang) * dist;
        particle.set_pos(pos[0] + x_pos, pos[1], pos[2] + z_pos);

        // 3. Set the particle's ending X and Z location to a point in a circle in the XZ plane.
        dist = Math.sqrt(Math.random() * this.top_rad);
        ang  = Math.random() * 2 * Math.PI;    // Generate a random angle.
        let x_targ  = Math.cos(ang) * dist;
        let z_targ  = Math.sin(ang) * dist;

        // 4. Set the particle's velocity so that it goes to the center of the XZ plane evenly over the particle's life.
        particle.set_velocity(0, this.up_velocity, 0);
    }

    set_up_velocity(vel)
    {
        this.up_velocity = vel;

        for(let i = 0; i < this.max_particles; i++)
        {
            let cur_vel = this.particles[i].get_velocity();    // This returns a vec3 from the glMatrix library.
            this.particles[i].set_velocity(cur_vel[0], this.up_velocity, cur_vel[2]);
        }
    }

    update(dt)
    {
        super.update(dt);
    }
};


class static_cr_sim extends particle_system
{
    constructor(gl, num)
    {
        super(gl, num, -1, 0.0, 0.0);   // (gl, num, life, life_std_dev, r_prob)
    }

    init_particles()
    {
        // Create the initial particles for the system. The particles are all located at the center. The first particle
        // faces the target position of the particle system.
        // The remaining particles face points that are evenly spaced in a circle. The circle is created by starting
        // at the first point and rotating around the up vector of the particle system. This causes the circle to be
        // perpendicular to the up vector, centered at the position of the particle system.
        
        // 1. Calculate the radius of the circle.
        let x1 =      this.pos[0], y1 =      this.pos[1],      z1 = this.pos[2];
        let x2 = this.targ_pos[0], y2 = this.targ_pos[1], z2 = this.targ_pos[2];
        let radius = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) + Math.pow(z1 - z2, 2));

        // 2. Set vectors for the U and V axes. The equation I am using to calculate the points is called the 
        // "parametric equation for a circle in 3D". Vector u is assumed to be perpendicular to the up vector. The user
        // is assumed to have entered correct values for "pos", "targ_pos", and "up_vec"
        let u = vec3.create(), v = vec3.create();
        vec3.subtract(u, this.targ_pos, this.pos);   // target position - position
        vec3.normalize(u, u);                        // Normalization is required for step 3.
        vec3.cross(v, this.up_vec, u);
        vec3.normalize(v, v);                        // Normalization is required for step 3.
        
        // 3. Create particles and set their target positions to points around in a circle.
        for(let i = 0; i < this.max_particles; i++)
        {
            let ang = 2 * Math.PI * i / this.max_particles;
            let x = this.pos[0] + radius * Math.cos(ang) * u[0] + radius * Math.sin(ang) * v[0];
            let y = this.pos[1] + radius * Math.cos(ang) * u[1] + radius * Math.sin(ang) * v[1];
            let z = this.pos[2] + radius * Math.cos(ang) * u[2] + radius * Math.sin(ang) * v[2];

            this.particles[i] = new particle();
            this.particles[i].reset(this.life_span);
            this.particles[i].set_targ_pos(x, y, z);
        }
    }
}


class circle extends model
{
    constructor(gl, num_segs)
    {
        // Call the model constructor.
        super(gl);

        // All of the commands below fill the buffers associated with this model's mesh.
        // Define a circle centered at the origin with diameter equal to 1. The circle is lying in the XY plane facing
        // the screen (looking at negative Z Axis).
        let positions = [], indices = [], st_coords = [];

        // 1. Fill the position buffer and ST texture coordinate buffer.
        let d_ang = 2.0 * Math.PI / num_segs;
        let ang = 0.0;
        positions.push(0.0, 0.0, 0.0);    // First add the center point, then traverse around the circle.
        st_coords.push(0.5, 0.5);
        for(let i = 0; i < num_segs; i++)
        {
            let x = Math.cos(ang) * 0.5;
            let y = Math.sin(ang) * 0.5;
            positions.push(x, y, 0.0);            // The first point added is always (1.0, 0.0, 0.0).
            st_coords.push(x + 0.5, -y + 0.5);    // Convert cartesian coordinates to ST coordinates.
            ang += d_ang;
        }

        // 2. Fill the index buffer.
        for(let i = 1; i < num_segs; i++)
            indices.push(0, i, i + 1);
        indices.push(0, num_segs, 1);    // Connect the last triangle back to the beginning.

        // Create a new mesh object to hold mesh data for a circle.
        let sq_mesh = new mesh(gl);

        let f32_positions = new Float32Array(positions);
        let ui16_indices  = new Uint16Array(indices);
        let f32_st_coords = new Float32Array(st_coords);

        // Store the ST coordinates on the CPU so they can be modified or retrieved in shaders.
        this.set_st_coords(f32_st_coords);

        sq_mesh.vbo_alloc(gl.ARRAY_BUFFER        , 0, f32_positions, gl.STATIC_DRAW);    // Index 0 - Vertex buffer.
        sq_mesh.vbo_alloc(gl.ELEMENT_ARRAY_BUFFER, 1,  ui16_indices, gl.STATIC_DRAW);    // Index 1 - Index buffer.
        sq_mesh.vbo_alloc(gl.ARRAY_BUFFER        , 2, f32_st_coords, gl.STATIC_DRAW);    // Index 2 - ST texture
                                                                                         // coordinate buffer.
        sq_mesh.set_render_params(gl.TRIANGLES, num_segs * 3, gl.UNSIGNED_SHORT, 0);

        // Inherits the mesh field from model. Set the field to reference the new mesh object.
        this.set_mesh(sq_mesh);
    }
};


class square extends model
{
    constructor(gl)
    {
        // Call the model constructor.
        super(gl);

        // All of the commands below fill the buffers associated with this model's mesh.
        // Define a square centered at the origin with length equal to 1. The square is lying in the XY plane.
        let positions = [-0.5, -0.5,  0.0,     // Vertex 0 - Bottom Left
                          0.5, -0.5,  0.0,     // Vertex 1 - Bottom Right
                          0.5,  0.5,  0.0,     // Vertex 2 - Top Right
                         -0.5,  0.5,  0.0];    // Vertex 3 - Top Left

        // This array defines the square as two faces made of two triangles each. The indices are listed in CCW order.
        let indices = [0, 2, 1, 0, 3, 2];    // Front Face - Faces the positive Z axis (facing towards the screen).

        // The bottom left vertex is mapped to the top left of the texture image. If not, the texture is inverted.
        let st_coords = [0, 1,     // Vertex 0 is associated with the top left of the texture image.
                         1, 1,     // Vertex 1 is associated with the top right of the texture image.
                         1, 0,     // Vertex 2 is associated with the bottom right of the texture image.
                         0, 0];    // Vertex 3 is associated with the bottom left of the texture image.

        // Create a new mesh object to hold mesh data for a square.
        let sq_mesh = new mesh(gl);

        let f32_positions = new Float32Array(positions);
        let ui16_indices  = new Uint16Array(indices);
        let f32_st_coords = new Float32Array(st_coords);

        // Store the ST coordinates on the CPU so they can be modified or retrieved in shaders.
        this.set_st_coords(f32_st_coords);

        sq_mesh.vbo_alloc(gl.ARRAY_BUFFER        , 0, f32_positions, gl.STATIC_DRAW);    // Index 0 - Vertex buffer.
        sq_mesh.vbo_alloc(gl.ELEMENT_ARRAY_BUFFER, 1,  ui16_indices, gl.STATIC_DRAW);    // Index 1 - Index buffer.
        sq_mesh.vbo_alloc(gl.ARRAY_BUFFER        , 2, f32_st_coords, gl.STATIC_DRAW);    // Index 2 - ST texture
                                                                                         // coordinate buffer.
        sq_mesh.set_render_params(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

        // Inherits the mesh field from model. Set the field to reference the new mesh object.
        this.set_mesh(sq_mesh);
    }
};


function compile_shader(gl, src, type)
{
    let shader = gl.createShader(type);

    if(shader === null)
    {
        gl.deleteShader(shader);
        throw('Error in compile_shader() function. Error Information: createShader() returned null.');
    }
    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    // Check if it compiled and return shader if successful.
    let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if(!success)
    {
        let err_msg = `Error in compile_shader() function. Error Information: ${gl.getShaderInfoLog(shader)}`;
        gl.deleteShader(shader);
        throw(err_msg);
    }
    return shader;
}


function create_program(gl, vertex_shader, fragment_shader)
{
    let program = gl.createProgram();

    gl.attachShader(program, vertex_shader);
    gl.attachShader(program, fragment_shader);

    gl.linkProgram(program);

    let success = gl.getProgramParameter(program, gl.LINK_STATUS);

    if(!success)
    {
        let err_msg = `Error in create_program() function. Error Information: ${gl.getProgramInfoLog(program)}`;
        gl.deleteShader(vertex_shader);
        gl.deleteShader(fragment_shader);
        gl.deleteProgram(program);
        throw(err_msg);
    }
    return program;
}


function create_texture(gl, url)
{
    let texture = gl.createTexture();

    let img = new Image();
    img.src = url;

    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Initially, fill the texture with a 1x1 white pixel that is transparent.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 0]));

    // These statements execute after the image finishes loading. The image is loaded into the texture.
    img.onload = () =>
    {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    }

    return texture;
}


function url_file_to_str(url)
{
    let bfr = '';
    let xhr_request = new XMLHttpRequest();

    // The third parameter set to "false" indicates a syncrhonous request.
    xhr_request.open("GET", url, false);
    xhr_request.send();

    // Check if the response is valid (status in the range 200-299).
    if(xhr_request.status >= 200 && xhr_request.status <= 299)
    {
        // The response from the request is stored as a string.
        bfr = xhr_request.responseText;
        return bfr;
    }
    else
        throw(`Error in uri_file_to_str() function. Error Information: Get request to URL returned a status code not
               between 200 and 299. The actual response code returned was ${xhr_request.status}.`);
}