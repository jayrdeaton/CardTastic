/** Every Image's `fadeDuration`. Android's Image fades each bitmap that isn't an Android resource in over 300ms: a
 * Metro-served build's, and an OTA update's new images (expo-updates hands those over as file:// paths). A card face's
 * onLoad then comes while the face is still see-through, so a ghost handed over on it (cardFacePaint.ts) left the card
 * half drawn for the length of the fade. A bitmap here is meant to appear whole, the frame it loads. Android only: other
 * platforms ignore the prop. */
export const NO_IMAGE_FADE = 0
