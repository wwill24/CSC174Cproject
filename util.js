import { tiny, defs } from "./examples/common.js";

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } =
  tiny;

export class Particle {
  constructor() {
    this.mass = 1;
    this.position = vec3(0, 17, -30);
    this.velocity = vec3(
      -10 * Math.sin(Math.PI / 4),
      0,
      -10 * Math.cos(Math.PI / 4)
    );
    //     this.velocity = vec3(0, 5, -5);
    this.force = vec3(0, 0, 0);
    this.acceleration = vec3(0, 0, 0);
    this.staticFriction = 0.92;
    this.kineticFriction = 0.8;
    this.radius = 0.7;
  }

  setProperties(mass, position, velocity) {
    this.mass = mass;
    this.position = position;
    this.velocity = velocity;
  }

  setAcceleration(g) {
    this.acceleration = g.times(1 / this.mass);
  }

  applyAdditionalForce(force) {
    this.force = this.force.plus(force);
    this.acceleration = this.force.times(1 / this.mass);
  }

  groundCollision() {
    const e = this.elasticity;
    const v = this.viscosity;
    let mu_s = this.staticFriction * 2;
    let mu_k = this.kineticFriction * 1.5;
    const groundNormal = vec3(0, 1, 0); // Y-axis upward

    let distance = this.position.dot(groundNormal);
    let relativeVelocity = this.velocity.dot(groundNormal);
    let tangentialVelocity = this.velocity.minus(
      groundNormal.times(relativeVelocity)
    );

    // Forces
    let spring = groundNormal.times(e * Math.max(distance, 0));
    let damping = groundNormal.times(v * relativeVelocity);
    let normal = groundNormal.times(this.force.dot(groundNormal)).times(-1);

    this.force = this.force.plus(spring.minus(damping));

    if (distance < 0) {
      // Correct position
      this.position = this.position.plus(groundNormal.times(-distance));
      this.velocity = this.velocity.minus(
        groundNormal.times(relativeVelocity * 1.8)
      );

      let tangentialSpeed = this.velocity.norm();
      if (tangentialSpeed > 0) {
        let normalMagnitude = normal.norm();
        // If the speed is really low, completely stop the ball
        if (tangentialSpeed < 0.1) {
          this.velocity = vec3(0, 0, 0);
          this.acceleration = vec3(0, 0, 0);
        } else {
          // Apply kinetic friction
          let frictionDirection = tangentialVelocity.normalized().times(-1);
          let frictionForce = frictionDirection.times(mu_k * normalMagnitude);
          this.force = this.force.plus(frictionForce);

          // Reduce velocity over time
          this.velocity[0] *= this.staticFriction;
          this.velocity[2] *= this.staticFriction;
        }
      }
    }
  }

  backboardCollision() {
    const e = 1;
    const v = 1;
    const mu_s = this.staticFriction;
    const mu_k = this.kineticFriction;

    // Backboard properties
    const backboardNormal = vec3(0, 0, 1); // Faces positive Z
    const backboardZ = -39; // Front face of the backboard
    const backboardCenter = vec3(0, 17, backboardZ);
    const backboardWidth = 10;
    const backboardHeight = 6;
    const halfWidth = backboardWidth / 2;
    const halfHeight = backboardHeight / 2;
    const ballRadius = this.radius;

    // Compute distance from the front face of the backboard
    let distance = this.position[2] - (backboardZ + ballRadius); // Adjust for ball radius
    let relativeVelocity = this.velocity.dot(backboardNormal);
    let tangentialVelocity = this.velocity.minus(
      backboardNormal.times(relativeVelocity)
    );
    // Forces
    let spring = backboardNormal.times(e * Math.max(distance, 0));
    let damping = backboardNormal.times(v * relativeVelocity);
    let normal = backboardNormal
      .times(this.force.dot(backboardNormal))
      .times(-1);

    this.force = this.force.plus(spring.minus(damping));

    // Check if the ball is within backboard bounds and colliding with the front face
    if (
      Math.abs(this.position[0] - backboardCenter[0]) <
        halfWidth + ballRadius &&
      Math.abs(this.position[1] - backboardCenter[1]) <
        halfHeight + ballRadius &&
      distance < 0
    ) {
      this.position = this.position.plus(backboardNormal.times(distance * -1));
      this.velocity = this.velocity.minus(
        backboardNormal.times(relativeVelocity * 1.8)
      );
      if (tangentialVelocity.norm() > 0) {
        let tangentialMagnitude = this.force.minus(normal).norm();
        let normalMagnitude = normal.norm();

        if (tangentialMagnitude < mu_s * normalMagnitude) {
          let slowdownFactor = tangentialMagnitude / (mu_s * normalMagnitude);
          this.velocity = this.velocity.times(slowdownFactor);
          this.acceleration = this.acceleration.times(slowdownFactor);
        } else {
          let frictionDirection = tangentialVelocity.normalized().times(-1);
          this.force = this.force.plus(
            frictionDirection.times(mu_k * normalMagnitude)
          );
        }
      }
    }
  }

