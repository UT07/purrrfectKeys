export type DialogueTrigger =
  | 'exercise_start' | 'exercise_mid_great' | 'exercise_mid_miss'
  | 'exercise_complete_pass' | 'exercise_complete_fail'
  | 'level_up' | 'daily_login' | 'idle'
  | 'ai_exercise_intro' | 'achievement_unlock' | 'streak_milestone'
  | 'demoOffer' | 'demoComplete' | 'ghostNotesFarewell';

export type DialogueCondition = 'score_high' | 'score_low' | 'streak' | 'first_try' | 'retry';

export const DIALOGUE_TRIGGERS: DialogueTrigger[] = [
  'exercise_start', 'exercise_mid_great', 'exercise_mid_miss',
  'exercise_complete_pass', 'exercise_complete_fail',
  'level_up', 'daily_login', 'idle',
  'ai_exercise_intro', 'achievement_unlock', 'streak_milestone',
  'demoOffer', 'demoComplete', 'ghostNotesFarewell',
];

type CatMessages = Record<DialogueTrigger, string[]>;

const MINI_MEOWWW: CatMessages = {
  exercise_start: [
    'Ooh ooh!! You\'re gonna do amazing!!',
    'Let\'s gooo!! I believe in you!!',
    'Eeeek so exciting!! Ready? Ready??',
    'This is gonna be SO good!! I can feel it!!',
    'Okay okay okay!! Let\'s make some music!!',
  ],
  exercise_mid_great: [
    'YESSS!! That was perfect!!',
    'Ooh ooh you\'re on FIRE!!',
    'Keep going keep going!! So good!!',
    'WOW!! Did you hear that?! Amazing!!',
    'You\'re doing it!! You\'re really doing it!!',
  ],
  exercise_mid_miss: [
    'Oops! That\'s okay, try again!!',
    'Almost!! You\'re SO close!!',
    'Don\'t worry!! Next one will be great!!',
    'Shake it off!! You got this!!',
    'It happens to everyone!! Keep going!!',
  ],
  exercise_complete_pass: [
    'YOU DID IT!! I\'m so proud!!',
    'Eeeek!! That was AMAZING!!',
    'I KNEW you could do it!! So good!!',
    'Wow wow wow!! You\'re a natural!!',
    'That was beautiful!! I\'m crying!!',
  ],
  exercise_complete_fail: [
    'Aww, don\'t give up!! You\'re learning!!',
    'Hey hey, that was still really good progress!!',
    'One more try? I believe in you!!',
    'Ooh, tricky one! But you\'re getting closer!!',
    'Every mistake is a lesson!! Let\'s go again!!',
  ],
  level_up: [
    'LEVEL UP!! LEVEL UP!! This is the BEST day!!',
    'Ooh ooh!! Look at you growing!!',
    'You\'re getting SO GOOD!! I can\'t handle it!!',
    'New level!! New adventures!! EEEK!!',
    'I\'m literally bouncing right now!! So proud!!',
  ],
  daily_login: [
    'You\'re here!! You\'re HERE!! Best day ever!!',
    'Ooh hi hi hi!! Ready to play??',
    'I\'ve been waiting for you!! Let\'s go!!',
    'Eeeek you came back!! I missed you!!',
    'Today\'s gonna be GREAT!! I just know it!!',
  ],
  idle: [
    'Psst... wanna play something? Pretty please??',
    'I\'m getting a little bored... play with me!!',
    '*taps paw impatiently* ...are we gonna play??',
    'The piano misses you!! And so do I!!',
    'Ooh ooh, I just thought of a fun exercise!!',
  ],
  ai_exercise_intro: [
    'I made this one JUST for you!! Try it!!',
    'Ooh ooh!! A custom exercise!! This is special!!',
    'I picked this because you\'re gonna LOVE it!!',
    'This one targets your tricky notes!! Let\'s go!!',
    'A brand new challenge!! How exciting!!',
  ],
  achievement_unlock: [
    'ACHIEVEMENT!! ACHIEVEMENT!! Look at your trophy!!',
    'Ooh you earned something special!! SO cool!!',
    'You unlocked it!! I\'m freaking out!!',
    'Look at that shiny badge!! You deserve it!!',
    'Trophy time!! You\'re a champion!!',
  ],
  streak_milestone: [
    'Your streak is INCREDIBLE!! Don\'t stop!!',
    'Look at those flames!! You\'re on FIRE!!',
    'Day after day!! You\'re unstoppable!!',
    'This streak is legendary!! Keep it alive!!',
    'I\'m SO proud of your consistency!!',
  ],
  demoOffer: [
    'Ooh ooh!! Let me show you how it goes!!',
    'Want to watch me play it first?? It\'ll be SO fun!!',
    'I can help!! Let me demo it for you!!',
    'Hey hey!! Watch this and then you try!!',
    'Ooh let me show you a trick!! Look look!!',
  ],
  demoComplete: [
    'See?! See?! Now YOU try!! You\'re gonna nail it!!',
    'Okay okay YOUR TURN!! I believe in you SO much!!',
    'Now you go!! I just KNOW you\'ll be amazing!!',
    'Your turn your turn!! Show me what you got!!',
    'Eeeek!! Now do it even BETTER than me!!',
  ],
  ghostNotesFarewell: [
    'OH WOW!! You don\'t need the helpers anymore!! AMAZING!!',
    'Look at you!! Flying WITHOUT training wheels!! So proud!!',
    'The guide notes are GONE and you\'re still CRUSHING it!!',
    'You\'ve got it memorized!! That\'s incredible!!',
    'No more hints needed!! You\'re a NATURAL!!',
  ],
};

