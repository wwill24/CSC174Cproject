import { tiny, defs } from "./examples/common.js";
import { Articulated_Human } from "./human.js";
import { Shape_From_File } from "./examples/obj-file-demo.js";
import { Particle, ParticleSystem } from "./util.js";
import { ShootingSpline } from "./human.js";

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

Object.assign(vec3, {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  subtract: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  len: (a) => Math.hypot(a[0], a[1], a[2])
});

export const Basketball_base =
  (defs.Basketball_base = class Basketball_base extends Component {
    init() {
      console.log("init");

      // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
      this.hover = this.swarm = false;
      this.time = 0;
      this.isMoving = true;

      this.shapes = {
        box: new defs.Cube(),
        ball: new defs.Subdivision_Sphere(4),
        axis: new defs.Axis_Arrows(),
        court: new Shape_From_File("assets/court/court.obj"),
        rack: new Shape_From_File("assets/rack/racks.obj")
      };

      // *** Materials: ***
      const basic = new defs.Basic_Shader();
      const phong = new defs.Phong_Shader();
      const tex_phong = new defs.Textured_Phong();
      this.materials = {};
      this.materials.plastic = {
        shader: phong,
        ambient: 0.2,
        diffusivity: 1,
        specularity: 0.5,
        color: color(0.9, 0.5, 0.9, 1),
      };
      this.materials.metal = {
        shader: phong,
        ambient: 0.2,
        diffusivity: 1,
        specularity: 1,
        color: color(0.9, 0.5, 0.9, 1),
      };
      this.materials.rgb = {
        shader: tex_phong,
        ambient: 0.5,
        texture: new Texture("assets/rgb.jpg"),
      };
      this.materials.court = {
        shader: tex_phong,
        ambient: 0.5,
        texture: new Texture("assets/court/Material.002_baseColor.png"),
      };
      this.materials.rack = {
        shader: phong,
        ambient: 0.2,
        diffusivity: 1,
        specularity: 1,
        color: color(0.6, 0.3, 0.1, 1)
      }

      this.ball_location = vec3(1, 1, 1);
      this.ball_radius = 0.25;

      // Creating basketball
      this.particleSystem = new ParticleSystem();
      // drawing the particle (basketball)
      this.particleSystem.createParticles(1);
      // Creating a human instance
      this.human = new Articulated_Human();
      // Control points for spline path for human to walk.
      this.splineControlPoints = [
        [20, 0, 20], // Top right
        [0, 0, 30], // Top center
        [-20, 0, 20], // Top left
        [-30, 0, 0], // Left center
        [-20, 0, -20], // Bottom left
        [0, 0, -30], // Bottom center
        [20, 0, -20], // Bottom right
        [30, 0, 0], // Right center
        [20, 0, 20], // Close the loop
      ];
    }

    render_animation(caller) {
      // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
      if (!caller.controls) {
        this.animated_children.push(
          (caller.controls = new defs.Movement_Controls({
            uniforms: this.uniforms,
          }))
        );
        caller.controls.add_mouse_controls(caller.canvas);

        // !!! Camera changed here
        // TODO: you can change the camera as needed.
        // Starter Camera Angle (will use for demo)
        Shader.assign_camera(
          Mat4.look_at(
              vec3(0, 20, 30),
              vec3(0, 12, 0),
              vec3(0, 1, 0)
          ),
          this.uniforms
        );

        // Debugging looking down birds eye view at backboard
        // Shader.assign_camera(
        //   Mat4.look_at(
        //       vec3(0, 40, -38),
        //       vec3(0, 29, -38),
        //       vec3(0, 0, -1)
        //   ),
        //   this.uniforms
        // );

        // Debugging looking straight at backboard
        // Shader.assign_camera(
        //   Mat4.look_at(
        //     vec3(0, 15, -20), // Keep the camera in the same position
        //     vec3(0, 15, -40), // Look farther in the negative z direction
        //     vec3(0, 1, 0) // Keep "up" the same
        //   ),
        //   this.uniforms
        // );
      }
      this.uniforms.projection_transform = Mat4.perspective(
        Math.PI / 4,
        caller.width / caller.height,
        1,
        100
      );

      // *** Lights: *** Values of vector or point lights.  They'll be consulted by
      // the shader when coloring shapes.  See Light's class definition for inputs.
      const t = (this.t = this.uniforms.animation_time / 1000);

      // const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,-1,1,0 ) ); !!!
      // !!! Light changed here
      const light_position = vec4(20, 20, 20, 1.0);
      this.uniforms.lights = [
        defs.Phong_Shader.light_source(
          light_position,
          color(1, 1, 1, 1),
          100000000
        ),
      ];

      // draw axis arrows.
      this.shapes.axis.draw(
        caller,
        this.uniforms,
        Mat4.identity(),
        this.materials.rgb
      );

      // draw basketball court
      const model_transform_court = Mat4.identity()
        .times(Mat4.translation(0, 7.5, 0))
        .times(Mat4.scale(50, 50, 50, 0))
        .times(Mat4.rotation(Math.PI / 2, 0, 1, 0));
      this.shapes.court.draw(
        caller,
        this.uniforms,
        model_transform_court,
        this.materials.court
      );

      const model_transform_rack = Mat4.identity()
        .times(Mat4.translation(0, 3, 0))
        .times(Mat4.scale(4,4,4,0));

      this.shapes.rack.draw(caller, this.uniforms, model_transform_rack, this.materials.rack);

      this.shootingSpline.draw(caller, this.uniforms, model_transform_rack, this.materials.rack);
    }
  });