  netCollision() {
    // Net parameters
    const topCenter = vec3(0, 13.49, -38);
    const bottomCenter = vec3(0, 10, -38);
    const topRadius = 2;
    const bottomRadius = 1;
    const netHeight = topCenter[1] - bottomCenter[1];
    const netThickness = 0.1;

    // Ball parameters
    let ballHeight = this.position[1];

    // Ensure ball is near net height range (with some margin)
    const margin = 0.7 + netThickness;
    if (
      ballHeight < bottomCenter[1] - margin ||
      ballHeight > topCenter[1] + margin
    )
      return;

    // Compute net radius at the ball's height (linear interpolation)
    let heightRatio = (ballHeight - bottomCenter[1]) / netHeight;
    heightRatio = Math.max(0, Math.min(1, heightRatio)); // Clamp between 0 and 1
    let netRadiusAtHeight =
      bottomRadius + heightRatio * (topRadius - bottomRadius);

    // Ball's position in the XZ plane
    let ballXZ = vec3(this.position[0], 0, this.position[2]);
    let netXZ = vec3(topCenter[0], 0, topCenter[2]);

    // Vector from net center to ball in XZ plane
    let displacementXZ = ballXZ.minus(netXZ);
    let distanceXZ = displacementXZ.norm();

    // Handle case where ball is exactly at center
    if (distanceXZ < 0.0001) {
      displacementXZ = vec3(0.01, 0, 0);
      distanceXZ = 0.01;
    }

    // Calculate distance to inside and outside surface of the conical net
    let distanceToInside = distanceXZ - (netRadiusAtHeight - netThickness);
    let distanceToOutside = netRadiusAtHeight + netThickness - distanceXZ;

    // Check collision with either inside or outside of net
    let isInsideCollision = distanceToInside < 0.9 && distanceToInside > 0;
    let isOutsideCollision =
      distanceToOutside < 0.9 &&
      distanceToOutside > 0 &&
      distanceXZ > netRadiusAtHeight;

    if (isInsideCollision || isOutsideCollision) {
      // Determine collision normal (points in or out depending on side of collision)
      let normalDirection = isInsideCollision ? 1 : -1;
      let surfaceNormal = displacementXZ.normalized().times(normalDirection);

      // Calculate relative velocity along the collision normal
      let relativeVelocity = this.velocity.dot(surfaceNormal);
      // Only bounce if moving toward the surface
      if (relativeVelocity > 0) {
        // Apply bounce with elasticity
        this.velocity = this.velocity.minus(
          surfaceNormal.times(relativeVelocity * 1.5)
        );

        // Move ball outside the net surface
        let penetrationDepth = isInsideCollision
          ? 0.7 - distanceToInside
          : 0.7 - distanceToOutside;

        let correctionFactor = Math.min(penetrationDepth, 0.5);
        this.position = this.position.plus(
          surfaceNormal.times(correctionFactor * -1)
        );
      }
    }
  }

