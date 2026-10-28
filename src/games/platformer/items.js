// PIXEL CHIC data (no logic). Rects are [x, y, w, h, colorKey?] on a 16x32 grid.
// Color keys: 'c1' = player-chosen color, 'c2' = item accent, or a palette name / '#hex'.
// Hair rects default to the hair color.

export const SKINS = [
  { name: 'PORCELAIN', c: '#fbe0c8' }, { name: 'FAIR', c: '#f0c39c' },
  { name: 'TAN', c: '#d99b6c' }, { name: 'BROWN', c: '#b97a4b' },
  { name: 'DEEP', c: '#8a5530' }, { name: 'EBONY', c: '#5c3620' },
];

export const EYE_COLORS = [
  { name: 'BROWN', c: 'brown' }, { name: 'BLUE', c: 'blue' }, { name: 'GREEN', c: 'green' },
  { name: 'VIOLET', c: 'violet' }, { name: 'GREY', c: 'grey' },
];

export const HAIR_COLORS = [
  { name: 'BLACK', c: 'black' }, { name: 'BROWN', c: 'brown' }, { name: 'BLONDE', c: '#e3b866' },
  { name: 'RED', c: 'red' }, { name: 'PINK', c: '#f28ab2' }, { name: 'BLUE', c: 'blue' },
  { name: 'VIOLET', c: 'violet' }, { name: 'WHITE', c: 'cream' },
];

export const CLOTH_COLORS = [
  'red', 'orange', 'yellow', 'green', 'teal', 'sky', 'blue', 'violet', 'cream', 'black', 'grey', 'maroon',
];

export const HAIR = [
  { id: 'bob', name: 'BOB', back: [[3, 3, 10, 9]], front: [[3, 2, 10, 3]] },
  { id: 'longStraight', name: 'LONG STRAIGHT', back: [[2, 3, 12, 17]],
    front: [[3, 2, 10, 3], [3, 5, 1, 10], [12, 5, 1, 10]] },
  { id: 'twinTails', name: 'TWIN TAILS', back: [],
    front: [[3, 2, 10, 3], [2, 5, 2, 9], [12, 5, 2, 9], [2, 5, 2, 1, 'red'], [12, 5, 2, 1, 'red']] },
  { id: 'afroPuffs', name: 'AFRO PUFFS', back: [], front: [[3, 2, 10, 3], [0, 0, 4, 5], [12, 0, 4, 5]] },
  { id: 'bun', name: 'TOP BUN', back: [], front: [[3, 2, 10, 3], [6, 0, 4, 3]] },
  { id: 'buzz', name: 'BUZZ CUT', back: [], front: [[4, 2, 8, 2]] },
  { id: 'curlyTop', name: 'CURLY TOP', back: [],
    front: [[3, 1, 10, 4], [4, 0, 8, 1], [3, 5, 1, 2], [12, 5, 1, 2]] },
  { id: 'afro', name: 'SHORT AFRO', back: [[1, 2, 14, 8]],
    front: [[1, 0, 14, 6], [2, 6, 2, 3], [12, 6, 2, 3]] },
];

