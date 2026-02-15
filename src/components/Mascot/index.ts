/**
 * Mascot component exports
 * Salsa - the Purrrfect Keys piano mascot + Cat Character Avatar System
 */

export { MascotBubble } from './MascotBubble';
export type { MascotBubbleProps } from './MascotBubble';

export {
  getRandomTip,
  getTipForScore,
  getTipForStreak,
  TIPS,
} from './mascotTips';
export type { MascotTip, MascotMood, TipCategory } from './mascotTips';

export { CatAvatar } from './CatAvatar';
export type { CatAvatarSize } from './CatAvatar';

export {
  CAT_CHARACTERS,
  getCatById,
  getDefaultCat,
  getUnlockedCats,
  isCatUnlocked,
} from './catCharacters';
export type { CatCharacter } from './catCharacters';
