import type { ListingType } from '@/lib/constants';

/** The editor's fields the description can fill, as the editor holds them (empty: not set). */
export const FILLABLE_FIELDS = ['category', 'price', 'priceMax', 'condition', 'serviceType', 'startsAt', 'address', 'placeId'] as const;

export type FillableField = (typeof FILLABLE_FIELDS)[number];
export type FieldValues = Record<FillableField, string>;

// An event starts out free (0) until someone names an entry, so 0 still counts as not set.
const isEmpty = (name: FillableField, value: string, type: ListingType) => value.trim() === '' || (type === 'EVENT' && name === 'price' && Number(value) === 0);

// "0" and "0.00" are the same price: reading it again changes nothing.
const isSame = (name: FillableField, read: string, current: string) =>
  read === current || ((name === 'price' || name === 'priceMax') && current.trim() !== '' && Number(read) === Number(current));

/** The values read from the description go only into empty fields: what the admin set stays. Also says which got filled. */
export function fillEmptyFields<T extends FieldValues>(current: T, read: Partial<FieldValues>, type: ListingType) {
  const filled = FILLABLE_FIELDS.filter((name) => {
    const value = read[name];
    return value && !isSame(name, value, current[name]) && isEmpty(name, current[name], type);
  });
  return { fields: { ...current, ...Object.fromEntries(filled.map((name) => [name, read[name]])) } as T, filled };
}

/** Whether the field has a value, and if not whether publishing needs one (the editor's save refuses it without). */
export function fieldState(name: FillableField, value: string, type: ListingType): 'set' | 'missing' | 'needed' {
  if (value.trim() !== '') return 'set';
  const isNeeded = name === 'category' || (name === 'price' && type !== 'SERVICE') || (name === 'startsAt' && type === 'EVENT');
  return isNeeded ? 'needed' : 'missing';
}
