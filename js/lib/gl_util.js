// gl_util.js is an ES module. Therefore, strict mode is enabled without including 'use strict;'.

import './gl-matrix.js';
// The above import statement creates an object called "glMatrix". The object destructuring below allows for properties
// to be referenced directly. For example, vec3.create() instead of glMatrix.vec3.create(). The file imported uses
// UMD (Universal Module Definition).
let {mat4, quat, vec3} = glMatrix;
import {gen_rand_gaussian} from './gaussian.js';
export {camera, circle, compile_shader, create_program, create_texture, init_gl, instanced_mesh, mesh, model, particle,
        particle_system, rising_sim, square, static_cr_sim, url_file_to_str, world_object};

let gl = null;


class mesh
{
        // Rendering Parameters:
        idx_count  = 0;                                    // A GLintptr specifying the number of indices to render.
        mode       = 0;                                    // A GLenum specifying the drawing mode(example gl.TRANGLES).
        offset     = 0;                                    // A GLintptr specifying the offset where to start reading
                                                           // the element array buffer, divisable by size of "type".
        type       = 0;                                    // A GLenum specifying the data type used in the element 
                                                           // array buffer (example gl.UNSIGNED_SHORT).

        // Rendering Data Storage:
        vao        = null;                                 // The vertex array object containing all rendering state.
        vbo_list   = [null, null, null];                   // The list of VBOs in the mesh. Initially set to null.
                                                           // Index 0 is the vertex buffer.
                                                           // Index 1 is the element array buffer.
                                                           // Index 2 is the ST texture coordinate buffer.

    constructor()
    {
        this.vao        = gl.createVertexArray()
    }

    draw()
    {
        gl.bindVertexArray(this.vao);
        gl.drawElements(this.mode, this.idx_count, this.type, this.offset);
    }

    free()
    {
        // Per MDN WebGL2 documentation, the deleteBuffer() call is not needed because of deletion upon dereferencing.
        // I include it to match the deleteVertexArray() call. The documentation isn't clear about whether calling
        // deleteVertexArray() is necessary or not.
        for(let i = 0; i < this.vbo_list.length; i++)
        {
            gl.deleteBuffer(this.vbo_list[i]);
            this.vbo_list[i] = null;
        }

        gl.deleteVertexArray(this.vao);
        this.vao = null;
    }

    // "target"      - The OpenGL buffer to bind to.
    // "vbo_idx"     - The index of the vbo to allocate and write to. Must be either 0, 1, or 2 for a mesh.
    // "attrib_ptr"  - The GLuint that identifies the index of the vertex attribute to be modified.
    // "size"        - The number of elements (not bytes) associated with the attribute. Between 1 and 4.
    // "type"        - A GLenum specifying the data type used in the element array buffer (example gl.UNSIGNED_SHORT).
    // "normalize"   - A GLboolean specifying whether integer data values should be normalized into a certain range when
    //                 being cast to a float.
    // "stride"      - A GLsizei specifying the offset in bytes between the beginning of consecutive vertex attributes.
    //                 Between 0 and 255 (inclusive).
    // "offset"      - A GLintptr specifying the offset in bytes to the first component in the vertex attribute array.
    // "divisor"     - How many times the attribute advances for each instanced draw call. 0 means the attribute advances
    //                 once per vertex. An attribute is only "instanced" when the divisor value is non-zero.
    set_attrib_ptr(target, vbo_idx, attrib_ptr, size, type, normalize, stride, offset, divisor)
    {
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(target, this.vbo_list[vbo_idx]);
        gl.enableVertexAttribArray(attrib_ptr);
        gl.vertexAttribPointer(attrib_ptr, size, type, normalize, stride, offset);
        gl.vertexAttribDivisor(attrib_ptr, divisor);
    }