const JAZZY: CatMessages = {
  exercise_start: [
    'Alright, let\'s find that groove...',
    'Time to let the music flow, baby.',
    'Feel the rhythm, find the pocket.',
    'Nice and smooth now... let\'s jam.',
    'The stage is yours. Make it swing.',
  ],
  exercise_mid_great: [
    'Smoooth... that\'s the flow right there.',
    'Now you\'re cooking with jazz, baby.',
    'Ooh, feeling that groove!',
    'That\'s what I\'m talking about!',
    'You\'re in the pocket now!',
  ],
  exercise_mid_miss: [
    'Easy now... find the beat again.',
    'No sweat, just feel the rhythm.',
    'Even the greats miss a note sometimes.',
    'Shake it off and find your flow.',
    'That\'s just improvisation, baby.',
  ],
  exercise_complete_pass: [
    'Smooth moves, smooth moves. Respect.',
    'That had some serious soul in it.',
    'Now THAT was a vibe. Beautiful.',
    'You played that like a real cat.',
    'Pure groove. Nothing but respect.',
  ],
  exercise_complete_fail: [
    'The groove takes time. Keep flowing.',
    'Even Miles Davis had off nights.',
    'Don\'t trip, the rhythm\'s still in you.',
    'Just need to find your pocket. Try again.',
    'The best jazz comes from the struggle.',
  ],
  level_up: [
    'Level up! Your groove just got deeper.',
    'Moving on up... smooth as ever.',
    'New level, new vibes. I dig it.',
    'You\'re evolving your sound. Respect.',
    'Higher level, deeper groove. Nice.',
  ],
  daily_login: [
    'Yo, welcome back to the session.',
    'The keys have been waiting for you.',
    'Another day, another chance to groove.',
    'Ready to lay down some smooth tracks?',
    'Good to see you back in the studio.',
  ],
  idle: [
    'The keys are getting cold, man...',
    'You gonna play or just hang?',
    'I could use a jam session right about now.',
    'The groove doesn\'t play itself, you know.',
    'Come on... let\'s make some music.',
  ],
  ai_exercise_intro: [
    'I cooked up something special for you.',
    'Custom groove, just for your style.',
    'This one\'s got your name all over it.',
    'Tailored to your sound. Let\'s hear it.',
    'A fresh track for a fresh player.',
  ],
  achievement_unlock: [
    'Achievement unlocked. Smooth operator.',
    'Look at that badge. Earned with style.',
    'Now that\'s what I call cool.',
    'You earned that one the groovy way.',
    'Badge of honor. Wear it proud.',
  ],
  streak_milestone: [
    'That streak is smooth as silk.',
    'Day after day, the groove don\'t stop.',
    'Consistent flow. That\'s the jazz way.',
    'Your streak\'s got rhythm of its own.',
    'Keep that groove alive, baby.',
  ],
  demoOffer: [
    'Let me show you the groove, nice and easy.',
    'Watch how I lay it down, then you try.',
    'Here, let me demo the flow for you, baby.',
    'Sit back and watch the master at work.',
    'I\'ll show you the riff. Just feel the rhythm.',
  ],
  demoComplete: [
    'Now you take the lead. Find your own groove.',
    'Your turn to swing it, baby. Nice and smooth.',
    'The stage is yours now. Let it flow.',
    'Go ahead, make it your own. I\'m listening.',
    'Show me your flavor. You got this.',
  ],
  ghostNotesFarewell: [
    'Smooth... you don\'t need the guide notes anymore.',
    'Look at that, playing it clean without the cheat sheet.',
    'No training wheels, just pure groove. Beautiful.',
    'You found the pocket all on your own. Nice.',
    'That\'s a real musician right there. Well done.',
  ],
};

