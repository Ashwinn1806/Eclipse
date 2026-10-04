export interface SetTemplate {
  setNumber: number;
  targetWeight: number;
  targetReps: number;
  isDropSet?: boolean;
}

export interface ExerciseTemplate {
  id: string;
  name: string;
  category: string;
  targetWeight: number;
  targetReps: number;
  defaultSets: number;
  restSeconds: number;
  isCompound: boolean;
  presetSets?: SetTemplate[];
}

export interface SplitDefinition {
  slug: string;
  name: string;
  shortName: string;
  subtitle: string;
  focus: string;
  iconName: 'dumbbell' | 'flame' | 'zap' | 'activity' | 'shield';
  colorGradient: string;
  accentColor: string;
  defaultTonnage: number[];
  exercises: ExerciseTemplate[];
}

export let USER_SPLITS: SplitDefinition[] = [
  {
    slug: 'push',
    name: 'Day 1: Push Day',
    shortName: 'Push',
    subtitle: 'Chest · Delts · Triceps · Forearms',
    focus: 'Hypertrophy & Anterior Strength',
    iconName: 'dumbbell',
    colorGradient: 'from-cyan-500 via-teal-400 to-emerald-400',
    accentColor: '#06b6d4',
    defaultTonnage: [4850, 5200, 5640, 6100],
    exercises: [
      {
        id: 'flat-bench-press',
        name: 'Flat Bench Press',
        category: 'Compound · Chest',
        targetWeight: 27.5,
        targetReps: 7,
        defaultSets: 3,
        restSeconds: 120,
        isCompound: true,
        presetSets: [
          { setNumber: 1, targetWeight: 25, targetReps: 7, isDropSet: false },
          { setNumber: 2, targetWeight: 27.5, targetReps: 3, isDropSet: false },
          { setNumber: 3, targetWeight: 27.5, targetReps: 3, isDropSet: true },
        ],
      },
      {
        id: 'incline-chest-press',
        name: 'Incline Chest Press',
        category: 'Compound · Upper Chest',
        targetWeight: 25,
        targetReps: 10,
        defaultSets: 3,
        restSeconds: 90,
        isCompound: true,
        presetSets: [
          { setNumber: 1, targetWeight: 20, targetReps: 13, isDropSet: false },
          { setNumber: 2, targetWeight: 25, targetReps: 8, isDropSet: false },
          { setNumber: 3, targetWeight: 30, targetReps: 4, isDropSet: true },
        ],
      },
      {
        id: 'machine-shoulder-press',
        name: 'Machine Shoulder Press',
        category: 'Compound · Deltoids',
        targetWeight: 30,
        targetReps: 8,
        defaultSets: 2,
        restSeconds: 90,
        isCompound: true,
        presetSets: [
          { setNumber: 1, targetWeight: 30, targetReps: 8, isDropSet: false },
          { setNumber: 2, targetWeight: 35, targetReps: 4, isDropSet: true },
        ],
      },
      {
        id: 'cable-fly-middle',
        name: 'Cable Fly Middle',
        category: 'Isolation · Mid Chest',
        targetWeight: 40,
        targetReps: 12,
        defaultSets: 2,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 40, targetReps: 12, isDropSet: false },
          { setNumber: 2, targetWeight: 45, targetReps: 8, isDropSet: true },
        ],
      },
      {
        id: 'cable-fly-lower',
        name: 'Cable Fly Lower',
        category: 'Isolation · Lower Chest',
        targetWeight: 35,
        targetReps: 12,
        defaultSets: 2,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 35, targetReps: 12, isDropSet: false },
          { setNumber: 2, targetWeight: 40, targetReps: 8, isDropSet: true },
        ],
      },
      {
        id: 'single-hand-pushdown',
        name: 'Single Hand Pushdown',
        category: 'Isolation · Triceps',
        targetWeight: 20,
        targetReps: 12,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 15, targetReps: 15, isDropSet: false },
          { setNumber: 2, targetWeight: 20, targetReps: 12, isDropSet: false },
          { setNumber: 3, targetWeight: 25, targetReps: 8, isDropSet: false },
        ],
      },
      {
        id: 'single-hand-overhead-triceps',
        name: 'Single Hand Overhead Triceps',
        category: 'Isolation · Triceps Long Head',
        targetWeight: 20,
        targetReps: 10,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 15, targetReps: 15, isDropSet: false },
          { setNumber: 2, targetWeight: 20, targetReps: 10, isDropSet: false },
          { setNumber: 3, targetWeight: 40, targetReps: 8, isDropSet: true },
        ],
      },
      {
        id: 'reverse-curl',
        name: 'Reverse Curl',
        category: 'Isolation · Brachioradialis',
        targetWeight: 40,
        targetReps: 15,
        defaultSets: 2,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 40, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 50, targetReps: 8, isDropSet: true },
        ],
      },
      {
        id: 'forearm-curls',
        name: 'Forearm Curls',
        category: 'Isolation · Forearms',
        targetWeight: 60,
        targetReps: 15,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 50, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 60, targetReps: 15, isDropSet: false },
          { setNumber: 3, targetWeight: 70, targetReps: 8, isDropSet: false },
        ],
      },
    ],
  },
  {
    slug: 'pull',
    name: 'Day 2: Pull Day',
    shortName: 'Pull',
    subtitle: 'Back · Lats · Biceps · Abs',
    focus: 'Posterior Chain & Upper Back Width',
    iconName: 'flame',
    colorGradient: 'from-amber-400 via-orange-500 to-red-500',
    accentColor: '#f59e0b',
    defaultTonnage: [5400, 5750, 6100, 6500],
    exercises: [
      {
        id: 'pull-ups',
        name: 'Pull-ups',
        category: 'Compound · Back',
        targetWeight: 0,
        targetReps: 15,
        defaultSets: 3,
        restSeconds: 90,
        isCompound: true,
        presetSets: [
          { setNumber: 1, targetWeight: 0, targetReps: 15, isDropSet: false },
          { setNumber: 2, targetWeight: 0, targetReps: 15, isDropSet: false },
          { setNumber: 3, targetWeight: 0, targetReps: 15, isDropSet: false },
        ],
      },
      {
        id: 'cable-rowing',
        name: 'Cable Rowing',
        category: 'Compound · Mid Back',
        targetWeight: 90,
        targetReps: 15,
        defaultSets: 3,
        restSeconds: 90,
        isCompound: true,
        presetSets: [
          { setNumber: 1, targetWeight: 80, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 100, targetReps: 15, isDropSet: false },
          { setNumber: 3, targetWeight: 100, targetReps: 15, isDropSet: false },
        ],
      },
      {
        id: 'lat-pulldown',
        name: 'Lat Pulldown',
        category: 'Compound · Lats',
        targetWeight: 78,
        targetReps: 8,
        defaultSets: 3,
        restSeconds: 90,
        isCompound: true,
        presetSets: [
          { setNumber: 1, targetWeight: 71.5, targetReps: 15, isDropSet: false },
          { setNumber: 2, targetWeight: 78, targetReps: 8, isDropSet: false },
          { setNumber: 3, targetWeight: 84.5, targetReps: 4, isDropSet: true },
        ],
      },
      {
        id: 'rear-delt-fly',
        name: 'Rear Delt Fly',
        category: 'Isolation · Rear Delts',
        targetWeight: 45,
        targetReps: 12,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 40, targetReps: 15, isDropSet: false },
          { setNumber: 2, targetWeight: 45, targetReps: 12, isDropSet: false },
          { setNumber: 3, targetWeight: 50, targetReps: 8, isDropSet: false },
        ],
      },
      {
        id: 'barbell-curl',
        name: 'Barbell Curl',
        category: 'Isolation · Biceps',
        targetWeight: 12.5,
        targetReps: 15,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 10, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 12.5, targetReps: 15, isDropSet: false },
          { setNumber: 3, targetWeight: 15, targetReps: 8, isDropSet: false },
        ],
      },
      {
        id: 'preacher-curl',
        name: 'Preacher Curl',
        category: 'Isolation · Biceps Peak',
        targetWeight: 45,
        targetReps: 8,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 40, targetReps: 12, isDropSet: false },
          { setNumber: 2, targetWeight: 45, targetReps: 8, isDropSet: false },
          { setNumber: 3, targetWeight: 50, targetReps: 4, isDropSet: true },
        ],
      },
      {
        id: 'cable-crunches',
        name: 'Cable Crunches',
        category: 'Isolation · Abs',
        targetWeight: 60,
        targetReps: 12,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 50, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 60, targetReps: 12, isDropSet: false },
          { setNumber: 3, targetWeight: 70, targetReps: 8, isDropSet: true },
        ],
      },
      {
        id: 'leg-raises',
        name: 'Leg Raises',
        category: 'Isolation · Core',
        targetWeight: 0,
        targetReps: 20,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 0, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 0, targetReps: 20, isDropSet: false },
          { setNumber: 3, targetWeight: 0, targetReps: 15, isDropSet: false },
        ],
      },
    ],
  },
  {
    slug: 'legs',
    name: 'Day 3: Legs & Shoulders',
    shortName: 'Legs',
    subtitle: 'Quads · Hamstrings · Calves · Arms',
    focus: 'Lower Body Drive & Forearm Density',
    iconName: 'zap',
    colorGradient: 'from-purple-500 via-violet-400 to-indigo-500',
    accentColor: '#8b5cf6',
    defaultTonnage: [6200, 6650, 7100, 7600],
    exercises: [
      {
        id: 'super-squat',
        name: 'Super Squat',
        category: 'Compound · Quads & Glutes',
        targetWeight: 80,
        targetReps: 15,
        defaultSets: 3,
        restSeconds: 150,
        isCompound: true,
        presetSets: [
          { setNumber: 1, targetWeight: 50, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 80, targetReps: 15, isDropSet: false },
          { setNumber: 3, targetWeight: 100, targetReps: 13, isDropSet: false },
        ],
      },
      {
        id: 'leg-extension',
        name: 'Leg Extension',
        category: 'Compound · Quad Isolation',
        targetWeight: 85,
        targetReps: 15,
        defaultSets: 3,
        restSeconds: 90,
        isCompound: true,
        presetSets: [
          { setNumber: 1, targetWeight: 70, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 85, targetReps: 15, isDropSet: false },
          { setNumber: 3, targetWeight: 100, targetReps: 10, isDropSet: false },
        ],
      },
      {
        id: 'leg-curl',
        name: 'Leg Curl',
        category: 'Isolation · Hamstrings',
        targetWeight: 60,
        targetReps: 15,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 50, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 60, targetReps: 15, isDropSet: false },
          { setNumber: 3, targetWeight: 70, targetReps: 7, isDropSet: true },
        ],
      },
      {
        id: 'calves',
        name: 'Calves',
        category: 'Isolation · Gastrocnemius',
        targetWeight: 0,
        targetReps: 25,
        defaultSets: 4,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 0, targetReps: 25, isDropSet: false },
          { setNumber: 2, targetWeight: 0, targetReps: 25, isDropSet: false },
          { setNumber: 3, targetWeight: 0, targetReps: 25, isDropSet: false },
          { setNumber: 4, targetWeight: 0, targetReps: 25, isDropSet: false },
        ],
      },
      {
        id: 'reverse-curl-legs',
        name: 'Reverse Curl',
        category: 'Isolation · Forearms',
        targetWeight: 40,
        targetReps: 12,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 30, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 40, targetReps: 12, isDropSet: false },
          { setNumber: 3, targetWeight: 45, targetReps: 8, isDropSet: true },
        ],
      },
      {
        id: 'forearm-curls-legs',
        name: 'Forearm Curls',
        category: 'Isolation · Forearms',
        targetWeight: 60,
        targetReps: 15,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 50, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 60, targetReps: 15, isDropSet: false },
          { setNumber: 3, targetWeight: 70, targetReps: 8, isDropSet: true },
        ],
      },
    ],
  },
  {
    slug: 'upper',
    name: 'Day 5: Upper Body',
    shortName: 'Upper',
    subtitle: 'Chest · Back · Delts · Arms · Abs',
    focus: 'Total Upper Body Hypertrophy',
    iconName: 'activity',
    colorGradient: 'from-blue-500 via-cyan-400 to-teal-400',
    accentColor: '#3b82f6',
    defaultTonnage: [5100, 5450, 5800, 6250],
    exercises: [
      {
        id: 'incline-bench-press',
        name: 'Incline Bench Press',
        category: 'Compound · Upper Chest',
        targetWeight: 25,
        targetReps: 10,
        defaultSets: 3,
        restSeconds: 90,
        isCompound: true,
        presetSets: [
          { setNumber: 1, targetWeight: 20, targetReps: 12, isDropSet: false },
          { setNumber: 2, targetWeight: 25, targetReps: 10, isDropSet: false },
          { setNumber: 3, targetWeight: 27.5, targetReps: 8, isDropSet: false },
        ],
      },
      {
        id: 'cable-fly',
        name: 'Cable Fly',
        category: 'Isolation · Chest Fly',
        targetWeight: 40,
        targetReps: 12,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 35, targetReps: 15, isDropSet: false },
          { setNumber: 2, targetWeight: 40, targetReps: 12, isDropSet: false },
          { setNumber: 3, targetWeight: 45, targetReps: 10, isDropSet: false },
        ],
      },
      {
        id: 'pull-ups-upper',
        name: 'Pull-ups',
        category: 'Compound · Back',
        targetWeight: 0,
        targetReps: 15,
        defaultSets: 2,
        restSeconds: 90,
        isCompound: true,
        presetSets: [
          { setNumber: 1, targetWeight: 0, targetReps: 15, isDropSet: false },
          { setNumber: 2, targetWeight: 0, targetReps: 15, isDropSet: false },
        ],
      },
      {
        id: 'cable-rowing-upper',
        name: 'Cable Rowing',
        category: 'Compound · Mid Back',
        targetWeight: 90,
        targetReps: 15,
        defaultSets: 3,
        restSeconds: 90,
        isCompound: true,
        presetSets: [
          { setNumber: 1, targetWeight: 80, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 100, targetReps: 15, isDropSet: false },
          { setNumber: 3, targetWeight: 100, targetReps: 15, isDropSet: false },
        ],
      },
      {
        id: 'lat-pulldown-upper',
        name: 'Lat Pulldown',
        category: 'Compound · Lats',
        targetWeight: 78,
        targetReps: 8,
        defaultSets: 3,
        restSeconds: 90,
        isCompound: true,
        presetSets: [
          { setNumber: 1, targetWeight: 71.5, targetReps: 15, isDropSet: false },
          { setNumber: 2, targetWeight: 78, targetReps: 8, isDropSet: false },
          { setNumber: 3, targetWeight: 84, targetReps: 4, isDropSet: true },
        ],
      },
      {
        id: 'cable-side-delts',
        name: 'Cable Side Delts',
        category: 'Isolation · Side Delts',
        targetWeight: 7.5,
        targetReps: 12,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 5, targetReps: 15, isDropSet: false },
          { setNumber: 2, targetWeight: 7.5, targetReps: 12, isDropSet: false },
          { setNumber: 3, targetWeight: 10, targetReps: 10, isDropSet: false },
        ],
      },
      {
        id: 'single-hand-rope-pushdown',
        name: 'Single Hand Rope Pushdown',
        category: 'Isolation · Triceps',
        targetWeight: 15,
        targetReps: 12,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 10, targetReps: 15, isDropSet: false },
          { setNumber: 2, targetWeight: 15, targetReps: 12, isDropSet: false },
          { setNumber: 3, targetWeight: 20, targetReps: 10, isDropSet: false },
        ],
      },
      {
        id: 'overhead-cable-extension',
        name: 'Overhead Cable Extension',
        category: 'Isolation · Triceps',
        targetWeight: 45,
        targetReps: 12,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 40, targetReps: 15, isDropSet: false },
          { setNumber: 2, targetWeight: 45, targetReps: 12, isDropSet: false },
          { setNumber: 3, targetWeight: 50, targetReps: 8, isDropSet: false },
        ],
      },
      {
        id: 'bar-curl',
        name: 'Bar Curl',
        category: 'Compound · Biceps',
        targetWeight: 25,
        targetReps: 10,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: true,
        presetSets: [
          { setNumber: 1, targetWeight: 20, targetReps: 12, isDropSet: false },
          { setNumber: 2, targetWeight: 25, targetReps: 10, isDropSet: false },
          { setNumber: 3, targetWeight: 30, targetReps: 8, isDropSet: false },
        ],
      },
      {
        id: 'preacher-curl-upper',
        name: 'Preacher Curl',
        category: 'Isolation · Biceps',
        targetWeight: 20,
        targetReps: 10,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 15, targetReps: 12, isDropSet: false },
          { setNumber: 2, targetWeight: 20, targetReps: 10, isDropSet: false },
          { setNumber: 3, targetWeight: 20, targetReps: 8, isDropSet: false },
        ],
      },
      {
        id: 'cable-crunches-upper',
        name: 'Cable Crunches',
        category: 'Isolation · Abs',
        targetWeight: 60,
        targetReps: 12,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 50, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 60, targetReps: 12, isDropSet: false },
          { setNumber: 3, targetWeight: 70, targetReps: 8, isDropSet: true },
        ],
      },
      {
        id: 'leg-raises-upper',
        name: 'Leg Raises',
        category: 'Isolation · Core',
        targetWeight: 0,
        targetReps: 20,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 0, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 0, targetReps: 20, isDropSet: false },
          { setNumber: 3, targetWeight: 0, targetReps: 15, isDropSet: false },
        ],
      },
    ],
  },
  {
    slug: 'lower',
    name: 'Day 6: Lower Body',
    shortName: 'Lower',
    subtitle: 'Quads · Hamstrings · Calves · Forearms',
    focus: 'Unilateral & Quad Hypertrophy',
    iconName: 'shield',
    colorGradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    accentColor: '#10b981',
    defaultTonnage: [5800, 6200, 6700, 7200],
    exercises: [
      {
        id: 'super-squat-lower',
        name: 'Super Squat',
        category: 'Compound · Quads',
        targetWeight: 80,
        targetReps: 15,
        defaultSets: 3,
        restSeconds: 150,
        isCompound: true,
        presetSets: [
          { setNumber: 1, targetWeight: 50, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 80, targetReps: 15, isDropSet: false },
          { setNumber: 3, targetWeight: 100, targetReps: 13, isDropSet: false },
        ],
      },
      {
        id: 'leg-extension-lower',
        name: 'Leg Extension',
        category: 'Compound · Quad Extension',
        targetWeight: 85,
        targetReps: 15,
        defaultSets: 3,
        restSeconds: 90,
        isCompound: true,
        presetSets: [
          { setNumber: 1, targetWeight: 70, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 85, targetReps: 15, isDropSet: false },
          { setNumber: 3, targetWeight: 100, targetReps: 10, isDropSet: false },
        ],
      },
      {
        id: 'leg-curl-lower',
        name: 'Leg Curl',
        category: 'Isolation · Hamstrings',
        targetWeight: 60,
        targetReps: 15,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 50, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 60, targetReps: 15, isDropSet: false },
          { setNumber: 3, targetWeight: 70, targetReps: 7, isDropSet: true },
        ],
      },
      {
        id: 'calves-lower',
        name: 'Calves',
        category: 'Isolation · Calves',
        targetWeight: 0,
        targetReps: 25,
        defaultSets: 4,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 0, targetReps: 25, isDropSet: false },
          { setNumber: 2, targetWeight: 0, targetReps: 25, isDropSet: false },
          { setNumber: 3, targetWeight: 0, targetReps: 25, isDropSet: false },
          { setNumber: 4, targetWeight: 0, targetReps: 25, isDropSet: false },
        ],
      },
      {
        id: 'reverse-curl-lower',
        name: 'Reverse Curl',
        category: 'Isolation · Forearms',
        targetWeight: 40,
        targetReps: 12,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 30, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 40, targetReps: 12, isDropSet: false },
          { setNumber: 3, targetWeight: 45, targetReps: 8, isDropSet: true },
        ],
      },
      {
        id: 'forearm-curls-lower',
        name: 'Forearm Curls',
        category: 'Isolation · Forearms',
        targetWeight: 60,
        targetReps: 15,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
        presetSets: [
          { setNumber: 1, targetWeight: 50, targetReps: 20, isDropSet: false },
          { setNumber: 2, targetWeight: 60, targetReps: 15, isDropSet: false },
          { setNumber: 3, targetWeight: 70, targetReps: 8, isDropSet: true },
        ],
      },
    ],
  },
];