    // "mode"        - A GLenum specifying mode to draw (example gl.TRANGLES).
    // "count"       - A GLintptr specifying the number of indices to be rendered.
    // "type"        - A GLenum specifying the data type used in the element array buffer (example gl.UNSIGNED_SHORT).
    // "offset"      - A GLintptr specifying the offset where to start reading the element array buffer, divisable
    //                 by size of "type".
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
        gl.bindVertexArray(this.vao);
        let vbo = gl.createBuffer();
        gl.bindBuffer(target, vbo);
        gl.bufferData(target, size_or_ptr, usage);

        this.vbo_list[vbo_idx] = vbo;
    }

    // Copy and recreate as many VBOs as possible from a source mesh.
    vbo_copy(src_mesh)
    {
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

            // Index 1 is the element array buffer (gl.ELEMENT_ARRAY_BUFFER). All others use type gl.ARRAY_BUFFER.
            let target = (i === 1) ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;

            // Get the usage and size parameters from the source buffer.
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

    // "target"      - The OpenGL buffer to bind to.
    // "vbo_idx"     - The index of the VBO to allocate and write to. Must be either 0, 1, or 2 for a mesh.
    // "offset"      - The starting index of the VBO where updating begins.
    // "data"        - Must be an ArrayBuffer, SharedArrayBuffer, a TypedArray, or a DataView containing data for an
    //                 OpenGL buffer such as vertices, colors, indices, etc.
    // "src_offset"  - A GLuint specifying the offset in bytes where to start replacing data in the buffer.
    // "length"      - Number of elements in the data buffer.
    vbo_update(target, vbo_idx, offset, data, src_offset, length)
    {
        gl.bindVertexArray(this.vao);
        gl.bindBuffer(target, this.vbo_list[vbo_idx]);
        gl.bufferSubData(target, offset, data, src_offset, length);
    }
};


class instanced_mesh extends mesh
{
    inst_count     = 0;                                    // The number of instances.

    constructor()
    {
        // The super constructor creates a VBO list with 3 elements. This constructor adds buffer 3 to the list.
        super();
                                                           // Index 0 is the vertex buffer.
                                                           // Index 1 is the element array buffer.
                                                           // Index 2 is the ST texture coordinate buffer.
        this.vbo_list[3] = null;                           // Index 3 is the buffer of model matrices for each instance.
    }

    draw()
    {
        gl.bindVertexArray(this.vao);
        gl.drawElementsInstanced(this.mode, this.idx_count, this.type, this.offset, this.inst_count);
    }

    set_num_instances(num)
    {
        this.inst_count = num;
    }
};


class world_object
{
    // Orientation
    targ_pos       = vec3.fromValues( 0.0,  0.0, 1.0);     // The point being looked at by the object.
    up_vec         = vec3.fromValues( 0.0,  1.0, 0.0);     // The up vector of the object (normalized).

    // Physics
    accel          = vec3.fromValues( 0.0,  0.0, 0.0);     // The acceleration of the object.
    pos            = vec3.fromValues( 0.0,  0.0, 0.0);     // The position of the object.
    scale          = vec3.fromValues( 1.0,  1.0, 1.0);     // The scaling (1.0 means object is not scaled).
    velocity       = vec3.fromValues( 0.0,  0.0, 0.0);     // The velocity of the object.