  wallCollision_right() {
    const e = 1;
    const v = 1;
    const mu_s = this.staticFriction;
    const mu_k = this.kineticFriction;

    // bounce the ball opposite way
    const wallX = 38;
    const wallNormal = vec3(-1, 0, 0);
    const ballRadius = 0.7;

    // If distance > 0, it means the ball center has penetrated past the plane.
    let distance = this.position[0] - (wallX - ballRadius);

    // Project velocity onto the wall’s normal:
    let relativeVelocity = this.velocity.dot(wallNormal);
    let tangentialVelocity = this.velocity.minus(
      wallNormal.times(relativeVelocity)
    );

    let spring = wallNormal.times(e * Math.max(distance, 0));
    let damping = wallNormal.times(v * relativeVelocity);
    let normal = wallNormal.times(this.force.dot(wallNormal)).times(-1);

    this.force = this.force.plus(spring.minus(damping));

    // Actual collision response if the ball is penetrating the wall plane:
    if (distance > 0) {
      this.position[0] = wallX - ballRadius;

      // Invert the force
      this.velocity = this.velocity.minus(
        wallNormal.times(relativeVelocity * 1.8)
      );

      if (tangentialVelocity.norm() > 0) {
        let tangentialMagnitude = this.force.minus(normal).norm();
        let normalMagnitude = normal.norm();
        // If below static friction threshold, slow down tangential velocity
        if (tangentialMagnitude < mu_s * normalMagnitude) {
          let slowdownFactor = tangentialMagnitude / (mu_s * normalMagnitude);
          this.velocity = this.velocity.times(slowdownFactor);
          this.acceleration = this.acceleration.times(slowdownFactor);
        } else {
          // Kinetic friction
          let frictionDirection = tangentialVelocity.normalized().times(-1);
          this.force = this.force.plus(
            frictionDirection.times(mu_k * normalMagnitude)
          );
        }
      }
    }
  }

  wallCollision_left() {
    const e = 1;
    const v = 1;
    const mu_s = this.staticFriction;
    const mu_k = this.kineticFriction;

    // bounce the ball opposite way
    const wallX = -37;
    const wallNormal = vec3(1, 0, 0);
    const ballRadius = 0.7;

    // If distance < 0, it means the ball center has penetrated past the plane.
    let distance = this.position[0] - (wallX - ballRadius);

    // Project velocity onto the wall’s normal:
    let relativeVelocity = this.velocity.dot(wallNormal);
    let tangentialVelocity = this.velocity.minus(
      wallNormal.times(relativeVelocity)
    );

    let spring = wallNormal.times(e * Math.max(distance, 0));
    let damping = wallNormal.times(v * relativeVelocity);
    let normal = wallNormal.times(this.force.dot(wallNormal)).times(-1);

    this.force = this.force.plus(spring.minus(damping));

    // Actual collision response if the ball is penetrating the wall plane:
    if (distance < 0) {
      this.position[0] = wallX - ballRadius;

      // Invert the force
      this.velocity = this.velocity.minus(
        wallNormal.times(relativeVelocity * 1.8)
      );

      if (tangentialVelocity.norm() > 0) {
        let tangentialMagnitude = this.force.minus(normal).norm();
        let normalMagnitude = normal.norm();
        // If below static friction threshold, slow down tangential velocity
        if (tangentialMagnitude < mu_s * normalMagnitude) {
          let slowdownFactor = tangentialMagnitude / (mu_s * normalMagnitude);
          this.velocity = this.velocity.times(slowdownFactor);
          this.acceleration = this.acceleration.times(slowdownFactor);
        } else {
          // Kinetic friction
          let frictionDirection = tangentialVelocity.normalized().times(-1);
          this.force = this.force.plus(
            frictionDirection.times(mu_k * normalMagnitude)
          );
        }
      }
    }
  }

  wallCollision_top() {
    const e = 1;
    const v = 1;
    const mu_s = this.staticFriction;
    const mu_k = this.kineticFriction;

    // bounce the ball opposite way
    const wallZ = -52.5;
    const wallNormal = vec3(0, 0, 1);
    const ballRadius = 0.7;

    // If distance > 0, it means the ball center has penetrated past the plane.
    let distance = this.position[2] - (wallZ - ballRadius);

    // Project velocity onto the wall’s normal:
    let relativeVelocity = this.velocity.dot(wallNormal);
    let tangentialVelocity = this.velocity.minus(
      wallNormal.times(relativeVelocity)
    );

    let spring = wallNormal.times(e * Math.max(distance, 0));
    let damping = wallNormal.times(v * relativeVelocity);
    let normal = wallNormal.times(this.force.dot(wallNormal)).times(-1);

    this.force = this.force.plus(spring.minus(damping));

    // Actual collision response if the ball is penetrating the wall plane:
    if (distance < 0) {
      this.position[2] = wallZ - ballRadius;

      // Invert the force
      this.velocity = this.velocity.minus(
        wallNormal.times(relativeVelocity * 1.8)
      );

      if (tangentialVelocity.norm() > 0) {
        let tangentialMagnitude = this.force.minus(normal).norm();
        let normalMagnitude = normal.norm();
        // If below static friction threshold, slow down tangential velocity
        if (tangentialMagnitude < mu_s * normalMagnitude) {
          let slowdownFactor = tangentialMagnitude / (mu_s * normalMagnitude);
          this.velocity = this.velocity.times(slowdownFactor);
          this.acceleration = this.acceleration.times(slowdownFactor);
        } else {
          // Kinetic friction
          let frictionDirection = tangentialVelocity.normalized().times(-1);
          this.force = this.force.plus(
            frictionDirection.times(mu_k * normalMagnitude)
          );
        }
      }
    }
  }

