import {tiny, defs} from './examples/common.js';
import { Articulated_Human } from './human.js';
import { Shape_From_File } from './examples/obj-file-demo.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export
const Basketball_base = defs.Basketball_base =
    class Basketball_base extends Component
    {                                          
      init()
      {
        console.log("init")

        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        this.hover = this.swarm = false;
        this.time = 0;
        this.isMoving = true;

        this.shapes = { 
          'box'  : new defs.Cube(),
          'ball' : new defs.Subdivision_Sphere( 4 ),
          'axis' : new defs.Axis_Arrows(),
          court: new Shape_From_File("assets/court/court.obj")
        };

        // *** Materials: *** 
        const basic = new defs.Basic_Shader();
        const phong = new defs.Phong_Shader();
        const tex_phong = new defs.Textured_Phong();
        this.materials = {};
        this.materials.plastic = { shader: phong, ambient: .2, diffusivity: 1, specularity: .5, color: color( .9,.5,.9,1 ) }
        this.materials.metal   = { shader: phong, ambient: .2, diffusivity: 1, specularity:  1, color: color( .9,.5,.9,1 ) }
        this.materials.rgb = { shader: tex_phong, ambient: .5, texture: new Texture( "assets/rgb.jpg" ) }

        this.ball_location = vec3(1, 1, 1);
        this.ball_radius = 0.25;

        // TODO: you should create a Spline class instance
        this.human = new Articulated_Human();
      }

      render_animation( caller )
      {                                  
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if( !caller.controls )
        { this.animated_children.push( caller.controls = new defs.Movement_Controls( { uniforms: this.uniforms } ) );
          caller.controls.add_mouse_controls( caller.canvas );

          // !!! Camera changed here
          // TODO: you can change the camera as needed.
          Shader.assign_camera( 
            Mat4.look_at(
                vec3(0, 15, 25),  
                vec3(0, 10, 0),
                vec3(0, 1, 0)    
            ), 
            this.uniforms 
          );
        
        }
        this.uniforms.projection_transform = Mat4.perspective( Math.PI/4, caller.width/caller.height, 1, 100 );

        // *** Lights: *** Values of vector or point lights.  They'll be consulted by
        // the shader when coloring shapes.  See Light's class definition for inputs.
        const t = this.t = this.uniforms.animation_time/1000;

        // const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,-1,1,0 ) ); !!!
        // !!! Light changed here
        const light_position = vec4(20, 20, 20, 1.0);
        this.uniforms.lights = [ defs.Phong_Shader.light_source( light_position, color( 1,1,1,1 ), 100000000 ) ];

        // draw axis arrows.
        this.shapes.axis.draw(caller, this.uniforms, Mat4.identity(), this.materials.rgb);

        // draw basketball court
        const model_transform_court = Mat4.identity()
        .times(Mat4.translation(0, 7.5, 0))
        .times(Mat4.scale(50, 50, 50, 0))
        .times(Mat4.rotation(Math.PI / 2, 0, 1, 0));
        this.shapes.court.draw(caller, this.uniforms, model_transform_court, this.materials.plastic)
      }
    }


export class Basketball extends Basketball_base
{                                                    
  render_animation( caller )
  {                                               
    super.render_animation( caller );

    /**********************************
     Start coding down here!!!!
     **********************************/
    const blue = color( 0,0,1,1 ), 
          yellow = color( 1,0.7,0,1 ), 
          wall_color = color( 0.7, 1.0, 0.8, 1 ), 
          blackboard_color = color( 0.2, 0.2, 0.2, 1 );

    const t = this.t = this.uniforms.animation_time/1000;

    // !!! Draw ground
    let floor_transform = Mat4.translation(0, 0, 0).times(Mat4.scale(10, 0.01, 10));
    // this.shapes.box.draw( caller, this.uniforms, floor_transform, { ...this.materials.plastic, color: yellow } );

    // TODO: you should draw scene here.
    // TODO: you can change the wall and board as needed.
    // let wall_transform = Mat4.translation(0, 7, -1.2).times(Mat4.scale(8, 7, 0.1));
    // this.shapes.box.draw( caller, this.uniforms, wall_transform, { ...this.materials.plastic, color: wall_color } );
    // let board_transform = Mat4.translation(1.5, 7, -1).times(Mat4.scale(3, 3, 0.1));
    // this.shapes.box.draw( caller, this.uniforms, board_transform, { ...this.materials.plastic, color: blackboard_color } );
    
    // drawing the human at resting position
    this.human.draw(caller, this.uniforms, this.materials.plastic);
  }

  render_controls()
  {                                 
    // render_controls(): Sets up a panel of interactive HTML elements, including
    // buttons with key bindings for affecting this scene, and live info readouts.
    this.control_panel.innerHTML += "Assignment 2: IK Engine";
    this.new_line();    
    // TODO: You can add your button events for debugging. (optional)
    this.key_triggered_button( "Debug", [ "Shift", "D" ], this.debug );
    this.key_triggered_button( "Debug 2", [ "Shift", "E" ], this.debug2 );
    this.new_line();
  }

  debug() {
    this.human.debug();
    console.log("Current end effector at ", this.human.get_end_effector_position());
  }

  debug2() {
    this.human.debug(null, 2);
    console.log("Current end effector at ", this.human.get_end_effector_position());
  }
}