export class Basketball extends Basketball_base {
  constructor() {
    super();
    this.sim = 0;
    this.render = true;
  }
  render_animation(caller) {
    super.render_animation(caller);

    /**********************************
     Start coding down here!!!!
     **********************************/
    const blue = color(0, 0, 1, 1),
      yellow = color(1, 0.7, 0, 1),
      wall_color = color(0.7, 1.0, 0.8, 1),
      blackboard_color = color(0.2, 0.2, 0.2, 1);

    const t = (this.t = this.uniforms.animation_time / 1000);

    /**********************************
     *  Update & Draw the Human
     **********************************/
    // // Get the ball's current position
    // const ball_pos = this.particleSystem.particles[0].position;
    
    // // Get human's current position
    // const human_pos = this.human.root.location_matrix.times(vec4(0,0,0,1));
    // const current_pos = vec3(human_pos[0], 0, human_pos[2]);
    
    // // Calculate direction to ball
    // const direction = vec3(ball_pos[0] - current_pos[0], 0, ball_pos[2] - current_pos[2]);
    // const distance = Math.sqrt(direction[0] * direction[0] + direction[2] * direction[2]);

    // if (distance > 3) {
    //     const normalized_dir = vec3(direction[0]/distance, 0, direction[2]/distance);
    //     const speed = 5;
    //     const movement = normalized_dir.times(speed * (this.uniforms.animation_delta_time / 1000));
        
    //     // Update human position and orientation
    //     const angle = Math.atan2(normalized_dir[0], normalized_dir[2]);
    //     this.human.root.location_matrix = Mat4.translation(
    //         current_pos[0] + movement[0], 
    //         7.5,
    //         current_pos[2] + movement[2]
    //     ).times(Mat4.rotation(angle, 0, 1, 0));
    // }
    
    // this.human.updateWalking(t);

    // Update shooting animation
    this.human.updateShooting(t);

    // Draw the human
    this.human.draw(caller, this.uniforms, this.materials.plastic);

    /**********************************
     *  Update & Draw the Basketball
     **********************************/
    if (this.render) {
      const step = 1 / 1000; // Fixed small time step for smoother simulation.
      const fps = 60;
      let dt = Math.min(1.0 / 30, 1.0 / fps);

      let next = this.sim + dt; // Calculate the next simulation time.

      while (this.sim < next) {
        this.particleSystem.update(step); // Apply small time step updates.
        this.sim += step;
      }
    }

    this.particleSystem.draw(
      caller,
      this.uniforms,
      this.shapes,
      this.materials
    );
  }

  render_controls() {
    // render_controls(): Sets up a panel of interactive HTML elements, including
    // buttons with key bindings for affecting this scene, and live info readouts.
    this.control_panel.innerHTML += "Basketball Animation";
    this.new_line();
  }
}