  wallCollision_bottom() {
    const e = 1;
    const v = 1;
    const mu_s = this.staticFriction;
    const mu_k = this.kineticFriction;

    // bounce the ball opposite way
    const wallZ = 52.5;
    const wallNormal = vec3(0, 0, -1);
    const ballRadius = 0.7;

    // If distance > 0, it means the ball center has penetrated past the plane.
    let distance = this.position[2] - (wallZ - ballRadius);

    // Project velocity onto the wall’s normal:
    let relativeVelocity = this.velocity.dot(wallNormal);
    let tangentialVelocity = this.velocity.minus(
      wallNormal.times(relativeVelocity)
    );

    let spring = wallNormal.times(e * Math.max(distance, 0));
    let damping = wallNormal.times(v * relativeVelocity);
    let normal = wallNormal.times(this.force.dot(wallNormal)).times(-1);

    this.force = this.force.plus(spring.minus(damping));

    // Actual collision response if the ball is penetrating the wall plane:
    if (distance > 0) {
      this.position[2] = wallZ - ballRadius;

      // Invert the force
      this.velocity = this.velocity.minus(
        wallNormal.times(relativeVelocity * 1.8)
      );

      if (tangentialVelocity.norm() > 0) {
        let tangentialMagnitude = this.force.minus(normal).norm();
        let normalMagnitude = normal.norm();
        // If below static friction threshold, slow down tangential velocity
        if (tangentialMagnitude < mu_s * normalMagnitude) {
          let slowdownFactor = tangentialMagnitude / (mu_s * normalMagnitude);
          this.velocity = this.velocity.times(slowdownFactor);
          this.acceleration = this.acceleration.times(slowdownFactor);
        } else {
          // Kinetic friction
          let frictionDirection = tangentialVelocity.normalized().times(-1);
          this.force = this.force.plus(
            frictionDirection.times(mu_k * normalMagnitude)
          );
        }
      }
    }
  }

  simulateEuler(step) {
    this.position = this.position.plus(this.velocity.times(step));
    this.velocity = this.velocity.plus(this.acceleration.times(step));
    this.acceleration = vec3(0, 0, 0);
    this.force = vec3(0, 0, 0);
  }

  simulateSymplectic(step) {
    this.position = this.position.plus(this.velocity.times(step));
    this.velocity = this.velocity.plus(this.acceleration.times(step));
    this.acceleration = vec3(0, 0, 0);
    this.force = vec3(0, 0, 0);
  }

  simulateVerlet(step) {
    this.position = this.position
      .plus(this.velocity.times(step))
      .plus(this.acceleration.times(0.5 * step ** 2));

    const currentAcceleration = this.acceleration.copy();
    this.velocity = this.velocity.plus(
      currentAcceleration.plus(this.acceleration).times(0.5 * step)
    );
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.springs = [];
    this.viscosity = 1;
    this.elasticity = 1;
    this.gravity = vec3(0, -9.81, 0);
    this.integrationMethod = "euler";
    this.timeStep = 1 / 100;
    this.radius = 0.7;
    this.staticFriction = 0.9;
    this.kineticFriction = 0.8;
    this.backboardPosition = vec3();
    this.backboardNormal = vec3(0, 0, 1);
  }

