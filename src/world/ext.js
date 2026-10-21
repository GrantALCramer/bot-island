// Extension registries so theme packs (City, Old West, Candy, Glade...) can add styles to the shared zone
// components without growing Structures.jsx / Fun.jsx. Each entry is keyed by cfg.style.
//   lab[style]   -> component({ hc })                       HoloLab base (screens/core stay shared)
//   ring[style]  -> component({ hc, primary })              HoloRing decor (replaces the base disc)
//   bar[style]   -> () => ({ bar, stool })  barExtra[style] -> component({ X, primary })   social bar
//   dock[style]  -> component({ from, to })                 extra dock decor; vessel[style] -> component({ mid, to })
//   dockGeo[style] -> (from, to) => geometry   replaces the plank deck (e.g. City train platform)
//   plaza[style] -> component({ gs, count })                plaza centerpiece (gs = grow ref for the bench ring)
//   post[style]  -> component({ x, y, z, h })               hammock posts; hamCol[style] = 4 stripe colors
//   torch[style] -> component({ position, light, h, seed })
//   ride[style]  -> { pole(), disc(), riders() -> [geo x4], rod: bool }   SeahorseRide kit (orbit logic stays shared)
//   fun[type:style] -> component({ inst, cfg, occupied, count })  activity structures
export const EXT = { lab: {}, ring: {}, bar: {}, barExtra: {}, dock: {}, dockGeo: {}, vessel: {}, plaza: {}, post: {}, hamCol: {}, torch: {}, fun: {}, holo: {}, ride: {} };
