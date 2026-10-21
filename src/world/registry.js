// Component registry: theme configs reference these by name. Add a new piece here + in your theme file.
// Zone components receive { inst, cfg, occupied, waiting, primary }; slot generators live in layout.js
// (ZONE_TYPES / HOME_TYPES) so sizes and capacities are known to the layout engine.
import { BeachTerrain, Ocean } from './Ground.jsx';
import { PalmGrove, TropicalPlants, Ferns, IceSpikes, SnowPines, CoralGarden, SeaRocks, JungleCanopy, Kelp } from './Vegetation.jsx';
import { HoloLab, HoloRing, TikiBar, ClamLounge, Dock, Campfire, Hammocks, Bungalow } from './Structures.jsx';
import { Igloo, Treehouse, TreeBridges, GlassDome, IceFloes, Penguins, Aurora, FishSchools, GodRays, Plankton, Waterfall } from './Themed.jsx';
import { Fireflies, Bubbles } from './Ambient.jsx';
import { HotTub, Trampoline, Volleyball, VineSwing, SnowFort, SeahorseRide, HarpStage, LavaPit } from './Fun.jsx';
import { Minka, SakuraTrees, Maples, Bamboo, KoiPond, ZenGarden, Pagoda, Petals, Fuji } from './Sakura.jsx';
import { Townhouse, CityBlocks, StreetProps, Skyline, CityGrid } from './City.jsx';
import { Shack, MainStreet, WestProps, Tumbleweeds, Buzzards, Mesas } from './West.jsx';
import { EXT } from './ext.js';
import { createElement } from 'react';
import { Gingerbread, CandyGarden, Sprinkles, IceCreamHills } from './Candy.jsx';
import { Shroom, GiantShrooms, Spores, ForestRim } from './Glade.jsx';
import { Geode, CrystalFields, GlowRiver, CaveDome, CaveMotes } from './Cave.jsx';
import { Crypt, Graveyard, FullMoon, Ghosts, Bats, Swamp, GroundFog } from './Haunted.jsx';
import { MoonPod, Gazebo, Cabin, MoonRocks, CloudRim, GoldTrees, HellRocks, MoonDust, Sparkles, HellEmbers, HeavenRays, Volcano } from './Realms.jsx';

export const TERRAIN = { BeachTerrain };
export const WATER = { Ocean };
export const VEGETATION = { PalmGrove, TropicalPlants, Ferns, IceSpikes, SnowPines, CoralGarden, SeaRocks, JungleCanopy, Kelp, IceFloes, Waterfall, MoonRocks, CloudRim, GoldTrees, HellRocks, SakuraTrees, Maples, Bamboo, KoiPond, ZenGarden, Pagoda, CityBlocks, StreetProps, MainStreet, WestProps, CandyGarden, GiantShrooms, CrystalFields, GlowRiver, Graveyard };
export const ZONES = { HoloLab, HoloRing, TikiBar, ClamLounge, Dock, Campfire, Hammocks, HotTub, Trampoline, Volleyball, VineSwing, SnowFort, SeahorseRide, HarpStage, LavaPit, Range };
function Range(props) { const C = EXT.fun['Range:' + (props.cfg?.style || '')] || EXT.fun['Range:']; return C ? createElement(C, props) : null; }
export const HOMES = { Bungalow, Igloo, Treehouse, GlassDome, MoonPod, Gazebo, Cabin, Minka, Townhouse, Shack, Gingerbread, Shroom, Geode, Crypt };
export const HOME_EXTRAS = { Treehouse: TreeBridges };
export const AMBIENT = { Fireflies, Bubbles, Aurora, Penguins, FishSchools, GodRays, Plankton, MoonDust, Sparkles, HellEmbers, HeavenRays, Volcano, Petals, Fuji, Skyline, CityGrid, Tumbleweeds, Buzzards, Mesas, Sprinkles, IceCreamHills, Spores, ForestRim, CaveDome, CaveMotes, FullMoon, Ghosts, Bats, GroundFog, Swamp };
