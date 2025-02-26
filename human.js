import * as math from "https://cdn.jsdelivr.net/npm/mathjs@10.6.4/+esm";
import { tiny, defs } from "./examples/common.js";

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } =
  tiny;

const shapes = {
  sphere: new defs.Subdivision_Sphere(5),
};

export const Articulated_Human = class Articulated_Human {
  constructor() {
    const sphere_shape = shapes.sphere;

    // torso node
    const torso_transform = Mat4.scale(1, 2.5, 0.5);
    this.torso_node = new Node("torso", sphere_shape, torso_transform);
    // root -> torso
    const root_location = Mat4.translation(-1, 7.5, 0);
    this.root = new Arc("root", null, this.torso_node, root_location);

    // head node
    let head_transform = Mat4.scale(0.6, 0.6, 0.6);
    head_transform.pre_multiply(Mat4.translation(0, 0.6, 0));
    this.head_node = new Node("head", sphere_shape, head_transform);
    // torso -> neck -> head
    const neck_location = Mat4.translation(0, 2.5, 0);
    this.neck = new Arc("neck", this.torso_node, this.head_node, neck_location);
    this.torso_node.children_arcs.push(this.neck);

    // right upper arm node
    let ru_arm_transform = Mat4.scale(1.2, 0.2, 0.2);
    ru_arm_transform.pre_multiply(Mat4.translation(1.2, 0, 0));
    this.ru_arm_node = new Node("ru_arm", sphere_shape, ru_arm_transform);
    // torso -> r_shoulder -> ru_arm
    const r_shoulder_location = Mat4.translation(0.6, 2, 0);
    this.r_shoulder = new Arc("r_shoulder", this.torso_node, this.ru_arm_node, r_shoulder_location);
    this.torso_node.children_arcs.push(this.r_shoulder);
    this.r_shoulder.set_dof(true, true, true);

    // right lower arm node
    let rl_arm_transform = Mat4.scale(1, 0.2, 0.2);
    rl_arm_transform.pre_multiply(Mat4.translation(1, 0, 0));
    this.rl_arm_node = new Node("rl_arm", sphere_shape, rl_arm_transform);
    // ru_arm -> r_elbow -> rl_arm
    const r_elbow_location = Mat4.translation(2.4, 0, 0);
    this.r_elbow = new Arc("r_elbow", this.ru_arm_node, this.rl_arm_node, r_elbow_location);
    this.ru_arm_node.children_arcs.push(this.r_elbow);
    this.r_elbow.set_dof(true, true, false);

    // right hand node
    let r_hand_transform = Mat4.scale(0.4, 0.3, 0.2);
    r_hand_transform.pre_multiply(Mat4.translation(0.4, 0, 0));
    this.r_hand_node = new Node("r_hand", sphere_shape, r_hand_transform);
    // rl_arm -> r_wrist -> r_hand
    const r_wrist_location = Mat4.translation(2, 0, 0);
    this.r_wrist = new Arc("r_wrist", this.rl_arm_node, this.r_hand_node, r_wrist_location);
    this.rl_arm_node.children_arcs.push(this.r_wrist);
    this.r_wrist.set_dof(true, false, true);

    // left upper arm node
    let lu_arm_transform = Mat4.scale(1.2, .2, .2);
    lu_arm_transform.pre_multiply(Mat4.translation(-1.2, 0, 0));
    this.lu_arm_node = new Node("lu_arm", sphere_shape, lu_arm_transform);
    // torso -> l_shoulder -> lu_arm
    const l_shoulder_location = Mat4.translation(-0.6, 2, 0);
    this.l_shoulder = new Arc("l_shoulder", this.torso_node, this.lu_arm_node, l_shoulder_location);
    this.torso_node.children_arcs.push(this.l_shoulder);

    // left lower arm node
    let ll_arm_transform = Mat4.scale(1, 0.2, 0.2);
    ll_arm_transform.pre_multiply(Mat4.translation(-1, 0, 0));
    this.ll_arm_node = new Node("ll_arm", sphere_shape, ll_arm_transform);
    // lu_arm -> l_elbow -> ll_arm
    const l_elbow_location = Mat4.translation(-2.4, 0, 0);
    this.l_elbow = new Arc("l_elbow", this.lu_arm_node, this.ll_arm_node, l_elbow_location);
    this.lu_arm_node.children_arcs.push(this.l_elbow);

    // left hand node
    let l_hand_transform = Mat4.scale(0.4, 0.3, 0.2)
    l_hand_transform.pre_multiply(Mat4.translation(-0.4, 0, 0));
    this.l_hand_node = new Node("l_hand", sphere_shape, l_hand_transform);
    // ll_arm -> l_wrist -> l_hand
    const l_wrist_location = Mat4.translation(-2, 0, 0);
    this.l_wrist = new Arc("l_wrist", this.ll_arm_node, this.l_hand_node, l_wrist_location);
    this.ll_arm_node.children_arcs.push(this.l_wrist);

    // right upper leg node
    let ru_leg_transform = Mat4.scale(0.3, 1.2, 0.3)
    ru_leg_transform.pre_multiply(Mat4.translation(0, -1.2, 0));
    this.ru_leg_node = new Node("ru_leg", sphere_shape, ru_leg_transform);
    // torso -> r_hip -> r_thigh
    const r_hip_location = Mat4.translation(0.5, -2.2, 0);
    this.r_hip = new Arc("r_hip", this.torso_node, this.ru_leg_node, r_hip_location);
    this.torso_node.children_arcs.push(this.r_hip);

    // right lower leg node
    let rl_leg_transform = Mat4.scale(.3, 1.2, .3);
    rl_leg_transform.pre_multiply(Mat4.translation(0, -1.2, 0));
    this.rl_leg_node = new Node("rl_leg", sphere_shape, rl_leg_transform);
    // ru_leg->r_knee->rl_leg
    const r_knee_location = Mat4.translation(0, -2.4, 0);
    this.r_knee = new Arc("r_knee", this.ru_leg_node, this.rl_leg_node, r_knee_location);
    this.ru_leg_node.children_arcs.push(this.r_knee);   

    // right foot node
    let r_foot_transform = Mat4.scale(.4, .3, .2);
    r_foot_transform.pre_multiply(Mat4.translation(0, -0.3, 0));
    this.r_foot_node = new Node("r_foot", sphere_shape, r_foot_transform);
    // rl_leg -> r_ankle -> r_foot
    const r_ankle_location = Mat4.translation(0, -2.4, 0);
    this.r_ankle = new Arc("r_ankle", this.rl_leg_transform, this.r_foot_node, r_ankle_location);
    this.rl_leg_node.children_arcs.push(this.r_ankle);

    // left upper leg node
    let lu_leg_transform = Mat4.scale(.3, 1.2, .3);
    lu_leg_transform.pre_multiply(Mat4.translation(0, -1.2, 0));
    this.lu_leg_node = new Node("lu_leg", sphere_shape, lu_leg_transform);
    const l_hip_location = Mat4.translation(-0.5, -2.2, 0);
    this.l_hip = new Arc("l_hip", this.torso_node, this.lu_leg_node, l_hip_location);
    this.torso_node.children_arcs.push(this.l_hip);

    // left lower leg node
    let ll_leg_transform = Mat4.scale(.3, 1.2, .3);
    ll_leg_transform.pre_multiply(Mat4.translation(0, -1.2, 0));
    this.ll_leg_node = new Node("ll_leg", sphere_shape, ll_leg_transform);
    const l_knee_location = Mat4.translation(0, -2.4, 0);
    this.l_knee = new Arc("l_knee", this.lu_leg_node, this.ll_leg_node, l_knee_location);
    this.lu_leg_node.children_arcs.push(this.l_knee);

    // left foot node
    let l_foot_transform = Mat4.scale(.4, .3, .2);
    l_foot_transform.pre_multiply(Mat4.translation(0, -0.3, 0));
    this.l_foot_node = new Node("l_foot", sphere_shape, l_foot_transform);
    const l_ankle_location = Mat4.translation(0, -2.4, 0);
    this.l_ankle = new Arc("l_ankle", this.ll_leg_node, this.l_foot_node, l_ankle_location);
    this.ll_leg_node.children_arcs.push(this.l_ankle);

    // add the only end-effector
    const r_hand_end_local_pos = vec4(0.8, 0, 0, 1);
    this.end_effector = new End_Effector("r_hand", this.r_wrist, r_hand_end_local_pos);
    this.r_wrist.end_effector = this.end_effector;

    // here I only use 7 dof
    this.dof = 7; // only 7 since we only need to move the right arm
    this.Jacobian = null;
    this.theta = [0, 0, 0, 0, 0, 0, 0];
    this.apply_theta();
  }

  // mapping from global theta to each joint theta
  apply_theta(arc = this.root, index = 0) {

  }

  _rec_update(arc, matrix) {

  }

  // Draw human model following the example in char.png
  draw(webgl_manager, uniforms, material) {
    this.matrix_stack = [];
    this._rec_draw(this.root, Mat4.identity(), webgl_manager, uniforms, material);
  }

  _rec_draw(arc, matrix, webgl_manager, uniforms, material) {
    if (arc !== null) {
      const L = arc.location_matrix;
      const A = arc.articulation_matrix;
      matrix.post_multiply(L.times(A));
      this.matrix_stack.push(matrix.copy());

      const node = arc.child_node;
      const T = node.transform_matrix;
      matrix.post_multiply(T);
      
      const white = color(1,1,1,1);

      if (node.name === "r_hand") {
          node.shape.draw(webgl_manager, uniforms, matrix, { ...material, color: white })
      }
      else {
          node.shape.draw(webgl_manager, uniforms, matrix, material);
      }

      matrix = this.matrix_stack.pop();
      for (const next_arc of node.children_arcs) {
        this.matrix_stack.push(matrix.copy());
        this._rec_draw(next_arc, matrix, webgl_manager, uniforms, material);
        matrix = this.matrix_stack.pop();
      }
    }
  }

  debug(arc=null) {
      if (arc === null)
          arc = this.root;

      if (arc !== this.root) {
          arc.articulation_matrix = arc.articulation_matrix.times(Mat4.rotation(0.02, 0, 0, 1));
      }

      const node = arc.child_node;
      for (const next_arc of node.children_arcs) {
          this.debug(next_arc);
      }
  }
};

class Node {
  constructor(name, shape, transform) {
    this.name = name;
    this.shape = shape;
    this.transform_matrix = transform;
    this.children_arcs = [];
  }
}

class Arc {
  constructor(name, parent, child, location) {
    this.name = name;
    this.parent_node = parent;
    this.child_node = child;
    this.location_matrix = location;
    this.articulation_matrix = Mat4.identity();
    this.end_effector = null;
    // Here I only implement rotational DOF
    this.dof = {
      Rx: false,
      Ry: false,
      Rz: false,
    };
  }

  // Here I only implement rotational DOF
  set_dof(x, y, z) {
    this.dof.Rx = x;
    this.dof.Ry = y;
    this.dof.Rz = z;
  }
}

// You are absoulutely free to modify this class, or add more classes.
class End_Effector {
  constructor(name, parent, local_position) {
    this.name = name;
    this.parent = parent;
    this.local_position = local_position;
    this.global_position = null;
  }
}
