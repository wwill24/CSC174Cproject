import { tiny, defs } from "./examples/common.js";
import { Articulated_Human } from "./human.js";
import { Shape_From_File } from "./examples/obj-file-demo.js";
import { Particle, ParticleSystem } from "./util.js";
import { ShootingSpline } from "./human.js";

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } =
  tiny;

/*****************************************************
 *  Spline Class
 *
 * This class creates a closed “infinity” spline.
 * The spline is defined in the board’s local coordinates.
 * It now uses a Gerono lemniscate to generate a horizontal 8.
 *****************************************************/
class Spline {
  constructor() {
    // We'll sample 100 points along the spline.
    this.numSamples = 1000;
    this.points = [];
    for (let i = 0; i <= this.numSamples; i++) {
      let t = i / this.numSamples;
      let pt = this.getPoint(t);
      this.points.push(pt);
    }
  }
  // Simulating a shooting motion with a parabolic arc
  // In Spline class:
  getPoint(t) {
    // These numbers now define a relative offset from the release point.
    let offsetX = -0.5 + (0.3 + 0.5) * t;  // Moves from -0.5 to +0.3 relative to the hand.
    // A parabolic arc in Y: starting low, rising to a peak, then falling a little.
    let startY = -0.3, peakY = 0.7;
    let offsetY = (1 - (t - 0.5) ** 2) * (peakY - startY) + startY;
    let offsetZ = 0.6 * t;  // Extends forward from 0 to 0.6.
    
    return vec3(offsetX, offsetY, offsetZ);
  }

  // Linear interpolation between sample points.
  sample(t) {
    t = t % 1; // wrap around
    let scaled = t * this.numSamples;
    let index = Math.floor(scaled);
    let frac = scaled - index;
    let p0 = this.points[index];
    let p1 = this.points[(index + 1) % this.points.length];
    return vec3.add(p0, vec3.scale(vec3.subtract(p1, p0), frac));
  }
  // Draw the spline as small spheres along the curve.
  draw(caller, uniforms, board_transform, material) {
    for (let i = 0; i < this.points.length; i++) {
      let pt = this.points[i];
      // Transform the spline point from board-local to world coordinates.
      let world_pt = board_transform.times(vec4(pt[0], pt[1], pt[2], 1));
      let transform = Mat4.translation(
        world_pt[0],
        world_pt[1],
        world_pt[2]
      ).times(Mat4.scale(0.11, 0.11, 0.11));
      caller.shapes.ball.draw(caller, uniforms, transform, material);
    }
  }
}

Object.assign(vec3, {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  subtract: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  scale: (a, s) => [a[0] * s, a[1] * s, a[2] * s],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
});

export const Basketball_base =
  (defs.Basketball_base = class Basketball_base extends Component {
    init() {
      console.log("init");

      // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
      this.hover = this.swarm = false;
      this.time = 0;
      this.isMoving = true;
      this.count = false;
      this.count_tracker = 1;
      this.walk = false;

      this.shapes = {
        box: new defs.Cube(),
        ball: new defs.Subdivision_Sphere(4),
        axis: new defs.Axis_Arrows(),
        court: new Shape_From_File("assets/court/court.obj"),
        rack: new Shape_From_File("assets/rack/racks.obj"),
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
        color: color(0.6, 0.3, 0.1, 1),
      };

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
      // Spline for the shooting motion
      this.shootingSpline = new ShootingSpline();
      // Arm state: first "moving" to pick up the ball, then "drawing" the shooting motion spline.
      this.armState = "moving";
      this.spline_t = 0;
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
          Mat4.look_at(vec3(0, 20, 30), vec3(0, 12, 0), vec3(0, 1, 0)),
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
        .times(Mat4.translation(5, 3, 0))
        .times(Mat4.rotation(Math.PI / 2, 0, 1, 0)) // Rotate 90° around Y-axis
        .times(Mat4.scale(4, 4, 4));

      this.shapes.rack.draw(
        caller,
        this.uniforms,
        model_transform_rack,
        this.materials.rack
      );

      // this.shootingSpline.draw(caller, this.uniforms, model_transform_rack, this.materials.rack);
    }
  });

export class Basketball extends Basketball_base {
  constructor() {
    super();
    this.sim = 0;
    this.render = true;
  }