  createParticles(count) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle());
    }
  }

  createSprings(count) {
    for (let i = 0; i < count; i++) {
      this.springs.push(null);
    }
  }

  isValidParticleIndex(index) {
    return index >= 0 && index < this.particles.length;
  }

  linkParticlesAndSprings(springIndex, pIndex1, pIndex2, ks, kd, length) {
    if (
      !this.isValidParticleIndex(pIndex1) ||
      !this.isValidParticleIndex(pIndex2)
    ) {
      console.error("Invalid particle index:", pIndex1, pIndex2);
      return;
    }

    const particle1 = this.particles[pIndex1];
    const particle2 = this.particles[pIndex2];
    let baseLength;

    if (length >= 0) {
      baseLength = length;
    } else {
      baseLength = particle1.position.minus(particle2.position).norm();
    }

    const newSpring = new Spring(particle1, particle2, ks, kd, baseLength);

    if (springIndex === this.springs.length) {
      this.springs.push(newSpring);
    } else if (springIndex >= 0 && springIndex < this.springs.length) {
      this.springs[springIndex] = newSpring;
    } else {
      console.error(`Invalid spring index: ${springIndex}`);
    }
  }

  update(dt = this.timeStep) {
    for (const particle of this.particles) {
      particle.force = vec3(0, 0, 0);
      particle.applyAdditionalForce(this.gravity.times(particle.mass));
    }

    this.springs.forEach((spring) => {
      if (spring) {
        spring.applySpringForce();
      }
    });

    for (const particle of this.particles) {
      // Determine first the method before calculating the collision with the ground
      switch (this.integrationMethod) {
        case "euler":
          particle.simulateEuler(dt);
          break;
        case "symplectic":
          particle.simulateSymplectic(dt);
          break;
        case "verlet":
          particle.simulateVerlet(dt);
          break;
        default:
          // Defaults to euler
          particle.simulateEuler(dt);
          break;
      }
      particle.groundCollision();
      particle.backboardCollision();
      particle.netCollision();
      particle.wallCollision_right();
      particle.wallCollision_left();
      particle.wallCollision_top();
      particle.wallCollision_bottom();
    }
  }

  draw(webglManager, uniforms, shapes, materials) {
    const blue = color(0, 0, 1, 1);
    const red = color(1, 0, 0, 1);
    const orange = color(1, 0.5, 0, 1);

    // Draw all particles
    this.particles.forEach((particle) =>
      this.drawParticle(
        particle,
        webglManager,
        uniforms,
        shapes,
        materials,
        orange
      )
    );

    // Draw all springs
    this.springs.forEach((spring) => {
      if (spring) {
        this.drawSpring(spring, webglManager, uniforms, shapes, materials, red);
      }
    });
  }

  drawParticle(particle, webglManager, uniforms, shapes, materials, color) {
    const particleTransform = Mat4.translation(...particle.position).times(
      Mat4.scale(this.radius, this.radius, this.radius)
    );

    shapes.ball.draw(webglManager, uniforms, particleTransform, {
      ...materials.metal,
      color,
    });
  }

  drawSpring(spring, webglManager, uniforms, shapes, materials, color) {
    const startPosition = spring.particle1.position;
    const endPosition = spring.particle2.position;
    const displacementVector = endPosition.minus(startPosition);
    const springLength = displacementVector.norm();
    const midpoint = startPosition.plus(endPosition).times(0.5);

    const modelTransform =
      Math.abs(displacementVector[0]) < 1e-6 &&
      Math.abs(displacementVector[2]) < 1e-6
        ? Mat4.translation(...midpoint).times(
            Mat4.scale(0.05, springLength / 2, 0.05)
          )
        : this.computeSpringTransform(
            midpoint,
            displacementVector,
            springLength
          );

    shapes.box.draw(webglManager, uniforms, modelTransform, {
      ...materials.plastic,
      color,
    });
  }

  computeSpringTransform(center, springVector, len) {
    const normalizedVector = springVector.normalized();
    const normal = vec3(0, 1, 0);
    const axis = normal.cross(normalizedVector).normalized();
    const angle = Math.acos(normal.dot(normalizedVector));

    return Mat4.translation(...center)
      .times(Mat4.rotation(angle, ...axis))
      .times(Mat4.scale(0.1, len / 2, 0.1));
  }

  reset() {
    this.particles = [];
    this.springs = [];
  }
}