export function getSplitBySlug(slug: string): SplitDefinition {
  const normalized = slug.toLowerCase().trim();
  const match = USER_SPLITS.find(
    (s) => s.slug === normalized || s.slug.includes(normalized) || normalized.includes(s.slug)
  );
  return match || USER_SPLITS[0];
}

export function deleteAndReindexMemorySplit(splitId: string): SplitDefinition[] {
  const normalized = splitId.toLowerCase().trim();
  USER_SPLITS = USER_SPLITS.filter((s) => {
    const slugNorm = s.slug.toLowerCase().trim();
    const nameNorm = s.name.toLowerCase().trim();
    return (
      slugNorm !== normalized &&
      !nameNorm.includes(normalized) &&
      !normalized.includes(slugNorm)
    );
  });

  // Re-index remaining splits sequentially: Day 1, Day 2, Day 3...
  USER_SPLITS = USER_SPLITS.map((s, idx) => {
    const newDayNum = idx + 1;
    const cleanedName = s.name.replace(/^Day\s+\d+:\s*/i, '');
    return {
      ...s,
      name: `Day ${newDayNum}: ${cleanedName}`,
    };
  });

  return USER_SPLITS;
}

export function reorderMemorySplit(splitId: string, direction: 'up' | 'down'): SplitDefinition[] {
  const normalized = splitId.toLowerCase().trim();
  const index = USER_SPLITS.findIndex(
    (s) => s.slug.toLowerCase().trim() === normalized || s.name.toLowerCase().includes(normalized)
  );

  if (index === -1) return USER_SPLITS;
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (targetIndex < 0 || targetIndex >= USER_SPLITS.length) return USER_SPLITS;

  // Swap elements
  const temp = USER_SPLITS[index];
  USER_SPLITS[index] = USER_SPLITS[targetIndex];
  USER_SPLITS[targetIndex] = temp;

  // Re-index titles sequentially
  USER_SPLITS = USER_SPLITS.map((s, idx) => {
    const newDayNum = idx + 1;
    const cleanedName = s.name.replace(/^Day\s+\d+:\s*/i, '');
    return {
      ...s,
      name: `Day ${newDayNum}: ${cleanedName}`,
    };
  });

  return USER_SPLITS;
}

