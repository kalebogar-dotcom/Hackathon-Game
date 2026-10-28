// PIXEL CHIC data. Local grid is 24 wide x 32 tall. Shapes: [x, y, w, h, colorKey]
// or ['o', cx, cy, rx, ry, colorKey] for a rounded ellipse.
// Keys: c1 (chosen color), c1d (darker), c1l (lighter), c2 (accent), c2d, h/hd/hl (hair, dark, light),
// s/sd (skin, dark), or any palette name / '#hex'.

export const SKINS = [
  { name: 'PORCELAIN', c: '#fbe0c8' }, { name: 'FAIR', c: '#f0c39c' },
  { name: 'TAN', c: '#d99b6c' }, { name: 'BROWN', c: '#b97a4b' },
  { name: 'DEEP', c: '#8a5530' }, { name: 'EBONY', c: '#5c3620' },
];

export const EYE_COLORS = [
  { name: 'BROWN', c: 'brown' }, { name: 'BLUE', c: 'blue' }, { name: 'GREEN', c: 'green' },
  { name: 'VIOLET', c: 'violet' }, { name: 'GREY', c: 'grey' }, { name: 'BLACK', c: 'black' },
];

export const HAIR_COLORS = [
  { name: 'BLACK', c: 'black' }, { name: 'BROWN', c: 'brown' }, { name: 'BLONDE', c: '#e3b866' },
  { name: 'RED', c: 'red' }, { name: 'PINK', c: '#f28ab2' }, { name: 'BLUE', c: 'blue' },
  { name: 'VIOLET', c: 'violet' }, { name: 'WHITE', c: 'cream' },
];

export const CLOTH_COLORS = [
  'red', 'orange', 'yellow', 'green', 'teal', 'sky', 'blue', 'violet', 'cream', 'black', 'grey', 'maroon',
];

const FR = [[7, 1, 10, 1], [6, 2, 12, 2], [5, 4, 14, 1], [8, 2, 3, 1, 'hl'], [9, 1, 2, 1, 'hl']];

export const HAIR = [
  { id: 'bob', name: 'BOB', back: [['o', 12, 8, 9, 7]],
    front: [...FR, [5, 5, 2, 6], [17, 5, 2, 6], [5, 10, 2, 1, 'hd'], [17, 10, 2, 1, 'hd']] },
  { id: 'longStraight', name: 'LONG STRAIGHT', back: [['o', 12, 6, 9, 5], [4, 6, 16, 17]],
    front: [...FR, [5, 5, 2, 12], [17, 5, 2, 12], [5, 16, 2, 1, 'hd'], [17, 16, 2, 1, 'hd']] },
  { id: 'twinTails', name: 'TWIN TAILS', back: [['o', 3.5, 11.5, 2.5, 5.5], ['o', 20.5, 11.5, 2.5, 5.5]],
    front: [...FR, [5, 5, 2, 3], [17, 5, 2, 3], [2, 6, 3, 1, 'red'], [19, 6, 3, 1, 'red']] },
  { id: 'afroPuffs', name: 'AFRO PUFFS', back: [['o', 3.5, 4.5, 3.5, 3.5], ['o', 20.5, 4.5, 3.5, 3.5]],
    front: [...FR, [5, 5, 1, 3], [18, 5, 1, 3], [2, 3, 1, 1, 'hl'], [21, 3, 1, 1, 'hl'], [3, 5, 1, 1, 'hl'], [20, 5, 1, 1, 'hl']] },
  { id: 'bun', name: 'TOP BUN', back: [],
    front: [...FR, ['o', 12, 2, 3.5, 2.5], [10, 1, 2, 1, 'hl'], [5, 5, 1, 3], [18, 5, 1, 3]] },
  { id: 'buzz', name: 'BUZZ CUT', back: [],
    front: [[7, 2, 10, 1], [6, 3, 12, 1], [5, 4, 14, 1], [5, 5, 1, 3], [18, 5, 1, 3], [8, 2, 3, 1, 'hl']] },
  { id: 'curlyTop', name: 'CURLY TOP', back: [],
    front: [['o', 12, 3, 7.5, 3], [5, 4, 14, 1], [5, 5, 1, 3, 'hd'], [18, 5, 1, 3, 'hd'],
      [8, 1, 1, 1, 'hl'], [12, 0, 1, 1, 'hl'], [15, 1, 1, 1, 'hl'], [10, 2, 1, 1, 'hl'], [14, 3, 1, 1, 'hl']] },
  { id: 'afro', name: 'SHORT AFRO', back: [['o', 12, 7, 10, 7.5]],
    front: [[6, 0, 12, 1], [5, 1, 14, 4], [5, 5, 1, 4, 'hd'], [18, 5, 1, 4, 'hd'],
      [8, 1, 2, 1, 'hl'], [14, 2, 1, 1, 'hl'], [3, 5, 1, 1, 'hl'], [20, 6, 1, 1, 'hl'], [11, 0, 2, 1, 'hl']] },
];

