# Weather Icon Options (Preview & Import)

You can preview these collections, then tell me which one to use and I’ll wire it up.

---

## Colorful / Advanced Aesthetic (non-monochrome)

### A. **Meteocons by Bas Milius** ⭐ Recommended

- **Preview:** [Filled icons](https://basmilius.github.io/weather-icons/index-fill.html) | [Outlined icons](https://basmilius.github.io/weather-icons/index-line.html)
- **Package:** `@bybas/weather-icons`
- **License:** MIT
- **Pros:** Hand-crafted, animated SVG, filled & outlined styles, rich set (clear-day, partly-cloudy-day-rain, thunderstorms, fog, etc.), professional look
- **Cons:** Uses Dark Sky naming; we map OpenWeather codes → Meteocons names
- **Note:** Icons are colorful/filled by default; can be styled via CSS

---

### B. **Weather Iconic** (multi-color)

- **Preview:** [GitHub](https://github.com/konradmichalik/weather-iconic) | [temps app demo](https://jackd248.github.io/temps/)
- **Package:** `weather-iconic`
- **License:** CC BY-SA 3.0
- **Pros:** 100 minimal icons, multi-color support via CSS vars (`--weather-primary-fill`, `--weather-secondary-fill`), day/night variants, tree-shakeable
- **Cons:** Landing page may be down; icon names differ from OpenWeather (need mapping)

---

### C. **QWeather Icons** (和风天气)

- **Preview:** [icons.qweather.com](https://icons.qweather.com/en/)
- **Package:** `qweather-icons`
- **Pros:** Outline + filled variants, polished design, SVG + webfont, Figma file available
- **Cons:** Built for QWeather API; mapping to OpenWeather codes required
- **Note:** Chinese weather provider; icons work for any weather app

---

### D. **Visual Crossing WeatherIcons**

- **Preview:** [GitHub](https://github.com/visualcrossing/WeatherIcons) — see index PNGs for 4 color sets
- **Format:** SVG/PNG in repo (no npm package; use raw files or CDN)
- **License:** LGPL-3.0
- **Pros:** 4 color sets + 4 mono sets, 22 icons each, ready to use
- **Cons:** Fewer icons; built for Visual Crossing API; need mapping

---

## Monochrome

### 1. **OpenWeatherMap (current default)**

- **Preview:** [OpenWeather icon list](https://openweathermap.org/weather-conditions#Weather-Icons)
- **Format:** PNG images from their CDN
- **Pros:** Matches API, no extra dependency
- **Cons:** Pixel-based, limited styling

---

## 2. **react-icons / Weather Icons (wi)** *(currently in use)*

- **Preview:** [react-icons wi gallery](https://react-icons.github.io/react-icons/icons/wi/)
- **Package:** `react-icons` (already installed)
- **Import:** `import { WiDaySunny, WiDayRain } from "react-icons/wi"`
- **Pros:** SVG, 200+ icons, day/night variants, free (SIL OFL)
- **Cons:** Older visual style

---

## 3. **Lucide Icons** (general set with weather-like icons)

- **Preview:** [Lucide icons](https://lucide.dev/icons/) — search “cloud”, “sun”, “rain”, “snow”
- **Package:** `lucide-react`
- **Pros:** Modern, consistent, tree-shakeable
- **Cons:** Not weather-specific; fewer direct matches (e.g. Cloud, CloudRain, Sun, Snowflake)

---

## 4. **Heroicons** (already in project)

- **Preview:** [Heroicons](https://heroicons.com/) — search “sun”, “cloud”
- **Package:** `@heroicons/react` (already installed)
- **Pros:** No new dependency, matches existing UI
- **Cons:** Very few weather icons (Sun, Cloud)

---

## 5. **Tabler Icons**

- **Preview:** [Tabler icons](https://tabler.io/icons) — search “weather”, “cloud”, “rain”
- **Package:** `@tabler/icons-react`
- **Pros:** Large set, many weather icons, MIT license
- **Cons:** New dependency

---

## 6. **Phosphor Icons**

- **Preview:** [Phosphor icons](https://phosphoricons.com/) — search “cloud”, “sun”, “rain”
- **Package:** `@phosphor-icons/react`
- **Pros:** Multiple weights (thin, light, regular, bold), modern look
- **Cons:** New dependency

---

## 7. **weather-icons-react** (dedicated weather set)

- **Preview:** [npm package](https://www.npmjs.com/package/weather-icons-react) — based on weathericons.io
- **Package:** `weather-icons-react`
- **Pros:** Built for weather, OpenWeather-compatible
- **Cons:** Separate package from react-icons/wi

---

## Recommendation

- **Keep OpenWeather PNGs:** Easiest, no changes.
- **Meteocons (@bybas/weather-icons):** Best for a colorful, polished look. Filled style is vibrant; animated SVGs add polish.
- **Weather Iconic:** Good for multi-color, customizable icons.
- **QWeather Icons:** Strong alternative if you prefer their outline/filled style.

Tell me which collection you prefer and I’ll update the Weather widget to use it.
