export type PremiumSeatStatus = { guild_premium: boolean; pass_active: boolean; seats: number; used: number };
export function activationChoice(status: PremiumSeatStatus): 'active' | 'plans' | 'activate' | 'full' {
  if (status.guild_premium) return 'active';
  if (!status.pass_active) return 'plans';
  return status.used < status.seats ? 'activate' : 'full';
}
