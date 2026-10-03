export interface DefaultDietItem {
  itemName: string;
  category: 'Meal' | 'Snack' | 'Water';
  calories: number;
  proteinG: number;
  waterMl: number;
}

export const DEFAULT_DAILY_DIET: DefaultDietItem[] = [
  { itemName: 'Water 1', category: 'Water', calories: 0, proteinG: 0, waterMl: 1000 },
  { itemName: 'BREAKFAST', category: 'Meal', calories: 765, proteinG: 43, waterMl: 0 },
  { itemName: 'Dry fruits', category: 'Snack', calories: 275, proteinG: 9, waterMl: 0 },
  { itemName: 'Water 2', category: 'Water', calories: 0, proteinG: 0, waterMl: 1000 },
  { itemName: 'LUNCH', category: 'Meal', calories: 600, proteinG: 15, waterMl: 0 },
  { itemName: 'Water 3', category: 'Water', calories: 0, proteinG: 0, waterMl: 1000 },
  { itemName: 'Pre-Snack', category: 'Snack', calories: 360, proteinG: 4, waterMl: 0 },
  { itemName: 'Eggs (3)', category: 'Meal', calories: 200, proteinG: 18, waterMl: 0 },
  { itemName: 'Water 4', category: 'Water', calories: 0, proteinG: 0, waterMl: 1000 },
  { itemName: 'DINNER', category: 'Meal', calories: 600, proteinG: 15, waterMl: 0 },
  { itemName: 'Whey Protein + Isabgol', category: 'Snack', calories: 100, proteinG: 25, waterMl: 0 },
  { itemName: '2 Soaked Anjeer', category: 'Snack', calories: 50, proteinG: 1, waterMl: 0 },
];
