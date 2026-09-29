export interface ExerciseTemplate {
  id: string;
  name: string;
  category: string;
  targetWeight: number;
  targetReps: number;
  defaultSets: number;
  restSeconds: number;
  isCompound: boolean;
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

export const USER_SPLITS: SplitDefinition[] = [
  {
    slug: 'push',
    name: 'Push Day A',
    shortName: 'Push',
    subtitle: 'Chest · Delts · Triceps',
    focus: 'Hypertrophy & Anterior Strength',
    iconName: 'dumbbell',
    colorGradient: 'from-cyan-500 via-teal-400 to-emerald-400',
    accentColor: '#06b6d4',
    defaultTonnage: [4850, 5200, 5640, 6100],
    exercises: [
      {
        id: 'incline-db-press',
        name: 'Incline Dumbbell Press',
        category: 'Compound · Chest Hypertrophy',
        targetWeight: 32,
        targetReps: 10,
        defaultSets: 3,
        restSeconds: 90,
        isCompound: true,
      },
      {
        id: 'overhead-barbell-press',
        name: 'Overhead Barbell Press',
        category: 'Compound · Anterior Deltoids',
        targetWeight: 50,
        targetReps: 8,
        defaultSets: 3,
        restSeconds: 120,
        isCompound: true,
      },
      {
        id: 'tricep-rope-pushdown',
        name: 'Tricep Rope Pushdown',
        category: 'Isolation · Triceps Lateral Head',
        targetWeight: 25,
        targetReps: 12,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
      },
      {
        id: 'cable-lateral-raise',
        name: 'Cable Lateral Raise',
        category: 'Isolation · Medial Deltoids',
        targetWeight: 12.5,
        targetReps: 15,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
      },
    ],
  },
  {
    slug: 'pull',
    name: 'Pull Day A',
    shortName: 'Pull',
    subtitle: 'Back · Lats · Biceps',
    focus: 'Posterior Chain & Upper Back Width',
    iconName: 'flame',
    colorGradient: 'from-amber-400 via-orange-500 to-red-500',
    accentColor: '#f59e0b',
    defaultTonnage: [5400, 5750, 6100, 6500],
    exercises: [
      {
        id: 'barbell-deadlift',
        name: 'Conventional Deadlift',
        category: 'Compound · Posterior Chain',
        targetWeight: 120,
        targetReps: 5,
        defaultSets: 3,
        restSeconds: 150,
        isCompound: true,
      },
      {
        id: 'lat-pulldown',
        name: 'Neutral Grip Lat Pulldown',
        category: 'Compound · Lats & Teres Major',
        targetWeight: 65,
        targetReps: 10,
        defaultSets: 3,
        restSeconds: 90,
        isCompound: true,
      },
      {
        id: 'chest-supported-row',
        name: 'Chest-Supported Row',
        category: 'Compound · Rhomboids & Mid Traps',
        targetWeight: 42.5,
        targetReps: 10,
        defaultSets: 3,
        restSeconds: 90,
        isCompound: true,
      },
      {
        id: 'incline-db-curl',
        name: 'Incline Dumbbell Curl',
        category: 'Isolation · Biceps Long Head',
        targetWeight: 14,
        targetReps: 12,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
      },
    ],
  },
  {
    slug: 'legs',
    name: 'Leg Day A',
    shortName: 'Legs',
    subtitle: 'Quads · Hamstrings · Calves',
    focus: 'Lower Body Strength & Quad Drive',
    iconName: 'zap',
    colorGradient: 'from-purple-500 via-violet-400 to-indigo-500',
    accentColor: '#8b5cf6',
    defaultTonnage: [6200, 6650, 7100, 7600],
    exercises: [
      {
        id: 'barbell-back-squat',
        name: 'Barbell Back Squat',
        category: 'Compound · Quad & Knee Extension',
        targetWeight: 100,
        targetReps: 8,
        defaultSets: 3,
        restSeconds: 150,
        isCompound: true,
      },
      {
        id: 'romanian-deadlift',
        name: 'Romanian Deadlift (RDL)',
        category: 'Compound · Hamstring & Hip Hinge',
        targetWeight: 90,
        targetReps: 10,
        defaultSets: 3,
        restSeconds: 120,
        isCompound: true,
      },
      {
        id: 'leg-extension',
        name: 'Quad Leg Extension',
        category: 'Isolation · Rectus Femoris',
        targetWeight: 55,
        targetReps: 12,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
      },
      {
        id: 'standing-calf-raise',
        name: 'Standing Calf Raise',
        category: 'Isolation · Gastrocnemius',
        targetWeight: 75,
        targetReps: 15,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
      },
    ],
  },
  {
    slug: 'upper',
    name: 'Upper Body B',
    shortName: 'Upper',
    subtitle: 'Torso & Arm Specialization',
    focus: 'Horizontal & Vertical Torso Balance',
    iconName: 'activity',
    colorGradient: 'from-blue-500 via-cyan-400 to-teal-400',
    accentColor: '#3b82f6',
    defaultTonnage: [5100, 5450, 5800, 6250],
    exercises: [
      {
        id: 'barbell-bench-press',
        name: 'Flat Barbell Bench Press',
        category: 'Compound · Sternal Pecs',
        targetWeight: 80,
        targetReps: 8,
        defaultSets: 3,
        restSeconds: 120,
        isCompound: true,
      },
      {
        id: 'weighted-pullup',
        name: 'Weighted Pull-Up',
        category: 'Compound · Lat Hypertrophy',
        targetWeight: 10,
        targetReps: 8,
        defaultSets: 3,
        restSeconds: 120,
        isCompound: true,
      },
      {
        id: 'db-lateral-raise',
        name: 'Dumbbell Lateral Raise',
        category: 'Isolation · Lateral Deltoids',
        targetWeight: 14,
        targetReps: 12,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
      },
      {
        id: 'ez-bar-preacher-curl',
        name: 'EZ Bar Preacher Curl',
        category: 'Isolation · Biceps Brachii',
        targetWeight: 28,
        targetReps: 10,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
      },
    ],
  },
  {
    slug: 'lower',
    name: 'Lower Body B',
    shortName: 'Lower',
    subtitle: 'Glutes · Posterior Chain · Core',
    focus: 'Unilateral Stability & Posterior Chain',
    iconName: 'shield',
    colorGradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    accentColor: '#10b981',
    defaultTonnage: [5800, 6200, 6700, 7200],
    exercises: [
      {
        id: 'barbell-hip-thrust',
        name: 'Barbell Hip Thrust',
        category: 'Compound · Gluteus Maximus',
        targetWeight: 130,
        targetReps: 10,
        defaultSets: 3,
        restSeconds: 120,
        isCompound: true,
      },
      {
        id: 'bulgarian-split-squat',
        name: 'Bulgarian Split Squat',
        category: 'Compound · Unilateral Quads & Glutes',
        targetWeight: 24,
        targetReps: 10,
        defaultSets: 3,
        restSeconds: 90,
        isCompound: true,
      },
      {
        id: 'seated-leg-curl',
        name: 'Seated Leg Curl',
        category: 'Isolation · Knee Flexion Hamstrings',
        targetWeight: 50,
        targetReps: 12,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
      },
      {
        id: 'hanging-leg-raise',
        name: 'Hanging Leg Raise',
        category: 'Isolation · Rectus Abdominis',
        targetWeight: 0,
        targetReps: 15,
        defaultSets: 3,
        restSeconds: 60,
        isCompound: false,
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
