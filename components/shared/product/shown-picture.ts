// The listing's gallery and its Share buttons are apart on the page: the gallery notes the picture on screen,
// Share reads it at the tap, so that picture goes to WhatsApp.
let shownPicture = 0;

export const setShownPicture = (index: number) => {
  shownPicture = index;
};

export const getShownPicture = () => shownPicture;
