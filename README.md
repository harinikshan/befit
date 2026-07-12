# BeFit — 26-week consistency-first fitness logbook

> **Show up. That's the program.**

BeFit is a privacy-first fitness logbook that helps you build a lasting exercise habit over 26 weeks. Everything runs entirely in your browser using `localStorage`—no accounts, no servers, and no data collection.

---

## What it is

A beginner-friendly 6-month fitness program built around three simple principles:

| Layer | What it measures |
|---|---|
| **Consistency** | Complete at least 6 sessions each week for 24 of 26 weeks |
| **Endurance** | Monthly 2 km timed run compared with your starting baseline |
| **Body** | Long-term weight and waist measurements |

Instead of deciding what to do every day, simply open the app and follow today's session. The focus is on consistency rather than perfection.

---

## Features

- 📅 Daily workout schedule (Monday–Saturday)
- ✅ One-tap workout logging
- 🔥 Consistency streak tracker
- 📊 Weight, waist, and 2 km run progress charts
- 📝 Weekly review journal
- 💡 Personalized guidance based on your own data
- 🍽️ Simple nutrition principles (no calorie counting)
- 💾 Export and import your data
- 🔒 100% offline & privacy-first

---

## Pages

| Tab | Purpose |
|---|---|
| **Today** | View today's workout and log completion |
| **Streak** | Calendar, weekly targets, and consistency tracking |
| **Log** | Weekly review and workout history |
| **Progress** | Charts for weight, waist, and running performance |
| **Guidance** | Suggestions generated from your own data |
| **Plan** | Weekly schedule, exercise list, and nutrition guidelines |
| **Safety** | Exercise safety reminders and disclaimer |
| **Profile** | Personal information, backup, restore, and reset |

---

## Data Storage

All information is stored only in your browser using `localStorage`.

```text
befit.profile
befit.days
befit.weeks
befit.monthly
```

### Schema

```javascript
befit.profile  { name, startDate, weightKg, waistCm, run2kMin, maxPushups, timeSlot }
befit.days     { "YYYY-MM-DD": "done" | "short" | "rest" | "sick" | "missed" }
befit.weeks    [ { weekEnding, sessions, weightKg, P, S, T, note } ]
befit.monthly  [ { date, waistCm, run2kMin } ]
```

No accounts are required, no analytics are used, and your data never leaves your device.

---

## Project Structure

| File | Purpose |
|---|---|
| `index.html` | Application layout |
| `styles.css` | Theme and styling |
| `app.js` | Workout schedule, tracking, charts, and program logic |

No frameworks, build tools, or external dependencies.

---

## Customization

You can easily customize the app:

| File | Change |
|---|---|
| `app.js` | Workout plan, program length, guidance rules, references |
| `styles.css` | Colors, typography, spacing, shadows |
| `index.html` | Title, navigation labels, footer, branding |

---

## Privacy

BeFit is designed to be completely private.

- No accounts
- No backend
- No cloud database
- No tracking
- No analytics
- No personal data leaves your device

Each visitor has their own independent data stored in their own browser. Nothing is shared between users.

---

## Disclaimer

BeFit is intended for healthy adults who are cleared for moderate exercise. It is **not medical advice**. Stop exercising if you experience sharp pain, and consult a healthcare professional regarding injuries, medical conditions, medications, or significant weight changes.

---

**Meal-prep reference:** https://www.youtube.com/channel/UCjeDdgwverf8ZgMAaqY8F3Q