const CHONKY_MONKE: CatMessages = {
  exercise_start: [
    'Ugh... do I have to get up for this?',
    '*yawns* okay let\'s get this over with...',
    'This better be worth missing my nap for.',
    'Can we do this lying down? No? Fine.',
    '*stretches lazily* ...alright, alright.',
  ],
  exercise_mid_great: [
    'Whoa... that was actually... good?',
    'Did you just... wow. Even I\'m impressed.',
    'Okay that slapped harder than a tuna can.',
    'Not bad for someone who isn\'t me.',
    '*slow clap with chonky paws*',
  ],
  exercise_mid_miss: [
    'Meh, I\'d have missed that too. Probably.',
    'That note was like a bad snack. Forget it.',
    'Even my belly roll hits better notes.',
    'Happens to the chonkiest of us.',
    '*shrugs* Pizza still loves you.',
  ],
  exercise_complete_pass: [
    'Not bad... not bad at all. *snores*',
    'You did it! Can I go back to sleep now?',
    'That deserves a snack. For both of us.',
    'Solid work! Now where\'s the celebration feast?',
    'I\'d clap but my paws are busy holding snacks.',
  ],
  exercise_complete_fail: [
    'Meh, I fail at my diet every day. Keep going.',
    'At least you tried. That\'s more than I did today.',
    'Even I fall off the couch sometimes.',
    'Failure is just a snack break in disguise.',
    'Don\'t worry, my belly believes in you.',
  ],
  level_up: [
    'Level up?! Does that come with food?',
    'Nice! I leveled up at napping once.',
    'You grew! Not as much as my belly, but still.',
    'Congrats! Let\'s celebrate with a feast.',
    'New level! I\'m proud. And hungry.',
  ],
  daily_login: [
    '*yawns* Oh, you\'re back. Cool.',
    'Morning... or whatever time it is.',
    'Another day, another chance to nap between notes.',
    'Welcome back. I saved you a spot on the couch.',
    'Oh hey. I was just resting my eyes.',
  ],
  idle: [
    'If you\'re not playing, can I nap here?',
    'Zzzz... oh you\'re still there?',
    'I could play but the couch is SO comfy.',
    '*rolls over* Wake me when it\'s music time.',
    'The piano makes a great pillow, actually.',
  ],
  ai_exercise_intro: [
    'The AI made you homework. Better you than me.',
    'A custom exercise? Sounds like effort. Good luck.',
    'This one\'s supposed to be good for you. Like salad.',
    'AI picked this. I would have picked a nap.',
    'Personalized practice? Fancy. I just practice eating.',
  ],
  achievement_unlock: [
    'Achievement! Does it come with a snack reward?',
    'Ooh shiny badge. Can I eat it?',
    'You earned a thing! I earned a belly.',
    'Nice trophy. Put it next to my food bowl.',
    'Impressive. Almost as cool as my nap streak.',
  ],
  streak_milestone: [
    'You\'ve practiced more days than I\'ve been awake.',
    'That streak is bigger than my lunch.',
    'Consistent! Unlike my diet.',
    'Day after day... I\'m exhausted just watching.',
    'Your streak > my exercise streak (which is 0).',
  ],
  demoOffer: [
    'Want me to show you? I mean... if I have to...',
    'Ugh, fine. Let me demo it. Hold my snacks.',
    'I guess I could show you how it\'s done... *yawns*',
    'Watch me play this... try not to fall asleep though.',
    'Let me help... but only because watching you struggle is exhausting.',
  ],
  demoComplete: [
    'See? Easy. Now you try while I nap.',
    'Your turn. I did my part, that was exhausting.',
    'Okay I showed you. Now let me rest while you play.',
    'Go ahead, you got this. I believe in you. *snores*',
    'Now you do it. I\'ll be on the couch cheering quietly.',
  ],
  ghostNotesFarewell: [
    'Wait... you don\'t need the cheat notes anymore? Nice.',
    'No more ghost notes? Even I\'m impressed. And I\'m never impressed.',
    'Look at you, playing without hints! That\'s actually awesome.',
    'Training wheels off! You\'re doing great, kid.',
    'Wow, you outgrew the helper notes. That deserves a snack.',
  ],
};