    set_accel(x, y, z)
    {
        vec3.set(this.accel, x, y , z);
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


class camera extends world_object
{
    // Parameters:
    aspect         = 1.0;                                  // The camera's aspect ratio.
    fov            = (95 * 2 * Math.PI) / 360;             // The field of view in radians. Set to a gaming FOV.
    z_far          = 100;                                  // The far value in glMatrix's perspective() function.
    z_near         = 0.1;                                  // The near value in glMatrix's perspective() function.

    // Matrix Outputs:
    proj_mtx       = mat4.create();                        // The projection matrix associated with the camera.
    view_mtx       = mat4.create();                        // The view matrix associated with the camera.

    // Intermediate Data:
    eye_radius     = 1.0;                                  // An intermediate calculation for traverse_arcball().
    fwd_vec        = vec3.create();                        // An intermediate calculation for traverse_arcball().
    right_vec      = vec3.create();                        // An intermediate calculation for traverse_arcball().
    rot_horiz      = quat.create();                        // An intermediate calculation for traverse_arcball().
    rot_vert       = quat.create();                        // An intermediate calculation for traverse_arcball().

    constructor(aspect)
    {
        super();
        this.aspect = aspect;
    }

    compute_proj_mtx()
    {
        mat4.perspective(this.proj_mtx, this.fov, this.aspect, this.z_near, this.z_far);
        return this.proj_mtx;
    }

    compute_view_mtx()
    {
        mat4.lookAt(this.view_mtx, this.pos, this.targ_pos, this.up_vec);
        return this.view_mtx;
    }

    set_pos(x, y, z)
    {
        super.set_pos(x, y, z);
        this.eye_radius = vec3.distance(this.pos, this.targ_pos);   // "eye_radius" is needed in traverse_arcball().
    }

    set_targ_pos(x, y, z)
    {
        super.set_targ_pos(x, y, z);
        this.eye_radius = vec3.distance(this.pos, this.targ_pos);   // "eye_radius" is needed in traverse_arcball().
    }

    traverse_arcball(rads_x, rads_y)
    {
        // 1. Calculate the forward and right vectors. "up_vec" is already normalized by set_up_vec() or step 5.
        vec3.subtract(this.fwd_vec, this.targ_pos, this.pos);   // target position - eye position
        vec3.cross(this.right_vec, this.fwd_vec, this.up_vec);
        vec3.normalize(this.right_vec, this.right_vec);   // Not necessary in most situations. However, in theory,
                           // "up_vec" could be set in set_up_vec() such that it is not at a 90 degree angle to
                           // "fwd_vec". This could cause "rot_vert" to be calculated incorrectly in step 2 and
                           // ultimately cause "pos" to be calculated incorrectly in step 6. This is especially
                           // noticable when "rads_x" and "rads_y" are large. The camera's eye position will deviate
                           // significantly from its original radius after just one call to traverse_arcball().

        // 2. Fill rotation quaternions with rotation angles.
        quat.setAxisAngle(this.rot_horiz, this.up_vec, -rads_x);
        quat.setAxisAngle(this.rot_vert, this.right_vec, -rads_y);

        // 3. Moving the mouse up and down rotates the forward and up vectors across the right camera axis.
        vec3.transformQuat(this.fwd_vec, this.fwd_vec, this.rot_vert);
        vec3.transformQuat(this.up_vec, this.up_vec, this.rot_vert);

        // 4. Moving the mouse left and right rotates the forward vector and right vector across the up camera axis.
        vec3.transformQuat(this.fwd_vec, this.fwd_vec, this.rot_horiz);   // The right vector is calculated in step 5.

        // 5. Rebuild the right and up vector to prevent floating-point drift. Otherwise, vectors will slowly drift and
        // not stay at a 90 degree angle to each other due to accumulated floating-point rounding errors.
        vec3.cross(this.right_vec, this.fwd_vec, this.up_vec);
        vec3.cross(this.up_vec, this.right_vec, this.fwd_vec);
        vec3.normalize(this.up_vec, this.up_vec);   // This class stores the up vector in normalized form. It's
                                                    // normalized here for the next traverse_arcball() call.

        // 6. Calculate the new camera position based upon the new forward vector.
        vec3.normalize(this.fwd_vec, this.fwd_vec);  // normalized because "pos" drifts, causing the camera to move.
        vec3.scale(this.fwd_vec, this.fwd_vec, this.eye_radius);    // Scale "fwd_vec" back to its original magnitude.
        vec3.subtract(this.pos, this.targ_pos, this.fwd_vec);       // target position - forward vector
    }
};


class model extends world_object
{
    // Graphics Rendering
    mesh           = null;                                 // The mesh associated with the object.

    // Matrix Outputs
    mdl_mtx        = mat4.create();                        // The model matrix of the object.

    compute_mdl_mtx()
    {
        mat4.targetTo(this.mdl_mtx, this.pos, this.targ_pos, this.up_vec);
        mat4.scale(this.mdl_mtx, this.mdl_mtx, this.scale);
        return this.mdl_mtx;
    }

    render()
    {
        this.mesh.draw();
    }

    set_mesh(mesh)
    {
        this.mesh = mesh;
    }
};


class circle extends model
{
    constructor(num_segs)
    {
        // Call the model constructor.
        super();

        // All of the commands below fill the buffers associated with this model's mesh.
        // Define a circle centered at the origin with diameter equal to 1. The circle is lying in the XY plane and
        // faces towards the negative Z axis when front-facing is set to CCW.
        let positions = [], indices = [], st_coords = [];

        // 1. Fill the position buffer and ST texture coordinate buffer.
        let d_ang = 2 * Math.PI / num_segs;
        let ang = 2 * Math.PI;
        positions.push(0.0, 0.0, 0.0);   // First add the center point, then go around the circle clockwise.
        st_coords.push(0.5, 0.5);
        for(let i = 0; i < num_segs; i++)
        {
            let x = Math.cos(ang) * 0.5;
            let y = Math.sin(ang) * 0.5;
            positions.push(x, y, 0.0);           // The first point added is always (1.0, 0.0, 0.0).
            st_coords.push(x + 0.5, y + 0.5);   // Convert cartesian coordinates to ST coordinates.
            ang -= d_ang;
        }

        // 2. Fill the element array buffer with triangles to construct a circle. The indices are listed in CCW order if
        // you are looking from the negative Z axis.
        for(let i = 1; i < num_segs; i++)
            indices.push(0, i, i + 1);
        indices.push(0, num_segs, 1);    // Connect the last triangle back to the beginning.

        // Create a new mesh object to hold mesh data for a circle.
        let sq_mesh = new mesh();

        let f32_positions = new Float32Array(positions);
        let ui16_indices  = new Uint16Array(indices);
        let f32_st_coords = new Float32Array(st_coords);

        sq_mesh.vbo_alloc(gl.ARRAY_BUFFER        , 0, f32_positions, gl.STATIC_DRAW); // Index 0 - Vertex buffer.
        sq_mesh.vbo_alloc(gl.ELEMENT_ARRAY_BUFFER, 1,  ui16_indices, gl.STATIC_DRAW); // Index 1 - Element array buffer.
        sq_mesh.vbo_alloc(gl.ARRAY_BUFFER        , 2, f32_st_coords, gl.STATIC_DRAW); // Index 2 - ST texture coordinate
                                                                                      // buffer.
        sq_mesh.set_render_params(gl.TRIANGLES, num_segs * 3, gl.UNSIGNED_SHORT, 0);

        // Inherits the mesh field from model. Set the field to reference the new mesh object.
        this.set_mesh(sq_mesh);
    }
};


class particle extends model
{
    life           = -1;                                   // The amount of life (ms) remaining.
                                                           // 0 represents a dead particle.
                                                           // -1 represents an infiniely-lived particle.

    get_life()
    {
        return this.life;
    }

    reset(life)
    {
        this.life = life;
    }

    update(dt)
    {
        // Life > 0 means the particle is neither dead nor infinitely-lived. Its life value should be updated.
        if(this.life > 0)
        {
            this.life -= dt;

            if(this.life < 0)
                this.life = 0;
        }
        super.update(dt);
    }
};


class square extends model
{
    constructor()
    {
        // Call the model constructor.
        super();

        // All of the commands below fill the buffers associated with this model's mesh.
        // Define a square centered at the origin with length equal to 1. The square is lying in the XY plane and faces
        // towards the negative Z axis when front-facing is set to CCW.
        let positions = [-0.5,  0.5,  0.0,    // Vertex 0 - Top Left
                          0.5,  0.5,  0.0,    // Vertex 1 - Top Right
                          0.5, -0.5,  0.0,    // Vertex 2 - Bottom Right
                         -0.5, -0.5,  0.0];   // Vertex 3 - Bottom Left

        // Fill the element array buffer with two triangles to construct a square. The indices are listed in CCW order
        // if you are looking from the negative Z axis.
        let indices = [0, 1, 2, 0, 2, 3];    // Front Face - Faces the positive Z axis (facing towards the screen).

        let st_coords = [0, 1,    // Vertex 0 is associated with the top left of the texture image.
                         1, 1,    // Vertex 1 is associated with the top right of the texture image.
                         1, 0,    // Vertex 2 is associated with the top right of the texture image.
                         0, 0];   // Vertex 3 is associated with the top left of the texture image.

        // Create a new mesh object to hold mesh data for a square.
        let sq_mesh = new mesh();

        let f32_positions = new Float32Array(positions);
        let ui16_indices  = new Uint16Array(indices);
        let f32_st_coords = new Float32Array(st_coords);

        sq_mesh.vbo_alloc(gl.ARRAY_BUFFER        , 0, f32_positions, gl.STATIC_DRAW); // Index 0 - Vertex buffer.
        sq_mesh.vbo_alloc(gl.ELEMENT_ARRAY_BUFFER, 1,  ui16_indices, gl.STATIC_DRAW); // Index 1 - Element array buffer.
        sq_mesh.vbo_alloc(gl.ARRAY_BUFFER        , 2, f32_st_coords, gl.STATIC_DRAW); // Index 2 - ST texture coordinate
                                                                                      // buffer.
        sq_mesh.set_render_params(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

        // Inherits the mesh field from model. Set the field to reference the new mesh object.
        this.set_mesh(sq_mesh);
    }
};


class particle_system extends world_object
{
    life_span      = 0;                                    // The mean life for particles (ms).
    life_std_dev   = 0;                                    // The standard deviation of "life_span" (ms).
    max_particles  = 0;                                    // The maximum number of particles (dead or alive).
    mdl_arr        = null;                                 // The model matrix data array for particles.
    mesh           = null;                                 // The instanced mesh for rendering all of the particles.
    particles      = [];                                   // The array that holds all particle references.
    r_rate         = 1;                                    // The instantaneous failure rate (respawns per second).
    
    constructor(num, life_span, life_std_dev, r_rate)
    {
        super();

        this.mdl_arr       = new Float32Array(num * 16);
        this.max_particles = num;
        this.life_span     = life_span;
        this.life_std_dev  = life_std_dev;
        this.r_rate        = r_rate;

        // Associate an instanced mesh for the particle system.
        this.mesh = new instanced_mesh();

        // Allocate the model matrix array. Setting a reference particle will create the other buffers (indices 0 - 2).
        this.mesh.vbo_alloc(gl.ARRAY_BUFFER, 3, this.mdl_arr, gl.DYNAMIC_DRAW);
        this.mesh.set_num_instances(this.max_particles);

        // Create the initial particles for the system.
        for(let i = 0; i < this.max_particles; i++)
            this.particles[i] = new particle();
    }

    // If necessary, modify this function in subclasses to change how particles are set initially.
    init_particles()
    {
        for(let i = 0; i < this.max_particles; i++)
            this.respawn_particle(this.particles[i]);
    }

    render()
    {
        this.mesh.draw();
    }

    // If necessary, modify this function in subclasses to change how particles are set initially.
    respawn_particle(particle)
    {
        // 1. Restore the particle's life. Wrap the value if it is less than 0 or greater than lifespan.
        let life = gen_rand_gaussian(this.life_span, this.life_std_dev);
        life = life % this.life_span;
        if (life <= 0) life += this.life_span;   // Makes the interval (0, life_span].
        particle.reset(life);

        // 2. Place the particle at the location of the particle system.
        particle.set_pos(this.pos[0], this.pos[1], this.pos[2]);
    }

    // "particle"  - A model that will be used to construct the particle system.
    set_ref_particle(particle)
    {
        // Copy VBO data from the reference particle.
        this.mesh.vbo_copy(particle.mesh);
    }

    update(dt)
    {
        super.update(dt);

        // 1. Cycle through the array of particles, updating each particle.
        let num_alive = 0;
        for(let i = 0; i < this.max_particles; i++)
        {
            let time_left = dt;
            while(time_left > 0)
            {
                let life = this.particles[i].get_life();

                // 1A. The particle is dead. It doesn't need updates, but it can be respawned.
                if(life === 0)
                {
                    // 1B. Pick a random cumulative probability, which is uniform for a continuous random variable.
                    let prob = Math.random();   // 1 cannot be chosen, preventing Math.log(0) = -infinity below.

                    // 1C. I am modeling the probability of respawning as a hazard function. In this case, the
                    // continuous random variable is the amount of time needed to respawn. The particle has an "r_rate"
                    // chance of respawning per second. Using the cumulative distribution function for an exponential
                    // function (hazard function), the amount of time the particle needs to respawn is calculated below.
                    let time_to_respawn = Math.log(-(prob - 1))/-this.r_rate * 1000   // See exponential CDF function.

                    // 1D. The particle respawns. Advance the amount of time left to be at the point of respawn.
                    if(time_to_respawn <= time_left)
                    {
                        this.respawn_particle(this.particles[i]);
                        time_left -= time_to_respawn;
                    }
                    else time_left = 0;
                }
                else if(life === -1)   // 1E. The particle is alive, infinitely-lived, and is updated.
                {
                    this.particles[i].update(time_left);
                    time_left = 0;
                }
                else   // 1F. The particle is alive, not infinitely-lived, and is updated.
                {
                    let upd_time = Math.min(life, time_left);
                    time_left -= upd_time
                    this.particles[i].update(upd_time);   // Don't update the particle past its death.
                }
            }
            // 1F. If the particle is dead after all updates, don't render it by going to the next particle (for loop).
            if(this.particles[i].get_life() === 0) continue;

            // 1G. Transfer data from the (alive) particle's model matrix to the model matrix buffer for rendering.
            num_alive += 1;
            let mdl_idx = (num_alive - 1)* 16;
            let mdl_mtx = this.particles[i].compute_mdl_mtx();
            for(let j = 0; j < 16; j++)
            this.mdl_arr[mdl_idx + j] = mdl_mtx[j];
        }

        // 2. Copy the data for alive particles from the buffers into the corresponding VBO.
        this.mesh.vbo_update(gl.ARRAY_BUFFER, 3, 0, this.mdl_arr, 0, num_alive * 16);    // Model Matrices Array
        this.mesh.set_num_instances(num_alive);
    }
};


class rising_sim extends particle_system
{
    bot_rad        = 0.0;                                  // The radius of the circle where particles spawn.
    up_velocity    = 0.0;                                  // The upwards velocity for spawned particles per second.

    constructor(num, life_span, life_std_dev, r_rate, up_velocity, bot_rad)
    {
        super(num, life_span, life_std_dev, r_rate);
        this.bot_rad = bot_rad;
        this.up_velocity = up_velocity;
    }

    respawn_particle(particle)
    {
        super.respawn_particle(particle);

        // 1. Place the particle in a circle in the XZ plane at the location of the particle system.
        // Area varies by the square of radius. Adjust the random value so that particles spawn uniformly in the circle
        // (in the XZ plane) at the base of the particle system.
        let dist  = Math.sqrt(Math.random()) * this.bot_rad;
        let ang   = Math.random() * 2 * Math.PI;    // Generate a random angle.
        let x_pos = Math.cos(ang) * dist;
        let z_pos = Math.sin(ang) * dist;
        particle.set_pos(this.pos[0] + x_pos, this.pos[1], this.pos[2] + z_pos);

        // 2. Set the particle's velocity so that it goes to the center of the XZ plane evenly over the particle's life.
        particle.set_velocity(0, this.up_velocity, 0);
    }

    set_up_velocity(vel)
    {
        this.up_velocity = vel;
    }
};


class static_cr_sim extends particle_system
{
    constructor(num)
    {
        super(num, -1, 0.0, 0.0);   // (num, life, life_std_dev, r_rate)
    }

    init_particles()
    {
        // Set initial particles for the system. The particles are all located at the center. The first particle faces
        // the target position of the particle system.
        // The remaining particles face points that are evenly spaced in a circle. The circle is created by starting
        // at the first point and rotating around the up vector of the particle system. This causes the circle to be
        // perpendicular to the up vector, centered at the position of the particle system.
        
        // 1. Calculate the radius of the circle.
        let radius = vec3.distance(this.pos, this.targ_pos);

        // 2. Set vectors for the U and V axes. The equation I am using to calculate the points is called the
        // "parametric equation for a circle in 3D". Vector u is assumed to be perpendicular to the up vector. The user
        // is assumed to have entered correct values for "pos", "targ_pos", and "up_vec".
        let u = vec3.create(), v = vec3.create();
        vec3.subtract(u, this.targ_pos, this.pos);   // target position - current position
        vec3.normalize(u, u);                        // Normalization is required for step 3.
        vec3.cross(v, this.up_vec, u);
        vec3.normalize(v, v);                        // Normalization is required for step 3.
        
        // 3. Create particles and set their target positions to points around in a semicircle.
        for(let i = 0; i < this.max_particles; i++)
        {
            let ang = Math.PI * i / this.max_particles;
            let x = this.pos[0] + radius * Math.cos(ang) * u[0] + radius * Math.sin(ang) * v[0];
            let y = this.pos[1] + radius * Math.cos(ang) * u[1] + radius * Math.sin(ang) * v[1];
            let z = this.pos[2] + radius * Math.cos(ang) * u[2] + radius * Math.sin(ang) * v[2];
            this.particles[i].reset(this.life_span);
            this.particles[i].set_targ_pos(x, y, z);
        }
    }
}


function compile_shader(src, type)
{
    let shader = gl.createShader(type);

    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
    {
        let err_msg = `${gl.getShaderInfoLog(shader)}`;
        gl.deleteShader(shader);
        throw new Error(err_msg);
    }
    return shader;
}


function create_program(vertex_shader, fragment_shader)
{
    let program = gl.createProgram();

    gl.attachShader(program, vertex_shader);
    gl.attachShader(program, fragment_shader);
    gl.linkProgram(program);

    if(!gl.getProgramParameter(program, gl.LINK_STATUS))
    {
        let err_msg = `${gl.getProgramInfoLog(program)}`;
        gl.deleteProgram(program);
        throw new Error(err_msg);
    }
    return program;
}


function create_texture(url, file_type)
{
    let texture = gl.createTexture();
    let img = new Image();
    let flip_st_orig = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
    img.src = url;

    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Initially, fill the texture with a 1x1 white pixel that is transparent.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 0]));

    // These statements execute after the image finishes loading. The image is loaded into the texture.
    img.onload = () =>
    {
        // The texture needs to be rebound because another texture could have been bound while loading the image.
        // From here, the entire callback gets executed and cannot be interrupted (run-to-completion), ensuring that the
        // correct texture remains bound.
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Ensure the bottom left of the image gets associated with the ST coordinate (0, 0). The only file types
        // supported currently are PNG or BMP.
        if(file_type == 'png') gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        if(file_type == 'bmp') gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flip_st_orig);   // Restore the original flip state.
    }

    img.onerror = () =>
    {
        throw new Error('Image failed to load.');
    }

    return texture;
}


function init_gl(gl_context)
{
    gl = gl_context;
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
        throw(`Get request to URL returned a status code not between 200 and 299. The actual response code returned was
               ${xhr_request.status}.`);
}