// c1 = default color, c2 = accent color, collection = wardrobe group (used in later phases)
export const SLOT_ITEMS = {
  top: [
    { id: 'tee', name: 'TEE', collection: 'BASICS', c1: 'sky', c2: 'cream',
      rects: [[5, 13, 6, 9, 'c1'], [3, 13, 2, 3, 'c1'], [11, 13, 2, 3, 'c1']] },
    { id: 'hoodie', name: 'HOODIE', collection: 'STREETWEAR', c1: 'teal', c2: 'grey',
      rects: [[5, 13, 6, 9, 'c1'], [3, 13, 2, 8, 'c1'], [11, 13, 2, 8, 'c1'], [6, 13, 4, 2, 'c2'], [6, 18, 4, 2, 'c2']] },
    { id: 'sweater', name: 'SWEATER', collection: 'COZY', c1: 'orange', c2: 'cream',
      rects: [[5, 13, 6, 9, 'c1'], [3, 13, 2, 8, 'c1'], [11, 13, 2, 8, 'c1'], [5, 17, 6, 1, 'c2'], [3, 17, 2, 1, 'c2'], [11, 17, 2, 1, 'c2']] },
    { id: 'blouse', name: 'BLOUSE', collection: 'OLD MONEY', c1: 'cream', c2: 'maroon',
      rects: [[5, 13, 6, 9, 'c1'], [3, 13, 2, 5, 'c1'], [11, 13, 2, 5, 'c1'], [7, 13, 2, 3, 'c2'], [7, 16, 2, 1, 'c2']] },
  ],
  bottom: [
    { id: 'jeans', name: 'JEANS', collection: 'BASICS', c1: 'blue', c2: 'cream',
      rects: [[5, 22, 3, 8, 'c1'], [8, 22, 3, 8, 'c1'], [5, 22, 6, 1, 'c2']] },
    { id: 'shorts', name: 'SHORTS', collection: 'BASICS', c1: 'green', c2: 'grey',
      rects: [[5, 22, 6, 4, 'c1'], [5, 22, 6, 1, 'c2']] },
    { id: 'skirt', name: 'SKIRT', collection: 'COQUETTE', c1: 'maroon', c2: 'cream',
      rects: [[4, 22, 8, 5, 'c1'], [4, 26, 8, 1, 'c2']] },
    { id: 'cargo', name: 'CARGO PANTS', collection: 'STREETWEAR', c1: 'grey', c2: 'black',
      rects: [[5, 22, 3, 8, 'c1'], [8, 22, 3, 8, 'c1'], [5, 25, 1, 2, 'c2'], [10, 25, 1, 2, 'c2']] },
  ],
  dress: [
    { id: 'sundress', name: 'SUNDRESS', collection: 'COQUETTE', c1: 'cream', c2: 'red',
      rects: [[5, 13, 6, 5, 'c1'], [4, 18, 8, 10, 'c1'], [5, 13, 1, 2, 'c2'], [10, 13, 1, 2, 'c2'], [4, 27, 8, 1, 'c2']] },
    { id: 'gown', name: 'BALL GOWN', collection: 'GLAMOUR', c1: 'violet', c2: 'yellow',
      rects: [[5, 13, 6, 6, 'c1'], [3, 19, 10, 11, 'c1'], [5, 13, 6, 1, 'c2'], [3, 29, 10, 1, 'c2']] },
  ],
  outer: [
    { id: 'jacket', name: 'JACKET', collection: 'STREETWEAR', c1: 'black', c2: 'grey',
      rects: [[3, 13, 2, 9, 'c1'], [11, 13, 2, 9, 'c1'], [5, 13, 2, 9, 'c1'], [9, 13, 2, 9, 'c1'], [5, 21, 6, 1, 'c2']] },
    { id: 'cardigan', name: 'CARDIGAN', collection: 'DARK ACADEMIA', c1: 'maroon', c2: 'yellow',
      rects: [[3, 13, 2, 8, 'c1'], [11, 13, 2, 8, 'c1'], [5, 13, 2, 9, 'c1'], [9, 13, 2, 9, 'c1'], [7, 14, 1, 1, 'c2'], [7, 17, 1, 1, 'c2']] },
  ],
  shoes: [
    { id: 'sneakers', name: 'SNEAKERS', collection: 'BASICS', c1: 'cream', c2: 'grey',
      rects: [[5, 29, 3, 3, 'c1'], [8, 29, 3, 3, 'c1'], [5, 31, 3, 1, 'c2'], [8, 31, 3, 1, 'c2']] },
    { id: 'boots', name: 'BOOTS', collection: 'GOTHIC', c1: 'black', c2: 'grey',
      rects: [[5, 26, 3, 6, 'c1'], [8, 26, 3, 6, 'c1'], [5, 31, 3, 1, 'c2'], [8, 31, 3, 1, 'c2']] },
    { id: 'maryjanes', name: 'MARY JANES', collection: 'COQUETTE', c1: 'red', c2: 'cream',
      rects: [[5, 30, 3, 2, 'c1'], [8, 30, 3, 2, 'c1'], [5, 29, 3, 1, 'c2'], [8, 29, 3, 1, 'c2']] },
  ],
  acc: [
    { id: 'bow', name: 'HAIR BOW', collection: 'COQUETTE', c1: 'red', c2: 'maroon',
      rects: [[9, 1, 4, 3, 'c1'], [10, 2, 2, 1, 'c2']] },
    { id: 'glasses', name: 'GLASSES', collection: 'BASICS', c1: 'black', c2: 'grey',
      rects: [[4, 6, 4, 1, 'c1'], [4, 9, 4, 1, 'c1'], [4, 6, 1, 4, 'c1'], [7, 6, 1, 4, 'c1'],
        [8, 6, 4, 1, 'c1'], [8, 9, 4, 1, 'c1'], [8, 6, 1, 4, 'c1'], [11, 6, 1, 4, 'c1']] },
    { id: 'scarf', name: 'SCARF', collection: 'COZY', c1: 'red', c2: 'cream',
      rects: [[5, 12, 6, 2, 'c1'], [5, 14, 2, 4, 'c1'], [5, 16, 2, 1, 'c2']] },
    { id: 'crown', name: 'CROWN', collection: 'GLAMOUR', c1: 'yellow', c2: 'orange',
      rects: [[5, 1, 6, 2, 'c1'], [5, 0, 1, 1, 'c1'], [7, 0, 2, 1, 'c1'], [10, 0, 1, 1, 'c1'], [5, 2, 6, 1, 'c2']] },
  ],
};

export const PRESETS = [
  { name: 'COZY AUTUMN', items: { top: ['sweater', 'orange'], bottom: ['jeans', 'blue'], outer: ['cardigan', 'maroon'], shoes: ['boots', 'black'], acc: ['scarf', 'red'] } },
  { name: 'STREET STAR', items: { top: ['hoodie', 'violet'], bottom: ['cargo', 'grey'], outer: ['jacket', 'black'], shoes: ['sneakers', 'cream'] } },
  { name: 'SWEET DATE', items: { dress: ['sundress', 'cream'], shoes: ['maryjanes', 'red'], acc: ['bow', 'red'] } },
  { name: 'GLAM NIGHT', items: { dress: ['gown', 'violet'], shoes: ['maryjanes', 'black'], acc: ['crown', 'yellow'] } },
];

export const DEFAULT_LOOKS = {
  girl: {
    skin: 2, eyes: 0, hair: 'longStraight', hairColor: 1,
    top: { id: 'blouse', c: 'cream' }, bottom: { id: 'skirt', c: 'maroon' }, dress: null, outer: null,
    shoes: { id: 'sneakers', c: 'sky' }, acc: { id: 'bow', c: 'red' },
  },
  boy: {
    skin: 3, eyes: 0, hair: 'curlyTop', hairColor: 0,
    top: { id: 'hoodie', c: 'teal' }, bottom: { id: 'jeans', c: 'blue' }, dress: null, outer: null,
    shoes: { id: 'sneakers', c: 'cream' }, acc: null,
  },
};