export function addMemorySplit(): SplitDefinition {
  let maxDayNum = USER_SPLITS.length;
  for (const s of USER_SPLITS) {
    const match = s.name.match(/^Day\s+(\d+):/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxDayNum) maxDayNum = num;
    }
  }
  const newDayNum = maxDayNum + 1;
  const timestamp = Date.now();
  const newSlug = `custom-${timestamp}`;
  const newSplit: SplitDefinition = {
    slug: newSlug,
    name: `Day ${newDayNum}: New Session`,
    shortName: `Day ${newDayNum}`,
    subtitle: 'Custom Muscle Focus',
    focus: 'Hypertrophy & Strength',
    iconName: 'dumbbell',
    colorGradient: 'from-cyan-500 via-teal-400 to-emerald-400',
    accentColor: '#06b6d4',
    defaultTonnage: [4500, 4800, 5200, 5600],
    exercises: [
      {
        id: `custom-ex-${timestamp}`,
        name: 'Bench Press',
        category: 'Compound · Chest',
        targetWeight: 20,
        targetReps: 10,
        defaultSets: 3,
        restSeconds: 90,
        isCompound: true,
        presetSets: [
          { setNumber: 1, targetWeight: 20, targetReps: 10, isDropSet: false },
          { setNumber: 2, targetWeight: 20, targetReps: 10, isDropSet: false },
          { setNumber: 3, targetWeight: 20, targetReps: 10, isDropSet: false },
        ],
      },
    ],
  };
  USER_SPLITS.push(newSplit);
  return newSplit;
}



