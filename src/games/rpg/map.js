// EMBER TALE room data. 16px tiles, 20×10 tiles drawn below a 20px quest strip.
// '#' wall, '.' floor, ',' rug, 'b' barrel, 't' table, 'w' old well, 'D' door,
// 'N' Wren the lantern keeper, 'P' player start, 'S' where the slime appears.
export const TILE = 16;
export const TOP = 20;

export const ROOM = [
  '####################',
  '#..b............ww.#',
  '#...............ww.#',
  '#..t......N........#',
  '#..t............S..#',
  '#.......,,,,.......#',
  '#.......,P,,.......#',
  '#..b....,,,,....b..#',
  '#..................#',
  '#########DD#########',
];

export const SOLID = new Set(['#', 'b', 't', 'w', 'D']);
