import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export class Particle {
    constructor() {
      this.mass = 1;
      this.position = vec3(0, 17, -34);
      this.velocity = vec3(0, 0, -10);
      this.force = vec3(0, 0, 0);
      this.acceleration = vec3(0, 0, 0);
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
      const mu_s = this.staticFriction;
      const mu_k = this.kineticFriction
      const groundNormal = vec3(0, 1, 0); // Points upward on y axis
      let distance = this.position.dot(groundNormal);
      let relativeVelocity = this.velocity.dot(groundNormal);
      let tangentialVelocity = this.velocity.minus(groundNormal.times(relativeVelocity));

      // Forces used
      let spring = groundNormal.times(e * Math.max(distance, 0));
      let damping = groundNormal.times(v * relativeVelocity);
      let normal = groundNormal.times(this.force.dot(groundNormal)).times(-1);
      
      this.force = this.force.plus(spring.minus(damping));

      if (distance < 0) {
        this.position = this.position.plus(groundNormal.times(distance * -1));
        this.velocity = this.velocity.minus(groundNormal.times(relativeVelocity * 1.85));
        
        if (tangentialVelocity.norm() > 0) {
          let tangentialMagnitude = this.force.minus(normal).norm();
          let normalMagnitude = normal.norm();

          if (tangentialMagnitude < mu_s * normalMagnitude) {
            let slowdownFactor = tangentialMagnitude / (mu_s * normalMagnitude);
            this.velocity = this.velocity.times(slowdownFactor);
            this.acceleration = this.acceleration.times(slowdownFactor);
          } else {
            let frictionDirection = tangentialVelocity.normalized().times(-1);
            this.force = this.force.plus(frictionDirection.times(mu_k * normalMagnitude));
          }
        }
      }
    }

    backboardCollision() {
      const e = this.elasticity;
      const v = this.viscosity;
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
      const ballRadius = 0.7;
  
      // Compute distance from the front face of the backboard
      let distance = this.position[2] - (backboardZ + ballRadius); // Adjust for ball radius
      let relativeVelocity = this.velocity.dot(backboardNormal);
      let tangentialVelocity = this.velocity.minus(backboardNormal.times(relativeVelocity));
      // Forces
      let spring = backboardNormal.times(e * Math.max(distance, 0));
      let damping = backboardNormal.times(v * relativeVelocity);
      let normal = backboardNormal.times(this.force.dot(backboardNormal)).times(-1);
  
      this.force = this.force.plus(spring.minus(damping));

      // Check if the ball is within backboard bounds and colliding with the front face
      if (
          Math.abs(this.position[0] - backboardCenter[0]) < halfWidth + ballRadius &&
          Math.abs(this.position[1] - backboardCenter[1]) < halfHeight + ballRadius &&
          distance < 0
      ) {
        this.position = this.position.plus(backboardNormal.times(distance * -1));
        this.velocity = this.velocity.minus(backboardNormal.times(relativeVelocity * 1.80));
        
        if (tangentialVelocity.norm() > 0) {
          let tangentialMagnitude = this.force.minus(normal).norm();
          let normalMagnitude = normal.norm();

          if (tangentialMagnitude < mu_s * normalMagnitude) {
            let slowdownFactor = tangentialMagnitude / (mu_s * normalMagnitude);
            this.velocity = this.velocity.times(slowdownFactor);
            this.acceleration = this.acceleration.times(slowdownFactor);
          } else {
            let frictionDirection = tangentialVelocity.normalized().times(-1);
            this.force = this.force.plus(frictionDirection.times(mu_k * normalMagnitude));
          }
        }
      }
    }

    netCollision() {
      const e = this.elasticity * 0.6;  // Reduce bounce intensity
      const v = this.viscosity;
  
      // Net parameters
      const topCenter = vec3(0, 14, -38);
      const bottomCenter = vec3(0, 10, -38);
      const topRadius = 2;
      const bottomRadius = 1;
      const netHeight = topCenter[1] - bottomCenter[1];
  
      // Ball parameters
      let ballHeight = this.position[1];
  
      // Ensure ball is within net height range
      if (ballHeight < bottomCenter[1] || ballHeight > topCenter[1]) return;
  
      // Compute net radius at the ball's height (linear interpolation)
      let heightRatio = (ballHeight - bottomCenter[1]) / netHeight;
      let netRadiusAtHeight = bottomRadius + heightRatio * (topRadius - bottomRadius);
  
      // Get ball's XZ position (ignoring Y)
      let ballXZ = vec3(this.position[0], 0, this.position[2]);
      let netXZ = vec3(topCenter[0], 0, topCenter[2]);
  
      // Distance from net center in XZ plane
      let displacementXZ = ballXZ.minus(netXZ);
      let distanceXZ = displacementXZ.norm();
  
      // Ensure distanceXZ is a valid number
      if (isNaN(distanceXZ) || distanceXZ === undefined) {
          console.error("Invalid distanceXZ calculation!", displacementXZ);
          return;
      }
  
      // Collision check
      let penetrationDepth = distanceXZ - netRadiusAtHeight;
  
      // Ensure penetrationDepth is valid
      if (isNaN(penetrationDepth)) {
          console.error("NaN detected in penetrationDepth!", distanceXZ, netRadiusAtHeight);
          return;
      }
  
      if (Math.abs(penetrationDepth) < 0.7) {
          let surfaceNormal = (distanceXZ > 0) ? displacementXZ.normalized() : vec3(1, 0, 0); // Default normal
  
          // Bounce effect (reduce velocity slightly)
          let relativeVelocity = this.velocity.dot(surfaceNormal);
          this.velocity = this.velocity.minus(surfaceNormal.times(relativeVelocity * (1 + e)));
  
          // Correct position with limit to prevent teleportation
          let correctionFactor = Math.min(0.5, Math.abs(penetrationDepth)); // Prevents extreme jumps
          this.position = this.position.minus(surfaceNormal.times(correctionFactor));
      }
    }

    wallCollision() {

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
      this.position = this.position.plus(this.velocity.times(step))
        .plus(this.acceleration.times(0.5 * step ** 2));
  
      const currentAcceleration = this.acceleration.copy();
      this.velocity = this.velocity.plus(currentAcceleration.plus(this.acceleration).times(0.5 * step));
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
    if (!this.isValidParticleIndex(pIndex1) || !this.isValidParticleIndex(pIndex2)) {
      console.error("Invalid particle index:", pIndex1, pIndex2);
      return;
    }

    const particle1 = this.particles[pIndex1];
    const particle2 = this.particles[pIndex2];
    let baseLength;

    if (length >= 0) {
      baseLength = length;
    }
    else {
      baseLength = particle1.position.minus(particle2.position).norm();
    }

    const newSpring = new Spring(particle1, particle2, ks, kd, baseLength);

    if (springIndex === this.springs.length) {
      this.springs.push(newSpring);
    } 
    else if (springIndex >= 0 && springIndex < this.springs.length) {
      this.springs[springIndex] = newSpring;
    } 
    else {
      console.error(`Invalid spring index: ${springIndex}`);
    }
  }

  update(dt = this.timeStep) {
    for (const particle of this.particles) {
      particle.force = vec3(0, 0, 0);
      particle.applyAdditionalForce(this.gravity.times(particle.mass));
    }

    this.springs.forEach(spring => {
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
    }
  }

  draw(webglManager, uniforms, shapes, materials) {
    const blue = color(0, 0, 1, 1);
    const red = color(1, 0, 0, 1);
    const orange = color(1, 0.5, 0, 1);
  
    // Draw all particles
    this.particles.forEach(particle => 
      this.drawParticle(particle, webglManager, uniforms, shapes, materials, orange)
    );
  
    // Draw all springs
    this.springs.forEach(spring => {
      if (spring) {
        this.drawSpring(spring, webglManager, uniforms, shapes, materials, red);
      }
    });
  }

  drawParticle(particle, webglManager, uniforms, shapes, materials, color) {
    const particleTransform = Mat4.translation(...particle.position)
      .times(Mat4.scale(this.radius, this.radius, this.radius));
  
    shapes.ball.draw(webglManager, uniforms, particleTransform, { ...materials.metal, color });
  }
  

  drawSpring(spring, webglManager, uniforms, shapes, materials, color) {
    const startPosition = spring.particle1.position;
    const endPosition = spring.particle2.position;
    const displacementVector = endPosition.minus(startPosition);
    const springLength = displacementVector.norm();
    const midpoint = startPosition.plus(endPosition).times(0.5);
  
    const modelTransform = (Math.abs(displacementVector[0]) < 1e-6 && Math.abs(displacementVector[2]) < 1e-6)
      ? Mat4.translation(...midpoint).times(Mat4.scale(0.05, springLength / 2, 0.05))
      : this.computeSpringTransform(midpoint, displacementVector, springLength);
  
    shapes.box.draw(webglManager, uniforms, modelTransform, { ...materials.plastic, color });
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
}
