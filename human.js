import * as math from "https://cdn.jsdelivr.net/npm/mathjs@10.6.4/+esm";
import { tiny, defs } from "./examples/common.js";

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } =
  tiny;

const shapes = {
  sphere: new defs.Subdivision_Sphere(5),
};

export const Articulated_Human = class Articulated_Human {
  constructor(splineControlPoints) {
    // Store the control points for later use in updateWalking().
    // If none are provided, use a default set.
    this.controlPoints = splineControlPoints || [
      vec3(0, 7.5, 0),
      vec3(5, 7.5, 5),
      vec3(10, 7.5, 0),
      vec3(5, 7.5, -5),
    ];

    const sphere_shape = shapes.sphere;

    // ---------------------------
    // Torso and Root (Body)
    // ---------------------------
    const torso_transform = Mat4.scale(1, 2.5, 0.5);
    this.torso_node = new Node("torso", sphere_shape, torso_transform);
    const root_location = Mat4.translation(0, 7.5, 0);
    this.root = new Arc("root", null, this.torso_node, root_location);

    // ---------------------------
    // Head and Neck (Unchanged)
    // ---------------------------
    let head_transform = Mat4.scale(0.6, 0.6, 0.6);
    head_transform.pre_multiply(Mat4.translation(0, 0.6, 0));
    this.head_node = new Node("head", sphere_shape, head_transform);
    const neck_location = Mat4.translation(0, 2.5, 0);
    this.neck = new Arc("neck", this.torso_node, this.head_node, neck_location);
    this.torso_node.children_arcs.push(this.neck);

    // ---------------------------
    // Right Arm (Used for drawing the spline)
    // ---------------------------
    let ru_arm_transform = Mat4.scale(1.2, 0.2, 0.2);
    ru_arm_transform.pre_multiply(Mat4.translation(1.2, 0, 0));
    this.ru_arm_node = new Node("ru_arm", sphere_shape, ru_arm_transform);
    const r_shoulder_location = Mat4.translation(0.6, 2, 0);
    this.r_shoulder = new Arc(
      "r_shoulder",
      this.torso_node,
      this.ru_arm_node,
      r_shoulder_location
    );
    this.torso_node.children_arcs.push(this.r_shoulder);
    this.r_shoulder.set_dof(true, true, true);

    let rl_arm_transform = Mat4.scale(1, 0.2, 0.2);
    rl_arm_transform.pre_multiply(Mat4.translation(1, 0, 0));
    this.rl_arm_node = new Node("rl_arm", sphere_shape, rl_arm_transform);
    const r_elbow_location = Mat4.translation(2.4, 0, 0);
    this.r_elbow = new Arc(
      "r_elbow",
      this.ru_arm_node,
      this.rl_arm_node,
      r_elbow_location
    );
    this.ru_arm_node.children_arcs.push(this.r_elbow);
    this.r_elbow.set_dof(true, true, false);

    let r_hand_transform = Mat4.scale(0.4, 0.3, 0.2);
    r_hand_transform.pre_multiply(Mat4.translation(0.4, 0, 0));
    this.r_hand_node = new Node("r_hand", sphere_shape, r_hand_transform);
    const r_wrist_location = Mat4.translation(2, 0, 0);
    this.r_wrist = new Arc(
      "r_wrist",
      this.rl_arm_node,
      this.r_hand_node,
      r_wrist_location
    );
    this.rl_arm_node.children_arcs.push(this.r_wrist);
    this.r_wrist.set_dof(true, false, true);

    // ---------------------------
    // Left Arm (Unchanged)
    // ---------------------------
    let lu_arm_transform = Mat4.scale(1.2, 0.2, 0.2);
    lu_arm_transform.pre_multiply(Mat4.translation(-1.2, 0, 0));
    this.lu_arm_node = new Node("lu_arm", sphere_shape, lu_arm_transform);
    const l_shoulder_location = Mat4.translation(-0.6, 2, 0);
    this.l_shoulder = new Arc(
      "l_shoulder",
      this.torso_node,
      this.lu_arm_node,
      l_shoulder_location
    );
    this.torso_node.children_arcs.push(this.l_shoulder);

    let ll_arm_transform = Mat4.scale(1, 0.2, 0.2);
    ll_arm_transform.pre_multiply(Mat4.translation(-1, 0, 0));
    this.ll_arm_node = new Node("ll_arm", sphere_shape, ll_arm_transform);
    const l_elbow_location = Mat4.translation(-2.4, 0, 0);
    this.l_elbow = new Arc(
      "l_elbow",
      this.lu_arm_node,
      this.ll_arm_node,
      l_elbow_location
    );
    this.lu_arm_node.children_arcs.push(this.l_elbow);

    let l_hand_transform = Mat4.scale(0.4, 0.3, 0.2);
    l_hand_transform.pre_multiply(Mat4.translation(-0.4, 0, 0));
    this.l_hand_node = new Node("l_hand", sphere_shape, l_hand_transform);
    const l_wrist_location = Mat4.translation(-2, 0, 0);
    this.l_wrist = new Arc(
      "l_wrist",
      this.ll_arm_node,
      this.l_hand_node,
      l_wrist_location
    );
    this.ll_arm_node.children_arcs.push(this.l_wrist);

    // ---------------------------
    // Right Leg (Modified for walking)
    // ---------------------------
    // right upper leg node
    let ru_leg_transform = Mat4.scale(0.3, 1.2, 0.3);
    ru_leg_transform.pre_multiply(Mat4.translation(0, -1.2, 0));
    this.ru_leg_node = new Node("ru_leg", sphere_shape, ru_leg_transform);
    // torso -> r_hip -> ru_leg
    const r_hip_location = Mat4.translation(0.5, -2.2, 0);
    this.r_hip = new Arc(
      "r_hip",
      this.torso_node,
      this.ru_leg_node,
      r_hip_location
    );
    this.r_hip.set_dof(true, false, false); // allow hip rotation
    this.torso_node.children_arcs.push(this.r_hip);
    // right lower leg node
    let rl_leg_transform = Mat4.scale(0.3, 1.2, 0.3);
    rl_leg_transform.pre_multiply(Mat4.translation(0, -1.2, 0));
    this.rl_leg_node = new Node("rl_leg", sphere_shape, rl_leg_transform);
    // ru_leg -> r_knee -> ru_leg
    const r_knee_location = Mat4.translation(0, -2.4, 0);
    this.r_knee = new Arc(
      "r_knee",
      this.ru_leg_node,
      this.rl_leg_node,
      r_knee_location
    );
    this.r_knee.set_dof(true, false, false); // allow knee bending
    this.ru_leg_node.children_arcs.push(this.r_knee);
    // right foot node
    let r_foot_transform = Mat4.scale(0.4, 0.3, 0.2);
    r_foot_transform.pre_multiply(Mat4.translation(0, -0.3, 0));
    this.r_foot_node = new Node("r_foot", sphere_shape, r_foot_transform);
    // rl_leg -> r_ankle -> r_foot
    const r_ankle_location = Mat4.translation(0, -2.4, 0);
    this.r_ankle = new Arc(
      "r_ankle",
      this.rl_leg_node,
      this.r_foot_node,
      r_ankle_location
    );
    this.rl_leg_node.children_arcs.push(this.r_ankle);

    // ---------------------------
    // Left Leg (Modified for walking)
    // ---------------------------
    // left upper leg node
    let lu_leg_transform = Mat4.scale(0.3, 1.2, 0.3);
    lu_leg_transform.pre_multiply(Mat4.translation(0, -1.2, 0));
    this.lu_leg_node = new Node("lu_leg", sphere_shape, lu_leg_transform);
    // torso -> l_hip -> lu_leg
    const l_hip_location = Mat4.translation(-0.5, -2.2, 0);
    this.l_hip = new Arc(
      "l_hip",
      this.torso_node,
      this.lu_leg_node,
      l_hip_location
    );
    this.l_hip.set_dof(true, false, false); // allow left hip rotation
    this.torso_node.children_arcs.push(this.l_hip);
    // left lower leg node
    let ll_leg_transform = Mat4.scale(0.3, 1.2, 0.3);
    ll_leg_transform.pre_multiply(Mat4.translation(0, -1.2, 0));
    this.ll_leg_node = new Node("ll_leg", sphere_shape, ll_leg_transform);
    // lu_leg -> l_knee -> lu_leg
    const l_knee_location = Mat4.translation(0, -2.4, 0);
    this.l_knee = new Arc(
      "l_knee",
      this.lu_leg_node,
      this.ll_leg_node,
      l_knee_location
    );
    this.l_knee.set_dof(true, false, false); // allow left knee bending
    this.lu_leg_node.children_arcs.push(this.l_knee);
    // left foot node
    let l_foot_transform = Mat4.scale(0.4, 0.3, 0.2);
    l_foot_transform.pre_multiply(Mat4.translation(0, -0.3, 0));
    this.l_foot_node = new Node("l_foot", sphere_shape, l_foot_transform);
    // ll_leg -> l_ankle -> l_foot
    const l_ankle_location = Mat4.translation(0, -2.4, 0);
    this.l_ankle = new Arc(
      "l_ankle",
      this.ll_leg_node,
      this.l_foot_node,
      l_ankle_location
    );
    this.ll_leg_node.children_arcs.push(this.l_ankle);

    // ---------------------------
    // End-Effector for the right hand (for drawing the spline)
    // ---------------------------
    const r_hand_end_local_pos = vec4(0.8, 0, 0, 1);
    this.end_effector = new End_Effector(
      "r_hand",
      this.r_wrist,
      r_hand_end_local_pos
    );
    this.r_wrist.end_effector = this.end_effector;

    // Retain IK DOF for the arm (if needed)
    this.dof = 7;
    this.Jacobian = null;
    this.theta = [0, 0, 0, 0, 0, 0, 0];
    this.apply_theta();
  }

  // Propagate joint angles (for IK on the arm)
  apply_theta() {
    let index = 0;
    this._apply_theta_recursive(this.root, index);
  }

  _apply_theta_recursive(arc, index) {
    if (arc === null) return index;

    // If this arc is one of the leg joints, skip applying the global theta.
    if (
      arc.name === "r_hip" ||
      arc.name === "r_knee" ||
      arc.name === "l_hip" ||
      arc.name === "l_knee"
    ) {
      // Continue recursively without consuming any theta values.
      for (const child_arc of arc.child_node.children_arcs) {
        index = this._apply_theta_recursive(child_arc, index);
      }
      return index;
    }

    const dof_count =
      (arc.dof.Rx ? 1 : 0) + (arc.dof.Ry ? 1 : 0) + (arc.dof.Rz ? 1 : 0);
    const theta_values = this.theta.slice(index, index + dof_count);
    arc.update_articulation(theta_values);
    let new_index = index + dof_count;
    for (const child_arc of arc.child_node.children_arcs) {
      new_index = this._apply_theta_recursive(child_arc, new_index);
    }
    return new_index;
  }

  calculate_Jacobian() {
    let J = new Array(3);
    for (let i = 0; i < 3; i++) {
      J[i] = new Array(this.dof);
    }
    const original_theta = this.theta.slice();
    const original_position = this.get_end_effector_position();
    for (let i = 0; i < this.dof; i++) {
      const delta_theta = 0.01;
      this.theta[i] += delta_theta;
      this.apply_theta();
      const perturbed_position = this.get_end_effector_position();
      const delta_position = vec3.subtract(
        perturbed_position,
        original_position
      );
      J[0][i] = delta_position[0] / delta_theta;
      J[1][i] = delta_position[1] / delta_theta;
      J[2][i] = delta_position[2] / delta_theta;
      this.theta = original_theta.slice();
      this.apply_theta();
    }
    return J;
  }

  calculate_delta_theta(J, dx) {
    const lambda = 0.01;
    const A = math.add(
      math.multiply(math.transpose(J), J),
      math.multiply(lambda, math.identity(J[0].length))
    );
    const b = math.multiply(math.transpose(J), dx);
    const x = math.lusolve(A, b);
    return x.toArray();
  }

  get_end_effector_position() {
    this.matrix_stack = [];
    this._rec_update(this.root, Mat4.identity());
    const v = this.end_effector.global_position;
    return vec3(v[0], v[1], v[2]);
  }

  _rec_update(arc, matrix) {
    if (arc === null) return;
    const globalMatrix = matrix
      .times(arc.location_matrix)
      .times(arc.articulation_matrix);
    if (arc.end_effector) {
      const localPos = arc.end_effector.local_position;
      const localPositionVec4 = vec4(localPos[0], localPos[1], localPos[2], 1);
      const globalPositionVec4 = globalMatrix.times(localPositionVec4);
      arc.end_effector.global_position = vec3(
        globalPositionVec4[0],
        globalPositionVec4[1],
        globalPositionVec4[2]
      );
    }
    for (const child_arc of arc.child_node.children_arcs || []) {
      this._rec_update(child_arc, globalMatrix);
    }
  }

  // (Unchanged) Right arm IK update for drawing with the hand.
  updateIK(target) {
    let dx = vec3.subtract(target, this.get_end_effector_position());
    const J = this.calculate_Jacobian();
    const dtheta = this.calculate_delta_theta(J, dx);
    this.theta = this.theta.map((v, i) => v + (dtheta[i] ? dtheta[i][0] : 0));
    this.apply_theta();
  }

  // ---------------------------
  // Walking Animation
  // ---------------------------
  // Catmull-Rom Spline evaluator.
  // t is in [0, 1], and p0, p1, p2, p3 are control points (vec3 arrays).
  catmullRom(t, p0, p1, p2, p3) {
    const t2 = t * t,
      t3 = t2 * t;
    const out = [0, 0, 0];
    for (let i = 0; i < 3; i++) {
      out[i] =
        0.5 *
        (2 * p1[i] +
          (-p0[i] + p2[i]) * t +
          (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t2 +
          (-p0[i] + 3 * p1[i] - 3 * p2[i] + p3[i]) * t3);
    }
    return out;
  }
  // Moves the body and animates the leg joints. Call updateWalking(time)
  // in your animation loop (time in seconds).
  updateWalking(time) {
    // --- Improved Leg Motion ---
    const stepFrequency = 3; // Adjust for realistic stepping speed
    const hipAmplitude = 0.3; // Hip movement range
    const kneeAmplitude = 0.5; // Knee bending range

    // Compute step cycle using sine wave
    const stepCycle = Math.sin(stepFrequency * time);

    // Legs move in opposite phases
    this.r_hip.update_articulation([hipAmplitude * stepCycle]);
    this.l_hip.update_articulation([hipAmplitude * -stepCycle]);

    // Knees bend when foot lifts (absolute value smooths motion)
    this.r_knee.update_articulation([
      kneeAmplitude * Math.max(0, -stepCycle), // Bend when rising
    ]);
    this.l_knee.update_articulation([
      kneeAmplitude * Math.max(0, stepCycle), // Opposite leg bending
    ]);

    // --- Subtle Torso and Arm Movement ---
    const torsoAmplitude = 0.05; // Small sideways torso sway
    const armAmplitude = 0.4; // Arm swing range

    // Torso sways slightly opposite to leg movement
    const torsoSway = Mat4.rotation(torsoAmplitude * -stepCycle, 0, 0, 1);
    this.torso_node.apply_transform(torsoSway);

    // Arms swing opposite to legs for natural movement
    this.l_shoulder.update_articulation([
      armAmplitude * stepCycle, // Left arm moves forward when left leg moves back
    ]);
  }

  // ---------------------------
  // Draw the human model.
  // (Modified to color leg segments green for debugging.)
  // ---------------------------
  draw(webgl_manager, uniforms, material) {
    this.matrix_stack = [];
    this._rec_draw(
      this.root,
      Mat4.identity(),
      webgl_manager,
      uniforms,
      material
    );
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

      // Color the right hand red and leg segments green for clarity.
      let node_material = material;
      if (node.name === "r_hand") {
        node_material = { ...material, color: color(1, 0, 0, 1) };
      } else if (node.name.includes("leg") || node.name.includes("foot")) {
        node_material = { ...material, color: color(0, 1, 0, 1) };
      }
      node.shape.draw(webgl_manager, uniforms, matrix, node_material);

      matrix = this.matrix_stack.pop();
      for (const next_arc of node.children_arcs) {
        this.matrix_stack.push(matrix.copy());
        this._rec_draw(next_arc, matrix, webgl_manager, uniforms, material);
        matrix = this.matrix_stack.pop();
      }
    }
  }

  // (Unchanged debug function for IK)
  debug(arc = null, id = null) {
    const J = this.calculate_Jacobian();
    let dx = [[0], [-0.02], [0]];
    if (id === 2) dx = [[-0.02], [0], [0]];
    const dtheta = this.calculate_delta_theta(J, dx);
    this.theta = this.theta.map((v, i) => v + dtheta[i][0]);
    this.apply_theta();
  }

  // Debugging function to print the hierarchy
  print_hierarchy() {
    this._print_hierarchy_recursive(this.root, 0);
  }

  _print_hierarchy_recursive(arc, level) {
    if (arc === null) return;
    const indent = "  ".repeat(level);
    console.log(`${indent}Arc: ${arc.name}`);
    console.log(
      `${indent}  Parent: ${arc.parent_node ? arc.parent_node.name : "None"}`
    );
    console.log(`${indent}  Child: ${arc.child_node.name}`);
    for (const child_arc of arc.child_node.children_arcs) {
      this._print_hierarchy_recursive(child_arc, level + 1);
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

  // Method to update the node's transform
  set_transform(new_transform) {
    this.transform_matrix = new_transform;
  }

  // Apply a transformation relative to the current one
  apply_transform(additional_transform) {
    this.transform_matrix = this.transform_matrix.times(additional_transform);
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
    // Implement rotational DOF.
    this.dof = { Rx: false, Ry: false, Rz: false };
  }

  // Set which axes have a rotational degree of freedom.
  set_dof(x, y, z) {
    this.dof.Rx = x;
    this.dof.Ry = y;
    this.dof.Rz = z;
  }

  update_articulation(theta) {
    this.articulation_matrix = Mat4.identity();
    let index = 0;
    if (this.dof.Rx) {
      this.articulation_matrix.pre_multiply(
        Mat4.rotation(theta[index], 1, 0, 0)
      );
      index += 1;
    }
    if (this.dof.Ry) {
      this.articulation_matrix.pre_multiply(
        Mat4.rotation(theta[index], 0, 1, 0)
      );
      index += 1;
    }
    if (this.dof.Rz) {
      this.articulation_matrix.pre_multiply(
        Mat4.rotation(theta[index], 0, 0, 1)
      );
    }
  }
}

class End_Effector {
  constructor(name, parent, local_position) {
    this.name = name;
    this.parent = parent;
    this.local_position = local_position;
    this.global_position = null;
  }
}
