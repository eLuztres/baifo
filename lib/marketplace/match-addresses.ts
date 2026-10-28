const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** The addresses that contain every typed word, ignoring accents and case, in the list's order. */
export function matchAddresses(addressList: string[], query: string, limit: number) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return addressList.filter((address) => words.every((word) => normalize(address).includes(word))).slice(0, limit);
}