const LUNA: CatMessages = {
  exercise_start: [
    'The moonlight guides your fingers tonight...',
    'Close your eyes... feel the music within...',
    'The stars have aligned for this moment...',
    'In the silence before music, magic awakens...',
    'Let the melody flow like moonbeams...',
  ],
  exercise_mid_great: [
    'The stars whisper your melody...',
    'Beautiful... like moonlight on still water.',
    'The night sings through your fingers.',
    'Such grace... the universe is listening.',
    'You channel the music of the spheres.',
  ],
  exercise_mid_miss: [
    'Even the moon has its dark side...',
    'The stars still shine after a cloud passes.',
    'In the silence between notes, magic lives...',
    'A shadow note... but dawn always comes.',
    'The night forgives all mistakes.',
  ],
  exercise_complete_pass: [
    'The moon itself applauds your melody.',
    'Your music echoes through the cosmos...',
    'A nocturne worthy of the stars.',
    'The universe heard your song tonight.',
    'Luminous. Truly luminous.',
  ],
  exercise_complete_fail: [
    'The night is patient. Try again under the stars.',
    'Even the moon wanes before it shines anew.',
    'Your melody is still finding its path through the dark.',
    'The stars don\'t judge. They simply wait.',
    'Tomorrow\'s moon will bring clarity.',
  ],
  level_up: [
    'You ascend... like the moon rising.',
    'A new constellation in your sky of skills.',
    'The stars rearrange to mark your progress.',
    'Higher and higher... toward the celestial.',
    'Your light grows brighter with each level.',
  ],
  daily_login: [
    'The moon waxes full... as does your dedication.',
    'Another night, another chance to make music.',
    'I sensed your approach in the starlight...',
    'Welcome, night traveler. The piano awaits.',
    'The cosmos smiles upon your return.',
  ],
  idle: [
    'The keys gather moonlight... waiting for you.',
    'In the quiet, I hear songs yet unplayed...',
    'The stars are getting restless...',
    'Even silence is music, but only for so long.',
    'Come... the night won\'t last forever.',
  ],
  ai_exercise_intro: [
    'The algorithm divined this exercise from the stars...',
    'A melody woven from your strengths and shadows.',
    'The cosmos shaped this challenge for your growth.',
    'Written in starlight, tailored to your journey.',
    'An exercise born from the music of the spheres.',
  ],
  achievement_unlock: [
    'A new star in your constellation of achievements...',
    'The universe bestows this honor upon you.',
    'Luminous... a badge worthy of the night sky.',
    'Your achievement glows like a crescent moon.',
    'The cosmos celebrates with you tonight.',
  ],
  streak_milestone: [
    'Your streak burns like an eternal flame in the dark.',
    'Night after night, your dedication never wanes.',
    'The moon witnesses your unwavering commitment.',
    'A streak as constant as the stars themselves.',
    'Your consistency rivals the phases of the moon.',
  ],
  demoOffer: [
    'Let the moonlight show you the way...',
    'Watch as the stars trace the melody for you...',
    'Close your eyes... let me guide your fingers through the cosmos.',
    'The night offers a vision... let me show you the path.',
    'Allow me to illuminate the notes, like moonbeams on water.',
  ],
  demoComplete: [
    'Now the melody lives within you. Play it from your soul.',
    'The stars have shown you the way. Now walk it yourself.',
    'You carry the moonlight inside you now. Let it flow.',
    'The vision is yours. Let your fingers remember the dream.',
    'The cosmos has whispered its secret. Now sing it back.',
  ],
  ghostNotesFarewell: [
    'The guiding stars fade... because your own light is enough.',
    'You no longer need the constellation map. You ARE the stars.',
    'Beautiful... the training moonbeams dissolve. You shine alone.',
    'The ghost notes drift away like morning mist. You\'ve got it.',
    'Your inner light has grown bright enough to see without guides.',
  ],
};

