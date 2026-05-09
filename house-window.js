/* =============================================================================
 *  house-window.js  —  v3.20.1 Stage 5
 *
 *  Render glue for house.html. Reads the live state from chrome.storage,
 *  asks window.House for the current rap sheet, and paints it into the
 *  page. If the land bridge has been built the standard view is replaced
 *  by the denial paragraph.
 *
 *  This file NEVER writes state. Opening the house window is strictly a
 *  read operation on the save.
 * ============================================================================= */

(function () {
  'use strict';

  var STATE_KEY = 'pixelFocusState';
  var state = null;

  function $(id) { return document.getElementById(id); }

  // -------------------------------------------------------------------------
  // Flavour: header eyebrow and mood sentence. Both are derived from the
  // current chapter so the copy shifts subtly as the factory grows.
  // -------------------------------------------------------------------------
  var EYEBROWS = {
    prologue: 'THE HOUSE \u00B7 FIRST MORNING',
    early:    'THE HOUSE \u00B7 MORNING',
    mid:      'THE HOUSE \u00B7 LATE MORNING',
    'late-mid':'THE HOUSE \u00B7 AFTERNOON',
    late:     'THE HOUSE \u00B7 EARLY EVENING',
    denied:   'THE HOUSE \u00B7 UNREACHABLE'
  };

  // -------------------------------------------------------------------------
  // Rotating prose — twenty short italic notes each, for the three rap-sheet
  // rows (SPOUSE, CHILDREN, PETS). The window picks a stable starting index
  // at boot time, so each time the player opens the house they see a
  // different trio of observations, but those three stay put for the rest
  // of the session (every re-render during the same open uses the same
  // index). Offsets are added per row so the three selections are never
  // coincidentally identical.
  //
  // All of these are meant to read as the kind of small, warm, slightly
  // indirect observation one might make about a room one is not currently
  // standing in. None of them are vital signs or medical. The vital signs
  // panel below the rap sheet handles the clinical reading.
  // -------------------------------------------------------------------------
  var SPOUSE_NOTES = [
    'Reading at the kitchen table.',
    'Making coffee.',
    'On the phone with their mother.',
    'Folding laundry on the bed.',
    'Watching the news in the living room.',
    'Loading the dishwasher.',
    'Replying to emails at the desk.',
    'Packing a lunch.',
    'Taking out the trash.',
    'Watering the houseplants.',
    'Making a grocery list.',
    'Paying bills.',
    'Putting on a jacket by the front door.',
    'Brushing their teeth.',
    'Reading a book on the couch.',
    'Changing the sheets.',
    'Sweeping the kitchen floor.',
    'Taking a shower.',
    'Eating toast at the counter.',
    'Looking through the mail.',
    'Standing at the window with a cup of tea.',
    'Moving a plant to a sunnier spot.',
    'Sweeping something invisible off the rug.',
    'Rearranging the bookshelf alphabetically.',
    'Writing a to-do list on the back of a receipt.',
    'Fixing a drawer that has never quite closed.',
    'Wiping down the kitchen counters, twice.',
    'Pairing socks on the edge of the bed.',
    'Listening to the radio at a low volume.',
    'Looking for the good scissors.',
    'Writing a long note and then not leaving it.',
    'Ironing one shirt with great care.',
    'Opening and closing the fridge without taking anything.',
    'Standing in the doorway for a moment too long.',
    'Checking the weather and then checking it again.',
    'Cleaning their glasses on the hem of a shirt.',
    'Feeding the sourdough starter.',
    'Pulling a loose thread off a cushion.',
    'Writing a grocery list, then losing it.',
    'Pouring a second cup of coffee they won\u2019t finish.'
  ];

  var CHILDREN_NOTES = [
    'Doing homework at the table.',
    'Watching cartoons on the couch.',
    'Eating cereal.',
    'Playing with LEGOs on the rug.',
    'Drawing at the kitchen table.',
    'Taking a nap.',
    'Getting dressed for school.',
    'Brushing their teeth.',
    'Reading a book in bed.',
    'Packing a backpack.',
    'Eating lunch.',
    'Playing a video game.',
    'Looking out the window.',
    'Tying their shoes.',
    'Asking for a snack.',
    'Watching a movie.',
    'Doing a jigsaw puzzle.',
    'Coloring in a coloring book.',
    'Eating dinner.',
    'Washing their hands.',
    'Building a fort out of couch cushions.',
    'Sorting a shoebox of marbles by colour.',
    'Pretending the hallway is a balance beam.',
    'Narrating a long story to the refrigerator.',
    'Carefully drawing a map of the house.',
    'Doing a handstand against the wall.',
    'Running a toy car along the baseboard.',
    'Explaining a rule they just invented.',
    'Practising tying a shoelace on a stuffed bear.',
    'Trying on a grown-up coat from the closet.',
    'Quietly counting the steps on the stairs.',
    'Staring at the ceiling fan without blinking.',
    'Humming the same three notes over and over.',
    'Stacking books into an uneven tower.',
    'Cutting out paper snowflakes.',
    'Asking why the sky is the colour it is.',
    'Sharpening every pencil in the drawer.',
    'Watching dust drift in a beam of light.',
    'Writing a letter to nobody in particular.',
    'Rearranging the stuffed animals by height.',
    'Making a small museum on the windowsill.',
    'Balancing a spoon on the edge of a cup.',
    'Telling the pet a long, serious secret.',
    'Whispering plans into the heating vent.',
    'Folding a paper airplane with great ceremony.',
    'Drawing a family portrait with unusual heads.',
    'Counting the leaves on the houseplant.',
    'Setting up an imaginary shop on the rug.',
    'Reading the cereal box out loud.',
    'Hiding under the table with a flashlight.',
    'Teaching a doll the alphabet.',
    'Arguing gently with the washing machine.',
    'Practising a cartwheel in the hallway.',
    'Writing their name in the condensation.',
    'Watching a cartoon with the sound too loud.',
    'Drawing on a steamed-up window.',
    'Inventing a language for the goldfish.',
    'Turning the sofa into a pirate ship.',
    'Taping a drawing to the front of the fridge.',
    'Looking for a missing sock with great gravity.',
    'Trying to whistle, unsuccessfully.',
    'Practising saying a hard word on repeat.',
    'Pouring juice slightly past the rim of the glass.',
    'Waiting for the microwave like it\u2019s a miracle.',
    'Holding a seashell to one ear.',
    'Writing a very serious note and hiding it.',
    'Counting how many steps to the bathroom.'
  ];

  // =========================================================================
  // PET-TYPE-SPECIFIC ACTIVITY POOLS (v3.23.104)
  // Each pet type has its own set of ~30 unique activities. The house feed
  // picks from the pool matching the pet's chosen type. Fallback to generic
  // if no type has been chosen yet.
  // =========================================================================

  var CAT_NOTES = [
    'Sleeping on the couch.',
    'Sitting on the keyboard.',
    'Knocking a pen off the desk.',
    'Staring at the wall with great patience.',
    'Sitting in a cardboard box.',
    'Watching birds through the window.',
    'Perched on top of the bookshelf.',
    'Lying in a sunbeam.',
    'Stalking an invisible intruder.',
    'Sitting on the newspaper being read.',
    'Licking a paw with slow deliberation.',
    'Watching the ceiling with suspicion.',
    'Walking in slow figure-eights around ankles.',
    'Hiding behind the curtain, tail visible.',
    'Rolling once, considering, rolling back.',
    'Curled inside an open drawer.',
    'Following a beam of light with one paw.',
    'Sitting on the windowsill like a loaf.',
    'Making a nest out of a clean hoodie.',
    'Watching the dishwasher as if it owed money.',
    'Politely ignoring the new toy.',
    'Staring at a closed door, willing it open.',
    'Asleep on a book you were reading.',
    'Watching a spider with professional interest.',
    'Pressed flat against the cool tile.',
    'Zooming through the hallway at full speed.',
    'Judging everyone silently from a high shelf.',
    'Pawing at a glass of water on the counter.',
    'Chirping at a bird outside the window.',
    'Curled up on the warmest seat in the house.'
  ];

  var DOG_NOTES = [
    'Tail wagging at nothing in particular.',
    'Sniffing the same spot for the fifth time.',
    'Brought a sock to the living room.',
    'Lying by the front door, waiting.',
    'Drinking noisily from the water bowl.',
    'Chewing a toy with great enthusiasm.',
    'Following someone from room to room.',
    'Sitting at attention by the kitchen table.',
    'Rolling on the carpet with all four legs up.',
    'Pressing a nose against the window.',
    'Heard a sound. Must investigate.',
    'Resting a chin on someone\u2019s shoe.',
    'Carrying a ball, hoping someone will notice.',
    'Asleep in the middle of the hallway.',
    'Thumping a tail against the floor.',
    'Staring at the treat cupboard intently.',
    'Tilting head at a suspicious noise.',
    'Barked once at the mailman. Satisfied.',
    'Digging into the couch cushions.',
    'Lying on the cool kitchen floor.',
    'Sighing heavily and resting chin on paws.',
    'Running to the door. False alarm.',
    'Sniffing groceries as they come in.',
    'Forgot why they ran to the kitchen.',
    'Guarding a bone no one wanted.',
    'Sitting on feet for warmth.',
    'Watching the oven with hopeful eyes.',
    'Leaning against a leg and exhaling.',
    'Nudging a hand for scratches.',
    'Asleep, twitching through a dream.'
  ];

  var BLOB_NOTES = [
    'Pulsing contentedly in the corner.',
    'Absorbed a dust particle. Satisfied.',
    'Wobbled to the left. Then back.',
    'Glowing slightly brighter than usual.',
    'Contemplating the void behind the sofa.',
    'Vibrating at a frequency only it understands.',
    'Slowly oozing toward the warm radiator.',
    'Blinking. Or possibly breathing. Hard to tell.',
    'Sitting perfectly still. Suspiciously still.',
    'Changed color slightly. No one noticed.',
    'Emitted a soft hum. Then stopped.',
    'Absorbed a crumb. Seemed pleased.',
    'Expanded slightly, then thought better of it.',
    'Watching the ceiling fan with one pseudopod raised.',
    'Resting on the bookshelf between two volumes.',
    'Left a faint glow on the carpet.',
    'Quivered at a loud noise. Resumed quivering.',
    'Flattened against the window to watch the rain.',
    'Rolled off the table. Rolled back up.',
    'Existed loudly in the corner.',
    'Making a soft ambient noise like a fridge.',
    'Split into two briefly. Reconsidered.',
    'Phased through a sock. Seemed embarrassed.',
    'Sitting in a mug, perfectly round.',
    'Dimmed when the lights went on.',
    'Pulsed in rhythm with the washing machine.',
    'Stacked on top of itself for height.',
    'Reflected light in a way that seems intentional.',
    'Wobbled toward a family member, then retreated.',
    'Humming something. Possibly a lullaby.'
  ];

  var BIRD_NOTES = [
    'Screaming at nothing in particular.',
    'Tilting head at exactly 90 degrees.',
    'Fluffed up to maximum possible size.',
    'Preening a wing feather with great focus.',
    'Sitting on someone\u2019s head uninvited.',
    'Learned a new sound. It\u2019s the microwave.',
    'Bobbing to music only it can hear.',
    'Tapping beak against the mirror repeatedly.',
    'Shredding a piece of paper with enthusiasm.',
    'Singing. Loudly. At the worst time.',
    'Perched on the curtain rod, surveying.',
    'Mimicking the phone ringtone perfectly.',
    'Hopping across the table like it\u2019s lava.',
    'Hiding a seed behind a cushion.',
    'Staring directly into someone\u2019s eyes. Unblinking.',
    'Grinding beak contentedly. The sound of sleep.',
    'Climbing the cage bars for exercise.',
    'Hanging upside down for no clear reason.',
    'Investigating a button on someone\u2019s shirt.',
    'Chattering at a bird outside the window.',
    'Sitting in the food bowl like a nest.',
    'Doing a small sideways dance on the perch.',
    'Threw a pellet on the floor. On purpose.',
    'Napping with one foot tucked up.',
    'Made a sound like a door creaking.',
    'Flew to the kitchen. Flew back. Important trip.',
    'Nibbling an ear affectionately. Ow.',
    'Sitting in someone\u2019s collar like a scarf.',
    'Ringing the bell toy aggressively.',
    'Plotting. Obviously plotting.'
  ];

  var BUNNY_NOTES = [
    'Binkying across the living room.',
    'Thumped once, disapprovingly.',
    'Rearranging hay for the fiftieth time.',
    'Loafing in the corner perfectly round.',
    'Nose twitching at suspicious speed.',
    'Chewing a baseboard with zero guilt.',
    'Flopped sideways dramatically. Asleep instantly.',
    'Grooming an ear with tiny paws.',
    'Sitting in a salad bowl. Eating the salad.',
    'Digging at the carpet like there\u2019s treasure.',
    'Nudged a toy, then ignored it forever.',
    'Running laps around the coffee table.',
    'Standing on hind legs to inspect the counter.',
    'Pressed flat like a pancake. Content.',
    'Chinning everything. This is mine. This too.',
    'Sitting behind the curtain with ears poking out.',
    'Tossed a cup. Watched it roll. Satisfied.',
    'Chewing a cable. \u2014 Actually, please check.',
    'Sprawled in the most inconvenient spot.',
    'Staring at a wall. Deep thoughts.',
    'Accepted a head pat. Briefly.',
    'Zooming in circles at 3 AM.',
    'Sitting in a slipper like it\u2019s a bed.',
    'Nudging a hand for more greens.',
    'Hiding under the bed. Found immediately.',
    'Thumped again. Still disapproving.',
    'Cleaning whiskers with great ceremony.',
    'Hopped onto the sofa uninvited.',
    'Eating hay at a rate that seems competitive.',
    'Sitting perfectly still, being majestic.'
  ];

  var FISH_NOTES = [
    'Bubble.',
    'Another bubble.',
    'Forgot everything. Starting fresh.',
    'Discovered the castle again. Thrilled.',
    'Swimming left now instead of right.',
    'Staring at the glass. Or through it. Unclear.',
    'Ate a flake. Spat it out. Ate it again.',
    'Hiding behind the plastic plant.',
    'Following a finger along the glass.',
    'Sitting at the bottom. Thinking.',
    'Swimming in a very small circle.',
    'Nibbling at the gravel.',
    'Drifting near the surface, contemplative.',
    'Did a lap. New personal best.',
    'Staring at another fish. Or a reflection.',
    'Investigating the air pump with suspicion.',
    'Hovered in place for an unusual amount of time.',
    'Swam through the little arch. Very brave.',
    'Wiggled. Then stopped. Then wiggled.',
    'Explored the same corner for the third time.',
    'Opened mouth. Closed mouth. Opened mouth.',
    'Watching the light shimmer on the surface.',
    'Resting near the heater. Smart.',
    'Chased a bubble. Lost it.',
    'Sank a little. Rose a little. Life goes on.',
    'Flared fins briefly. Calmed down.',
    'Ate something off the glass. Best not to ask.',
    'Swimming with purpose. Destination unknown.',
    'Hovering near the feeding corner. Just in case.',
    'Being a fish. Fully committed.'
  ];

  // Fallback for pets with no type chosen yet — generic activities
  var GENERIC_PET_NOTES = [
    'Sleeping on the couch.',
    'Drinking from the water bowl.',
    'Curled up on the bed.',
    'Sitting by the window.',
    'Lying in a sunbeam.',
    'Napping on a rug.',
    'Resting in the living room.',
    'Curled on a blanket.',
    'Stretching on the floor.',
    'Sitting in the hallway.',
    'Watching birds through the window.',
    'Breathing slowly at nothing visible.',
    'Following you from room to room at a distance.'
  ];

  var PET_POOLS = {
    cat: CAT_NOTES,
    dog: DOG_NOTES,
    blob: BLOB_NOTES,
    bird: BIRD_NOTES,
    bunny: BUNNY_NOTES,
    fish: FISH_NOTES
  };

  // Eating-specific notes — only mixed into the feed when the bowl has food.
  // Prefixed with \x01 so renderPetSprites can detect them and swap the
  // sprite to the eating state. The prefix is stripped before display.
  var EATING_PREFIX = '\x01';

  var CAT_EATING_NOTES = [
    'Eating from its bowl. Slowly, as if judging each piece.',
    'Crunching kibble with its eyes half-closed.',
    'Licking the bowl clean. Pausing. Licking again.',
    'Eating with one paw on the rim, possessively.',
    'Nibbling carefully. It has opinions about this food.'
  ];
  var DOG_EATING_NOTES = [
    'Eating so fast the bowl is sliding across the floor.',
    'Inhaling food. Has not tasted any of it.',
    'Eating with tail wagging. Simple joy.',
    'Finished the bowl. Checking for seconds.',
    'Crunching happily. This is the best part of the day.'
  ];
  var BLOB_EATING_NOTES = [
    'Absorbing its food. The process is unclear but thorough.',
    'Enveloping the contents of the bowl. Slowly.',
    'Eating. Or possibly just sitting in the bowl.',
    'Food is disappearing into the blob. No chewing detected.',
    'The bowl is emptier than it was. The blob is larger.'
  ];
  var BIRD_EATING_NOTES = [
    'Pecking at seeds with quick, precise taps.',
    'Eating with one eye on the room.',
    'Scattering seeds everywhere. Eating two of them.',
    'Cracking a seed. Dropping the shell. Very efficient.',
    'Eating and singing between bites.'
  ];
  var BUNNY_EATING_NOTES = [
    'Munching steadily. Nose going a mile a minute.',
    'Eating hay. Chewing sideways. Very serious about it.',
    'Nibbling from the bowl with delicate precision.',
    'Eating quietly. Ears up. Listening while it chews.',
    'Working through the food systematically, left to right.'
  ];
  var FISH_EATING_NOTES = [
    'Rising to the surface for each flake. One at a time.',
    'Eating with small, precise gulps.',
    'Chasing a piece of food around the tank.',
    'Eating calmly near the surface. Unbothered.',
    'Food is disappearing. The fish looks satisfied, somehow.'
  ];

  var PET_EATING_POOLS = {
    cat: CAT_EATING_NOTES,
    dog: DOG_EATING_NOTES,
    blob: BLOB_EATING_NOTES,
    bird: BIRD_EATING_NOTES,
    bunny: BUNNY_EATING_NOTES,
    fish: FISH_EATING_NOTES
  };

  // Resolve which note pool to use for a given pet index.
  // When the bowl is full, eating notes are mixed in (~1 in 4 chance per rotation).
  function petPoolFor(idx) {
    var types = (state && state.housePetTypes) || [];
    var t = types[idx];
    var basePool = (t && PET_POOLS[t]) || GENERIC_PET_NOTES;

    // If the bowl is full, mix eating notes into the pool
    var bowl = petBowlState(idx);
    if (bowl === 'bowl_full' && t && PET_EATING_POOLS[t]) {
      // Tag eating notes with prefix so the sprite renderer can detect them
      var eatingPool = PET_EATING_POOLS[t].map(function(n) { return EATING_PREFIX + n; });
      // Interleave: add eating notes so they show up roughly 1 in 4 rotations
      return basePool.concat(eatingPool);
    }
    return basePool;
  }

  // Get the display name for a pet (player-chosen name or fallback)
  function petDisplayName(idx) {
    var names = (state && state.housePetNames) || [];
    if (names[idx]) return names[idx].toUpperCase();
    var types = (state && state.housePetTypes) || [];
    if (types[idx]) return types[idx].toUpperCase();
    return 'PET ' + (idx + 1);
  }

  // =========================================================================
  // PET PIXEL SPRITES (v3.23.104)
  // Custom 8x8 pixel art for each pet type in happy and sad states.
  // Each sprite is an array of 8 rows, each row an array of 8 hex colors
  // (or 'transparent'). Rendered onto a <canvas> element.
  // =========================================================================
  var PET_SPRITES = {
    cat: {
      happy: [
        ['transparent','transparent','#ffa500','transparent','transparent','#ffa500','transparent','transparent'],
        ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent'],
        ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
        ['transparent','#ff9f43','#ffffff','#ff9f43','#ff9f43','#f5f0eb','#ff9f43','transparent'],
        ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
        ['transparent','transparent','#ff9f43','#ff6b9d','#ff6b9d','#ff9f43','transparent','transparent'],
        ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
        ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent']
      ],
      sad: [
        ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
        ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent'],
        ['transparent','transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent','transparent'],
        ['transparent','#ff9f43','#ffffff','#ff9f43','#ff9f43','#ffffff','#ff9f43','transparent'],
        ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#5bc0eb','#ff9f43','transparent'],
        ['transparent','transparent','#ff9f43','#ff6b9d','#ff6b9d','#ff9f43','transparent','transparent'],
        ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
        ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent']
      ]
    },
    dog: {
      happy: [
        ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
        ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
        ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
        ['transparent','#8B5E3C','#ffffff','#8B5E3C','#8B5E3C','#f5f0eb','#8B5E3C','transparent'],
        ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
        ['transparent','transparent','#8B5E3C','#ff6b9d','#ff6b9d','#8B5E3C','transparent','transparent'],
        ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
        ['transparent','#8B5E3C','transparent','transparent','transparent','transparent','#8B5E3C','transparent']
      ],
      sad: [
        ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
        ['#8B5E3C','#8B5E3C','transparent','transparent','transparent','transparent','#8B5E3C','#8B5E3C'],
        ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
        ['transparent','#8B5E3C','#ffffff80','#8B5E3C','#8B5E3C','#ffffff80','#8B5E3C','transparent'],
        ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#5bc0eb','#8B5E3C','transparent'],
        ['transparent','transparent','#8B5E3C','#ff6b9d','#ff6b9d','#8B5E3C','transparent','transparent'],
        ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
        ['transparent','#8B5E3C','transparent','transparent','transparent','transparent','#8B5E3C','transparent']
      ]
    },
    blob: {
      happy: [
        ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
        ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent'],
        ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
        ['transparent','#6b6bff','#ffffff','#6b6bff','#6b6bff','#f5f0eb','#6b6bff','transparent'],
        ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
        ['transparent','transparent','#6b6bff','#ff6b9d','#ff6b9d','#6b6bff','transparent','transparent'],
        ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
        ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent']
      ],
      sad: [
        ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
        ['transparent','transparent','#3a3abf','#3a3abf','#3a3abf','#3a3abf','transparent','transparent'],
        ['transparent','#3a3abf','#3a3abf','#3a3abf','#3a3abf','#3a3abf','#3a3abf','transparent'],
        ['transparent','#6b6bff','#f5f0eb','#6b6bff','#6b6bff','#f5f0eb','#6b6bff','transparent'],
        ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#5bc0eb','#6b6bff','transparent'],
        ['transparent','transparent','#6b6bff','#7799aa','#7799aa','#6b6bff','transparent','transparent'],
        ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
        ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent']
      ]
    },
    bird: {
      happy: [
        ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
        ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent'],
        ['transparent','#00c9a7','#00c9a7','#00c9a7','#00c9a7','#00c9a7','transparent','transparent'],
        ['transparent','#00c9a7','#ffffff','#00c9a7','#00c9a7','#f5f0eb','#00c9a7','transparent'],
        ['transparent','#ffeb3b','#00f0c8','#00f0c8','#00f0c8','#00f0c8','#ffeb3b','transparent'],
        ['transparent','transparent','#00c9a7','#ffa500','#ffa500','#00c9a7','transparent','transparent'],
        ['transparent','transparent','#00c9a7','#00c9a7','#00c9a7','#00c9a7','transparent','transparent'],
        ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent']
      ],
      sad: [
        ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
        ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent'],
        ['transparent','#00c9a7','#00c9a7','#00c9a7','#00c9a7','#00c9a7','transparent','transparent'],
        ['transparent','#00c9a7','#f5f0eb','#00c9a7','#00c9a7','#f5f0eb','#00c9a7','transparent'],
        ['#ffeb3b','#ffeb3b','#00f0c8','#00f0c8','#00f0c8','#5bc0eb','#ffeb3b','#ffeb3b'],
        ['transparent','transparent','#00c9a7','#ffa500','#ffa500','#00c9a7','transparent','transparent'],
        ['transparent','transparent','#00c9a7','#00c9a7','#00c9a7','#00c9a7','transparent','transparent'],
        ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent']
      ]
    },
    bunny: {
      happy: [
        ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
        ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
        ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
        ['transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent'],
        ['transparent','#e8e0d8','#ffffff','#e8e0d8','#e8e0d8','#ffffff','#e8e0d8','transparent'],
        ['transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent'],
        ['transparent','transparent','#e8e0d8','#ff6b9d','#ff6b9d','#e8e0d8','transparent','transparent'],
        ['transparent','transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent','transparent']
      ],
      sad: [
        ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
        ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
        ['transparent','#e8e0d8','#e8e0d8','transparent','transparent','#e8e0d8','#e8e0d8','transparent'],
        ['transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent'],
        ['transparent','#e8e0d8','#ffffff','#e8e0d8','#e8e0d8','#ffffff','#e8e0d8','transparent'],
        ['transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#5bc0eb','#e8e0d8','transparent'],
        ['transparent','transparent','#e8e0d8','#9c27b0','#9c27b0','#e8e0d8','transparent','transparent'],
        ['transparent','transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent','transparent']
      ]
    },
    fish: {
      happy: [
        ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
        ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
        ['transparent','transparent','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb','transparent'],
        ['transparent','#5bc0eb','#44ff44','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb'],
        ['transparent','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
        ['transparent','transparent','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
        ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
        ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
      ],
      sad: [
        ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
        ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
        ['transparent','transparent','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb','transparent'],
        ['transparent','#5bc0eb','#ff4444','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb'],
        ['transparent','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
        ['transparent','transparent','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
        ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
        ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
      ]
    }
  };

  
    // =========================================================================
    // Additional pet states: sick, sleeping, eating, excited, angry,
    // working, dancing, scared + food bowl (full/empty)
    // =========================================================================
    PET_SPRITES.cat.sick = [
      ['transparent','transparent','#ffa500','transparent','transparent','#ffa500','transparent','transparent'],
      ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent'],
      ['transparent','#ff6b00','#ff6b00','#ff6b00','#ff6b00','#ff6b00','#ff6b00','transparent'],
      ['transparent','#ff9f43','#88cc44','#ff6b00','#ff6b00','#88cc44','#ff9f43','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff6b00','#ff6b00','#ff9f43','#ff9f43','transparent'],
      ['transparent','transparent','#ff9f43','#88cc44','#88cc44','#ff9f43','transparent','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent']
    ];
    PET_SPRITES.cat.sleeping = [
      ['transparent','transparent','#ffa500','transparent','transparent','#ffa500','transparent','transparent'],
      ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','#ff9f43','#cc7a2e','#ff9f43','#ff9f43','#cc7a2e','#ff9f43','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent']
    ];
    PET_SPRITES.cat.eating = [
      ['transparent','transparent','#ffa500','transparent','transparent','#ffa500','transparent','transparent'],
      ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','#ff9f43','#ffffff','#ff9f43','#ff9f43','#f5f0eb','#ff9f43','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff4500','#ff4500','#ff9f43','#ff9f43','transparent'],
      ['transparent','transparent','#ff9f43','#ff6347','#ff6347','#ff9f43','transparent','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent']
    ];
    PET_SPRITES.cat.excited = [
      ['transparent','transparent','#ffa500','transparent','transparent','#ffa500','transparent','transparent'],
      ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','#ff9f43','#ffd700','#ff9f43','#ff9f43','#ffd700','#ff9f43','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff4500','#ff4500','#ff4500','#ff9f43','transparent'],
      ['transparent','transparent','#ff9f43','#ff6347','#ff6347','#ff6347','transparent','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent']
    ];
    PET_SPRITES.cat.angry = [
      ['transparent','transparent','#ffa500','transparent','transparent','#ffa500','transparent','transparent'],
      ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent'],
      ['transparent','#cc7a2e','#ff9f43','#ff9f43','#cc7a2e','#ff9f43','#ff9f43','transparent'],
      ['transparent','#ff9f43','#ff4444','#ff9f43','#ff9f43','#ff4444','#ff9f43','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','transparent','#ff9f43','#cc7a2e','#cc7a2e','#ff9f43','transparent','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent']
    ];
    PET_SPRITES.cat.working = [
      ['transparent','transparent','#ffa500','#ffd700','#ffd700','#ffa500','transparent','transparent'],
      ['transparent','#ffd700','#ff9f43','#ffd700','#ffd700','#ff9f43','#ffd700','transparent'],
      ['transparent','#ff9f43','#ffa500','#ffa500','#ffa500','#ffa500','#ff9f43','transparent'],
      ['transparent','#ff9f43','#ffffff','#ff9f43','#ff9f43','#ffffff','#ff9f43','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','transparent','#ff9f43','#ff6b9d','#ff6b9d','#8B5E3C','#c0c0c0','#c0c0c0'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#8B5E3C','#ff9f43','transparent'],
      ['transparent','transparent','#ff9f43','transparent','transparent','#8B5E3C','transparent','transparent']
    ];
    PET_SPRITES.cat.dancing = [
      ['transparent','transparent','#ffa500','transparent','transparent','#ffa500','transparent','transparent'],
      ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','#ff9f43','#ffffff','#ff9f43','#ff9f43','#f5f0eb','#ff9f43','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','transparent','#ff9f43','#ff6b9d','#ff6b9d','#ff9f43','transparent','transparent'],
      ['#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43'],
      ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent']
    ];
    PET_SPRITES.cat.scared = [
      ['transparent','transparent','#ffa500','transparent','transparent','#ffa500','transparent','transparent'],
      ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent'],
      ['transparent','#ff9f43','#ffffff','#ff9f43','#ff9f43','#ffffff','#ff9f43','transparent'],
      ['transparent','#ff9f43','#ffffff','#ff9f43','#ff9f43','#ffffff','#ff9f43','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','transparent','#ff9f43','#333333','#333333','#ff9f43','transparent','transparent'],
      ['transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent'],
      ['transparent','transparent','#ff9f43','transparent','transparent','#ff9f43','transparent','transparent']
    ];
    PET_SPRITES.cat.bowl_full = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#ffa500','#ffa500','#ffa500','#ffa500','transparent','transparent'],
      ['transparent','#8B5E3C','#ffa500','#ffa500','#ffa500','#ffa500','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#a0764e','#a0764e','#8B5E3C','transparent','transparent'],
      ['transparent','transparent','transparent','#8B5E3C','#8B5E3C','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.cat.bowl_empty = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#a0764e','#a0764e','#8B5E3C','transparent','transparent'],
      ['transparent','transparent','transparent','#8B5E3C','#8B5E3C','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.dog.sick = [
      ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#6b4530','#6b4530','#6b4530','#6b4530','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#88cc44','#6b4530','#6b4530','#88cc44','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#6b4530','#6b4530','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#88cc44','#88cc44','#8B5E3C','transparent','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','transparent','transparent','transparent','transparent','#8B5E3C','transparent']
    ];
    PET_SPRITES.dog.sleeping = [
      ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#6b4530','#8B5E3C','#8B5E3C','#6b4530','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','transparent','transparent','transparent','transparent','#8B5E3C','transparent']
    ];
    PET_SPRITES.dog.eating = [
      ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#ffffff','#8B5E3C','#8B5E3C','#f5f0eb','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#ff4500','#ff4500','#8B5E3C','transparent','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#ff6347','#ff6347','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','transparent','transparent','transparent','transparent','#8B5E3C','transparent']
    ];
    PET_SPRITES.dog.excited = [
      ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#ffd700','#8B5E3C','#8B5E3C','#ffd700','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#ff4500','#ff4500','#ff4500','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#ff6347','#ff6347','#ff6347','transparent','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','transparent','transparent','transparent','transparent','#8B5E3C','transparent']
    ];
    PET_SPRITES.dog.angry = [
      ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#6b4530','#8B5E3C','#8B5E3C','#6b4530','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#ff4444','#8B5E3C','#8B5E3C','#ff4444','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#6b4530','#6b4530','#8B5E3C','transparent','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','transparent','transparent','transparent','transparent','#8B5E3C','transparent']
    ];
    PET_SPRITES.dog.working = [
      ['transparent','#8B5E3C','#8B5E3C','#ffd700','#ffd700','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#ffd700','#8B5E3C','#ffd700','#ffd700','#8B5E3C','#ffd700','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#ffffff','#8B5E3C','#8B5E3C','#ffffff','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#a0764e','#ff6b9d','#ff6b9d','#333333','#c0c0c0','#c0c0c0'],
      ['transparent','#8B5E3C','#a0764e','#8B5E3C','#8B5E3C','#333333','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','transparent','transparent','transparent','#333333','#8B5E3C','transparent']
    ];
    PET_SPRITES.dog.dancing = [
      ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#ffffff','#8B5E3C','#8B5E3C','#f5f0eb','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#ff6b9d','#ff6b9d','#8B5E3C','transparent','transparent'],
      ['#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C'],
      ['#8B5E3C','#8B5E3C','transparent','transparent','transparent','transparent','#8B5E3C','#8B5E3C']
    ];
    PET_SPRITES.dog.scared = [
      ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','transparent','transparent','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#ffffff','#8B5E3C','#8B5E3C','#ffffff','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#ffffff','#8B5E3C','#8B5E3C','#ffffff','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#333333','#333333','#8B5E3C','transparent','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','transparent','transparent','transparent','transparent','#8B5E3C','transparent']
    ];
    PET_SPRITES.dog.bowl_full = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#ffa500','#ff9f43','#ffa500','#ff9f43','transparent','transparent'],
      ['transparent','#8B5E3C','#ff9f43','#ffa500','#ffb64c','#ffa500','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#a0764e','#a0764e','#8B5E3C','transparent','transparent'],
      ['transparent','transparent','transparent','#8B5E3C','#8B5E3C','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.dog.bowl_empty = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#a0764e','#a0764e','#8B5E3C','transparent','transparent'],
      ['transparent','transparent','transparent','#8B5E3C','#8B5E3C','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.blob.sick = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent'],
      ['transparent','#6b6bff','#3a3abf','#3a3abf','#3a3abf','#3a3abf','#6b6bff','transparent'],
      ['transparent','#6b6bff','#88cc44','#3a3abf','#3a3abf','#88cc44','#6b6bff','transparent'],
      ['transparent','#6b6bff','#6b6bff','#3a3abf','#3a3abf','#6b6bff','#6b6bff','transparent'],
      ['transparent','transparent','#6b6bff','#88cc44','#88cc44','#6b6bff','transparent','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent']
    ];
    PET_SPRITES.blob.sleeping = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','#6b6bff','#3a3abf','#6b6bff','#6b6bff','#3a3abf','#6b6bff','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent']
    ];
    PET_SPRITES.blob.eating = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','#6b6bff','#ffffff','#6b6bff','#6b6bff','#f5f0eb','#6b6bff','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','transparent','#6b6bff','#ff4500','#ff4500','#6b6bff','transparent','transparent'],
      ['transparent','#6b6bff','#6b6bff','#ff6347','#ff6347','#6b6bff','#6b6bff','transparent'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent']
    ];
    PET_SPRITES.blob.excited = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','#6b6bff','#ffd700','#6b6bff','#6b6bff','#ffd700','#6b6bff','transparent'],
      ['transparent','#6b6bff','#6b6bff','#ff4500','#ff4500','#ff4500','#6b6bff','transparent'],
      ['transparent','transparent','#6b6bff','#ff6347','#ff6347','#ff6347','transparent','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent']
    ];
    PET_SPRITES.blob.angry = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent'],
      ['transparent','#3a3abf','#6b6bff','#6b6bff','#3a3abf','#6b6bff','#6b6bff','transparent'],
      ['transparent','#6b6bff','#ff4444','#6b6bff','#6b6bff','#ff4444','#6b6bff','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','transparent','#6b6bff','#3a3abf','#3a3abf','#6b6bff','transparent','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent']
    ];
    PET_SPRITES.blob.working = [
      ['transparent','transparent','transparent','#ffd700','#ffd700','transparent','transparent','transparent'],
      ['transparent','transparent','#ffd700','#ffd700','#ffd700','#ffd700','transparent','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','#6b6bff','#ffffff','#6b6bff','#6b6bff','#ffffff','#6b6bff','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','transparent','#6b6bff','#ff6b9d','#ff6b9d','#8B5E3C','#c0c0c0','#c0c0c0'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#8B5E3C','#6b6bff','transparent'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#8B5E3C','transparent','transparent']
    ];
    PET_SPRITES.blob.dancing = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','#6b6bff','#ffffff','#6b6bff','#6b6bff','#f5f0eb','#6b6bff','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','transparent','#6b6bff','#ff6b9d','#ff6b9d','#6b6bff','transparent','transparent'],
      ['#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent']
    ];
    PET_SPRITES.blob.scared = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent'],
      ['transparent','#6b6bff','#ffffff','#6b6bff','#6b6bff','#ffffff','#6b6bff','transparent'],
      ['transparent','#6b6bff','#ffffff','#6b6bff','#6b6bff','#ffffff','#6b6bff','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','transparent','#6b6bff','#333333','#333333','#6b6bff','transparent','transparent'],
      ['transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent'],
      ['transparent','transparent','#6b6bff','#6b6bff','#6b6bff','#6b6bff','transparent','transparent']
    ];
    PET_SPRITES.blob.bowl_full = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#9932cc','#6b6bff','#9932cc','#6b6bff','transparent','transparent'],
      ['transparent','#8B5E3C','#6b6bff','#9932cc','#6b6bff','#9932cc','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#a0764e','#a0764e','#8B5E3C','transparent','transparent'],
      ['transparent','transparent','transparent','#8B5E3C','#8B5E3C','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.blob.bowl_empty = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#a0764e','#a0764e','#8B5E3C','transparent','transparent'],
      ['transparent','transparent','transparent','#8B5E3C','#8B5E3C','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.bird.sick = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent'],
      ['transparent','#00c9a7','#44ff44','#44ff44','#44ff44','#44ff44','transparent','transparent'],
      ['transparent','#00c9a7','#88cc44','#44ff44','#44ff44','#88cc44','#00c9a7','transparent'],
      ['transparent','#ffeb3b','#00f0c8','#44ff44','#44ff44','#00f0c8','#ffeb3b','transparent'],
      ['transparent','transparent','#00c9a7','#ffa500','#ffa500','#00c9a7','transparent','transparent'],
      ['transparent','transparent','#00c9a7','#00c9a7','#00c9a7','#00c9a7','transparent','transparent'],
      ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent']
    ];
    PET_SPRITES.bird.sleeping = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent'],
      ['transparent','#00c9a7','#00c9a7','#00c9a7','#00c9a7','#00c9a7','transparent','transparent'],
      ['transparent','#00c9a7','#009b82','#00c9a7','#00c9a7','#009b82','#00c9a7','transparent'],
      ['transparent','#ffeb3b','#00f0c8','#00f0c8','#00f0c8','#00f0c8','#ffeb3b','transparent'],
      ['transparent','transparent','#00c9a7','#ffa500','#ffa500','#00c9a7','transparent','transparent'],
      ['transparent','transparent','#00c9a7','#00c9a7','#00c9a7','#00c9a7','transparent','transparent'],
      ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent']
    ];
    PET_SPRITES.bird.eating = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent'],
      ['transparent','#00c9a7','#00c9a7','#00c9a7','#00c9a7','#00c9a7','transparent','transparent'],
      ['transparent','#00c9a7','#ffffff','#00c9a7','#00c9a7','#f5f0eb','#00c9a7','transparent'],
      ['transparent','#ffeb3b','#00f0c8','#00f0c8','#00f0c8','#00f0c8','#ffeb3b','transparent'],
      ['transparent','transparent','#00c9a7','#ff4500','#ff4500','#00c9a7','transparent','transparent'],
      ['transparent','transparent','#00c9a7','#ff6347','#ff6347','#00c9a7','transparent','transparent'],
      ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent']
    ];
    PET_SPRITES.bird.excited = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent'],
      ['transparent','#00c9a7','#00c9a7','#00c9a7','#00c9a7','#00c9a7','transparent','transparent'],
      ['transparent','#00c9a7','#ffd700','#00c9a7','#00c9a7','#ffd700','#00c9a7','transparent'],
      ['transparent','#ffeb3b','#00f0c8','#ff4500','#ff4500','#ff4500','#ffeb3b','transparent'],
      ['transparent','transparent','#00c9a7','#ff6347','#ff6347','#ff6347','transparent','transparent'],
      ['transparent','transparent','#00c9a7','#00c9a7','#00c9a7','#00c9a7','transparent','transparent'],
      ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent']
    ];
    PET_SPRITES.bird.angry = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent'],
      ['transparent','#009b82','#00c9a7','#00c9a7','#009b82','#00c9a7','transparent','transparent'],
      ['transparent','#00c9a7','#ff4444','#00c9a7','#00c9a7','#ff4444','#00c9a7','transparent'],
      ['transparent','#ffeb3b','#00f0c8','#00f0c8','#00f0c8','#00f0c8','#ffeb3b','transparent'],
      ['transparent','transparent','#00c9a7','#ffa500','#ffa500','#00c9a7','transparent','transparent'],
      ['transparent','transparent','#00c9a7','#00c9a7','#00c9a7','#00c9a7','transparent','transparent'],
      ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent']
    ];
    PET_SPRITES.bird.working = [
      ['transparent','transparent','transparent','#ffd700','#ffd700','transparent','transparent','transparent'],
      ['transparent','transparent','#ffd700','#ffd700','#ffd700','#ffd700','transparent','transparent'],
      ['transparent','#00c9a7','#00c9a7','#00c9a7','#00c9a7','#00c9a7','transparent','transparent'],
      ['transparent','#00c9a7','#ffffff','#00c9a7','#00c9a7','#ffffff','#00c9a7','transparent'],
      ['transparent','#ffeb3b','#00c9a7','#00f0c8','#00f0c8','#00f0c8','#ffeb3b','transparent'],
      ['transparent','transparent','#00c9a7','#ffa500','#ffa500','#8B5E3C','#c0c0c0','#c0c0c0'],
      ['transparent','transparent','#00c9a7','#00c9a7','#00c9a7','#8B5E3C','transparent','transparent'],
      ['transparent','transparent','transparent','#00c9a7','#00c9a7','#8B5E3C','transparent','transparent']
    ];
    PET_SPRITES.bird.dancing = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent'],
      ['transparent','#00c9a7','#00c9a7','#00c9a7','#00c9a7','#00c9a7','transparent','transparent'],
      ['transparent','#00c9a7','#ffffff','#00c9a7','#00c9a7','#f5f0eb','#00c9a7','transparent'],
      ['transparent','#ffeb3b','#00f0c8','#00f0c8','#00f0c8','#00f0c8','#ffeb3b','transparent'],
      ['transparent','transparent','#00c9a7','#ffa500','#ffa500','#00c9a7','transparent','transparent'],
      ['#00c9a7','transparent','#00c9a7','#00c9a7','#00c9a7','#00c9a7','transparent','#00c9a7'],
      ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent']
    ];
    PET_SPRITES.bird.scared = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent'],
      ['transparent','#00c9a7','#ffffff','#00c9a7','#00c9a7','#ffffff','transparent','transparent'],
      ['transparent','#00c9a7','#ffffff','#00c9a7','#00c9a7','#ffffff','#00c9a7','transparent'],
      ['transparent','#ffeb3b','#00f0c8','#00f0c8','#00f0c8','#00f0c8','#ffeb3b','transparent'],
      ['transparent','transparent','#00c9a7','#ffa500','#ffa500','#00c9a7','transparent','transparent'],
      ['transparent','transparent','#00c9a7','#00c9a7','#00c9a7','#00c9a7','transparent','transparent'],
      ['transparent','transparent','transparent','#00c9a7','#00c9a7','transparent','transparent','transparent']
    ];
    PET_SPRITES.bird.bowl_full = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#ffeb3b','#ffd700','#ffeb3b','#ffd700','transparent','transparent'],
      ['transparent','#8B5E3C','#ffd700','#ffeb3b','#ffd700','#ffeb3b','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#a0764e','#a0764e','#8B5E3C','transparent','transparent'],
      ['transparent','transparent','transparent','#8B5E3C','#8B5E3C','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.bird.bowl_empty = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#a0764e','#a0764e','#8B5E3C','transparent','transparent'],
      ['transparent','transparent','transparent','#8B5E3C','#8B5E3C','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.bunny.sick = [
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','#e8e0d8','#aaaaaa','#aaaaaa','#aaaaaa','#aaaaaa','#e8e0d8','transparent'],
      ['transparent','#e8e0d8','#558833','#aaaaaa','#aaaaaa','#558833','#e8e0d8','transparent'],
      ['transparent','#e8e0d8','#e8e0d8','#aaaaaa','#aaaaaa','#e8e0d8','#e8e0d8','transparent'],
      ['transparent','transparent','#e8e0d8','#ff6b9d','#ff6b9d','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent','transparent']
    ];
    PET_SPRITES.bunny.sleeping = [
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent'],
      ['transparent','#e8e0d8','#ffffff','#ffffff','#ffffff','#ffffff','#e8e0d8','transparent'],
      ['transparent','#e8e0d8','#e8e0d8','#ffffff','#ffffff','#e8e0d8','#e8e0d8','transparent'],
      ['transparent','transparent','#e8e0d8','#ff6b9d','#ff6b9d','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent','transparent']
    ];
    PET_SPRITES.bunny.eating = [
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent'],
      ['transparent','#e8e0d8','#ffffff','#e8e0d8','#e8e0d8','#ffffff','#e8e0d8','transparent'],
      ['transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent'],
      ['transparent','transparent','#e8e0d8','#ff4500','#ff4500','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','#ff6347','#ff6347','#e8e0d8','transparent','transparent']
    ];
    PET_SPRITES.bunny.excited = [
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent'],
      ['transparent','#e8e0d8','#ffd700','#e8e0d8','#e8e0d8','#ffd700','#e8e0d8','transparent'],
      ['transparent','#e8e0d8','#e8e0d8','#ff4500','#ff4500','#ff4500','#e8e0d8','transparent'],
      ['transparent','transparent','#e8e0d8','#ff6347','#ff6347','#ff6347','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent','transparent']
    ];
    PET_SPRITES.bunny.angry = [
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent'],
      ['transparent','#e8e0d8','#cc3300','#e8e0d8','#e8e0d8','#cc3300','#e8e0d8','transparent'],
      ['transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent'],
      ['transparent','transparent','#e8e0d8','#ff6b9d','#ff6b9d','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent','transparent']
    ];
    PET_SPRITES.bunny.working = [
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','#ffd700','#ffd700','#e8e0d8','transparent','transparent'],
      ['transparent','#ffd700','#e8e0d8','#ffd700','#ffd700','#e8e0d8','#ffd700','transparent'],
      ['transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent'],
      ['transparent','#e8e0d8','#ffffff','#e8e0d8','#e8e0d8','#ffffff','#e8e0d8','transparent'],
      ['transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#8B5E3C','#c0c0c0','#c0c0c0'],
      ['transparent','transparent','#e8e0d8','#ff6b9d','#ff6b9d','#8B5E3C','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','#e8e0d8','#e8e0d8','#8B5E3C','transparent','transparent']
    ];
    PET_SPRITES.bunny.dancing = [
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent'],
      ['transparent','#e8e0d8','#ffffff','#e8e0d8','#e8e0d8','#ffffff','#e8e0d8','transparent'],
      ['transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent'],
      ['#e8e0d8','transparent','#e8e0d8','#ff6b9d','#ff6b9d','#e8e0d8','transparent','#e8e0d8'],
      ['transparent','transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent','transparent']
    ];
    PET_SPRITES.bunny.scared = [
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','transparent','transparent','#e8e0d8','transparent','transparent'],
      ['transparent','#e8e0d8','#333333','#e8e0d8','#e8e0d8','#333333','#e8e0d8','transparent'],
      ['transparent','#333333','#333333','#ffffff','#ffffff','#333333','#333333','transparent'],
      ['transparent','#e8e0d8','#333333','#ffffff','#ffffff','#333333','#e8e0d8','transparent'],
      ['transparent','transparent','#e8e0d8','#ff6b9d','#ff6b9d','#e8e0d8','transparent','transparent'],
      ['transparent','transparent','#e8e0d8','#e8e0d8','#e8e0d8','#e8e0d8','transparent','transparent']
    ];
    PET_SPRITES.bunny.bowl_full = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#ff9f43','#ff9f43','#ff9f43','#ff9f43','transparent','transparent'],
      ['transparent','#8B5E3C','#ff9f43','#ffb64c','#ffb64c','#ff9f43','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#a0764e','#a0764e','#8B5E3C','transparent','transparent'],
      ['transparent','transparent','transparent','#8B5E3C','#8B5E3C','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.bunny.bowl_empty = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#a0764e','#a0764e','#8B5E3C','transparent','transparent'],
      ['transparent','transparent','transparent','#8B5E3C','#8B5E3C','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.fish.sick = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb','transparent'],
      ['transparent','#5bc0eb','#558833','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb'],
      ['transparent','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
      ['transparent','transparent','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.fish.sleeping = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb','transparent'],
      ['transparent','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb'],
      ['transparent','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
      ['transparent','transparent','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.fish.eating = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb','transparent'],
      ['transparent','#5bc0eb','#44ff44','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb'],
      ['transparent','#ff4500','#ff4500','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
      ['transparent','#ff6347','#ff6347','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.fish.excited = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb','transparent'],
      ['transparent','#5bc0eb','#ffd700','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb'],
      ['transparent','#ff4500','#ff4500','#ff4500','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
      ['transparent','#ff6347','#ff6347','#ff6347','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.fish.angry = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb','transparent'],
      ['transparent','#5bc0eb','#cc3300','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb'],
      ['transparent','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
      ['transparent','transparent','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.fish.working = [
      ['transparent','transparent','#ffd700','#ffd700','transparent','transparent','transparent','transparent'],
      ['transparent','#ffd700','#ffd700','#ffd700','#ffd700','transparent','transparent','transparent'],
      ['transparent','transparent','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb','transparent'],
      ['transparent','#5bc0eb','#ffffff','#5bc0eb','#8B5E3C','#c0c0c0','#c0c0c0','#5bc0eb'],
      ['transparent','#5bc0eb','#5bc0eb','#5bc0eb','#8B5E3C','#5bc0eb','#5bc0eb','transparent'],
      ['transparent','transparent','#5bc0eb','#5bc0eb','#8B5E3C','#5bc0eb','#5bc0eb','transparent'],
      ['transparent','transparent','transparent','transparent','#8B5E3C','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.fish.dancing = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb','transparent'],
      ['transparent','#5bc0eb','#44ff44','#5bc0eb','#5bc0eb','#5bc0eb','transparent','#5bc0eb'],
      ['transparent','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','#5bc0eb','#5bc0eb','transparent'],
      ['#5bc0eb','transparent','transparent','transparent','transparent','transparent','transparent','#5bc0eb'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.fish.scared = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#ffffff','#5bc0eb','#5bc0eb','transparent','#5bc0eb','transparent'],
      ['transparent','#ffffff','#000000','#ffffff','#5bc0eb','#5bc0eb','transparent','#5bc0eb'],
      ['transparent','#5bc0eb','#ffffff','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
      ['transparent','transparent','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','#5bc0eb','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.fish.bowl_full = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','#88cc44','#ffd700','#88cc44','#ffd700','transparent','transparent'],
      ['transparent','#8B5E3C','#ffd700','#88cc44','#ffd700','#88cc44','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#a0764e','#a0764e','#8B5E3C','transparent','transparent'],
      ['transparent','transparent','transparent','#8B5E3C','#8B5E3C','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];
    PET_SPRITES.fish.bowl_empty = [
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent'],
      ['transparent','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','#8B5E3C','transparent'],
      ['transparent','#8B5E3C','#a0764e','#a0764e','#a0764e','#a0764e','#8B5E3C','transparent'],
      ['transparent','transparent','#8B5E3C','#a0764e','#a0764e','#8B5E3C','transparent','transparent'],
      ['transparent','transparent','transparent','#8B5E3C','#8B5E3C','transparent','transparent','transparent'],
      ['transparent','transparent','transparent','transparent','transparent','transparent','transparent','transparent']
    ];


  // Draw a pet sprite onto a canvas at a given pixel size
  function drawPetSprite(canvas, petType, mood, pxSize) {
    if (!canvas || !petType || !PET_SPRITES[petType]) return;
    var sprite = PET_SPRITES[petType][mood] || PET_SPRITES[petType].happy;
    if (!sprite) return;
    var ctx = canvas.getContext('2d');
    canvas.width = 8 * pxSize;
    canvas.height = 8 * pxSize;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (var r = 0; r < 8; r++) {
      for (var c = 0; c < sprite[r].length; c++) {
        if (sprite[r][c] !== 'transparent') {
          ctx.fillStyle = sprite[r][c];
          ctx.fillRect(c * pxSize, r * pxSize, pxSize, pxSize);
        }
      }
    }
  }

  // =========================================================================
  // Pet mood from household condition — maps the story arc to sprite states.
  // The pet never knows about the factory. It only knows whether you are home,
  // whether it has been fed, and whether the door still opens.
  // =========================================================================
  // Condition-to-mood mapping. Uses only calm/neutral moods.
  // Dramatic states (scared, angry, sick) are reserved for the event
  // system so they only fire on the specific pet the event targets.
  var CONDITION_TO_PET_MOOD = {
    'Settling in.':                                         'happy',
    'Warm. The light is good.':                             'happy',
    'Tidy. The hallway has new flowers.':                   'excited',
    'Quiet. Everyone is where they should be.':             'dancing',
    'Distracted. The kettle has been on twice.':            'working',
    'Watchful. The door is checked after it is already locked.': 'sad',
    'Unwell. A letter was left on the desk, unopened.':     'sad',
    'Drifted. The calendar is three weeks out of date.':    'sleeping'
  };

  function petMoodFromCondition(condition, wb, petType) {
    if (!condition) {
      if (typeof wb === 'number') {
        if (wb >= 80) return 'dancing';
        if (wb >= 70) return 'excited';
        if (wb >= 55) return 'happy';
        if (wb >= 40) return 'working';
        if (wb >= 15) return 'sad';
        return 'sleeping';
      }
      return 'happy';
    }
    return CONDITION_TO_PET_MOOD[condition] || 'happy';
  }

  // Bowl state: depends on petFullness in state. If the player hasn't
  // spent money to feed, the bowl is empty. Fullness drains over time
  // (handled by app.js rollover). This is read-only — we just check.
  function petBowlState(petIndex) {
    if (!state) return 'bowl_empty';
    var fullness = state.petFullness;
    if (typeof fullness === 'number') return fullness > 0 ? 'bowl_full' : 'bowl_empty';
    if (Array.isArray(fullness)) {
      var f = fullness[petIndex] || 0;
      return f > 0 ? 'bowl_full' : 'bowl_empty';
    }
    return 'bowl_empty';
  }

  // =========================================================================
  // Pet tooltip — a single sentence describing how the pet is doing.
  // Never mentions the factory, dissidents, incinerators, or game mechanics.
  // The pet only knows its own small world.
  // =========================================================================
  var PET_TOOLTIPS = {
    happy: {
      cat:   ['Sitting in the window. The light is warm.', 'Watching a bird outside. Content.', 'Purring on the arm of the sofa.'],
      dog:   ['Lying by the door, tail moving slowly.', 'Found a comfortable spot on the rug.', 'Chewing on a toy. All is well.'],
      blob:  ['Settled on the shelf. Slightly luminous.', 'Wobbling gently. A good sign.', 'Warm to the touch.'],
      bird:  ['Hopping between perches. Feathers tidy.', 'Singing something small and repetitive.', 'Tilting its head at nothing.'],
      bunny: ['Nose twitching. Ears up. Comfortable.', 'Grooming itself carefully.', 'Sitting in the corner of its space, relaxed.'],
      fish:  ['Swimming in slow circles. The water is clean.', 'Drifting near the surface. Calm.', 'Following your finger against the glass.']
    },
    excited: {
      cat:   ['Knocked a glass off the counter. No remorse.', 'Running between rooms for no reason.', 'Staring at you with enormous pupils.'],
      dog:   ['Spinning in circles. Cannot be stopped.', 'Brought you a shoe. Very proud of it.', 'Tail going so fast the whole body moves.'],
      blob:  ['Bouncing. Actually bouncing.', 'Changed colour twice in the last minute.', 'Vibrating with what appears to be joy.'],
      bird:  ['Flapping hard enough to move its cage.', 'Singing loud enough to hear from outside.', 'Head-bobbing like it means something.'],
      bunny: ['Doing binkies across the room.', 'Thumping its back feet. Excited, not angry.', 'Zooming in tight circles.'],
      fish:  ['Splashing at the surface. Energetic.', 'Swimming fast laps. Something is good.', 'Blowing bubbles enthusiastically.']
    },
    dancing: {
      cat:   ['Dancing. It does not know what is coming.', 'Perfectly content. This will not last.', 'Playing with a piece of string. Everything is fine.'],
      dog:   ['Rolling on its back. Pure joy.', 'Playing with the children. Everyone is laughing.', 'This is the happiest it will ever be.'],
      blob:  ['Shimmering with every colour it has.', 'Dancing on the windowsill. Beautiful.', 'This is its best moment.'],
      bird:  ['Singing something it made up. Proud of it.', 'Swaying on its perch. The house is full.', 'This is the song it will stop singing later.'],
      bunny: ['Flopped on its side. Completely trusting.', 'Licking your hand. This means something.', 'Stretched out. No fear. Not yet.'],
      fish:  ['Swimming in figure eights. Showing off.', 'The tank is clean. The water is warm. Everything works.', 'Doing that thing where it looks right at you.']
    },
    working: {
      cat:   ['Rearranged the shoes by the door. Again.', 'Sitting by your coat. Waiting.', 'Keeping busy. Watching the clock.'],
      dog:   ['Carried its leash to the door. Put it back. Carried it again.', 'Pacing between rooms. Not anxious. Not yet.', 'Guarding the front window. Shift work.'],
      blob:  ['Organizing itself. Staying productive.', 'Reshaping into tidy forms. Coping.', 'Keeping the shelf clean. Staying useful.'],
      bird:  ['Rearranging seeds. Systematically.', 'Quiet. Focused on something only it can see.', 'Preening more than usual.'],
      bunny: ['Digging at the corner of its bed. Busy.', 'Rearranging hay. Purposefully.', 'Keeping its space in order.'],
      fish:  ['Swimming the same route. Precise. Repetitive.', 'Tidying the gravel with its nose.', 'Patrolling. Making sure everything is fine.']
    },
    scared: {
      cat:   ['Hides under the bed when it hears the door.', 'Ears flat. Watching the hallway.', 'Will not come out for food.'],
      dog:   ['Pressed against the wall. Eyes wide.', 'Whimpers when the letterbox opens.', 'Sleeping by the door. Not really sleeping.'],
      blob:  ['Pressed flat. Almost invisible.', 'Shaking slightly. Cold to the touch.', 'Tucked behind the books. Trying not to be seen.'],
      bird:  ['Silent. Feathers puffed. Very still.', 'Will not come to the front of the cage.', 'Stopped singing three days ago.'],
      bunny: ['Thumping. Not excited. Afraid.', 'Hiding in the back. Will not eat.', 'Ears flat against its head.'],
      fish:  ['Hiding behind the filter. Will not come out.', 'Staying at the bottom. Very still.', 'Darting away from shadows.']
    },
    sick: {
      cat:   ['Not eating. The bowl has been full since yesterday.', 'Sleeping too much. Not the good kind.', 'Its fur looks different. Duller.'],
      dog:   ['Lying on its side. Barely lifts its head.', 'Refused the treat. That has never happened before.', 'Nose is warm. Eyes are dull.'],
      blob:  ['Lost its colour. Grey now.', 'Not moving. Barely visible.', 'Cold. Smaller than it was.'],
      bird:  ['Feathers ruffled. Sitting at the bottom.', 'Not eating. The seed tray is untouched.', 'Silent. Has been silent.'],
      bunny: ['Not moving. Breathing too fast.', 'Lying flat. Eyes half closed.', 'Will not eat. Will not groom.'],
      fish:  ['Floating at an angle. Still alive.', 'Not eating. The food sits on the surface.', 'Moving very slowly. Something is wrong.']
    },
    sleeping: {
      cat:   ['Sleeping. Has been sleeping for a long time.', 'Curled up. Does not react when you enter.', 'The house is very quiet.'],
      dog:   ['Asleep by the door. Has been there all day.', 'Does not get up when you come in.', 'Dreaming. Its paws twitch.'],
      blob:  ['Dormant. Barely perceptible.', 'Asleep. Has not moved in days.', 'A small, still shape on the shelf.'],
      bird:  ['Head tucked. Sleeping on the cage floor.', 'Does not sing anymore. Just sleeps.', 'The cage is very quiet.'],
      bunny: ['Curled in the corner. Sleeping through everything.', 'Does not come out when called.', 'The hay is untouched.'],
      fish:  ['Resting at the bottom. The tank light is off.', 'Barely moving. The water is still.', 'Floating. Not swimming. Just floating.']
    },
    angry: {
      cat:   ['Hissing at the door. It used to like the door.', 'Scratched the sofa. Looked at you while it did it.', 'Knocked everything off the shelf. On purpose.'],
      dog:   ['Growled when you reached for it.', 'Chewed through a cushion. Not playing.', 'Barking at nothing. Or at you.'],
      blob:  ['Turned a colour you have not seen before. It is not a good colour.', 'Spiky. Do not touch.', 'Hot to the touch. Pulling away.'],
      bird:  ['Biting the bars. Loud. Persistent.', 'Screaming. Not singing. Screaming.', 'Threw its water dish.'],
      bunny: ['Thumping hard. Not a warning. A verdict.', 'Bit you. Drew blood. No apology.', 'Lunging at the cage door.'],
      fish:  ['Ramming the glass. Over and over.', 'Flaring at its own reflection.', 'Aggressive. Territorial. Something broke.']
    }
  };

  function petTooltipText(mood, petType, petIndex) {
    var pool = (PET_TOOLTIPS[mood] && PET_TOOLTIPS[mood][petType]) || PET_TOOLTIPS.happy.cat;
    // Use a stable selection based on petIndex and a slow-rotating seed
    var seed = Math.floor(Date.now() / 120000) + (petIndex || 0) * 7;
    return pool[seed % pool.length];
  }

  // Legacy wrapper — old code that called petMoodFromWellbeing still works
  function petMoodFromWellbeing(wb) {
    return petMoodFromCondition(null, wb);
  }

  // =========================================================================
  // HOUSEHOLD EVENTS (v3.23.152)
  //
  // Care tasks, surprises, and small moments that appear when you visit
  // the house. Some cost money, some earn it. Events are generated with
  // random timing -- sometimes multiple in a day, sometimes nothing for a
  // day. Addictive check-in mechanic: you don\'t know what you\'ll find.
  //
  // Each event targets a specific pet (by index) or the whole household
  // (petIndex: -1). Events specify which sprite state the pet shows while
  // the event is active, and which state it shows after completion.
  //
  // Event lifecycle:
  //   1. Generated on house visit (random roll)
  //   2. Displayed as a card in the events panel
  //   3. Player clicks the action button (may cost or earn money)
  //   4. Result message shown, pet sprite briefly shows result state
  //   5. Event moves to history (prevents repeats for a while)
  // =========================================================================

  var HOUSE_EVENT_POOL = [
    // ---- UNIVERSAL PET EVENTS (any pet type) ----
    {
      id: 'vet_checkup', petTypes: null,
      title: '{{name}} needs a check-up',
      desc: 'Been sneezing more than usual. A vet visit would put your mind at ease.',
      action: 'Take to vet',
      cost: 20,
      triggerState: 'sick',
      resultState: 'happy',
      result: '{{name}} got a clean bill of health. Back to normal.'
    },
    {
      id: 'medication', petTypes: null,
      title: '{{name}} needs medication',
      desc: 'The vet left a prescription. Time to administer it.',
      action: 'Give medication',
      cost: 10,
      triggerState: 'sick',
      resultState: 'happy',
      result: '{{name}} took the medicine without too much fuss.'
    },
    {
      id: 'grooming', petTypes: null,
      title: '{{name}} could use grooming',
      desc: 'Looking a bit scruffy. A grooming session would help.',
      action: 'Groom',
      cost: 8,
      triggerState: 'working',
      resultState: 'excited',
      result: '{{name}} looks much better. Almost smug about it.'
    },
    {
      id: 'new_toy', petTypes: null,
      title: 'New toy for {{name}}',
      desc: 'There\'s something at the pet store that {{name}} would love.',
      action: 'Buy toy',
      cost: 5,
      triggerState: 'excited',
      resultState: 'dancing',
      result: '{{name}} hasn\'t put the new toy down since you brought it home.'
    },
    {
      id: 'special_treat', petTypes: null,
      title: 'Special treat for {{name}}?',
      desc: 'You found the fancy treats at the back of the cupboard.',
      action: 'Give treat',
      cost: 3,
      triggerState: 'happy',
      resultState: 'excited',
      result: '{{name}} ate every last crumb and is now looking at you with hope.'
    },
    {
      id: 'comfort', petTypes: null,
      title: '{{name}} is frightened',
      desc: 'Something spooked them. They\'re hiding.',
      action: 'Comfort',
      cost: 0,
      triggerState: 'scared',
      resultState: 'happy',
      result: '{{name}} calmed down after some gentle attention.'
    },
    {
      id: 'found_thing', petTypes: null,
      title: '{{name}} found something',
      desc: 'Dragged something out from behind the couch. Looks valuable.',
      action: 'Inspect',
      cost: -8,
      triggerState: 'excited',
      resultState: 'dancing',
      result: '{{name}} found some loose change and a forgotten gift card. +$8.'
    },
    {
      id: 'sad_lonely', petTypes: null,
      title: '{{name}} seems lonely',
      desc: 'Sitting in the corner, not interested in anything. Just wants company.',
      action: 'Spend time together',
      cost: 0,
      triggerState: 'sad',
      resultState: 'happy',
      result: '{{name}} perked up once you sat down nearby. Just needed you.'
    },
    {
      id: 'angry_furniture', petTypes: null,
      title: '{{name}} destroyed a cushion',
      desc: 'There are feathers everywhere. {{name}} is glaring at you.',
      action: 'Clean up',
      cost: 6,
      triggerState: 'angry',
      resultState: 'happy',
      result: 'Mess cleaned. {{name}} has no regrets but seems calmer now.'
    },

    // ---- HOUSEHOLD-WIDE EVENTS ----
    {
      id: 'vacuum', petTypes: null, household: true,
      title: 'Time to vacuum',
      desc: 'The floors need cleaning. The pets will not enjoy this.',
      action: 'Start vacuuming',
      cost: 0,
      triggerState: 'scared',
      resultState: 'happy',
      result: 'Floors are clean. The pets are recovering from the noise.'
    },
    {
      id: 'new_blinds', petTypes: null, household: true,
      title: 'Install new blinds',
      desc: 'The old blinds are fraying. Time for an upgrade.',
      action: 'Install',
      cost: 12,
      triggerState: 'excited',
      resultState: 'happy',
      result: 'New blinds installed. Everyone is investigating the cords.'
    },
    {
      id: 'thunderstorm', petTypes: null, household: true,
      title: 'Thunderstorm',
      desc: 'The sky went dark. Thunder is rattling the windows.',
      action: 'Comfort everyone',
      cost: 0,
      triggerState: 'scared',
      resultState: 'happy',
      result: 'The storm passed. Everyone is back to normal, mostly.'
    },
    {
      id: 'spring_cleaning', petTypes: null, household: true,
      title: 'Spring cleaning day',
      desc: 'The house could use a deep clean. Everyone will need to pitch in.',
      action: 'Start cleaning',
      cost: 0,
      triggerState: 'working',
      resultState: 'dancing',
      result: 'The house is spotless. Everyone feels accomplished.'
    },
    {
      id: 'power_outage', petTypes: null, household: true,
      title: 'Power outage',
      desc: 'The lights went out. The pets are uneasy in the dark.',
      action: 'Light candles',
      cost: 2,
      triggerState: 'scared',
      resultState: 'happy',
      result: 'Candles lit. The house is cozy now, actually.'
    },
    {
      id: 'yard_sale', petTypes: null, household: true,
      title: 'Yard sale finds',
      desc: 'The neighbors are having a yard sale. Found some pet supplies.',
      action: 'Browse sale',
      cost: -10,
      triggerState: 'excited',
      resultState: 'dancing',
      result: 'Great haul. Sold some old things too. +$10.'
    },

    // ---- CAT-SPECIFIC ----
    {
      id: 'cat_knocked', petTypes: ['cat'],
      title: '{{name}} knocked a glass off the table',
      desc: 'Looked you dead in the eye while doing it.',
      action: 'Clean up',
      cost: 0,
      triggerState: 'angry',
      resultState: 'happy',
      result: '{{name}} has zero remorse but is purring now.'
    },
    {
      id: 'cat_bird_window', petTypes: ['cat'],
      title: '{{name}} spotted a bird outside',
      desc: 'Making that weird chattering sound at the window.',
      action: 'Open the blinds wider',
      cost: 0,
      triggerState: 'excited',
      resultState: 'dancing',
      result: '{{name}} is in heaven. The bird has no idea.'
    },
    {
      id: 'cat_hairball', petTypes: ['cat'],
      title: '{{name}} has a hairball problem',
      desc: 'Found evidence on the good rug.',
      action: 'Buy hairball remedy',
      cost: 5,
      triggerState: 'sick',
      resultState: 'happy',
      result: '{{name}} is feeling better. The rug is not.'
    },
    {
      id: 'cat_zoomies', petTypes: ['cat'],
      title: '{{name}} has the midnight zoomies',
      desc: 'Running laps at 3am. The whole house is awake.',
      action: 'Wait it out',
      cost: 0,
      triggerState: 'dancing',
      resultState: 'sleeping',
      result: '{{name}} crashed hard. Asleep on the stairs now.'
    },
    {
      id: 'cat_box', petTypes: ['cat'],
      title: 'A box arrived for {{name}}',
      desc: 'The delivery was for you, but {{name}} claimed the box.',
      action: 'Let them keep it',
      cost: 0,
      triggerState: 'excited',
      resultState: 'happy',
      result: '{{name}} has been in the box for two hours. Content.'
    },

    // ---- DOG-SPECIFIC ----
    {
      id: 'dog_show', petTypes: ['dog'],
      title: 'Dog show training for {{name}}',
      desc: 'The local dog show is next week. Time to practice.',
      action: 'Train',
      cost: 10,
      triggerState: 'working',
      resultState: 'excited',
      result: '{{name}} learned a new trick. Tail hasn\'t stopped wagging.'
    },
    {
      id: 'dog_fetch', petTypes: ['dog'],
      title: '{{name}} won the fetch championship',
      desc: 'Brought back every stick, every time. Crowd went wild.',
      action: 'Collect prize',
      cost: -12,
      triggerState: 'dancing',
      resultState: 'excited',
      result: '{{name}} is the champion. +$12. Strutting around the house.'
    },
    {
      id: 'dog_ate_something', petTypes: ['dog'],
      title: '{{name}} ate something weird',
      desc: 'Found them chewing on something unidentifiable in the yard.',
      action: 'Take to vet',
      cost: 15,
      triggerState: 'sick',
      resultState: 'happy',
      result: '{{name}} is fine. The vet says to keep an eye on them.'
    },
    {
      id: 'dog_trick', petTypes: ['dog'],
      title: '{{name}} learned a trick on its own',
      desc: 'Sat down and offered a paw without being asked.',
      action: 'Give a treat',
      cost: 2,
      triggerState: 'happy',
      resultState: 'dancing',
      result: '{{name}} is showing everyone. Over and over.'
    },
    {
      id: 'dog_walk', petTypes: ['dog'],
      title: '{{name}} needs a walk',
      desc: 'Brought the leash. Dropped it at your feet. Eyes enormous.',
      action: 'Go for a walk',
      cost: 0,
      triggerState: 'sad',
      resultState: 'dancing',
      result: '{{name}} is exhausted and happy. Best walk ever, apparently.'
    },

    // ---- BLOB-SPECIFIC ----
    {
      id: 'blob_telekinesis', petTypes: ['blob'],
      title: '{{name}} is practicing telekinesis',
      desc: 'Small objects are hovering slightly. The blob is concentrating.',
      action: 'Encourage training',
      cost: 8,
      triggerState: 'working',
      resultState: 'excited',
      result: '{{name}} moved a spoon three inches. Monumental progress.'
    },
    {
      id: 'blob_split', petTypes: ['blob'],
      title: '{{name}} briefly split in two',
      desc: 'Both halves looked equally confused. Recombined after a minute.',
      action: 'Monitor closely',
      cost: 0,
      triggerState: 'scared',
      resultState: 'happy',
      result: '{{name}} is whole again. Seems embarrassed about the whole thing.'
    },
    {
      id: 'blob_color', petTypes: ['blob'],
      title: '{{name}} changed color',
      desc: 'Shifted from its usual hue to something entirely new. Seems intentional.',
      action: 'Admire it',
      cost: 0,
      triggerState: 'excited',
      resultState: 'dancing',
      result: '{{name}} is showing off its new color to anyone who looks.'
    },
    {
      id: 'blob_absorbed', petTypes: ['blob'],
      title: '{{name}} absorbed something valuable',
      desc: 'Found it sitting on the kitchen counter looking satisfied. Your change jar is empty.',
      action: 'Negotiate its return',
      cost: -7,
      triggerState: 'happy',
      resultState: 'excited',
      result: '{{name}} produced $7 in assorted coins. Seemed proud.'
    },
    {
      id: 'blob_dormant', petTypes: ['blob'],
      title: '{{name}} went dormant',
      desc: 'Hasn\'t moved in hours. Barely visible. Just resting, probably.',
      action: 'Keep watch',
      cost: 0,
      triggerState: 'sleeping',
      resultState: 'happy',
      result: '{{name}} woke up. Slightly bigger than before.'
    },

    // ---- BIRD-SPECIFIC ----
    {
      id: 'bird_song', petTypes: ['bird'],
      title: '{{name}} learned a new song',
      desc: 'Been practicing all morning. Getting pretty good at it.',
      action: 'Listen',
      cost: 0,
      triggerState: 'dancing',
      resultState: 'happy',
      result: '{{name}} finished the performance. Took a bow. (A small head dip.)'
    },
    {
      id: 'bird_escaped', petTypes: ['bird'],
      title: '{{name}} got out of the cage',
      desc: 'Currently on top of the bookshelf. Looking down at you.',
      action: 'Coax back gently',
      cost: 0,
      triggerState: 'scared',
      resultState: 'happy',
      result: '{{name}} returned on its own terms. Dignity intact.'
    },
    {
      id: 'bird_contest', petTypes: ['bird'],
      title: 'Singing contest entry for {{name}}',
      desc: 'The neighborhood bird club is holding a competition.',
      action: 'Enter contest',
      cost: 3,
      triggerState: 'working',
      resultState: 'dancing',
      result: '{{name}} placed second. Would have won but got distracted by a mirror.'
    },
    {
      id: 'bird_molting', petTypes: ['bird'],
      title: '{{name}} is molting',
      desc: 'Feathers everywhere. Looks uncomfortable.',
      action: 'Buy supplements',
      cost: 5,
      triggerState: 'sick',
      resultState: 'happy',
      result: '{{name}} is growing new feathers. Looks ridiculous but feels better.'
    },
    {
      id: 'bird_mimic', petTypes: ['bird'],
      title: '{{name}} is mimicking the doorbell',
      desc: 'You\'ve answered the door four times. Nobody was there.',
      action: 'Accept your fate',
      cost: 0,
      triggerState: 'excited',
      resultState: 'happy',
      result: '{{name}} has moved on to mimicking the microwave.'
    },

    // ---- BUNNY-SPECIFIC ----
    {
      id: 'bunny_dig', petTypes: ['bunny'],
      title: '{{name}} found a tunnel project',
      desc: 'Digging with great purpose in the corner of the garden.',
      action: 'Let them dig',
      cost: 0,
      triggerState: 'working',
      resultState: 'excited',
      result: '{{name}} constructed an impressive hole. Very satisfied.'
    },
    {
      id: 'bunny_stash', petTypes: ['bunny'],
      title: '{{name}} has a hidden stash',
      desc: 'Found treats hidden behind the bookshelf. Entrepreneurial.',
      action: 'Discover it together',
      cost: -6,
      triggerState: 'excited',
      resultState: 'dancing',
      result: '{{name}}\'s stash included some things of actual value. +$6.'
    },
    {
      id: 'bunny_ate_bad', petTypes: ['bunny'],
      title: '{{name}} ate something it shouldn\'t have',
      desc: 'Got into the houseplants again.',
      action: 'Take to vet',
      cost: 12,
      triggerState: 'sick',
      resultState: 'happy',
      result: '{{name}} is fine but the fern is not.'
    },
    {
      id: 'bunny_binky', petTypes: ['bunny'],
      title: '{{name}} is doing binkies',
      desc: 'Leaping and twisting in the air. Pure joy.',
      action: 'Watch and enjoy',
      cost: 0,
      triggerState: 'dancing',
      resultState: 'happy',
      result: '{{name}} stuck the landing. Or close enough.'
    },
    {
      id: 'bunny_angry_thump', petTypes: ['bunny'],
      title: '{{name}} is thumping angrily',
      desc: 'You moved the water bowl two inches to the left. Unforgivable.',
      action: 'Move it back',
      cost: 0,
      triggerState: 'angry',
      resultState: 'happy',
      result: '{{name}} inspected the bowl. Acceptable. For now.'
    },

    // ---- FISH-SPECIFIC ----
    {
      id: 'fish_tank', petTypes: ['fish'],
      title: 'Tank cleaning day for {{name}}',
      desc: 'The water\'s looking a bit murky. Time for maintenance.',
      action: 'Clean tank',
      cost: 5,
      triggerState: 'working',
      resultState: 'excited',
      result: 'Tank is sparkling. {{name}} is swimming laps to celebrate.'
    },
    {
      id: 'fish_grew', petTypes: ['fish'],
      title: '{{name}} seems bigger',
      desc: 'Definitely grown since last week. Impressive.',
      action: 'Measure',
      cost: 0,
      triggerState: 'excited',
      resultState: 'dancing',
      result: '{{name}} has grown 2mm. That\'s significant when you\'re a fish.'
    },
    {
      id: 'fish_water', petTypes: ['fish'],
      title: 'Water quality issue for {{name}}',
      desc: 'The pH is off. {{name}} is sluggish.',
      action: 'Buy treatment',
      cost: 10,
      triggerState: 'sick',
      resultState: 'happy',
      result: 'Water balanced. {{name}} is swimming normally again.'
    },
    {
      id: 'fish_sync', petTypes: ['fish'],
      title: '{{name}} is doing synchronized swimming',
      desc: 'With its own reflection. Strangely graceful.',
      action: 'Watch',
      cost: 0,
      triggerState: 'dancing',
      resultState: 'happy',
      result: '{{name}} finished the routine. Stuck the ending. Nobody clapped.'
    },
    {
      id: 'fish_treasure', petTypes: ['fish'],
      title: '{{name}} uncovered treasure',
      desc: 'Dug up something shiny from the gravel. It\'s a coin.',
      action: 'Retrieve',
      cost: -5,
      triggerState: 'excited',
      resultState: 'dancing',
      result: 'Not sure how that got in there. +$5.'
    }
  ];

  // -- Event generation: called on each render. Uses houseEventLastRoll
  //    timestamp to decide whether to roll for new events.
  function generateHouseEvents() {
    if (!state) return;
    var now = Date.now();
    var lastRoll = state.houseEventLastRoll || 0;
    var elapsed = now - lastRoll;

    // Minimum 30 minutes between rolls
    if (elapsed < 30 * 60 * 1000) return;

    var events = (state.houseEvents || []).slice();
    var history = (state.houseEventHistory || []).slice();

    // Cap active events at 3
    if (events.length >= 3) return;

    var hours = elapsed / (60 * 60 * 1000);
    var roll = Math.random();
    var count = 0;

    if (hours >= 12) {
      count = roll < 0.3 ? 2 : 1;
    } else if (hours >= 4) {
      count = roll < 0.15 ? 2 : (roll < 0.55 ? 1 : 0);
    } else if (hours >= 1) {
      count = roll < 0.05 ? 2 : (roll < 0.35 ? 1 : 0);
    } else {
      count = roll < 0.25 ? 1 : 0;
    }

    if (count === 0) {
      _saveEventState(events, now, history);
      return;
    }

    var types = (state.housePetTypes || []);
    var names = (state.housePetNames || []);
    var petCount = types.length;

    var eligible = [];
    for (var e = 0; e < HOUSE_EVENT_POOL.length; e++) {
      var tmpl = HOUSE_EVENT_POOL[e];
      if (history.indexOf(tmpl.id) >= 0) continue;
      var alreadyActive = false;
      for (var a = 0; a < events.length; a++) {
        if (events[a].templateId === tmpl.id) { alreadyActive = true; break; }
      }
      if (alreadyActive) continue;

      if (tmpl.household) {
        if (petCount > 0) eligible.push({ tmpl: tmpl, petIndex: -1 });
      } else if (tmpl.petTypes === null) {
        for (var p = 0; p < petCount; p++) {
          if (types[p]) eligible.push({ tmpl: tmpl, petIndex: p });
        }
      } else {
        for (var p2 = 0; p2 < petCount; p2++) {
          if (tmpl.petTypes.indexOf(types[p2]) >= 0) {
            eligible.push({ tmpl: tmpl, petIndex: p2 });
          }
        }
      }
    }

    if (eligible.length === 0) {
      _saveEventState(events, now, history);
      return;
    }

    for (var s = eligible.length - 1; s > 0; s--) {
      var j = Math.floor(Math.random() * (s + 1));
      var tmp = eligible[s]; eligible[s] = eligible[j]; eligible[j] = tmp;
    }

    var toGenerate = Math.min(count, eligible.length, 3 - events.length);
    for (var g = 0; g < toGenerate; g++) {
      var pick = eligible[g];
      var petName = pick.petIndex >= 0 ? (names[pick.petIndex] || 'the pet') : '';
      var petType = pick.petIndex >= 0 ? (types[pick.petIndex] || 'cat') : '';

      events.push({
        templateId: pick.tmpl.id,
        petIndex: pick.petIndex,
        petType: petType,
        title: pick.tmpl.title.replace(/\{\{name\}\}/g, petName),
        desc: pick.tmpl.desc.replace(/\{\{name\}\}/g, petName),
        action: pick.tmpl.action,
        cost: pick.tmpl.cost,
        triggerState: pick.tmpl.triggerState,
        resultState: pick.tmpl.resultState,
        result: pick.tmpl.result.replace(/\{\{name\}\}/g, petName),
        household: pick.tmpl.household || false,
        createdAt: now
      });
    }

    _saveEventState(events, now, history);
  }

  function _saveEventState(events, lastRoll, history) {
    if (history.length > 20) history = history.slice(history.length - 20);
    state.houseEvents = events;
    state.houseEventLastRoll = lastRoll;
    state.houseEventHistory = history;
    try {
      var patch = {};
      patch[STATE_KEY] = state;
      chrome.storage.local.set(patch);
    } catch (e) {}
  }

  function completeHouseEvent(eventIndex) {
    if (!state) return;
    var events = (state.houseEvents || []).slice();
    if (eventIndex < 0 || eventIndex >= events.length) return;
    var ev = events[eventIndex];

    var coins = state.coins || 0;
    if (ev.cost > 0 && coins < ev.cost) {
      var card = document.querySelector('[data-event-index="' + eventIndex + '"]');
      if (card) {
        var btn = card.querySelector('.event-card-btn');
        if (btn) {
          btn.textContent = 'NOT ENOUGH MONEY';
          btn.disabled = true;
          setTimeout(function() {
            btn.textContent = ev.action;
            btn.disabled = false;
          }, 1500);
        }
      }
      return;
    }

    state.coins = coins - ev.cost;
    events.splice(eventIndex, 1);
    var history = (state.houseEventHistory || []).slice();
    history.push(ev.templateId);
    _saveEventState(events, state.houseEventLastRoll || Date.now(), history);
    _showEventResult(ev);
    render();
  }

  function _showEventResult(ev) {
    var container = document.getElementById('houseEventCards');
    if (!container) return;
    var resultEl = document.createElement('div');
    resultEl.className = 'event-result';
    resultEl.textContent = ev.result;
    container.insertBefore(resultEl, container.firstChild);
    setTimeout(function() {
      resultEl.style.transition = 'opacity 0.5s';
      resultEl.style.opacity = '0';
      setTimeout(function() { resultEl.remove(); }, 500);
    }, 8000);
  }

  function renderHouseEvents() {
    var panel = document.getElementById('houseEventsPanel');
    var container = document.getElementById('houseEventCards');
    if (!panel || !container) return;

    generateHouseEvents();

    var events = (state && state.houseEvents) || [];
    var now = Date.now();
    var maxAge = 24 * 60 * 60 * 1000;
    var active = [];
    var changed = false;
    for (var i = 0; i < events.length; i++) {
      if (now - events[i].createdAt < maxAge) {
        active.push(events[i]);
      } else {
        changed = true;
      }
    }
    if (changed) {
      _saveEventState(active, state.houseEventLastRoll || now, state.houseEventHistory || []);
      events = active;
    }

    var results = container.querySelectorAll('.event-result');
    var oldCards = container.querySelectorAll('.event-card');
    for (var r = 0; r < oldCards.length; r++) oldCards[r].remove();

    if (events.length === 0 && results.length === 0) {
      var types = (state && state.housePetTypes) || [];
      if (types.length === 0) {
        panel.style.display = 'none';
        return;
      }
      panel.style.display = '';
      var emptyEl = container.querySelector('.house-events-empty');
      if (!emptyEl) {
        emptyEl = document.createElement('div');
        emptyEl.className = 'house-events-empty';
        emptyEl.textContent = 'Nothing happening right now. Check back later.';
        container.appendChild(emptyEl);
      }
      return;
    }

    panel.style.display = '';
    var emptyMsg = container.querySelector('.house-events-empty');
    if (emptyMsg) emptyMsg.remove();

    for (var e = 0; e < events.length; e++) {
      var ev = events[e];
      var card = document.createElement('div');
      card.className = 'event-card';
      card.setAttribute('data-event-index', e);

      var header = document.createElement('div');
      header.className = 'event-card-header';

      var icon = document.createElement('canvas');
      icon.className = 'event-card-icon';
      icon.style.cssText = 'image-rendering:pixelated;width:24px;height:24px;';
      if (ev.petIndex >= 0 && ev.petType) {
        drawPetSprite(icon, ev.petType, ev.triggerState, 3);
      } else {
        var firstType = (state.housePetTypes || [])[0];
        if (firstType) drawPetSprite(icon, firstType, ev.triggerState, 3);
      }

      var titleEl = document.createElement('div');
      titleEl.className = 'event-card-title';
      titleEl.textContent = ev.title;

      header.appendChild(icon);
      header.appendChild(titleEl);

      var desc = document.createElement('div');
      desc.className = 'event-card-desc';
      desc.textContent = ev.desc;

      var footer = document.createElement('div');
      footer.className = 'event-card-footer';

      var costEl = document.createElement('div');
      costEl.className = 'event-card-cost';
      if (ev.cost > 0) {
        costEl.classList.add('cost');
        costEl.textContent = '-$' + ev.cost;
      } else if (ev.cost < 0) {
        costEl.classList.add('reward');
        costEl.textContent = '+$' + Math.abs(ev.cost);
      } else {
        costEl.classList.add('free');
        costEl.textContent = 'FREE';
      }

      var btn = document.createElement('button');
      btn.className = 'event-card-btn';
      btn.textContent = ev.action;

      var coins = (state && state.coins) || 0;
      if (ev.cost > 0 && coins < ev.cost) {
        btn.disabled = true;
        btn.title = 'Not enough money';
      }

      (function(idx) {
        btn.addEventListener('click', function() {
          completeHouseEvent(idx);
        });
      })(e);

      footer.appendChild(costEl);
      footer.appendChild(btn);

      card.appendChild(header);
      card.appendChild(desc);
      card.appendChild(footer);
      container.appendChild(card);
    }
  }

  function getEventOverrideMood(petIndex) {
    var events = (state && state.houseEvents) || [];
    for (var i = 0; i < events.length; i++) {
      var ev = events[i];
      if (ev.household || ev.petIndex === petIndex) {
        return ev.triggerState;
      }
    }
    return null;
  }

  // =========================================================================
  // PET NAMING PICKER (v3.23.104)
  // When the house opens and a pet exists that hasn't been typed/named yet,
  // a small inline picker appears. Framed as: "Your child is sitting with
  // the new arrival. What should they call it?"
  // =========================================================================
  // v3.23.117: blob removed from picker — existing blob pets still work with custom sprites — existing blob pets still work
  var PET_TYPE_OPTIONS = [
    { key: 'cat',   icon: '\ud83d\udc31', label: 'Cat' },
    { key: 'dog',   icon: '\ud83d\udc36', label: 'Dog' },
    { key: 'bird',  icon: '\ud83d\udc26', label: 'Bird' },
    { key: 'bunny', icon: '\ud83d\udc30', label: 'Bunny' },
    { key: 'fish',  icon: '\ud83d\udc1f', label: 'Fish' }
  ];

  function checkPetPicker() {
    if (!state) return;
    var sheet = (window.House && window.House.getRapSheet) ? window.House.getRapSheet(state) : null;
    if (!sheet) return;
    var pc = (sheet.pets && sheet.pets.count) || 0;
    if (pc === 0) return;

    var types = state.housePetTypes || [];
    var names = state.housePetNames || [];
    var shown = state.housePetPickerShown || [];

    // Find the first pet slot that hasn't been configured yet
    for (var i = 0; i < pc; i++) {
      if (!shown[i]) {
        showPetPicker(i, pc);
        return;
      }
    }
  }


  // Random pet name pools — used when the player clicks "let your kid name it"
  var KID_NAMES = {
    cat: ['Whiskers','Mittens','Shadow','Luna','Mochi','Noodle','Biscuit','Pepper',
          'Cleo','Socks','Pickle','Tofu','Beans','Pumpkin','Marble','Sesame',
          'Dusty','Ziggy','Tuna','Pretzel','Waffles','Nugget','Sprout','Olive'],
    dog: ['Buddy','Barkley','Scout','Rufus','Waffles','Biscuit','Nugget','Patches',
          'Moose','Bear','Bandit','Pepper','Taco','Meatball','Churro','Ziggy',
          'Captain','Nacho','Pickles','Noodle','Tank','Brisket','Maple','Acorn'],
    blob: ['Gloop','Wobble','Squish','Pudge','Blip','Ooze','Glimmer','Fizz',
           'Droplet','Jelly','Smudge','Globby','Plop','Wiggles','Shimmer','Ripple',
           'Dewdrop','Bloop','Quiver','Slurp','Mist','Splat','Gummy','Puff'],
    bird: ['Kiwi','Chirpy','Peep','Mango','Skittles','Sunny','Pip','Tweet',
           'Captain','Nugget','Pickles','Zazu','Rio','Tiki','Coco','Peanut',
           'Feathers','Birdie','Pepper','Olive','Cricket','Breezy','Pistachio','Clover'],
    bunny: ['Clover','Thumper','Bun-Bun','Hazel','Marshmallow','Cotton','Nibbles','Pippin',
            'Daisy','Pebble','Muffin','Cinnamon','Snowball','Biscuit','Honey','Nutmeg',
            'Buttercup','Willow','Flopsy','Dandelion','Poppy','Bramble','Cocoa','Truffle'],
    fish: ['Bubbles','Splash','Gill','Nemo','Coral','Finley','Neptune','Captain',
           'Sushi','Scales','Drift','Guppy','Puddle','Shimmer','Marlin','Goldie',
           'Tidbit','Ripple','Kelp','Blub','Current','Pebble','Sardine','Skipper']
  };

  function generateKidName(petType) {
    var pool = KID_NAMES[petType] || KID_NAMES.cat;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function showPetPicker(slotIndex, totalPets) {
    // Remove any existing picker
    var old = document.getElementById('petPickerOverlay');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.id = 'petPickerOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;';

    var ordinal = totalPets > 1 ? (slotIndex === 0 ? 'first' : 'second') : '';
    var childText = (state && state.lifetimeCoins >= 200) ? 'Your children are' : 'Your child is';

    var box = document.createElement('div');
    box.style.cssText = 'background:#12122a;border:2px solid #ffd700;border-radius:12px;padding:28px 24px;max-width:380px;width:90%;text-align:center;font-family:sans-serif;';

    box.innerHTML = '<div style="font-size:13px;color:#9494ff;margin-bottom:6px;font-style:italic;">'
      + childText + ' sitting with the ' + (ordinal ? ordinal + ' ' : '') + 'new arrival.</div>'
      + '<div style="font-size:16px;color:#e0e0e0;margin-bottom:16px;">What kind of creature is it?</div>'
      + '<div id="petTypeGrid" style="display:flex;flex-wrap:wrap;justify-content:center;gap:8px;margin-bottom:18px;"></div>'
      + '<div style="font-size:13px;color:#9494ff;margin-bottom:8px;font-style:italic;">'
      + 'What should they call it?</div>'
      + '<div style="display:flex;gap:8px;margin-bottom:14px;align-items:stretch;">'
      + '<input id="petNameInput" type="text" maxlength="16" placeholder="Type a name..." '
      + 'style="flex:1;padding:10px 14px;border:1px solid #2a2a4a;border-radius:8px;'
      + 'background:#1a1a3a;color:#e0e0e0;font-size:15px;text-align:center;outline:none;" />'
      + '<button id="kidNameBtn" style="padding:8px 12px;border:2px solid #9494ff;border-radius:8px;'
      + 'background:#1a1a3a;color:#9494ff;font-size:11px;cursor:pointer;white-space:nowrap;'
      + 'transition:all 0.15s;line-height:1.2;" title="Let your child pick a name">'
      + 'LET YOUR<br>KID NAME IT</button></div>'
      + '<div style="display:flex;gap:8px;justify-content:center;">'
      + '<canvas id="petPickerPreview" style="image-rendering:pixelated;width:48px;height:48px;border-radius:4px;"></canvas>'
      + '</div>'
      + '<button id="petPickerConfirm" disabled style="margin-top:14px;padding:10px 28px;border:2px solid #2a2a4a;'
      + 'border-radius:8px;background:#1a1a3a;color:#5a5a7e;font-size:14px;cursor:not-allowed;'
      + 'font-weight:600;transition:all 0.2s;">WELCOME HOME</button>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    var selectedType = null;
    var grid = document.getElementById('petTypeGrid');
    var preview = document.getElementById('petPickerPreview');
    var nameInput = document.getElementById('petNameInput');
    var confirmBtn = document.getElementById('petPickerConfirm');

    PET_TYPE_OPTIONS.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.style.cssText = 'padding:8px 14px;border:2px solid #2a2a4a;border-radius:8px;'
        + 'background:#1a1a3a;color:#e0e0e0;font-size:14px;cursor:pointer;transition:all 0.15s;';
      btn.textContent = opt.icon + ' ' + opt.label;
      btn.dataset.type = opt.key;
      btn.addEventListener('click', function () {
        selectedType = opt.key;
        // Highlight selected
        grid.querySelectorAll('button').forEach(function (b) {
          b.style.borderColor = '#2a2a4a';
          b.style.background = '#1a1a3a';
        });
        btn.style.borderColor = '#ffd700';
        btn.style.background = '#2a2a4a';
        // Draw preview
        drawPetSprite(preview, opt.key, 'happy', 6);
        updateConfirmState();
      });
      grid.appendChild(btn);
    });

    nameInput.addEventListener('input', function () {
      updateConfirmState();
    });

    var kidNameBtn = document.getElementById('kidNameBtn');
    if (kidNameBtn) {
      kidNameBtn.addEventListener('click', function () {
        if (!selectedType) {
          // Flash the type grid to hint they need to pick first
          grid.style.outline = '2px solid #ff6b9d';
          setTimeout(function () { grid.style.outline = ''; }, 800);
          return;
        }
        var name = generateKidName(selectedType);
        nameInput.value = name;
        // Brief flash effect on the button
        kidNameBtn.style.borderColor = '#ffd700';
        kidNameBtn.style.color = '#ffd700';
        setTimeout(function () {
          kidNameBtn.style.borderColor = '#9494ff';
          kidNameBtn.style.color = '#9494ff';
        }, 400);
        updateConfirmState();
      });
    }

    function updateConfirmState() {
      var ready = selectedType && nameInput.value.trim().length > 0;
      confirmBtn.disabled = !ready;
      confirmBtn.style.borderColor = ready ? '#ffd700' : '#2a2a4a';
      confirmBtn.style.color = ready ? '#ffd700' : '#5a5a7e';
      confirmBtn.style.cursor = ready ? 'pointer' : 'not-allowed';
    }

    confirmBtn.addEventListener('click', function () {
      if (!selectedType || !nameInput.value.trim()) return;

      // Save to state
      var types = (state.housePetTypes || []).slice();
      var names = (state.housePetNames || []).slice();
      var shown = (state.housePetPickerShown || []).slice();

      types[slotIndex] = selectedType;
      names[slotIndex] = nameInput.value.trim();
      shown[slotIndex] = true;

      state.housePetTypes = types;
      state.housePetNames = names;
      state.housePetPickerShown = shown;

      // Persist
      try {
        var patch = {};
        patch[STATE_KEY] = state;
        chrome.storage.local.set(patch);
      } catch (e) {}

      // Close overlay and re-render
      overlay.remove();
      render();

      // Check if there's another pet to name
      setTimeout(function () { checkPetPicker(); }, 500);
    });
  }

  // Rotating seed. Starts at a random position at module load so reopening
  // the window gives a different first view; then a rotation timer bumps
  // it on a slow cadence so the player who lingers on the house screen
  // sees the feed update — the family is doing different things every
  // little while. Offsets per row (and per sibling) keep simultaneous
  // picks from ever colliding.
  // ------------------------------------------------------------------------
  // Per-member seeds. Each household member (spouse, each child, each pet)
  // has its OWN seed and its OWN rotation timer, so family members do
  // not all change activities in lockstep. The keys look like
  // 'spouse:0', 'child:0', 'child:1', 'pet:0' etc.
  // ------------------------------------------------------------------------
  var memberSeeds  = {};
  var memberTimers = {};

  function getSeed(key) {
    if (typeof memberSeeds[key] !== 'number') {
      // Large random offset per key so initial picks diverge across siblings.
      memberSeeds[key] = Math.floor(Math.random() * 100000);
    }
    return memberSeeds[key];
  }

  function bumpSeed(key) {
    memberSeeds[key] = (getSeed(key) + 1) | 0;
  }

  function pickNoteFor(pool, key) {
    if (!pool || pool.length === 0) return '';
    var s = getSeed(key);
    var idx = ((s % pool.length) + pool.length) % pool.length;
    return pool[idx];
  }

  // Render a feed of notes, one per member, joined with line breaks so
  // a household with two children reads as two separate observations.
  // `count` is the number of members; `labelFn` turns 0-based index into
  // a short tag like "CHILD 1" (omitted entirely when there's only one).
  //
  // Each sibling is keyed by `keyPrefix + ':' + i` so each rotates on its
  // OWN seed — siblings never change activity at the same instant.
  function buildMemberFeed(pool, count, keyPrefix, labelFn) {
    if (!pool || pool.length === 0 || count <= 0) return '';
    var lines = [];
    for (var i = 0; i < count; i++) {
      var note = pickNoteFor(pool, keyPrefix + ':' + i);
      if (count > 1 && typeof labelFn === 'function') {
        lines.push(labelFn(i) + ': ' + note);
      } else {
        lines.push(note);
      }
    }
    return lines.join('<br>');
  }

  // ------------------------------------------------------------------------
  // Per-member rotation.
  //
  // Every active household member (spouse, each child, each pet) gets its
  // OWN setInterval ticking at a RANDOM period, with a RANDOM initial
  // delay. So three children do not all change activities at the same
  // instant — they drift relative to each other and the viewer watches
  // each person's feed change independently.
  //
  // Periods are roughly 14–26 seconds. Initial delays are 0–14 seconds.
  // ------------------------------------------------------------------------
  var PERIOD_MIN_MS  = 14000;
  var PERIOD_SPAN_MS = 12000;  // plus PERIOD_MIN, so 14–26s
  var INIT_DELAY_MS  = 14000;

  function activeMemberKeys(sheet) {
    var keys = ['spouse:0'];
    var kc = (sheet && sheet.children && sheet.children.count) || 0;
    for (var i = 0; i < kc; i++) keys.push('child:' + i);
    var pc = (sheet && sheet.pets && sheet.pets.count) || 0;
    for (var i = 0; i < pc; i++) keys.push('pet:' + i);
    return keys;
  }

  // Re-render the single DOM element that contains this member's feed.
  // Siblings within the same group share an element (kidNote, petNote),
  // so we rebuild the whole group from current per-member seeds; only
  // the bumped member's line actually changes, because the others still
  // resolve to the same seed index.
  function rerenderMemberGroup(key) {
    var sheet = (window.House && window.House.getRapSheet)
      ? window.House.getRapSheet(state || {})
      : null;
    if (!sheet) return;

    if (key.indexOf('spouse') === 0) {
      var sEl = $('spouseNote');
      if (sEl) sEl.textContent = pickNoteFor(SPOUSE_NOTES, 'spouse:0');
    } else if (key.indexOf('child') === 0) {
      var kEl = $('kidNote');
      var kc = (sheet && sheet.children && sheet.children.count) || 0;
      if (kEl) {
        kEl.innerHTML = buildMemberFeed(
          CHILDREN_NOTES, kc, 'child',
          function (i) { return 'CHILD ' + (i + 1); }
        );
      }
    } else if (key.indexOf('pet') === 0) {
      var pEl = $('petNote');
      var pc = (sheet && sheet.pets && sheet.pets.count) || 0;
      if (pEl) {
        pEl.innerHTML = buildPetFeed(pc, sheet);
      }
    }
  }

  function stopTimerFor(key) {
    if (memberTimers[key]) {
      clearTimeout(memberTimers[key].initial);
      clearInterval(memberTimers[key].interval);
      delete memberTimers[key];
    }
  }

  function startTimerFor(key) {
    if (memberTimers[key]) return;  // already running
    var rec = {};
    var period = PERIOD_MIN_MS + Math.floor(Math.random() * PERIOD_SPAN_MS);
    var delay  = Math.floor(Math.random() * INIT_DELAY_MS);
    rec.initial = setTimeout(function () {
      bumpSeed(key);
      rerenderMemberGroup(key);
      rec.interval = setInterval(function () {
        bumpSeed(key);
        rerenderMemberGroup(key);
      }, period);
    }, delay);
    memberTimers[key] = rec;
  }

  // Reconcile running timers with current population. Stops timers for
  // members that are no longer in the house; starts timers for new ones.
  function ensureMemberTimers(sheet) {
    var desired = {};
    activeMemberKeys(sheet).forEach(function (k) { desired[k] = true; });

    // Stop timers for members that no longer exist.
    Object.keys(memberTimers).forEach(function (k) {
      if (!desired[k]) stopTimerFor(k);
    });

    // Start timers for members that don't have one yet.
    Object.keys(desired).forEach(function (k) {
      if (!memberTimers[k]) startTimerFor(k);
    });
  }

  // Build the pet feed using type-specific pools and pet names.
  // Notes prefixed with EATING_PREFIX are eating notes — strip the prefix
  // before display but remember which pets are currently eating so the
  // sprite renderer can show the eating state.
  var _currentlyEating = {};  // { petIndex: true/false } — set each render

  function buildPetFeed(count, sheet) {
    if (count <= 0) return '';
    _currentlyEating = {};
    var lines = [];
    for (var i = 0; i < count; i++) {
      var pool = petPoolFor(i);
      var note = pickNoteFor(pool, 'pet:' + i);
      var name = petDisplayName(i);

      // Detect and strip eating prefix
      if (note && note.charAt(0) === EATING_PREFIX) {
        note = note.substring(1);
        _currentlyEating[i] = true;
      } else {
        _currentlyEating[i] = false;
      }

      lines.push('<strong>' + name + ':</strong> ' + note);
    }
    return lines.join('<br>');
  }

  // Render pixel sprites inline next to the pet note area — with bowl + tooltip
  function renderPetSprites(count, sheet) {
    // Find or create the sprite container
    var petRow = $('petNote');
    if (!petRow) return;
    var parent = petRow.parentElement;
    if (!parent) return;

    // Remove old sprite container if it exists
    var oldSprites = document.getElementById('petSpriteRow');
    if (oldSprites) oldSprites.remove();

    if (count <= 0) return;

    var wb = (sheet && typeof sheet.wellbeing === 'number') ? sheet.wellbeing : 70;
    var condition = (sheet && sheet.condition) || null;

    var row = document.createElement('div');
    row.id = 'petSpriteRow';
    row.style.cssText = 'display:flex;gap:14px;margin-top:8px;align-items:flex-end;';

    for (var i = 0; i < count; i++) {
      var types = (state && state.housePetTypes) || [];
      var petType = types[i];
      if (!petType) continue;

      // Per-pet mood from condition -- each pet type reacts differently
      var mood = petMoodFromCondition(condition, wb, petType);

      var wrap = document.createElement('div');
      wrap.style.cssText = 'text-align:center;position:relative;cursor:default;';

      // Pet sprite canvas -- priority: eating note > active event > condition mood
      var eventMood = getEventOverrideMood(i);
      var spriteMood = (_currentlyEating[i]) ? 'eating' : (eventMood || mood);
      var cv = document.createElement('canvas');
      cv.style.cssText = 'image-rendering:pixelated;width:32px;height:32px;display:block;margin:0 auto;';
      drawPetSprite(cv, petType, spriteMood, 4);

      // Bowl sprite canvas (smaller, below the pet)
      var bowlState = petBowlState(i);
      var bowlCv = document.createElement('canvas');
      bowlCv.style.cssText = 'image-rendering:pixelated;width:24px;height:24px;display:block;margin:2px auto 0;';
      drawPetSprite(bowlCv, petType, bowlState, 3);

      // Pet name label
      var lbl = document.createElement('div');
      lbl.style.cssText = 'font-size:8px;color:#5a5a7e;margin-top:2px;font-family:monospace;letter-spacing:0.5px;';
      lbl.textContent = petDisplayName(i);

      // Tooltip element (hidden until hover)
      var tip = document.createElement('div');
      tip.className = 'pet-tooltip';
      tip.style.cssText = 'display:none;position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);'
        + 'background:#1a1a2e;color:#c0c0d8;padding:6px 10px;border-radius:4px;font-size:10px;'
        + 'font-family:monospace;white-space:nowrap;z-index:100;pointer-events:none;'
        + 'border:1px solid #2a2a4e;max-width:260px;white-space:normal;line-height:1.4;';
      tip.textContent = petTooltipText(spriteMood, petType, i);

      // Tooltip hover logic
      (function(tipEl, wrapEl) {
        wrapEl.addEventListener('mouseenter', function() { tipEl.style.display = 'block'; });
        wrapEl.addEventListener('mouseleave', function() { tipEl.style.display = 'none'; });
      })(tip, wrap);

      wrap.appendChild(tip);
      wrap.appendChild(cv);
      wrap.appendChild(bowlCv);
      wrap.appendChild(lbl);
      row.appendChild(wrap);
    }

    // Insert after the pet note
    parent.appendChild(row);
  }

    var MOOD_LINES = {
    prologue:
      'The house is newly yours and has not yet decided what kind of house '
      + 'it is going to be. You have a lunch in a paper bag and one pencil '
      + 'in the back pocket of your trousers.',
    early:
      'Things are, by any reasonable measure, going well. The kettle has '
      + 'not been on for anything in particular. The pet, if there is a pet, '
      + 'is off attending to personal business.',
    mid:
      'The household has settled into a rhythm. The money is coming in. The '
      + 'hallway has new flowers in it. You put on your coat at the same '
      + 'minute every morning, and the door makes the same small sound.',
    'late-mid':
      'The light in the hallway is being left on later than it used to be. '
      + 'Somebody \u2014 not you \u2014 has started keeping a list of things '
      + 'on the kitchen counter. The list is short. It is not shown to you.',
    late:
      'The house is very tidy now. Every object is where it belongs. The '
      + 'family stops talking when you come in and resumes when you leave, '
      + 'which you find, on balance, respectful.',
    denied:
      'The house is not currently reachable on foot. A small brown envelope '
      + 'on the factory\u2019s outgoing tray advises that the family has '
      + 'been informed of the new arrangement.'
  };

  // -------------------------------------------------------------------------
  // Render — builds the rap sheet and writes it into the DOM. Never mutates
  // state, never persists.
  // -------------------------------------------------------------------------
  function render() {
    if (!state) return;
    var sheet = (window.House && window.House.getRapSheet) ? window.House.getRapSheet(state) : null;
    if (!sheet) return;

    var std = $('houseStandardView');
    var deniedEl = $('houseDenialView');

    // DENIAL MODE: the land bridge has been commissioned. Replace the
    // whole form with the stamp and letter.
    if (sheet.denied) {
      if (std) std.style.display = 'none';
      if (deniedEl) deniedEl.style.display = '';
      var body = $('denialBody');
      if (body && window.House && window.House.denialNotice) {
        body.textContent = window.House.denialNotice();
      }
      return;
    }

    if (std) std.style.display = '';
    if (deniedEl) deniedEl.style.display = 'none';

    // STANDARD MODE: populate the rap sheet and mood lines.
    var eyebrow = EYEBROWS[sheet.chapter] || EYEBROWS.early;
    var moodLine = MOOD_LINES[sheet.chapter] || MOOD_LINES.early;

    var eyebrowEl = $('houseChapterEyebrow');
    if (eyebrowEl) eyebrowEl.textContent = eyebrow;

    var moodEl = $('houseMoodLine');
    if (moodEl) moodEl.innerHTML = moodLine;

    var sp = $('spouseCount');
    if (sp) sp.textContent = String(sheet.spouse.count);

    var kc = $('kidCount');
    if (kc) kc.textContent = String(sheet.children.count);

    var pc = $('petCount');
    if (pc) pc.textContent = String(sheet.pets.count);

    // Rotating italic notes — per-member feed. Each child and each pet
    // gets its own observation, so a household with two children reads
    // as two distinct lines. A slow timer (NOTE_ROTATE_MS) bumps the
    // seed so the feed visibly changes while the player watches.
    var spouseNoteEl = $('spouseNote');
    if (spouseNoteEl) spouseNoteEl.textContent = pickNoteFor(SPOUSE_NOTES, 'spouse:0');

    var kidCount = (sheet && sheet.children && sheet.children.count) || 0;
    var kidNoteEl = $('kidNote');
    if (kidNoteEl) {
      kidNoteEl.innerHTML = buildMemberFeed(
        CHILDREN_NOTES, kidCount, 'child',
        function (i) { return 'CHILD ' + (i + 1); }
      );
    }

    var petCount = (sheet && sheet.pets && sheet.pets.count) || 0;
    var petNoteEl = $('petNote');
    if (petNoteEl) {
      petNoteEl.innerHTML = buildPetFeed(petCount, sheet);
    }

    // Render pet sprites next to the pet row
    renderPetSprites(petCount, sheet);

    // Check if any pet needs naming
    checkPetPicker();

    // After the rap sheet is painted, make sure each active member has its
    // own rotation timer. Pass the current population so members that no
    // longer exist stop ticking and new members start.
    ensureMemberTimers(sheet);

    var cv = $('conditionValue');
    if (cv) cv.textContent = sheet.condition;

    // -----------------------------------------------------------------
    // HOUSEHOLD EVENTS
    // -----------------------------------------------------------------
    renderHouseEvents();

    // -----------------------------------------------------------------
    // VITAL SIGNS — populate the security-monitor panel. One row per
    // member from the rap sheet. All values are read-only derivations
    // of the current state; no timers, no intervals, no writes.
    // -----------------------------------------------------------------
    renderVitals(sheet);
  }

  // The panel is rebuilt from scratch on every render. Member counts
  // change rarely (two thresholds total) so there is no benefit to
  // patching rows in place.
  function renderVitals(sheet) {
    var rows = $('vitalRows');
    if (!rows) return;

    // Clear.
    while (rows.firstChild) rows.removeChild(rows.firstChild);

    var members = (sheet && sheet.members) || [];
    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      var v = m.vitals || {};

      var row = document.createElement('div');
      row.className = 'vital-row';

      var cLabel = document.createElement('div');
      cLabel.className = 'v-label';
      cLabel.textContent = m.display || m.label || '';

      var cHR = document.createElement('div');
      cHR.className = 'v-hr';
      cHR.textContent = (v.hr != null ? v.hr : '--') + ' ' + (v.hrUnit || 'bpm');

      var cTemp = document.createElement('div');
      cTemp.className = 'v-temp';
      cTemp.textContent = (v.temp != null ? v.temp : '--') + (v.tempUnit || '');

      var cSeen = document.createElement('div');
      cSeen.className = 'v-seen';
      cSeen.textContent = v.lastSeen || '--';

      var cMood = document.createElement('div');
      cMood.className = 'v-mood';
      cMood.textContent = (v.mood || '') + ' \u00B7 ' + (v.motion || '');

      row.appendChild(cLabel);
      row.appendChild(cHR);
      row.appendChild(cTemp);
      row.appendChild(cSeen);
      row.appendChild(cMood);

      rows.appendChild(row);
    }

    // Telecommunications rows: phone + internet, with a status dot and
    // a short italic line of prose. Same monitor aesthetic, different
    // grid. Rebuilt from scratch on every render for the same reason
    // the member rows are.
    renderComms(sheet);

    // Wellbeing bar: green >=70, amber 40..69, red <40.
    var wb = (sheet && typeof sheet.wellbeing === 'number') ? sheet.wellbeing : 0;
    var fill  = $('wbFill');
    var value = $('wbValue');
    if (fill) {
      fill.style.width = Math.max(0, Math.min(100, wb)) + '%';
      fill.classList.remove('tier-good', 'tier-mid', 'tier-bad');
      if (wb >= 70)      fill.classList.add('tier-good');
      else if (wb >= 40) fill.classList.add('tier-mid');
      else               fill.classList.add('tier-bad');
    }
    if (value) value.textContent = wb + '%';
  }

  // -------------------------------------------------------------------------
  // Telecommunications rows. Reads sheet.telecoms.{phone,net} and paints
  // them into #commsRows with a coloured status dot and a short italic
  // line of prose. The copy lives in house.js; this function is only
  // responsible for arrangement.
  // -------------------------------------------------------------------------
  function renderComms(sheet) {
    var host = $('commsRows');
    if (!host) return;

    while (host.firstChild) host.removeChild(host.firstChild);

    var tele = sheet && sheet.telecoms;
    if (!tele) return;

    var lines = [tele.phone, tele.net];
    for (var i = 0; i < lines.length; i++) {
      var c = lines[i];
      if (!c) continue;

      var row = document.createElement('div');
      row.className = 'comms-row';

      var label = document.createElement('div');
      label.className = 'c-label';
      label.textContent = c.label || '';

      var status = document.createElement('div');
      // Map status -> CSS tier class.
      var tier = 'c-open';
      if (c.status === 'warn') tier = 'c-warn';
      else if (c.status === 'down') tier = 'c-down';
      status.className = 'c-status ' + tier;

      var dot = document.createElement('span');
      dot.className = 'c-dot';
      status.appendChild(dot);
      status.appendChild(document.createTextNode((c.readout || c.status || '').toUpperCase()));

      var note = document.createElement('div');
      note.className = 'c-note';
      note.textContent = c.note || '';

      row.appendChild(label);
      row.appendChild(status);
      row.appendChild(note);
      host.appendChild(row);
    }
  }

  // -------------------------------------------------------------------------
  // Navigation — all three buttons are passthroughs to the existing
  // pf-open router in background.js. Clicking BEGIN TEXTILE WORK opens
  // the main tracker (popup.html) exactly as the toolbar icon used to.
  // -------------------------------------------------------------------------
  function go(path) {
    // Let the dispatch module tear down its pending timer (and, in
    // future, push any confession line to the message log) BEFORE we
    // hand control off to the background router.
    try {
      if (window.HouseDispatch && typeof window.HouseDispatch.onLeave === 'function') {
        window.HouseDispatch.onLeave();
      }
    } catch (e) { /* ignore */ }

    try {
      chrome.runtime.sendMessage({ type: 'pf-open', path: path });
    } catch (e) {
      // If the router is unavailable for any reason, fall back to a plain
      // navigation in the current tab. This never runs in practice but
      // keeps the window robust on cold start.
      window.location.href = path;
    }
  }

  function wireNav() {
    var toPopup = $('toPopupBtn');
    if (toPopup) toPopup.addEventListener('click', function () { go('popup.html'); });

    var toLoom = $('toLoomBtn');
    if (toLoom) toLoom.addEventListener('click', function () { go('gallery.html'); });

    var toFactory = $('toFactoryBtn');
    if (toFactory) toFactory.addEventListener('click', function () { go('factory.html'); });

    var begin = $('beginWorkBtn');
    if (begin) begin.addEventListener('click', function () { go('popup.html'); });

    var begin2 = $('beginWorkBtn2');
    if (begin2) begin2.addEventListener('click', function () { go('factory.html'); });

  }

  // -------------------------------------------------------------------------
  // Boot — fetch the state once, wire up nav, and subscribe to storage
  // changes so the rap sheet updates in real time if the player is also
  // playing in another window. The subscription is purely a re-read.
  // -------------------------------------------------------------------------
  function boot() {
    wireNav();
    try {
      chrome.storage.local.get(STATE_KEY, function (result) {
        state = (result && result[STATE_KEY]) || {};
        render();
      });
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area !== 'local') return;
        if (!changes[STATE_KEY]) return;
        state = changes[STATE_KEY].newValue || {};
        render();
      });
    } catch (e) {
      // No chrome.storage available (unlikely in production). Render a
      // cold-start rap sheet from an empty state.
      state = {};
      render();
    }

    // Each household member has its own staggered rotation timer,
    // started from render() via ensureMemberTimers(). No global seed
    // bump here — we explicitly want family members to change activity
    // at DIFFERENT times, not all on the same tick.
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
