import type { CSSProperties, ForwardRefExoticComponent, RefAttributes } from 'react';
import type { KeramikAvatar as KeramikAvatarElement, KaMood, KaReaction, KaActivity, KaShape, KaAddon } from '../keramik-avatar';

export interface KeramikAvatarProps {
  mood?: KaMood;
  reaction?: KaReaction | null;
  activity?: KaActivity | null;
  query?: string;
  shape?: KaShape;
  autoMorph?: boolean;
  addons?: Partial<Record<KaAddon, boolean>>;
  body?: string;
  glow?: string;
  /** false = ausschalten (Röhren-Effekt), true = einschalten (Boot) */
  power?: boolean;
  /** Boot-Animation beim ersten Anzeigen (Standard: true) */
  boot?: boolean;
  size?: number | string;
  style?: CSSProperties;
}
export declare const KeramikAvatar: ForwardRefExoticComponent<KeramikAvatarProps & RefAttributes<KeramikAvatarElement>>;
export default KeramikAvatar;
