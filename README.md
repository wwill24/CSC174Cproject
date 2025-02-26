1. DONE [2 Points] Display a "classroom" with a floor plane and a blackboard on a planar wall parallel
to the x-y plane (perpendicular to the floor).
Lines 96-99 in assignment2.js

2. DONE [2 Points] Display the spline on the blackboard. You can either display the spline from the
beginning or gradually display it during the drawing animation.
Lines 6-49 in util.js to create the spline curve as a figure 8. Draw function to actually display called at line 102
in assignment2.js

3. DONE [4 Points] Model the human character using ellipsoids (you can use the Sphere primitive with
non-uniform scaling).
Lines 13-146 in human.js to model the human and create the joints. Drawn in assignment2.js by calling
draw function

4. [8 Points] Implement the inverse kinematics solver using the pseudoinverse approach.
Inverse kinematics to calculate joint angles and help movement of arm as it draws is done using all the functions
in Articulated_Human

5. [1 Point] Move the right hand from its initial position such that the end effector touches the
board (initial animation).
Lines 105-107 will move hand to spline

6. [3 Points] Then, move the hand to draw the spline, looping repeatedly, since the spline is a
closed shape.
Lines 229-244 will move the hand repeatedly using the other functions made