  shootBall() {
    let target = [0, 12, -38];  // The basket position

    // Get human's current position
    const human_pos = this.human.root.location_matrix.times(vec4(0, 0, 0, 1));
    const rootPos = vec3(human_pos[0], 0, human_pos[2]);

    // Calculate direction towards the target
    const direction = vec3(target[0] - rootPos[0], 0, target[2] - rootPos[2]);
    const distance = Math.sqrt(direction[0] ** 2 + direction[2] ** 2);

    if (distance > 0) {
        const normalized_dir = vec3(direction[0] / distance, 0, direction[2] / distance);
        const angle = Math.atan2(normalized_dir[0], normalized_dir[2]);

        // Rotate human to face the target before doing anything else
        this.human.root.location_matrix = Mat4.translation(
            rootPos[0], 7.5, rootPos[2]
        ).times(Mat4.rotation(angle, 0, 1, 0));
    }

    this.human.get_right_shoulder_position();
    this.shootingSpline.updateSpline(this.human);
    let releasePos = this.human.get_end_effector_position(); // vec3

    let g = -9.81;  

    // Reduce arc by increasing divisor 
    let horizontalDistance = Math.sqrt(
        (target[0] - releasePos[0]) ** 2 + 
        (target[2] - releasePos[2]) ** 2
    );
    let T = horizontalDistance / 10.5;

    // Solve for Initial Velocities
    let v0x = (target[0] - releasePos[0]) / T;
    let v0z = (target[2] - releasePos[2]) / T;
    let v0y = (target[1] - releasePos[1] - 0.5 * g * T * T) / T;
    let v0 = vec3(v0x, v0y, v0z); // Final velocity vector

    // Apply to the ball
    let ballParticle = this.particleSystem.particles[0];
    ballParticle.position = releasePos;
    
    return v0;
}

  walking(t){
    // // Get the ball's current position
    const ball_pos = this.particleSystem.particles[0].position;

    // Get human's current position
    const human_pos = this.human.root.location_matrix.times(vec4(0,0,0,1));
    const current_pos = vec3(human_pos[0], 0, human_pos[2]);

    // Calculate direction to ball
    const direction = vec3(ball_pos[0] - current_pos[0], 0, ball_pos[2] - current_pos[2]);
    const distance = Math.sqrt(direction[0] * direction[0] + direction[2] * direction[2]);

    if (distance > 3) {
        const normalized_dir = vec3(direction[0]/distance, 0, direction[2]/distance);
        const speed = 5;
        const movement = normalized_dir.times(speed * (this.uniforms.animation_delta_time / 1000));

        // Update human position and orientation
        const angle = Math.atan2(normalized_dir[0], normalized_dir[2]);
        this.human.root.location_matrix = Mat4.translation(
            current_pos[0] + movement[0],
            7.5,
            current_pos[2] + movement[2]
        ).times(Mat4.rotation(angle,0,1,0));
    }
    else{
      this.walk = false;
    }

    this.human.updateWalking(t);
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
    
    if(this.walk){
      this.walking(t);
    }

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

    let shot_transform = Mat4.translation(1.5, 5, -2).times(
      Mat4.scale(1, 10, -4)
    );

    let target;
    let v0_vec3;
    if(this.count && !this.walk){
      this.spline_t += 0.02; // adjust speed as needed (reduced from 0.001 to 0.0001)
      v0_vec3 = this.shootBall();
      
      if(this.spline_t > this.count_tracker - 0.9){
        this.particleSystem.particles[0].velocity = v0_vec3;
      }

      let splinePt = this.shootingSpline.sample(this.spline_t);
      this.shootingSpline.draw(caller, this.uniforms, Mat4.identity(), this.materials.rack);
      let worldPt = shot_transform.times(
        vec4(splinePt[0], splinePt[1], splinePt[2], 1)
      );
      let handPos = this.human.get_end_effector_position();
      let target = vec3.add(handPos, splinePt);
      
      this.human.updateIK(target);
    }
    if(this.spline_t >= this.count_tracker){
      this.count = false;
      this.count_tracker += 1;
    }
    

    // Draw the human
    this.human.draw(caller, this.uniforms, this.materials.plastic);

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
    this.key_triggered_button( "Shoot", [ "t" ], function() {
      this.count = true;
    } );
    this.key_triggered_button( "Walk", [ "y" ], function() {
      this.walk = !this.walk;
    } );
  }
}
