// EMBER TALE text. Lines are shown one at a time in the dialogue box (max ~74 characters).
export const DIALOGUE = {
  intro: [
    'WREN: AH, A TRAVELER! YOU MUST BE EMBER.',
    'WREN: A CELLAR SLIME CRAWLED UP THE OLD WELL...',
    'WREN: ...AND GULPED DOWN ALL MY LANTERN OIL!',
    'WREN: PLEASE DRIVE IT OFF BEFORE NIGHTFALL.',
  ],
  waiting: ['WREN: THE SLIME IS BY THE WELL. TAKE CARE!'],
  slimeAppears: ['SOMETHING GURGLES NEAR THE WELL...'],
  thanks: [
    'WREN: YOU DID IT! THE SLIME SPAT OUT MY OIL.',
    'WREN: THE LANTERN BURNS BRIGHT AGAIN. THANK YOU, EMBER!',
  ],
};

export const QUEST_TEXT = {
  talk: 'QUEST: TALK TO WREN',
  hunt: 'QUEST: DRIVE OFF THE SLIME BY THE WELL',
  report: 'QUEST: RETURN TO WREN',
  done: 'QUEST COMPLETE!',
};

export const BATTLE_TEXT = {
  start: 'A CELLAR SLIME OOZES INTO VIEW!',
  prompt: 'WHAT WILL EMBER DO?',
  attack: dmg => `EMBER SWINGS THE TORCH! ${dmg} DAMAGE.`,
  heal: amount => `EMBER EATS A HERB. +${amount} HP.`,
  noHerbs: 'NO HERBS LEFT!',
  enemy: dmg => `THE SLIME SPLASHES EMBER! ${dmg} DAMAGE.`,
  won: 'THE SLIME SHRINKS AND SLIPS AWAY!',
  lost: 'EMBER IS OVERWHELMED...',
};
