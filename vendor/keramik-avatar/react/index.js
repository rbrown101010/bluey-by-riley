import { createElement, forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import '../keramik-avatar.js';

// Ruft fn nur auf, wenn sich value nach dem ersten Rendern ändert (oder initial, wenn runInitially)
function useChange(el, value, fn, runInitially) {
  const prev = useRef(runInitially ? Symbol('init') : value);
  useEffect(() => {
    const key = JSON.stringify(value);
    const old = typeof prev.current === 'symbol' ? prev.current : JSON.stringify(prev.current);
    if (key === old || !el.current) return;
    prev.current = value;
    fn(el.current, value);
  });
}

/**
 * <KeramikAvatar mood="think" reaction={null} activity="search" query="…" />
 * Über ref erreichst du die volle API (react, boot, shutdown, …).
 */
export const KeramikAvatar = forwardRef(function KeramikAvatar(props, ref) {
  const {
    mood = 'neutral', reaction = null, activity = null, query,
    shape, autoMorph = false, addons, body, glow,
    power = true, boot = true, size = 300, style
  } = props;
  const el = useRef(null);
  useImperativeHandle(ref, () => el.current, []);

  useChange(el, mood, (a, v) => a.setMood(v));
  useChange(el, reaction, (a, v) => a.react(v || null), !!reaction);
  useChange(el, [activity, query], (a, v) => a.activity(v[0] || null, { query: v[1] }), !!activity);
  useChange(el, shape, (a, v) => v && a.setShape(v), !!shape);
  useChange(el, autoMorph, (a, v) => a.autoMorph(!!v), !!autoMorph);
  useChange(el, addons || null, (a, v) => { if (v) Object.keys(v).forEach((k) => a.addon(k, !!v[k])); }, !!addons);
  useChange(el, [body, glow], (a, v) => a.setColors({ body: v[0], glow: v[1] }), !!(body || glow));
  useChange(el, power, (a, v) => (v ? a.boot() : a.shutdown()), power === false);

  return createElement('keramik-avatar', {
    ref: el,
    boot: boot && power ? '' : undefined,
    style: Object.assign({ '--ka-size': typeof size === 'number' ? size + 'px' : size }, style)
  });
});

export default KeramikAvatar;
