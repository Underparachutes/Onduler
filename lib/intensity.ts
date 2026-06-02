export const INTENSITY_MULTIPLIER = { light: 0.5, medium: 1, deep: 1.5 } as const
export type Intensity = keyof typeof INTENSITY_MULTIPLIER