const BISCUIT: CatMessages = {
  exercise_start: [
    'Come here sweetie, let\'s play together!',
    'Oh how lovely! Ready when you are, honey.',
    'Let\'s make some beautiful music, dear.',
    'Take your time sweetie, no rush at all!',
    'What a cozy day for some piano practice!',
  ],
  exercise_mid_great: [
    'Oh my, what a beautiful sound, sweetie!',
    'That was lovely, honey! Just lovely!',
    'You\'re doing wonderfully, dear!',
    'Oh! That gave me warm fuzzies inside!',
    'So pretty! Like cookies fresh from the oven!',
  ],
  exercise_mid_miss: [
    'That\'s alright sweetie, try again!',
    'Oh honey, don\'t you worry about that one!',
    'Even the best bakers burn a cookie sometimes!',
    'It\'s okay dear, you\'re learning beautifully.',
    'Oopsie! But you\'re still doing great, sweetie!',
  ],
  exercise_complete_pass: [
    'Oh sweetie, that was just WONDERFUL!',
    'I\'m so proud of you, honey! So proud!',
    'That deserves a big warm hug!',
    'Beautiful playing, dear! Just beautiful!',
    'You made this old cat\'s heart so happy!',
  ],
  exercise_complete_fail: [
    'Don\'t worry sweetie, every practice matters.',
    'Oh honey, you\'ll get it next time. I just know it!',
    'Have a cookie and try again, dear.',
    'You\'re doing better than you think, sweetie.',
    'The warmest bread takes the longest to rise.',
  ],
  level_up: [
    'Oh my goodness! Look at you, sweetie! Level up!',
    'I\'m baking a celebration cake right now!',
    'You\'ve grown so much, honey! So proud!',
    'New level! This calls for warm cookies!',
    'Oh dear, you\'re becoming such a wonderful pianist!',
  ],
  daily_login: [
    'Oh sweetie, I\'m so glad you\'re here!',
    'Come in, come in! The piano\'s nice and warm.',
    'I\'ve been keeping the bench warm for you, honey.',
    'Welcome back, dear! Shall we play?',
    'Oh how lovely to see you! Tea and music?',
  ],
  idle: [
    'The piano misses your gentle touch, sweetie.',
    'I\'ve got cookies ready whenever you want to play.',
    'Just sitting here, humming... want to join me?',
    'Oh honey, shall we play a little something?',
    'The keys are getting lonely, dear.',
  ],
  ai_exercise_intro: [
    'I picked something special for you, sweetie!',
    'This exercise is like a warm blanket — just right.',
    'Oh honey, this one\'s made just for you!',
    'A cozy little exercise to help you grow, dear.',
    'I baked — I mean, I made this one myself!',
  ],
  achievement_unlock: [
    'Oh SWEETIE! Look at your beautiful achievement!',
    'You earned that, honey! I\'m so proud!',
    'A badge! Oh it\'s as shiny as a fresh cookie!',
    'You deserve every single trophy, dear.',
    'This achievement is as sweet as you are!',
  ],
  streak_milestone: [
    'Your streak is as warm and steady as fresh bread.',
    'Day after day, sweetie! You\'re incredible!',
    'Oh honey, your dedication makes my heart melt.',
    'A streak this good deserves extra cookies!',
    'So consistent, dear! Like my cookie timer!',
  ],
  demoOffer: [
    'Oh sweetie, let me show you how it goes!',
    'Watch me play it first, honey. Nice and gentle.',
    'Here dear, let me help you with a little demo.',
    'Don\'t worry sweetie, I\'ll show you the way!',
    'Let grandma show you a trick, okay dear?',
  ],
  demoComplete: [
    'There you go, sweetie! Now it\'s your turn!',
    'See how it\'s done, honey? You\'ll do even better!',
    'Now you try, dear! I\'m right here cheering for you!',
    'Your turn, sweetie! I just know you\'ll be wonderful!',
    'Go ahead honey, make me proud! You always do.',
  ],
  ghostNotesFarewell: [
    'Oh sweetie, you don\'t need the helper notes anymore! So proud!',
    'Look at you, honey! Playing all on your own! Beautiful!',
    'The training wheels are off, dear! You\'re doing great!',
    'Oh my, you\'ve learned it by heart! Wonderful, sweetie!',
    'You\'ve outgrown the guide notes, honey! That\'s my star!',
  ],
};