export const SLOT_ITEMS = {
  top: [
    { id: 'tee', name: 'TEE', collection: 'BASICS', c1: 'sky', c2: 'cream',
      rects: [[8, 14, 8, 8, 'c1'], [6, 14, 2, 3, 'c1'], [16, 14, 2, 3, 'c1'], [8, 20, 8, 2, 'c1d'], [10, 14, 4, 1, 'c2']] },
    { id: 'hoodie', name: 'HOODIE', collection: 'STREETWEAR', c1: 'teal', c2: 'grey',
      rects: [[8, 14, 8, 8, 'c1'], [6, 14, 2, 7, 'c1'], [16, 14, 2, 7, 'c1'], [9, 13, 6, 2, 'c2'], [10, 18, 4, 2, 'c1d'],
        [10, 15, 1, 3, 'c2'], [13, 15, 1, 3, 'c2'], [6, 20, 2, 1, 'c2'], [16, 20, 2, 1, 'c2']] },
    { id: 'sweater', name: 'SWEATER', collection: 'COZY', c1: 'orange', c2: 'cream',
      rects: [[8, 14, 8, 8, 'c1'], [6, 14, 2, 7, 'c1'], [16, 14, 2, 7, 'c1'], [8, 20, 8, 2, 'c2'],
        [6, 20, 2, 1, 'c2'], [16, 20, 2, 1, 'c2'], [9, 14, 6, 1, 'c2']] },
    { id: 'blouse', name: 'BLOUSE', collection: 'OLD MONEY', c1: 'cream', c2: 'maroon',
      rects: [[8, 14, 8, 8, 'c1'], [6, 14, 2, 5, 'c1'], [16, 14, 2, 5, 'c1'], [11, 14, 2, 2, 'c2'],
        [10, 15, 1, 1, 'c2'], [13, 15, 1, 1, 'c2'], [8, 20, 8, 1, 'c1d']] },
  ],
  bottom: [
    { id: 'jeans', name: 'JEANS', collection: 'BASICS', c1: 'blue', c2: 'cream',
      rects: [[9, 22, 3, 8, 'c1'], [12, 22, 3, 8, 'c1'], [9, 22, 6, 1, 'c2'], [12, 23, 1, 7, 'c1d']] },
    { id: 'shorts', name: 'SHORTS', collection: 'BASICS', c1: 'green', c2: 'grey',
      rects: [[9, 22, 6, 4, 'c1'], [9, 22, 6, 1, 'c2'], [12, 23, 1, 3, 'c1d']] },
    { id: 'skirt', name: 'SKIRT', collection: 'COQUETTE', c1: 'maroon', c2: 'cream',
      rects: [[8, 22, 8, 1, 'c2'], [7, 23, 10, 2, 'c1'], [6, 25, 12, 2, 'c1'], [6, 26, 12, 1, 'c1d'], [6, 27, 12, 1, 'c2']] },
    { id: 'cargo', name: 'CARGO PANTS', collection: 'STREETWEAR', c1: 'grey', c2: 'black',
      rects: [[9, 22, 3, 8, 'c1'], [12, 22, 3, 8, 'c1'], [9, 22, 6, 1, 'c2'], [9, 25, 2, 2, 'c1d'], [13, 25, 2, 2, 'c1d'], [12, 23, 1, 7, 'c1d']] },
  ],
  dress: [
    { id: 'sundress', name: 'SUNDRESS', collection: 'COQUETTE', c1: 'cream', c2: 'red',
      rects: [[8, 15, 8, 4, 'c1'], [9, 14, 1, 1, 'c2'], [14, 14, 1, 1, 'c2'], [8, 18, 8, 1, 'c2'],
        [7, 19, 10, 4, 'c1'], [6, 23, 12, 5, 'c1'], [7, 22, 10, 1, 'c1d'], [6, 27, 12, 1, 'c2']] },
    { id: 'gown', name: 'BALL GOWN', collection: 'GLAMOUR', c1: 'violet', c2: 'yellow',
      rects: [[8, 14, 8, 6, 'c1'], [6, 14, 2, 2, 'c1'], [16, 14, 2, 2, 'c1'], [9, 14, 6, 1, 'c2'], [8, 19, 8, 1, 'c2'],
        [7, 20, 10, 3, 'c1'], [5, 23, 14, 4, 'c1'], [4, 27, 16, 3, 'c1'], [4, 29, 16, 1, 'c2']] },
  ],
  outer: [
    { id: 'jacket', name: 'JACKET', collection: 'STREETWEAR', c1: 'black', c2: 'grey',
      rects: [[6, 14, 2, 7, 'c1'], [16, 14, 2, 7, 'c1'], [8, 14, 2, 8, 'c1'], [14, 14, 2, 8, 'c1'],
        [8, 14, 1, 1, 'c2'], [15, 14, 1, 1, 'c2'], [6, 20, 2, 1, 'c2'], [16, 20, 2, 1, 'c2'], [8, 21, 2, 1, 'c2'], [14, 21, 2, 1, 'c2']] },
    { id: 'cardigan', name: 'CARDIGAN', collection: 'DARK ACADEMIA', c1: 'maroon', c2: 'yellow',
      rects: [[6, 14, 2, 7, 'c1'], [16, 14, 2, 7, 'c1'], [8, 14, 2, 8, 'c1'], [14, 14, 2, 8, 'c1'],
        [9, 16, 1, 1, 'c2'], [9, 18, 1, 1, 'c2'], [9, 20, 1, 1, 'c2'], [6, 20, 2, 1, 'c2'], [16, 20, 2, 1, 'c2']] },
  ],
  shoes: [
    { id: 'sneakers', name: 'SNEAKERS', collection: 'BASICS', c1: 'cream', c2: 'grey',
      rects: [[8, 29, 4, 3, 'c1'], [12, 29, 4, 3, 'c1'], [8, 31, 4, 1, 'c2'], [12, 31, 4, 1, 'c2']] },
    { id: 'boots', name: 'BOOTS', collection: 'GOTHIC', c1: 'black', c2: 'grey',
      rects: [[8, 26, 4, 6, 'c1'], [12, 26, 4, 6, 'c1'], [8, 26, 4, 1, 'c2'], [12, 26, 4, 1, 'c2'], [8, 31, 4, 1, 'c2'], [12, 31, 4, 1, 'c2']] },
    { id: 'maryjanes', name: 'MARY JANES', collection: 'COQUETTE', c1: 'red', c2: 'cream',
      rects: [[8, 30, 4, 2, 'c1'], [12, 30, 4, 2, 'c1'], [8, 29, 4, 1, 'c2'], [12, 29, 4, 1, 'c2']] },
  ],
  acc: [
    { id: 'bow', name: 'HAIR BOW', collection: 'COQUETTE', c1: 'red', c2: 'maroon',
      rects: [[15, 2, 4, 3, 'c1'], [16, 3, 2, 1, 'c2']] },
    { id: 'glasses', name: 'GLASSES', collection: 'BASICS', c1: 'black', c2: 'grey',
      rects: [[6, 6, 5, 1, 'c1'], [6, 10, 5, 1, 'c1'], [6, 6, 1, 5, 'c1'], [10, 6, 1, 5, 'c1'],
        [13, 6, 5, 1, 'c1'], [13, 10, 5, 1, 'c1'], [13, 6, 1, 5, 'c1'], [17, 6, 1, 5, 'c1'], [11, 8, 2, 1, 'c1']] },
    { id: 'scarf', name: 'SCARF', collection: 'COZY', c1: 'red', c2: 'cream',
      rects: [[8, 13, 8, 2, 'c1'], [8, 14, 8, 1, 'c1d'], [9, 15, 2, 5, 'c1'], [9, 17, 2, 1, 'c2']] },
    { id: 'crown', name: 'CROWN', collection: 'GLAMOUR', c1: 'yellow', c2: 'orange',
      rects: [[8, 1, 8, 2, 'c1'], [8, 0, 1, 1, 'c1'], [11, 0, 2, 1, 'c1'], [15, 0, 1, 1, 'c1'], [11, 2, 2, 1, 'c2']] },
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
