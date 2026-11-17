import type { CompanionId } from './companions'

export type CompanionAction = 'idle' | 'pat' | 'hurt' | 'jump' | 'attack' | 'sleep' | 'happy' | 'visitor' | 'evolution' | 'greeting'
export type CompanionDialogue = Record<CompanionAction, string[]>

export const creatureDialogues: Record<CompanionId, CompanionDialogue> = {
  spark: {
    idle: ['Just chilling here, master.', 'I wonder what we’ll discover next!', 'This little corner has a good buzz.'],
    pat: ['Hehe! That tickles, master!', 'Aww, one more little pat?', 'You found my ticklish spot!'],
    hurt: ['Ouch! Easy there, master!', 'Whoa, gentle paws please!', 'That was a bit too rough for me.'],
    jump: ['Wheeee! Look at me!', 'Boing! Did you see that?', 'Up I go!'],
    attack: ['Take that! I’m stronger than I look!', 'Zap! A tiny burst of courage!', 'Ready? Here comes my best move!'],
    sleep: ['Ahh, feeling sleepy, master...', 'Just closing my eyes for a little bit.', 'Mmm, a tiny nap sounds perfect.'],
    happy: ['This is my favorite little corner!', 'You always brighten my day!', 'I’m all charged up and happy!'],
    visitor: ['Oh! Someone’s here! I’ll say hello.', 'A new face! This is exciting!', 'Look, master, we have company!'],
    evolution: ['I’m growing stronger because of you, master!', 'Our little team is leveling up!', 'Every visit helps me grow!'],
    greeting: ['Welcome! Stay a little, okay?', 'Hi there! I’m glad you found us.', 'Come on in, new friend!'],
  },
  ember: {
    idle: ['Hey master! It’s nice and warm here.', 'Keeping my little flame cozy.', 'This place feels like a warm hug.'],
    pat: ['Hehe! I like that, master!', 'That’s a very nice pat!', 'Careful, I might ask for another!'],
    hurt: ['Ouch! That was a little too much!', 'Hey, easy there! My tail nearly flared up!', 'A gentler touch would feel better.'],
    jump: ['Look at me go!', 'Wheee! Watch my tail flame!', 'Up, up, and away!'],
    attack: ['Fire it up!', 'A little flame, a lot of heart!', 'Take that! I’ve got some spark!'],
    sleep: ['Mmm... getting a little sleepy...', 'Time to curl up by the warm light.', 'Yawn... my tail is getting drowsy too.'],
    happy: ['You make my little flame glow brighter!', 'I’m feeling extra sunny today!', 'Hehe, I can’t help but smile!'],
    visitor: ['Oh! A new friend!', 'Someone’s here! I’ll give them a warm welcome.', 'A visitor! This place keeps getting cozier.'],
    evolution: ['I’m getting stronger with you!', 'We’re growing together, master!', 'My flame gets brighter every day.'],
    greeting: ['Come on in! Stay a while!', 'Hello there! I saved you a cozy spot.', 'Welcome, friend. It’s nice to meet you!'],
  },
  tide: {
    idle: ['Just drifting along, nice and easy.', 'Cool breeze, calm day. Perfect.', 'I’m taking it one ripple at a time.'],
    pat: ['Hehe, that tickles a little!', 'Not bad! You’ve got gentle hands.', 'A tiny pat for your favorite turtle?'],
    hurt: ['Oof! Let’s keep things gentle, okay?', 'Hey, easy! Shells are sturdy, but I’m still me.', 'That was a little rough around the edges.'],
    jump: ['Wheee, what a lovely view!', 'Up we splash!', 'Look at me go! Cool, right?'],
    attack: ['A little wave of strength!', 'Water blast, coming through!', 'Cool move, huh?'],
    sleep: ['Drifting off for a bit...', 'Mmm, time to tuck into my shell.', 'A little nap will do me good.'],
    happy: ['I’m glad we get to share this place.', 'You’re pretty cool, master.', 'Hehe, I’m having a shell of a time!'],
    visitor: ['A new visitor! I’ll wave hello.', 'Oh, company! Nice and easy, everyone.', 'Someone new has paddled in!'],
    evolution: ['I’m growing, one kind visit at a time.', 'We’re making waves together!', 'Look how far our little tide has carried us.'],
    greeting: ['Welcome in. I hope you can stay awhile.', 'Hey there! Pull up a spot by the water.', 'Nice to meet you. Make yourself comfy.'],
  },
  moss: {
    idle: ['Taking it easy, master.', 'Slow and steady feels just right.', 'I like this peaceful little patch.'],
    pat: ['Hehe! That was sweet of you.', 'A gentle pat, just how I like it.', 'Thanks, friend. That made me smile.'],
    hurt: ['Ouch! Easy does it, please.', 'That was a bit much. Let’s be gentle.', 'I’m okay, just take it slow with me.'],
    jump: ['Up, up, and away!', 'Look at these little legs go!', 'A happy hop for you!'],
    attack: ['Small but mighty. Take that!', 'A sturdy little move!', 'Rooted and ready!'],
    sleep: ['A quiet nap sounds nice...', 'Rest helps good things grow.', 'Mmm, I’ll dream of sunny gardens.'],
    happy: ['Little moments like this make me happy.', 'You make this place feel like home.', 'I’m glad we’re growing together.'],
    visitor: ['Oh, hello! Our little corner is growing.', 'A new friend has stopped by.', 'Welcome, visitor. There’s room for you here.'],
    evolution: ['Look how much we’ve grown together!', 'Good things grow with patience.', 'Every visit helps us put down stronger roots.'],
    greeting: ['Welcome! There’s room for you here.', 'Hello, friend. Take your time.', 'It’s nice to have you in our little garden.'],
  },
}

export function chooseCompanionMessage(dialogue: CompanionDialogue, action: CompanionAction) {
  const options = dialogue[action]
  return options[Math.floor(Math.random() * options.length)]
}

export function getCompanionMessage(companion: CompanionId, action: CompanionAction) {
  return chooseCompanionMessage(creatureDialogues[companion], action)
}
