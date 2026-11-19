# keramik-avatar

Animierter KI-Assistent als Web Component, ohne Abhängigkeiten. Er hat Mimiken, Reaktionen mit ausfahrenden Armen, ein Aktivitäts-HUD mit Brille, Formwechsel sowie Ein- und Ausschalten.

```
keramik-avatar/
├─ keramik-avatar.js      ← die Komponente (alles drin)
├─ keramik-avatar.d.ts    ← TypeScript-Typen
├─ react/                 ← React-Wrapper (Props statt Methoden)
├─ demo.html              ← Spielwiese mit allen Funktionen
└─ package.json
```

## 1. Installieren

Ordner ins Projekt legen, zum Beispiel nach `vendor/keramik-avatar`, dann:

```bash
npm install ./vendor/keramik-avatar
```

Ohne npm: `keramik-avatar.js` einfach kopieren und per `<script type="module">` laden.

## 2. Verwenden

### React

```jsx
import { KeramikAvatar } from 'keramik-avatar/react';

<KeramikAvatar
  size={280}
  mood="think"                       // Mimik
  reaction={null}                    // z. B. "confetti"
  activity="search"                  // HUD an, null = aus
  query="Wetter morgen"              // Suchbegriff im HUD
  power={true}                       // false = ausschalten
/>
```

Für die volle API gibt es eine Ref:

```jsx
const bot = useRef(null);
<KeramikAvatar ref={bot} />
bot.current.react('stop');
```

### Plain HTML / Electron / Tauri

```html
<script type="module" src="keramik-avatar.js"></script>
<keramik-avatar id="bot" boot style="--ka-size: 300px"></keramik-avatar>
<script type="module">
  const bot = document.getElementById('bot');
  bot.activity('mail');
</script>
```

### Vue 3

```js
// vite.config.js
vue({ template: { compilerOptions: { isCustomElement: (t) => t === 'keramik-avatar' } } })
```

```vue
<script setup>
import 'keramik-avatar';
import { ref } from 'vue';
const bot = ref(null);
</script>
<template><keramik-avatar ref="bot" boot /></template>
```

### Svelte / Angular

Die Komponente mit `import 'keramik-avatar'` einbinden und `<keramik-avatar>` direkt verwenden. Bei Angular kommt `CUSTOM_ELEMENTS_SCHEMA` ins Modul.

## 3. API

| Methode | Werte |
|---|---|
| `setMood(id)` | `neutral` `happy` `think` `wow` `focus` `oops` `wink` `sleep` `question` `alert` `meh` `confused` |
| `react(id \| null)` | `stop` `idea` `heart` `timer` `confetti` `coffee` `thumb` `wave` `umbrella` `magnifier` `music` `battery` |
| `activity(id \| null, { query })` | `search` `tasks` `mail` `cal` `run` |
| `setShape(name)` | `squircle` `kapsel` `kiesel` `helm` `monitor` |
| `autoMorph(bool)` | Formen wechseln automatisch |
| `addon(name, bool)` | `ring` `shadow` `ant` (Antenne) `pods` (Ohrmuscheln) |
| `setColors({ body, glow })` | Körper- und Leuchtfarbe |
| `boot()` / `shutdown()` | Einschalten mit Ladebalken / Ausschalten mit Röhren-Effekt |

Alle Methoden lassen sich verketten: `bot.activity(null).setMood('happy')`.

Attribute am Element: `boot`, `mood`, `shape`, `reaction`, `activity`, `query`, `body`, `glow`. Die Größe wird mit der CSS-Variable `--ka-size` gesetzt.

Die Listen der möglichen Werte bekommst du im Code über `KeramikAvatar.moods`, `.reactions`, `.activities`, `.shapes` und `.addons`.

## 4. Agent-Zustände anbinden

Ein Zuordnungs-Vorschlag. Am besten an einer zentralen Stelle, an der dein Agent seinen Status meldet:

```js
const MAP = {
  starting:   (b) => b.boot(),
  idle:       (b) => b.activity(null).setMood('neutral'),
  thinking:   (b) => b.setMood('think'),
  searching:  (b, d) => b.activity('search', { query: d.query }),
  reading_mail: (b) => b.activity('mail'),
  tasks:      (b) => b.activity('tasks'),
  running:    (b) => b.activity('run'),
  error:      (b) => b.setMood('oops'),
  distracted: (b) => b.react('stop'),
  done:       (b) => b.react('confetti'),
  reminder:   (b) => b.react('timer'),
  night:      (b) => b.setMood('sleep'),
  off:        (b) => b.shutdown(),
};
agent.on('status', (s, data) => MAP[s]?.(bot, data || {}));
```

## Hinweise

- Die HUD-Inhalte (Treffer, Mails, Termine, Wetter) sind Beispieldaten. Echt sind nur die Uhrzeit und dein `query`.
- Bei `prefers-reduced-motion` werden die CSS-Animationen abgeschaltet.
- `demo.html` funktioniert nur über einen lokalen Server, zum Beispiel `npx serve .`.
