# BeFit — 26-week consistency-first fitness logbook

> **Show up. That's the program.**

BeFit is a static single-page app you can host on GitHub Pages. Every visitor gets onboarded with their own information, follows the same 6-month beginner-friendly program structure, and tracks their own streak — all in their browser's `localStorage`. No backend. No accounts. No data leaves your device.

---

## What it is

A 6-month, 20–30 minutes-a-day training logbook built on three ideas:

| Layer | What it measures |
|---|---|
| **Consistency** (foundation) | ≥6 sessions/week, 24 of 26 weeks |
| **Endurance** (engine) | Monthly 2 km timed run vs baseline |
| **Body** (long game) | Waist tape + weight trend |

The fixed weekly schedule (Mon–Sat sessions, Sunday rest) means you never have to decide what to do — you just look it up. Three moderate diet rules replace calorie counting. A streak that measures showing up, not heroics.

### Pages / tabs

| Tab | Purpose |
|---|---|
| **Today** | Today's session + one-tap logging |
| **Streak** | Calendar history + weekly quota bars + the two laws |
| **Log** | 2-minute Sunday review form + running table |
| **Progress** | SVG charts for weight, waist, and 2 km run vs baseline |
| **Guidance** | Rule-based suggestions from your own data |
| **Plan** | Full week table, exercises, diet rules, meal-prep reference |
| **Safety** | 5 safety lines + medical disclaimer |
| **Profile** | Edit info, export/import JSON backup, clear data |

### localStorage schema

```
befit.profile  { name, startDate, weightKg, waistCm, run2kMin, maxPushups, timeSlot }
befit.days     { "YYYY-MM-DD": "done" | "short" | "rest" | "sick" | "missed" }
befit.weeks    [ { weekEnding, sessions, weightKg, P, S, T, note } ]
befit.monthly  [ { date, waistCm, run2kMin } ]
```

---

## Running locally

```bash
# Python (built in)
cd site
python3 -m http.server 8080
# → http://localhost:8080

# Or Node (if installed)
npx serve .
```

---

## Hosting on GitHub Pages

### 1. Create the git repo (already done for you)

```bash
cd ~/Desktop/befit/site
git init
git add -A
git commit -m "feat: BeFit v1 — 26-week consistency logbook"
```

### 2. Create a public GitHub repo

Go to [github.com/new](https://github.com/new), name it `befit` (or anything you like), set it to **Public**, and **do not** initialize with a README (you already have one).

### 3. Push

```bash
git remote add origin https://github.com/YOUR-USERNAME/befit.git
git branch -M main
git push -u origin main
```

### 4. Enable GitHub Pages

1. Go to your repo → **Settings** → **Pages**
2. Under **Source**, choose **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Click **Save**

Your site will be live at:

```
https://YOUR-USERNAME.github.io/befit/
```

It usually takes 1–2 minutes for Pages to build the first time.

### Privacy guarantee

Each visitor's data is stored only in **their own browser's `localStorage`**. One public URL works for unlimited users — their data never meets yours, and nothing reaches any server.

---

## Forking / customizing

The entire program is in three files:

| File | What to change |
|---|---|
| `app.js` | `SESSIONS` array (exercise details), `PRINCIPLES`, `MRBFIT` links, `PROGRAM_WEEKS`, `WEEKS_TARGET` |
| `styles.css` | CSS custom properties at `:root` for colors, fonts, shadows |
| `index.html` | Page title, nav tab labels, footer text |

No build step, no dependencies, no node_modules. Edit, save, push.

---

## Disclaimer

This is a consistency plan for healthy adults cleared for moderate exercise. It is **not medical advice**. Sharp pain means stop; anything medical — conditions, medications, injuries, rapid weight change — is a doctor's call, not a website's. Your data never leaves your browser.

---

*Meal-prep reference: [Mr. B-fit on YouTube](https://www.youtube.com/channel/UCjeDdgwverf8ZgMAaqY8F3Q)*
