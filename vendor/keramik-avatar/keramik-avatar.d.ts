export type KaMood = 'neutral' | 'happy' | 'think' | 'wow' | 'focus' | 'oops' | 'wink' | 'sleep' | 'question' | 'alert' | 'meh' | 'confused';
export type KaReaction = 'stop' | 'idea' | 'heart' | 'timer' | 'confetti' | 'coffee' | 'thumb' | 'wave' | 'umbrella' | 'magnifier' | 'music' | 'battery';
export type KaActivity = 'search' | 'tasks' | 'mail' | 'cal' | 'run';
export type KaShape = 'squircle' | 'kapsel' | 'kiesel' | 'helm' | 'monitor';
export type KaAddon = 'ring' | 'shadow' | 'ant' | 'pods';

export declare class KeramikAvatar extends HTMLElement {
  static readonly moods: KaMood[];
  static readonly reactions: KaReaction[];
  static readonly activities: KaActivity[];
  static readonly shapes: KaShape[];
  static readonly addons: KaAddon[];
  setMood(id: KaMood): this;
  react(id: KaReaction | null): this;
  activity(id: KaActivity | null, opts?: { query?: string }): this;
  setShape(name: KaShape): this;
  autoMorph(on: boolean): this;
  addon(name: KaAddon, on: boolean): this;
  setColors(colors: { body?: string; glow?: string }): this;
  boot(): this;
  shutdown(): this;
}
export default KeramikAvatar;

declare global {
  interface HTMLElementTagNameMap { 'keramik-avatar': KeramikAvatar; }
}
