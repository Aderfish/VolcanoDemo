---
title: Final Project Report CS-341 2024
---

# Volcano

![An image showing the final result](images/demo.jpg){width="300px"}


## Abstract

Volcanic eruptions are among the most awe-inspiring and powerful natural phenomena on Earth. This project aims to faithfully reproduce these phenomena through advanced simulation techniques. Our objective is to create realistic volcanic scenes and develop a flexible framework that facilitates the easy creation of diverse terrains and the design of various types of eruptions. To achieve this adaptability, the project embraces a procedural approach for both terrain generation and visual effects. We aim to provide users with an intuitive and interactive experience, allowing them to explore and manipulate volcanic eruptions.


## Overview

In this project, we tackle the challenge of rendering realistic volcanic eruptions through physically based simulations. Our framework is designed to be flexible, allowing for the creation of various types of eruptions with ease.

To achieve this goal, we begin by implementing a procedurally generated heightmap terrain system with parameters that can be adjusted through an intuitive UI menu. This procedural approach is chosen for its efficiency in rapidly creating diverse terrains. The procedural generation focuses on creating a volcanic island in the middle of the sea.

The next step is to add textures to achieve a more realistic render of the terrain. We once again choose a procedural approach for its flexibility. Specifically, we have three kinds of procedurally generated textures composing the terrain: the water around the island, the base terrain of the island, and the top of the volcano.

To enhance the realism of the water, we implement normal mapping on the water texture, giving the sensation of volumetric waves. Similarly, to emphasize the "rocky" aspect of the volcano, we add normal mapping to the volcanic terrain. 

Then, to represent the eruption, we chose to take a particle-based approach following the physical properties of lava flows. Thus, we implemented a fluid simulation with added constraints on temperature and viscosity to achieve a realistic lava flow. In particular, the simulation is heavily based on the process described in [Animating Lava Flows](http://www-evasion.imag.fr/Publications/1999/SACNG99/gi99.pdf). We once again adopt a flexible approach that allows easy modification of the simulation parameters, enabling users to experiment with various eruption scenarios.

To add to the immersion of the scene, we chose to include a key component of eruptions: smoke. To achieve this, we implemented a particle system that emits "smoke" particles above the crater of the volcano.

Finally, to enhance realism, we added a temperature-based rendering of the lava particles. While the particle meshes remain independent of each other, this approach contributes to the overall realistic appearance of the lava.

With all these effects implemented, the user is now able to generate various kinds of eruption scenarios based on realistic simulations of flowing lava, enhanced with immersive effects to contribute to the overall experience.


## Feature validation


### Feature 1

#### Implementation

TODO

#### Validation

TODO


### Feature 2

#### Implementation

TODO

#### Validation

TODO


### Feature 3

#### Implementation

TODO

#### Validation

TODO


## Discussion

TODO


## Contributions

<table>
	<caption>Worked hours</caption>
	<thead>
		<tr>
			<th>Name</th>
			<th>Week 1</th>
			<th>Week 2</th>
			<th>Week 3</th>
			<th>Week 4</th>
			<th>Week 5</th>
			<th>Week 6</th>
			<th>Total</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>Name 1</td>
			<td>TODO</td>
			<td>TODO</td>
			<td>TODO</td>
			<td>TODO</td>
			<td>TODO</td>
			<td>TODO</td>
			<td>TODO</td>
		</tr>
		<tr>
			<td>Name 2</td>
			<td>TODO</td>
			<td>TODO</td>
			<td>TODO</td>
			<td>TODO</td>
			<td>TODO</td>
			<td>TODO</td>
			<td>TODO</td>
		</tr>
		<tr>
			<td>Name 3</td>
			<td>TODO</td>
			<td>TODO</td>
			<td>TODO</td>
			<td>TODO</td>
			<td>TODO</td>
			<td>TODO</td>
			<td>TODO</td>
		</tr>
	</tbody>
</table>

<table>
	<caption>Individual contributions</caption>
	<thead>
		<tr>
			<th>Name</th>
			<th>Contribution</th>
		</tr>
	</thead>
	<tbody>
		<tr>
			<td>Name 1</td>
			<td>1/3</td>
		</tr>
		<tr>
			<td>Name 2</td>
			<td>1/3</td>
		</tr>
		<tr>
			<td>Name 3</td>
			<td>1/3</td>
		</tr>
	</tbody>
</table>


#### Comments

TODO


## References

TODO