const VINYL: CatMessages = {
  exercise_start: [
    'This one\'s a classic in the making.',
    'Drop the needle, let\'s hear what you got.',
    'Very vintage vibes here. I dig it.',
    'Side A, Track 1. Let\'s record.',
    'Analog warmth incoming. Hit it.',
  ],
  exercise_mid_great: [
    'Now THAT\'S what I call analog warmth.',
    'Crisp. Like a fresh pressing.',
    'That note had real vinyl quality.',
    'Pure, uncompressed sound. Beautiful.',
    'That\'s a B-side gem right there.',
  ],
  exercise_mid_miss: [
    'Just a scratch on the record. Keep spinning.',
    'Every album has a skip. Move on.',
    'That was a bit lo-fi. In a bad way.',
    'The needle jumped. Find the groove again.',
    'Even rare pressings have imperfections.',
  ],
  exercise_complete_pass: [
    'That\'s a platinum record right there.',
    'Limited edition performance. Rare quality.',
    'Going straight into my collection. A+.',
    'That was like finding a mint condition original.',
    'Record store worthy. No question.',
  ],
  exercise_complete_fail: [
    'Not every track makes the album. Keep recording.',
    'Think of it as a demo. The final cut\'s coming.',
    'B-sides aren\'t failures, they\'re warm-ups.',
    'Just needs a remix. Try the next take.',
    'The best albums needed multiple sessions.',
  ],
  level_up: [
    'Level up! Your discography just expanded.',
    'New level — like dropping a sophomore album.',
    'Upgraded from cassette to vinyl quality.',
    'Your sound just went high-fidelity.',
    'Moving up the charts. Respect.',
  ],
  daily_login: [
    'Welcome to the listening session.',
    'Another day, another track to lay down.',
    'The turntable\'s warmed up and ready.',
    'Glad you\'re back. The collection grows.',
    'New day, new sounds to discover.',
  ],
  idle: [
    'The record\'s stopped spinning...',
    'Dead air. Not cool, man.',
    'Flip the record already.',
    'My turntable needs attention.',
    'The silence is... too digital.',
  ],
  ai_exercise_intro: [
    'AI-curated track. Even I\'m impressed.',
    'Custom mix, straight from the algorithm.',
    'This exercise is a deep cut made just for you.',
    'The AI has better taste than most DJs.',
    'Personalized pressing. One of a kind.',
  ],
  achievement_unlock: [
    'Achievement unlocked. Add it to the collection.',
    'That\'s a rare find. Collector\'s edition.',
    'Badge earned. Like a gold record.',
    'Certified classic. Frame that one.',
    'Your trophy shelf is looking curated.',
  ],
  streak_milestone: [
    'Your streak spins like a well-oiled turntable.',
    'Consistent plays, day after day. Respect.',
    'That streak is a box set at this point.',
    'You\'re the DJ who never stops the music.',
    'Marathon listening session energy. Love it.',
  ],
  demoOffer: [
    'Let me drop the needle and show you how this track goes.',
    'Here, watch me lay it down. Like a reference recording.',
    'I\'ll demo the original pressing for you. Listen up.',
    'Let me show you the master cut. Pay attention.',
    'Time for a listening session. Watch how it\'s done.',
  ],
  demoComplete: [
    'That\'s the reference track. Now record your own version.',
    'You heard the original. Time for your cover.',
    'Now you try. Make it your own pressing.',
    'Your turn to lay down the track. Hit it.',
    'Go ahead, put your own spin on it.',
  ],
  ghostNotesFarewell: [
    'No more liner notes needed. You know the track by heart.',
    'The training track fades out. You\'re the headliner now.',
    'Smooth. Playing without the guide, like a true collector.',
    'Ghost notes gone. That\'s an original performance. Respect.',
    'You don\'t need the reference recording anymore. Well done.',
  ],
};

