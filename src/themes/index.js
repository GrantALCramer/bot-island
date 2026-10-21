import tropical from './tropical.js';
import antarctica from './antarctica.js';
import atlantis from './atlantis.js';
import jungle from './jungle.js';
import moon from './moon.js';
import heaven from './heaven.js';
import hell from './hell.js';
import sakura from './sakura.js';
import city from './city.js';
import west from './west.js';
import candy from './candy.js';
import glade from './glade.js';
import cave from './cave.js';
import haunted from './haunted.js';

export const THEMES = { tropical, antarctica, atlantis, jungle, moon, heaven, hell, sakura, city, west, candy, glade, cave, haunted };
export const THEME_LIST = Object.values(THEMES);
export const getTheme = (id) => THEMES[id] || tropical;
