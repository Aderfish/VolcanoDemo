---
title: Project Proposal CS-341 2024
---

# Volcano Simulation

![A representative image](images/demo.jpg){width="300px"}


## Abstract

We will render a volcano erruption.


## Features

| Feature                | Points       | Adapted Points |
|------------------------|--------------|----------------|
| Particle Effects for smoke and lava projections              | 20           | 20             |
| Physical based lava rendering              | 20           | 15             |
| Procedural volcano terrain generation              | 5           | 5             |
| Procedural texture generation              | 10           | 10             |
| Lava flow fluid simulation              | 20           | 20             |


## Schedule


<table>
	<tr>
		<th></th>
		<th>Name 1</th>
		<th>Name 2</th>
		<th>Name 3</th>
	</tr>
	<tr>
		<td>Week 1</td>
		<td>Write the project </td>
		<td>Find the ressources that we'll need during the project</td>
		<td>Setup the git repository</td>
	</tr>
	<tr>
		<td>Week 2</td>
		<td>Procedural volcano terrain generation</td>
		<td>Procedural texture generation of the volcano terrain</td>
		<td>Smoke particule effects for the volcano</td>
	</tr>
	<tr>
		<td>Week 3</td>
		<td>Fluid simulation of the lava (1/2)</td>
		<td>Add physical based shader to the lava (1/2)</td>
		<td>Procedural texture of the lava</td>
	</tr>
	<tr>
		<td>Week 4</td>
		<td>Fluid simulation of the lava (2/2)</td>
		<td>Add physical based shader to the lava (2/2)</td>
		<td>Eruption with particules</td>
	</tr>
	<tr>
		<td>Week 5</td>
		<td>Add particules around the lava flow</td>
		<td></td>
		<td></td>
	</tr>
	<tr>
		<td>Week 6</td>
		<td>Recording the final video</td>
		<td>Prepare the final presentation</td>
		<td>Finish the final report</td>
	</tr>
</table>


## Resources

### Lava Flow simulation
http://www-evasion.imag.fr/Publications/1999/SACNG99/gi99.pdf
http://www-evasion.imag.fr/Membres/Fabrice.Neyret/Lave/index-eng.html#Rendering 
https://www.researchgate.net/publication/365591320_Modeling_and_Visualization_of_Lava_Flows
https://home.cscamm.umd.edu/publications/hangzhou_CS-05-04.pdf

### Terrain generation
https://timetocode.tumblr.com/post/93970694121/volcanic-map-generation-step-by-step \
https://www.redblobgames.com/maps/terrain-from-noise/ \
https://www.scratchapixel.com/lessons/procedural-generation-virtual-worlds/perlin-noise-part-2/perlin-noise-terrain-mesh.html

### Lava rendering
#### Creating the lava mesh with voronoï tesselation
https://pubs.aip.org/aapt/ajp/article/90/6/469/2820132/Voronoi-cell-analysis-The-shapes-of-particle

#### Rendering the lava
http://www-evasion.imag.fr/Publications/1999/SACNG99/gi99.pdf
https://www.shadertoy.com/view/msycDz
https://learnopengl.com/PBR/Theory
https://threejs.org/examples/webgl_shader_lava.html


### Particles
https://web.stanford.edu/class/cs237d/smoke.pdf
https://www.opengl-tutorial.org/intermediate-tutorials/billboards-particles/particles-instancing/
https://learnopengl.com/In-Practice/2D-Game/Particles


### Procedural textures
https://thebookofshaders.com/12/