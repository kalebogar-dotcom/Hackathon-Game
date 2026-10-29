// Text for the "Protect the Creek" mission. These lines teach real ecology (checked against U.S. EPA Trash Free
// Waters pages, see README); they are labeled REAL-WORLD FACT in the game to set them apart from the zombie fiction.
// Keep lines under ~74 characters so they fit the 320-pixel screen.
export const MISSION_TEXT = Object.freeze({
  title: 'PROTECT THE CREEK',
  factLabel: 'REAL-WORLD FACT',
  ranger: [
    'RAIN CAN WASH LITTER FROM THE CLEARING INTO THE CREEK.',
    'REMOVE IT BEFORE IT REACHES THE WATER.',
  ],
  explain: [
    'REMOVING LITTER HELPS PROTECT STREAM HABITATS.',
    'PREVENTING NEW LITTER KEEPS THE PROBLEM FROM RETURNING.',
  ],
  question: 'HOW CAN WE HELP KEEP NEW LITTER OUT OF THE CREEK?',
  options: Object.freeze({
    A: 'MOVE THE LITTER PILE FARTHER UPSTREAM.',
    B: 'SECURE THE LITTER IN A COVERED COLLECTION BIN AWAY FROM THE CREEK.',
    C: 'PUSH THE LITTER INTO THE WATER.',
  }),
  feedback: Object.freeze({
    A: 'NOT QUITE. LITTER UPSTREAM CAN STILL WASH INTO THE CREEK WHEN IT RAINS. TRY AGAIN.',
    B: 'CORRECT! A COVERED BIN AWAY FROM THE WATER KEEPS RAIN AND WIND FROM CARRYING LITTER INTO THE CREEK.',
    C: 'NO. LITTER IN THE WATER CAN HARM FISH AND OTHER STREAM LIFE, AND IT DRIFTS DOWNSTREAM. TRY AGAIN.',
  }),
  skip: 'N  SKIP MISSION / START NEXT WAVE',
});
