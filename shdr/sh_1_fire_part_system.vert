#version 300 es
precision highp float;

in vec2 a_st_coords;
in vec3 a_pos;
in vec4 a_mdl_mtx_pt_0, a_mdl_mtx_pt_1, a_mdl_mtx_pt_2, a_mdl_mtx_pt_3;
out float v_col_filter;
out vec2 v_st_coords;
uniform float u_fr_time, u_sim_time;
uniform ivec2 u_size;
uniform mat4 u_proj_mtx, u_view_mtx;


void main()
{
    int num_texs = u_size[0] * u_size[1];
    float idx = floor(mod((u_sim_time / u_fr_time) + float(gl_InstanceID), float(num_texs)));

    // Calculate the ST offsets based on the sprite sheet dimensions.
    float s_offset = mod(idx, float(u_size[0])) / float(u_size[0]);
    float t_offset = floor(idx / float(u_size[0])) / float(u_size[1]);

    v_st_coords[0] = a_st_coords[0] / float(u_size[0]) + s_offset;
    v_st_coords[1] = a_st_coords[1] / float(u_size[1]) + t_offset;

    gl_Position = u_proj_mtx * u_view_mtx * mat4(a_mdl_mtx_pt_0, a_mdl_mtx_pt_1, a_mdl_mtx_pt_2, a_mdl_mtx_pt_3) *
                  vec4(a_pos, 1.0);
}