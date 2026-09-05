export const GRAMS_PER_OUNCE = 28.3495;

export type WaxType = {
  id: string;
  name: string;
  defaultLoad: number;
  recommendedRange: string;
  fragranceAddTempF: string;
  stirTime: string;
  waitBeforePour: string;
  pourTempF: string;
  cureTimeDays: string;
};

export const WAX_TYPES: WaxType[] = [
  {
    id: 'soy',
    name: 'Soy Wax',
    defaultLoad: 8,
    recommendedRange: '7-10%',
    fragranceAddTempF: '175-185 F',
    stirTime: '2 minutes',
    waitBeforePour: 'After mixing, cool to pour temp',
    pourTempF: '135-145 F',
    cureTimeDays: '10-14 days',
  },
  {
    id: 'apricot',
    name: 'Apricot Wax',
    defaultLoad: 9,
    recommendedRange: '8-10%',
    fragranceAddTempF: '180-190 F',
    stirTime: '2 minutes',
    waitBeforePour: 'After mixing, cool to pour temp',
    pourTempF: '150-165 F',
    cureTimeDays: '7-10 days',
  },
  {
    id: 'coconut-blend',
    name: 'Coconut Wax',
    defaultLoad: 9,
    recommendedRange: '8-10%',
    fragranceAddTempF: '180-190 F',
    stirTime: '2 minutes',
    waitBeforePour: 'After mixing, cool to pour temp',
    pourTempF: '170-190 F',
    cureTimeDays: '7-10 days',
  },
  {
    id: 'coconut-soy',
    name: 'Coconut Soy Blend',
    defaultLoad: 9,
    recommendedRange: '8-10%',
    fragranceAddTempF: '180-190 F',
    stirTime: '2 minutes',
    waitBeforePour: 'After mixing, cool to pour temp',
    pourTempF: '145-165 F',
    cureTimeDays: '7-10 days',
  },
  {
    id: 'coconut-apricot',
    name: 'Coconut Apricot Blend',
    defaultLoad: 10,
    recommendedRange: '9-12%',
    fragranceAddTempF: '180-190 F',
    stirTime: '2 minutes',
    waitBeforePour: 'After mixing, cool to pour temp',
    pourTempF: '145-160 F',
    cureTimeDays: '7-10 days',
  },
  {
    id: 'paraffin',
    name: 'Paraffin Wax',
    defaultLoad: 8,
    recommendedRange: '7-10%',
    fragranceAddTempF: '185-195 F',
    stirTime: '2 minutes',
    waitBeforePour: 'After mixing, cool to pour temp',
    pourTempF: '160-180 F',
    cureTimeDays: '3-5 days',
  },
  {
    id: 'parasoy',
    name: 'Parasoy Blend',
    defaultLoad: 9,
    recommendedRange: '8-10%',
    fragranceAddTempF: '180-190 F',
    stirTime: '2 minutes',
    waitBeforePour: 'After mixing, cool to pour temp',
    pourTempF: '150-170 F',
    cureTimeDays: '5-7 days',
  },
  {
    id: 'beeswax',
    name: 'Beeswax',
    defaultLoad: 7,
    recommendedRange: '6-8%',
    fragranceAddTempF: '180-185 F',
    stirTime: '2-3 minutes',
    waitBeforePour: 'After mixing, cool to pour temp',
    pourTempF: '175-178 F',
    cureTimeDays: '10-14 days',
  },
  {
    id: 'palm',
    name: 'Palm Wax',
    defaultLoad: 8,
    recommendedRange: '6-9%',
    fragranceAddTempF: '190-200 F',
    stirTime: '2-3 minutes',
    waitBeforePour: 'After mixing, cool to pour temp',
    pourTempF: '185-200 F',
    cureTimeDays: '7-10 days',
  },
  {
    id: 'rapeseed',
    name: 'Rapeseed Wax',
    defaultLoad: 8,
    recommendedRange: '7-10%',
    fragranceAddTempF: '170-180 F',
    stirTime: '2 minutes',
    waitBeforePour: 'After mixing, cool to pour temp',
    pourTempF: '130-145 F',
    cureTimeDays: '7-10 days',
  },
  {
    id: 'olive',
    name: 'Olive Wax',
    defaultLoad: 8,
    recommendedRange: '7-9%',
    fragranceAddTempF: '175-185 F',
    stirTime: '2 minutes',
    waitBeforePour: 'After mixing, cool to pour temp',
    pourTempF: '135-150 F',
    cureTimeDays: '7-10 days',
  },
  {
    id: 'gel-wax',
    name: 'Gel Wax',
    defaultLoad: 7,
    recommendedRange: '7-9%',
    fragranceAddTempF: '185-200 F',
    stirTime: '2 minutes',
    waitBeforePour: 'After mixing, cool to pour temp',
    pourTempF: '180-200 F',
    cureTimeDays: '2-3 days',
  },
];

export const INCOMPATIBLE_WAX_BLEND_IDS: Record<string, string[]> = {
  'gel-wax': WAX_TYPES.filter((waxType) => waxType.id !== 'gel-wax').map((waxType) => waxType.id),
};

export function areWaxTypesCompatible(waxTypeAId: string, waxTypeBId: string) {
  if (waxTypeAId === waxTypeBId) return true;
  const incompatibleA = INCOMPATIBLE_WAX_BLEND_IDS[waxTypeAId] ?? [];
  const incompatibleB = INCOMPATIBLE_WAX_BLEND_IDS[waxTypeBId] ?? [];
  return !incompatibleA.includes(waxTypeBId) && !incompatibleB.includes(waxTypeAId);
}

export const BLENDABLE_WAX_TYPES = WAX_TYPES;

export const BLEND_HINTS = [
  {
    waxAId: 'soy',
    waxBId: 'paraffin',
    percentA: 70,
    percentB: 30,
    text: 'Common blend: Soy 70% / Paraffin 30% (good balance of throw + smooth tops).',
  },
  {
    waxAId: 'soy',
    waxBId: 'paraffin',
    percentA: 60,
    percentB: 40,
    text: 'Common blend: Soy 60% / Paraffin 40% (stronger hot throw).',
  },
  {
    waxAId: 'soy',
    waxBId: 'coconut-blend',
    percentA: 80,
    percentB: 20,
    text: 'Common blend: Soy 80% / Coconut Wax 20% (creamier tops, smoother finish).',
  },
  {
    waxAId: 'soy',
    waxBId: 'apricot',
    percentA: 20,
    percentB: 80,
    text: 'Example blend: Soy 20% / Apricot 80% (smooth finish with a softer natural blend).',
  },
  {
    waxAId: 'coconut-apricot',
    waxBId: 'soy',
    percentA: 70,
    percentB: 30,
    text: 'Common blend: Coconut Apricot 70% / Soy 30% (luxury natural blend profile).',
  },
  {
    waxAId: 'soy',
    waxBId: 'beeswax',
    percentA: 90,
    percentB: 10,
    text: 'Common blend: Soy 90% / Beeswax 10% (harder finish, slower burn).',
  },
  {
    waxAId: 'paraffin',
    waxBId: 'soy',
    percentA: 80,
    percentB: 20,
    text: 'Common blend: Paraffin 80% / Soy 20% (very strong throw profile).',
  },
] as const;
