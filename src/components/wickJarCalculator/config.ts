export type WaxType = 'Soy' | 'Coconut Wax' | 'Paraffin' | 'Beeswax' | 'Gel Wax';
export type ContainerType = 'Glass' | 'Tin' | 'Ceramic' | 'Concrete' | 'None';

export const WAX_TYPES: WaxType[] = ['Soy', 'Coconut Wax', 'Paraffin', 'Beeswax', 'Gel Wax'];
export const BLENDABLE_WAX_TYPES: WaxType[] = WAX_TYPES.filter((wax) => wax !== 'Gel Wax');
export const CONTAINER_TYPES: ContainerType[] = ['None', 'Glass', 'Tin', 'Ceramic', 'Concrete'];
export const CM_PER_INCH = 2.54;

export type SupplierLabel = 'The Flaming Candle' | 'Amazon';
export type SupplierSearch = { label: SupplierLabel; query: string };
export type WickPoint = { x: number; y: number };

export const WICK_SUPPLIER_SEARCH: Record<string, SupplierSearch[]> = {
  CD: [{ label: 'The Flaming Candle', query: 'CD wick' }],
  ECO: [{ label: 'The Flaming Candle', query: 'ECO wick' }],
  HTP: [{ label: 'The Flaming Candle', query: 'HTP wick' }],
  LX: [{ label: 'The Flaming Candle', query: 'LX wick' }],
  'Premier 700': [{ label: 'The Flaming Candle', query: 'Premier 700 wick' }],
  'Zinc Core': [{ label: 'The Flaming Candle', query: 'zinc core wick' }],
  'Square Braid': [{ label: 'The Flaming Candle', query: 'square braid wick' }],
  'Wooden Wick': [{ label: 'The Flaming Candle', query: 'wooden wick' }],
};

export const WICK_COMMON_SIZES: Record<string, string[]> = {
  CD: ['CD 4', 'CD 6', 'CD 8', 'CD 10', 'CD 12'],
  ECO: ['ECO 2', 'ECO 4', 'ECO 6', 'ECO 8', 'ECO 10'],
  HTP: ['HTP 41', 'HTP 52', 'HTP 62', 'HTP 73', 'HTP 83'],
  LX: ['LX 8', 'LX 10', 'LX 12', 'LX 14', 'LX 16'],
  'Premier 700': ['700-7', '700-9', '700-11', '700-13', '700-15', '700-17', '700-19'],
  'Zinc Core': ['44-24-18', '51-32-18', '60-44-18', '62-52-18'],
  'Square Braid': ['#1/0', '#2/0', '#3/0', '#4/0', '#5/0'],
  'Wooden Wick': ['0.02 in (Thin)', '0.04 in (Medium)', '0.06 in (Thick)'],
};

export const WICK_MELT_DIAMETER_IN: Record<string, Record<string, number>> = {
  CD: {
    'CD 4': 1.8,
    'CD 6': 2.0,
    'CD 8': 2.2,
    'CD 10': 2.4,
    'CD 12': 2.6,
  },
  ECO: {
    'ECO 2': 1.75,
    'ECO 4': 1.95,
    'ECO 6': 2.15,
    'ECO 8': 2.35,
    'ECO 10': 2.55,
  },
  HTP: {
    'HTP 41': 1.8,
    'HTP 52': 2.0,
    'HTP 62': 2.2,
    'HTP 73': 2.4,
    'HTP 83': 2.6,
  },
  LX: {
    'LX 8': 1.8,
    'LX 10': 2.0,
    'LX 12': 2.2,
    'LX 14': 2.4,
    'LX 16': 2.6,
  },
  'Premier 700': {
    '700-7': 1.8,
    '700-9': 2.0,
    '700-11': 2.2,
    '700-13': 2.4,
    '700-15': 2.6,
    '700-17': 2.8,
    '700-19': 3.0,
  },
  'Zinc Core': {
    '44-24-18': 1.9,
    '51-32-18': 2.1,
    '60-44-18': 2.3,
    '62-52-18': 2.5,
  },
  'Square Braid': {
    '#1/0': 1.8,
    '#2/0': 2.0,
    '#3/0': 2.2,
    '#4/0': 2.4,
    '#5/0': 2.6,
  },
  'Wooden Wick': {
    '0.02 in (Thin)': 1.9,
    '0.04 in (Medium)': 2.25,
    '0.06 in (Thick)': 2.6,
  },
};
