import type { ListingType } from '@/lib/constants';

/** The editor's fields that show whether they are set, as the editor holds them (empty: not set). */
export const FILLABLE_FIELDS = ['category', 'price', 'priceMax', 'condition', 'serviceType', 'startsAt', 'address', 'placeId'] as const;

export type FillableField = (typeof FILLABLE_FIELDS)[number];
export type FieldValues = Record<FillableField, string>;

/** Whether the field has a value, and if not whether publishing needs one (the editor's save refuses it without). */
export function fieldState(name: FillableField, value: string, type: ListingType): 'set' | 'missing' | 'needed' {
  if (value.trim() !== '') return 'set';
  const isNeeded = name === 'category' || (name === 'price' && type !== 'SERVICE') || (name === 'startsAt' && type === 'EVENT');
  return isNeeded ? 'needed' : 'missing';
}
