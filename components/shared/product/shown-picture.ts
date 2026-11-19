// The listing's gallery and its Share buttons are apart on the page: the gallery notes the picture on screen,
// Share reads it at the tap, so that picture goes to WhatsApp.
// The picture itself, not its place: Share offers all of a listing's pictures, the gallery only its language's.
let shownPicture = '';

export const setShownPicture = (url: string) => {
  shownPicture = url;
};

export const getShownPicture = () => shownPicture;