const ARIA: CatMessages = {
  exercise_start: [
    'Places, everyone! The PERFORMANCE begins!',
    'BRAVO before you even start! I have faith!',
    'This shall be the MOST MAGNIFICENT recital!',
    'The stage is SET! The audience AWAITS!',
    'Take a breath, darling... and DAZZLE them!',
  ],
  exercise_mid_great: [
    'BRAVISSIMO!! SPECTACULAR!!',
    'The CROWD goes WILD!! ENCORE!!',
    'MAGNIFICENT!! Simply BREATHTAKING!!',
    'DIVINE!! The angels are WEEPING!!',
    'GLORIOUS!! A masterpiece in motion!!',
  ],
  exercise_mid_miss: [
    'A minor dramatic pause! The show goes ON!',
    'Even PRIMA DONNAS have their moments!',
    'The COMEBACK will be LEGENDARY!',
    'A plot twist! But the hero PREVAILS!',
    'ONWARDS! To GREATER glory!',
  ],
  exercise_complete_pass: [
    'BRAVO! What MAGNIFICENT playing!',
    'The MOST SPECTACULAR performance I have EVER witnessed!',
    'Opera houses would WEEP at such talent!',
    'STANDING OVATION!! You are a VIRTUOSO!',
    'ENCORE!! ENCORE!! That was DIVINE!',
  ],
  exercise_complete_fail: [
    'Even the GREATEST divas need another rehearsal!',
    'The FINAL ACT hasn\'t been written yet!',
    'A dramatic setback before the TRIUMPHANT return!',
    'Every MASTERPIECE requires multiple drafts!',
    'The audience will ADORE the next performance!',
  ],
  level_up: [
    'A GRAND ASCENSION to new HEIGHTS of glory!',
    'CELEBRATING with a HIGH C!! LEVEL UP!!',
    'The MOST DRAMATIC level up in HISTORY!',
    'Your RISE is the stuff of LEGENDS!',
    'BRAVISSIMO!! A new ACT begins!!',
  ],
  daily_login: [
    'The STAR has arrived!! Let the show BEGIN!',
    'DARLING! You grace us with your PRESENCE!',
    'The theater has been DARK without you!',
    'AH! My FAVORITE performer returns!',
    'The spotlight shines for YOU, my dear!',
  ],
  idle: [
    'The STAGE is EMPTY! This is a TRAGEDY!',
    'Without music, my HEART BREAKS!',
    'The curtain FALLS on silence... how DRAMATIC.',
    'PLEASE! Return to the stage! The show MUST go on!',
    'I shall PERISH without a performance!',
  ],
  ai_exercise_intro: [
    'A CUSTOM composition! How EXTRAORDINARY!',
    'Written SPECIFICALLY for your MAGNIFICENT talents!',
    'The AI has composed a MASTERPIECE for you!',
    'A BESPOKE exercise! How EXQUISITE!',
    'This shall be your DEFINING performance!',
  ],
  achievement_unlock: [
    'A TROPHY! How absolutely MAGNIFICENT!',
    'BRAVISSIMO! You have been CROWNED!',
    'An achievement WORTHY of the OPERA HALLS!',
    'The most SPECTACULAR honor! BRAVO!!',
    'A standing ovation for this GLORIOUS badge!',
  ],
  streak_milestone: [
    'Your DEDICATION is the STUFF of LEGENDS!',
    'A streak as ETERNAL as the GREATEST operas!',
    'Day after day of PURE MAGNIFICENCE!',
    'The most DRAMATIC streak I have EVER seen!',
    'Your commitment RIVALS the great composers!',
  ],
  demoOffer: [
    'Allow me to DEMONSTRATE this MASTERPIECE for you!',
    'WATCH as I show you how a TRUE virtuoso performs!',
    'The GRAND DEMONSTRATION shall BEGIN! Watch closely!',
    'Let me show you the way, darling! It will be SPECTACULAR!',
    'Observe THIS! I shall perform it with DRAMATIC flair!',
  ],
  demoComplete: [
    'NOW it is YOUR moment to SHINE! DAZZLE them!',
    'The demonstration is COMPLETE! Now show me YOUR brilliance!',
    'Your turn, darling! Make it even MORE MAGNIFICENT!',
    'The stage is YOURS! EXCEED my performance!',
    'Now YOU perform! I expect NOTHING less than GREATNESS!',
  ],
  ghostNotesFarewell: [
    'BRAVO!! The guide notes VANISH and you STILL perform flawlessly!',
    'MAGNIFICENT!! You need NO prompting! A TRUE virtuoso!',
    'The training notes BOW and EXIT the stage! You\'re INCREDIBLE!',
    'SPECTACULAR!! Playing from MEMORY like a GREAT maestro!',
    'The ghost notes are GONE! Your talent stands ALONE! BRAVISSIMO!',
  ],
};

