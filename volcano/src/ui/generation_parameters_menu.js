import {
  TerrainParameters,
  VolcanoParameters,
  IslandParameters,
  GenerationParameters,
} from "../noise/generation_parameters.js";

export function link_generation_parameters_menu(init_parameters, callback) {
  function setFieldsToValues(parameters) {
    document.getElementById("side_resolution").value =
      parameters.terrain.side_resolution;
    document.getElementById("terrain_width").value =
      parameters.terrain.m_terrain_width;
    document.getElementById("terrain_length").value =
      parameters.terrain.m_terrain_length;
    document.getElementById("water_tex_scale").value =
      parameters.terrain.water_tex_scale;
    document.getElementById("volcano_radius").value =
      parameters.volcano.m_volcano_radius;
    document.getElementById("volcano_max_height").value =
      parameters.volcano.m_volcano_max_height;
    document.getElementById("crater_radius").value =
      parameters.volcano.m_crater_radius;
    document.getElementById("crater_height").value =
      parameters.volcano.m_crater_height;
    document.getElementById("volcano_center_x").value =
      parameters.volcano.m_volcano_center[0];
    document.getElementById("volcano_center_y").value =
      parameters.volcano.m_volcano_center[1];
    document.getElementById("volcano_noise_freq").value =
      parameters.volcano.volcano_noise_freq;
    document.getElementById("volcano_transition_factor").value =
      parameters.volcano.volcano_transition_factor;
    document.getElementById("volcano_noise_prop").value =
      parameters.volcano.volcano_noise_prop;
    document.getElementById("volcano_noise_offset_x").value =
      parameters.volcano.volcano_noise_offset[0];
    document.getElementById("volcano_noise_offset_y").value =
      parameters.volcano.volcano_noise_offset[1];
    document.getElementById("island_radius").value =
      parameters.island.m_island_radius;
    document.getElementById("island_height").value =
      parameters.island.m_island_height;
    document.getElementById("island_prop_flat").value =
      parameters.island.island_prop_flat;
    document.getElementById("island_noise_freq").value =
      parameters.island.island_noise_freq;
    document.getElementById("island_transition_factor").value =
      parameters.island.island_transition_factor;
    document.getElementById("island_noise_offset_x").value =
      parameters.island.island_noise_offset[0];
    document.getElementById("island_noise_offset_y").value =
      parameters.island.island_noise_offset[1];
  }

  setFieldsToValues(init_parameters);
  const setDefaultButton = document.getElementById("set_default_button");
  setDefaultButton.addEventListener("click", () => {
    setFieldsToValues(init_parameters);
    callback(init_parameters);
  });

  const applyButton = document.getElementById("apply_generation_button");

  applyButton.addEventListener("click", () => {
    const generationParametersRaw = {
      side_resolution: parseInt(
        document.getElementById("side_resolution").value
      ),
      terrainWidth: parseInt(document.getElementById("terrain_width").value),
      terrainLength: parseInt(document.getElementById("terrain_length").value),
      
      water_tex_scale: parseFloat(document.getElementById("water_tex_scale").value),

      volcanoRadius: parseFloat(
        document.getElementById("volcano_radius").value
      ),
      volcanoMaxHeight: parseFloat(
        document.getElementById("volcano_max_height").value
      ),
      craterRadius: parseFloat(document.getElementById("crater_radius").value),
      craterHeight: parseFloat(document.getElementById("crater_height").value),
      volcanoCenterX: parseFloat(
        document.getElementById("volcano_center_x").value
      ),
      volcanoCenterY: parseFloat(
        document.getElementById("volcano_center_y").value
      ),
      volcanoNoiseFreq: parseFloat(
        document.getElementById("volcano_noise_freq").value
      ),
      volcanoTransitionFactor: parseFloat(
        document.getElementById("volcano_transition_factor").value
      ),
      volcanoNoiseProp: parseFloat(
        document.getElementById("volcano_noise_prop").value
      ),
      volcanoNoiseOffsetX: parseFloat(
        document.getElementById("volcano_noise_offset_x").value
      ),
      volcanoNoiseOffsetY: parseFloat(
        document.getElementById("volcano_noise_offset_y").value
      ),
      islandRadius: parseFloat(document.getElementById("island_radius").value),
      islandHeight: parseFloat(document.getElementById("island_height").value),
      islandPropFlat: parseFloat(
        document.getElementById("island_prop_flat").value
      ),
      islandNoiseFreq: parseFloat(
        document.getElementById("island_noise_freq").value
      ),
      islandTransitionFactor: parseFloat(
        document.getElementById("island_transition_factor").value
      ),
      islandNoiseOffsetX: parseFloat(
        document.getElementById("island_noise_offset_x").value
      ),
      islandNoiseOffsetY: parseFloat(
        document.getElementById("island_noise_offset_y").value
      ),
    };

    const terrainParams = new TerrainParameters();
    terrainParams.side_resolution = generationParametersRaw.side_resolution;
    terrainParams.m_terrain_width = generationParametersRaw.terrainWidth;
    terrainParams.m_terrain_length = generationParametersRaw.terrainLength;
    terrainParams.water_tex_scale = generationParametersRaw.water_tex_scale;

    const volcanoParams = new VolcanoParameters();
    volcanoParams.m_crater_radius = generationParametersRaw.craterRadius;
    volcanoParams.m_crater_height = generationParametersRaw.craterHeight;
    volcanoParams.m_volcano_max_height =
      generationParametersRaw.volcanoMaxHeight;
    volcanoParams.m_volcano_center = [
      generationParametersRaw.volcanoCenterX,
      generationParametersRaw.volcanoCenterY,
    ];
    volcanoParams.m_volcano_radius = generationParametersRaw.volcanoRadius;
    volcanoParams.volcano_noise_freq = generationParametersRaw.volcanoNoiseFreq;
    volcanoParams.volcano_transition_factor =
      generationParametersRaw.volcanoTransitionFactor;
    volcanoParams.volcano_noise_prop = generationParametersRaw.volcanoNoiseProp;
    volcanoParams.volcano_noise_offset = [
      generationParametersRaw.volcanoNoiseOffsetX,
      generationParametersRaw.volcanoNoiseOffsetY,
    ];

    const islandParams = new IslandParameters();
    islandParams.m_island_radius = generationParametersRaw.islandRadius;
    islandParams.m_island_height = generationParametersRaw.islandHeight;
    islandParams.island_prop_flat = generationParametersRaw.islandPropFlat;
    islandParams.island_noise_freq = generationParametersRaw.islandNoiseFreq;
    islandParams.island_transition_factor =
      generationParametersRaw.islandTransitionFactor;
    islandParams.island_noise_offset = [
      generationParametersRaw.islandNoiseOffsetX,
      generationParametersRaw.islandNoiseOffsetY,
    ];

    const generationParameters = new GenerationParameters();
    generationParameters.terrain = terrainParams;
    generationParameters.volcano = volcanoParams;
    generationParameters.island = islandParams;

    // Call the callback function with the generation parameters
    callback(generationParameters);
  });
}
