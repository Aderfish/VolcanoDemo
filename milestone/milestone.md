---
title: Milestone Report CS-341 2024
---

# Volcano


## Progress Summary

1. So far, we have started by creating a framework that will allow us to efficiently add features to our project. Then, we designed an algorithm using perlin noise to create the heightmap of a volcano on a island. And we have integrated a UI menu that allows to set the generation parameters in live (17 different parameters in total). \
In parallel, we have worked on generating a procedural texture for the volcano in order to get a more realistic look. \
We have also worked on the smoke particles coming out of the volcano crater. \
Finally, we have started working on the simulation of the lava flow following the process described in the paper [Animating lava flows](http://www-evasion.imag.fr/Publications/1999/SACNG99/gi99.pdf).


	<table>
		<caption>Achieved Goals</caption>
		<tr>
			<th></th>
			<th>Yoann Lafore</th>
			<th>Shimeng Ye</th>
			<th>Alberts Reisons</th>
		</tr>
		<tr>
			<td>Week 1</td>
			<td>Write the project proposal</td>
			<td>Find resources on the features for the project</td>
			<td>Setup the repository for the project</td>
		</tr>
		<tr>
			<td>Week 2</td>
			<td>Adapt code from Perlin noise homework to have foundation framework for the project + Design the procedural generation of the volcano</td>
			<td>Design the procedural generation of the volcano terrain texture to get a realistic look</td>
			<td>Start working on the smoke particles effect</td>
		</tr>
		<tr>
			<td>Week 3</td>
			<td>Start the implementation of the lava flow simulation</td>
			<td>Design the procedural texture of the water</td>
			<td>Have a base implementation for the smoke particles effect</td>
		</tr>
	</table>

2. Show some preliminary results.

![An image showing your progress](images/demo.jpg){width="300px"}

3. Optionally present the validation of any feature you have already implemented. This is not mandatory, but it can help you get useful feedback for the final report.

	- Feature Name

		- Implementation

			Briefly describe how you implemented the feature.

		- Validation

			Provide evidence (plots, screenshots, animations, etc.) that the feature works as expected.


  - Volcanic island terrain generation
    
    - Implementation

      The creation of the terrain has been splitted into two parts: the island and the volcano itself. \
      The island is first generated as a disk whose elevation smoothly decreases when approaching the edge in order to get a good transition with the water. Then, a combination of perlin FBM noises is used to get a more realistic terrain as well as little remote islands. \
      The volcano shape is created by generating a conic shape that descreases exponontially. Then, in the middle, we create a crater for where the lava particles will be emitted. Also, a combination of perlin FBM and turbulence noises are used to get the "rocky" look of the volcano. \
      Finally, both heightmaps are combined in order to get the look of a volcanic island.

      Also, to enhance interactivity, we have created a menu that allows to play with the various parameters of the generation. This allows to create all sort of volcanic islands by adjusting a total of 17 different parameters that play in the generation process.

    - Validation

      <img src="images/terrain_generation_val.png" width=700>


  - Terrain texture generation

    - Implementation

    - Validation


  - Smoke particles coming out of the volcano

    - Implementation

    - Validation


4. Report the number of hours each team member has dedicated to the project (as recorded on Moodle). Comment on the accuracy of your initial time estimates. Critically reflect on your work plan and assess if you are on track.

	<table>
		<caption>Worked Hours</caption>
		<tr>
			<th></th>
			<th>Yoann Lafore</th>
			<th>Shimeng Ye</th>
			<th>Alberts Reisons</th>
		</tr>
		<tr>
			<td>Week 1</td>
			<td>8</td>
			<td></td>
			<td></td>
		</tr>
		<tr>
			<td>Week 2</td>
			<td>10</td>
			<td></td>
			<td></td>
		</tr>
		<tr>
			<td>Week 3</td>
			<td>10</td>
			<td></td>
			<td></td>
		</tr>
	</table>

## Schedule Update

1. Acknowledge any delays or unexpected issues, and motivate proposed changes to the schedule, if needed.

	We did not encountered any particular delay. \
  However, when digging further into the implementation of certain features we noticed a potential issue which is the following :
  We initially planed to apply a voronoi tesselation of the lava particles system in order to generate the mesh. However, after looking at further documentations, we realised that this was going a hard task to implement properly. And this is amplified by the fact that we need to apply other constraints to the tessalation in order to keep a consistent mesh of the lava flowing.
  Moreover, the implementation of this feature is necessary before starting working on the rendering of the lava.
  So, we believe that continuing on the voronoi tesselation will introduce too much delay to finish the project correctly.
  We then propose the following alternative:\
  \
  Instead of using voronoi tesselation to create the lava mesh we will render each particle individually. \
  In order to keep some realism, some randomness will be introduced in the generation of each lava particle. Regarding the rendering, it will still be physically based on the temperature of the particle combined with a procedural lava texture. \
  In order to compensate for the removing of the voronoi tesselation feature, we propose to implement the normal mapping feature (10 points) for the volcano and the water. This will allow to enhance the "rocky" look of the volcano as well as giving a more volumetric look to the water. \
  \
  To resume, we propose the following changes in the features:
  
  **Remove :**

  - Lava rendering (voronoï tesselation of particles flow, semi-physically based rendering)	(20 points)
   
  **Add :**

  - Lava rendering (individual particle, semi-physically based rendering) (10 points)
  - Normal mapping (for water and volcano) (10 points)




2. Present the work plan for the remaining time.

	<table>
		<caption>Updated Schedule</caption>
		<tr>
			<th></th>
			<th>Name 1</th>
			<th>Name 2</th>
			<th>Name 3</th>
		</tr>
		<tr>
			<td>Week 4</td>
			<td></td>
			<td></td>
			<td></td>
		</tr>
		<tr>
			<td>Week 5</td>
			<td></td>
			<td></td>
			<td></td>
		</tr>
		<tr>
			<td>Week 6</td>
			<td></td>
			<td></td>
			<td></td>
		</tr>
	</table>