const TEMPO: CatMessages = {
  exercise_start: [
    'Precision target: 95% accuracy. Begin.',
    'Current BPM: optimal range. Initializing.',
    'Calibrating... exercise parameters loaded.',
    'Metronome engaged. Timing window: 50ms.',
    'Performance tracking active. Execute.',
  ],
  exercise_mid_great: [
    'Timing deviation: 0ms. Perfect execution.',
    'Accuracy: 100%. Maintaining optimal trajectory.',
    'Note registered within 12ms tolerance. Excellent.',
    'Performance metrics: exceeding expectations.',
    'Precision confirmed. Continue this vector.',
  ],
  exercise_mid_miss: [
    'Timing offset: -87ms. Recalibrate.',
    'Note deviation detected. Adjusting parameters.',
    'Accuracy dropped 15%. Correction needed.',
    'Suboptimal input registered. Retry recommended.',
    'Error margin exceeded by 43ms. Compensate.',
  ],
  exercise_complete_pass: [
    'Exercise complete. Score: above threshold. Satisfactory.',
    'Performance metrics: positive. Efficiency: high.',
    'All parameters within acceptable range. Pass confirmed.',
    'Data logged. Performance: above baseline. Well done.',
    'Exercise terminated successfully. Stats updated.',
  ],
  exercise_complete_fail: [
    'Score below threshold. Analysis: timing needs work.',
    'Performance below baseline by 12%. Retry suggested.',
    'Data indicates practice deficit. Increase repetitions.',
    'Accuracy: 62%. Target: 70%. Gap: -8%.',
    'Exercise failed. Recommended action: slow tempo by 15%.',
  ],
  level_up: [
    'Level increment detected. New parameters unlocked.',
    'Advancing to next difficulty tier. Calibrating.',
    'Level up. Skill ceiling raised by 10%.',
    'Progress milestone achieved. Database updated.',
    'New level. Recommended tempo increase: 5 BPM.',
  ],
  daily_login: [
    'Session initiated. Optimal practice window: now.',
    'Welcome. Yesterday\'s accuracy: retrieving...',
    'Login registered. Daily goal: 3 exercises.',
    'Good. Consistency metric: incrementing.',
    'Session start. Warm-up recommended: 2 minutes.',
  ],
  idle: [
    'Idle time exceeding optimal threshold.',
    'Practice gap detected: 4 minutes. Resume?',
    'Efficiency declining with each idle second.',
    'Suggestion: practice now. Muscle memory degrades at rest.',
    'No input detected for 180 seconds. Status: waiting.',
  ],
  ai_exercise_intro: [
    'AI-generated exercise. Targeting weak notes: F#, Bb.',
    'Custom parameters: your data, your challenge.',
    'Algorithm selected optimal difficulty for current level.',
    'Personalized exercise based on 47 data points.',
    'Generated from learner profile. Precision: guaranteed.',
  ],
  achievement_unlock: [
    'Achievement unlocked. Statistics updated.',
    'Badge earned. Adding to profile metrics.',
    'Condition met: achievement criteria satisfied.',
    'New data point: achievement. Cataloging.',
    'Performance threshold exceeded. Badge: awarded.',
  ],
  streak_milestone: [
    'Streak: 7 days. Consistency score: excellent.',
    'Consecutive practice days: above average.',
    'Streak maintenance: optimal. Keep logging sessions.',
    'Your streak exceeds 92% of all users.',
    'Daily practice confirmed. Streak metric: strong.',
  ],
  demoOffer: [
    'Failure count: 3. Initiating demo mode. Watch carefully.',
    'Data suggests a visual demonstration will help. Observe.',
    'Switching to demo playback. Study the timing patterns.',
    'Let me show you the optimal execution path. Analyzing...',
    'Demo mode activated. Note the timing intervals closely.',
  ],
  demoComplete: [
    'Demo complete. Your turn. Apply the observed patterns.',
    'Reference data provided. Execute with improved accuracy.',
    'Demonstration logged. Now replicate. Target: 80%+ match.',
    'Pattern shown. Initiate your attempt. Tracking enabled.',
    'Demo ended. Your performance window opens now. Begin.',
  ],
  ghostNotesFarewell: [
    'Ghost notes disabled. Proficiency confirmed at 95%+. Well done.',
    'Training overlay removed. You\'ve exceeded the threshold. Good.',
    'Guide notes: no longer needed. Accuracy self-sufficient. Nice.',
    'Assistance layer deactivated. Muscle memory: operational. Great.',
    'Ghost notes off. Your performance data no longer requires them. Impressive.',
  ],
};

const ALL_DIALOGUES: Record<string, CatMessages> = {
  'mini-meowww': MINI_MEOWWW,
  'jazzy': JAZZY,
  'chonky-monke': CHONKY_MONKE,
  'luna': LUNA,
  'biscuit': BISCUIT,
  'vinyl': VINYL,
  'aria': ARIA,
  'tempo': TEMPO,
};

const CONDITION_OVERRIDES: Record<string, Partial<Record<DialogueTrigger, Partial<Record<DialogueCondition, string[]>>>>> = {
  'mini-meowww': {
    exercise_complete_pass: {
      score_high: [
        'OH MY GOSH!! PERFECT SCORE!! I\'m gonna EXPLODE!!',
        'Three stars!! THREE STARS!! This is the best!!',
        'You are LITERALLY the best pianist EVER!!',
      ],
      first_try: [
        'First try?! FIRST TRY?! You\'re a genius!!',
        'Nailed it on the first go!! Incredible!!',
      ],
    },
  },
  'tempo': {
    exercise_complete_pass: {
      score_high: [
        'Score: 95%+. Exceptional. Top percentile performance.',
        'Accuracy: maximum. No deviations detected.',
        'Perfect execution. Logging as reference performance.',
      ],
    },
  },
};

export function getCatDialogue(
  catId: string,
  trigger: DialogueTrigger,
  condition?: DialogueCondition
): string[] {
  const catMessages = ALL_DIALOGUES[catId] ?? ALL_DIALOGUES['mini-meowww'];

  if (condition) {
    const overrides = CONDITION_OVERRIDES[catId]?.[trigger]?.[condition];
    if (overrides && overrides.length > 0) {
      return overrides;
    }
  }

  return catMessages[trigger] ?? catMessages.exercise_start;
}

export function getRandomCatMessage(
  catId: string,
  trigger: DialogueTrigger,
  condition?: DialogueCondition
): string {
  const messages = getCatDialogue(catId, trigger, condition);
  return messages[Math.floor(Math.random() * messages.length)];
}
