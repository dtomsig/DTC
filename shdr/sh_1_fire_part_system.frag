#version 300 es
precision highp float;

in vec2 v_st_coords;
out vec4 frag_color;
uniform sampler2D u_tex_sheet;


void main()
{
    frag_color = texture(u_tex_sheet, v_st_coords).rgba;

    if(frag_color.a < 0.001)   // Remove transparent fragments.
        discard;

    // Lowers the brightness and shifts the color red.
    frag_color.rgb = frag_color.rgb * 0.1;
    frag_color.r = frag_color.r * 3.9;
}