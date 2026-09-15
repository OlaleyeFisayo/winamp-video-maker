# Playerz design system

This is the single source of truth for how Playerz looks, reads, moves and is organised in code. Anyone (human or AI) building UI in this repo follows it exactly. If a screen needs something this document does not cover, extend the document first, then build.

## 1. Purpose and audience

Playerz lets a creator pick a Winamp skin (`.wsz`), drop in a track, set a background and aspect ratio, and export a video of the skin playing that track. Webamp can play skins in the browser but cannot export video. Playerz exists to close that gap for people who make music content for Reels, TikTok, Shorts and YouTube.

The page has one job: get from "I have a track" to "I have a video" with as few decisions as possible. Every design choice below serves that.

## 2. Direction

**Thesis.** The skin is the only decorated object on screen. The shell around it is a quiet black stage crew: flat, monochrome, outlined rather than filled, with one hand-drawn voice (Ananias, the face the logo is set in) so it still feels like Playerz and not a generic dark editor.

**Signature.** The stage. The skin renders at an integer pixel scale, never blurred, inside a frame drawn as a 1px `contrast` outline with a small monospace corner tag (`9:16 · 1080×1920`), the way a video editor draws a safe-frame. Around it everything is ghost and outline. **Export is the single solid `contrast`-filled element on the page.**

**What we borrow from Winamp, and what we do not.** We borrow crisp pixels and tiny uppercase monospace labels (the spirit of `TEXT.BMP`). We do not borrow bevels, gradients, chrome or fake 3D. The skin is the only skeuomorphic thing on screen.

## 3. Palette

Strictly grey scale. There is no accent colour and no coloured state. Tokens are **roles**, not colours: the same class (`bg-ink`, `text-paper`) renders the dark or light value depending on the theme. Dark is the default and the brand look; light is a toggle in the header, persisted per browser.

| Token | Dark | Light | Use |
|---|---|---|---|
| `stage` | `#FFFFFF` | `#FFFFFF` | The frame: the export canvas behind the skin. Not chrome, so it does not follow the theme; the Background layer will override it later. |
| `ink` | `#0A0A0A` | `#F5F5F5` | App background, header, both sidebars. |
| `graphite` | `#161616` | `#E8E8E8` | Raised surfaces: modal body, cards, inputs, dropzone at rest. |
| `rule` | `#2A2A2A` | `#D4D4D4` | 1px borders and dividers. |
| `ash` | `#8A8A8A` | `#6F6F6F` | Secondary text, icons at rest, placeholders, disabled labels. |
| `paper` | `#F2F2F2` | `#0D0D0D` | Primary text, active icons, outlines on hover-free selected items. |
| `overlay` | `rgb(0 0 0 / 0.7)` | same | Dialog backdrop. The one translucent value. |
| `contrast` | `#FFFFFF` | `#000000` | Export button fill, selected-state outline, focus ring, stage frame outline. The maximum-contrast fill. |

Rules:
- Never name a colour in a class or in copy ("white outline"); name the role (`contrast` outline). What is white in dark mode is black in light mode.
- No gradients. No tints. No opacity tricks to invent a new grey; use a token.
- Selection is a `contrast` 1px outline, never a fill.
- Errors are `paper` text with a `paper` underline on the offending field. Never red.
- The only shadow allowed is the dialog backdrop, the `overlay` token.
- Raw hex never appears in a component. Only Tailwind classes from the tokens (`bg-ink`, `text-ash`, `border-rule`).

## 4. Typography

Two roles, two faces.

**Ananias** (`/public/fonts/ananias/`, Regular 400 and Bold 700). The default face for everything a person reads: panel titles, button labels, template names, body copy, empty states, error messages. It is a hand-drawn marker face, the same one the logo uses, so the shell and the logo speak with one voice.

**System monospace** (`ui-monospace, "SF Mono", Menlo, Consolas, monospace`). Data only: timecodes, pixel dimensions, aspect ratios, file sizes, fps, and the uppercase panel eyebrows. Nothing is downloaded for it.

| Role | Face | Size / line | Weight | Case | Where |
|---|---|---|---|---|---|
| Eyebrow | mono | 11 / 1.3 | 400 | UPPERCASE, `tracking-[0.08em]` | Panel section headers: TEMPLATE, AUDIO, BACKGROUND, FRAME |
| Data | mono | 13 / 1.3 | 400 | as-is | `00:00`, `1080 × 1920`, `9:16`, `30 fps`, `2.4 MB` |
| UI | Ananias | 15 / 1.3 | 400 | Sentence case | Buttons, labels, template names, list items |
| Body | Ananias | 15 / 1.5 | 400 | Sentence case | Empty states, help text, errors |
| Title | Ananias | 18 / 1.3 | 700 | Sentence case | Modal title only |
| Display | Ananias | 24 / 1.2 | 700 | Sentence case | Reserved. Not used in the editor today. |

Bold is used in exactly three places: the Export label, the modal title, and the template name on the selected card. Everywhere else is Regular.

Never set Ananias below 13px. If something needs to be smaller, it is data and belongs in mono.

## 5. Shape and spacing

- Spacing grid: 4px. Allowed values: 4, 8, 12, 16, 24, 32, 48.
- Radius: `rounded-sm` (3px) on controls (buttons, inputs, tiles, cards). `rounded-md` (6px) on the modal. `0` on the stage frame.
- Borders: always 1px. Rest `rule`. Hover `ash`. Selected or active `contrast`.
- Header height 56. Left sidebar 280. Right sidebar 280. Panel padding 16. Gap between panel sections 24. Gap inside a section 8.
- Scrollbars: the standard `scrollbar-width: thin` and `scrollbar-color` set once on `*` in `index.css`, thumb `rule` at rest and `ash` while the scrolling element is hovered, transparent track. No custom scrollbar markup. The skin keeps its own bitmap scrollbars.
- Icons: `@tabler/icons-react`, size 16, `stroke={1.5}`. Colour follows the text colour of the parent (`ash` at rest, `paper` on hover or active). Icon-only buttons are 32×32.

## 6. Layout

Desktop first, minimum 1024px wide. Below 1024 the two sidebars collapse into a bottom sheet with the same three-plus-one sections as tabs; the stage stays on top.

```
┌──────────────────────────────────────────────────────────────────────┐
│ [logo 40px]                                  [NAME ▭      ][☼][Export]│ 56
├────────────┬───────────────────────────────────────────┬─────────────┤
│ TEMPLATE   │                                           │ FRAME       │
│ ┌────────┐ │            ┌──────────────┐               │ ▭ 16:9* YouTube│
│ │ thumb  │ │            │  background   │  16:9·1920×1080│ ▭ 9:16  Reels│
│ └────────┘ │            │  ┌────────┐   │               │ ▭ 1:1   Square│
│ Sony Winamp│            │  │  skin  │   │               │ ▭ 4:5   Feed │
│ ▢ Custom 3:2│
│ Change ›   │            │  └────────┘   │               │─────────────│
│────────────│            └──────────────┘               │ RESOLUTION  │
│ TRACKS  +  │                                           │ 1080 × 1920 │
│ ▶ song.mp3 │                                           │ 30 fps      │
│ 2 next.wav │                                           │             │
│────────────│                                           │             │
│ BACKGROUND │                                           │             │
│ ● Solid    │                                           │             │
│ ○ Image    │                                           │             │
│ ○ Video    │                                           │             │
└────────────┴───────────────────────────────────────────┴─────────────┘
   280px                     flex-1 (stage)                   280px
```

CSS grid on the app root: `grid-template-columns: 280px 1fr 280px; grid-template-rows: 56px 1fr; height: 100dvh`. The header spans all three columns. Sidebars scroll independently; the stage never scrolls.

### 6.1 Header

- Left: the logo at 40px height (the square mark is illegible much smaller), plain `<img>`, `alt="Playerz"`. `/images/logo.png` (black tile) in dark mode, `/images/logo-light.png` (black marks on transparent) in light mode. No wordmark next to it; the logo is the wordmark.
- Right, gap 12: the video name field, the theme toggle, then Export.
- Name field: mono eyebrow `NAME` as a visible `<label>`, then a 256px input `bg-graphite border-rule rounded-sm`, hover `ash`, focus `paper`. Placeholder "Untitled video". It is always bordered and filled so it reads as editable at rest, and it starts empty so the placeholder itself says a name is optional. Export uses the name as the file name.
- Theme toggle: `IconButton`, `IconSun` in dark mode and `IconMoon` in light, `aria-label` "Switch to light mode" / "Switch to dark mode".
- Export: `bg-contrast text-ink font-bold` Ananias 15, padding 8×16, `rounded-sm`. Icon `IconDownload` left of the label. This is the only filled button in the app. Disabled while no audio is loaded: `bg-graphite text-ash`, cursor not-allowed, tooltip "Add audio to export". Enabled with an empty name: tooltip "Exports as Untitled video.mp4".
- Bottom border 1px `rule`.

### 6.2 Left sidebar

Three sections in this fixed order, because it is the creator's order of work: Template, Tracks, Background. Each section is an eyebrow, an 8px gap, then its content. Sections are separated by 24px and a 1px `rule` divider.

**TEMPLATE**
- Thumbnail of the current skin's main window (from its `main.bmp`) on a `stage` background, `border-rule rounded-sm`, `image-rendering: pixelated`, full width, height auto.
- Template name below in UI type, `paper`. Author (from the skin's readme if present) in Data mono, `ash`.
- Ghost button "Change template" with `IconChevronRight`. Opens the Template modal.

**TRACKS**
- The playlist, in play order. It mirrors the skin's own playlist: tracks added through the skin (Eject, the playlist + button, ADD URL, a drop onto a window) appear here, and REM in the skin removes them here. Section header row: eyebrow `TRACKS` left, link button "Add tracks" with `IconPlus` right. The button opens the native picker (`audio/*`, multiple). No dropzone: the skin itself accepts drops, and a big empty box would compete with the stage.
- Empty: Body text in `ash`, "No tracks yet. Add MP3 or WAV files. They play in this order."
- Each row is one 36px line, `border-rule bg-graphite rounded-sm`: a 24px index button in Data mono `ash` ("Play <title>"), the name as a borderless inline input (border `rule` on hover, `ash` on focus), duration in Data mono `ash` (`--:--` until known), and a 28px `IconX` button "Remove <title>".
- Renaming: edit the name, Enter or blur commits, Esc reverts. The new name shows in the skin's playlist and marquee immediately; playback is not interrupted.
- The list shows at most five rows (212px) and scrolls for more. The playing track is always scrolled into view here, and in the skin's playlist it is scrolled into view and selected, so both lists agree on the active row.
- Active row (the track the skin is playing): `contrast` border and a 14px `IconPlayerPlay` in `paper` in place of the index. It mirrors the highlight in the skin's own playlist window; both move together.
- Mixed picks keep the audio files and show "Some files weren't audio and were skipped. Use MP3, WAV, OGG or FLAC." under the list until the next add.
- The first track added names the video when the name is still empty. Adding appends to the skin's playlist without interrupting playback; removing reloads the remaining list.

**BACKGROUND**
- A vertical radio list: Solid, Image, Video. Each row is 40px tall, radio drawn as a 12px circle with 1px `rule` border, filled `paper` when selected. Row text in UI type.
- Solid: below the row, a swatch strip of six greys (`stage`, `ink`, `graphite`, `rule`, `ash`, `paper`) plus one "Custom" swatch that opens the native `<input type="color">`. Default `stage`. Selected swatch has a `contrast` outline.
- Image / Video: below the row, the same Dropzone pattern as Audio, copy "Drop an image here." / "Drop a video here.", accepting `image/*` and `video/*`. Once loaded, a card with filename and a "Remove" icon button. A "Fit" segmented control (Cover, Contain) in Data mono.

### 6.3 Editor (centre)

Implementation: the `webamp` package renders the skin. One instance for the app's lifetime (`features/editor/lib/webamp.ts`), mounted with `renderInto` on the editor section, which must be `position: relative`. Webamp centres its open windows in that section. Main, equalizer and playlist windows open, stacked. Window positions are locked: a Redux middleware drops drag and resize actions, and Close is cancelled through `onWillClose`, so every other skin control keeps working. The skin renders into a 275×348 box that CSS grid keeps centred on resize. The playlist is mirrored into `useAudio.tracks` on every Webamp state change; the sidebar sends `add` / `remove` / `play` commands through `useAudio.commands`, which the editor applies. The current track index is mirrored into `useAudio.current` from `onTrackDidChange` by matching the loaded url against `getPlaylistTracks()`; the sidebar sends commands through `useAudio.commands`, which the editor applies. On every track change `revealTrack` selects the row in the skin playlist and sets its scroll position so the row is visible. `zIndex: 1` so dialogs and overlays sit above the skin. Audio comes from `useAudio.tracks`: appended files go through `appendTracks`, any other change reloads with `setTracksToPlay`, an empty list stops playback. Files are passed as blob tracks.


- The bed is `graphite` with 32px padding, one step lighter than the panels so it reads as background, not surface. It is chrome and follows the theme. The frame sits on it.
- The frame is `stage` white, the largest box of the selected ratio that fits the bed (CSS container units, no JS measuring), centred, 1px `contrast` outline. No labels on or around it; the ratio is visible in the sidebar. Default 16:9.
- Inside the frame: the background layer (solid, image or video, respecting Fit), then the skin centred on top at 1× in its 275×348 box. Scaling the skin to the frame is an export concern; a frame smaller than the skin clips it.
- Transport: deferred. The skin's own buttons play, pause and seek. Revisit a shell transport bar when the aspect frame lands, if the skin's controls prove too small in the frame.
- Unsupported browsers see Body text "This browser can't run the player. Try Chrome, Edge or Firefox." centred in the editor.

### 6.4 Right sidebar

Every section here is collapsible: the header row is a `<summary>` with the eyebrow and a chevron that rotates when open. Sections start open. Left-sidebar sections are not collapsible.

**FRAME**
- One `Segmented` control on a single line: `16:9` · `9:16` · `1:1` · `4:5` · `Custom`. Labels only, in Data mono 12; no glyphs or platform hints. Default 16:9. Arrow keys move the selection.
- Custom selected: a row of two fields appears under the control, `W` and `H` eyebrows over 36px mono number inputs with `×` between. Values commit on blur or Enter, clamp to 16…7680, and drive the frame live. Picking a preset hides the row but keeps the values.
- There is no resolution or frame-rate here; those are export choices (§6.6).

### 6.5 Template modal

- Overlay `rgb(0 0 0 / 0.7)`, full viewport. Dialog `graphite`, `border-rule rounded-md`, 880px wide, max height 80dvh, centred.
- Header 56px: Title "Choose a template" (Ananias 18 bold), 32×32 icon button `IconX` right with `aria-label="Close"`. Bottom border 1px `rule`.
- Body scrolls. Grid of template cards, 4 columns at 880 wide, gap 16, padding 24. A card is a `stage` thumbnail of the skin's `main.bmp` at pixelated scale inside a `border-rule rounded-sm` box, then the template name in UI type `paper`, then author in Data mono `ash`. Hover border `ash`. Selected border `contrast` and the name goes bold.
- The first card is always "Upload a skin": a dashed-border Dropzone accepting `.wsz`. Wrong file shows "This file isn't a Winamp skin. Choose a .wsz file."
- Footer 64px, top border 1px `rule`: ghost button "Cancel" left, ghost button "Use this template" right. The modal has no filled button; Export keeps that privilege.
- Focus is trapped inside the dialog. Esc closes. Focus returns to "Change template" on close.

### 6.6 Export dialog

Opened by the header's Export button (enabled once a track is loaded). Native `<dialog>`, 440px, `graphite` on the `overlay` backdrop, `rounded-md`.
- Header 56px: title "Export video" (Ananias 18 bold), `IconX` "Close". Esc and the backdrop close it.
- Body, gap 24: eyebrow "Frame rate" over a `Segmented` of `30 fps` / `60 fps`; eyebrow "Resolution" over a `Segmented` of `720p` / `1080p` / `2K` / `4K` (short side 720 / 1080 / 1440 / 2160; the long side follows the frame ratio, both rounded to even pixels). Then one Body line in `ash` with the numbers in mono `paper`: "Exports 1920 × 1080 at 30 fps as <name>.mp4".
- Footer: ghost "Cancel", primary "Export video". Inside the dialog this is the only filled button; the header's is behind the backdrop.

## 7. Components (`src/shared/ui`)

Every primitive accepts `className` and forwards native props. They are styled only with token classes.

| Component | Variants | Notes |
|---|---|---|
| `Button` | `primary` (`contrast` fill, ink text, bold), `ghost` (transparent, `border-rule`, `paper` text), `link` (no border, `ash` text, `paper` on hover) | Height 36, padding 8×16, `rounded-sm`, optional leading icon. `primary` is used once: Export. |
| `IconButton` | – | 32×32, `border-rule` on hover only, requires `aria-label`. |
| `Eyebrow` | – | Mono 11 uppercase tracked `ash`. Renders `<h2>`. |
| `Panel` | – | A sidebar column: `bg-ink`, side border 1px `rule`, padding 16, overflow-y auto. |
| `PanelSection` | `collapsible` | `Eyebrow` (plus optional `action` slot, right-aligned) + 8px gap + children. Adds a 1px `rule` divider and 24px above when not first. `collapsible` renders `<details open>` with a chevron in the summary. |
| `Dropzone` | `idle`, `over`, `error` | A `<button>` that opens the native picker and accepts drops. Dashed border `rule`, `ash` on drag-over, `paper` on error. Renders an icon, a Body line, "Browse files", and the caller's error text underlined. Filters by `accept` (`multiple` optional); calls `onFiles` with the matches and `onReject` if any were dropped. |
| `Segmented` | – | One-line radiogroup of equal segments, mono 12. Selected segment has a `contrast` border, never a fill. Arrow keys. Used for ratio, frame rate, resolution. |
| `Toaster` | – | Bottom-centre stack of one-line notices, `graphite` on `rule`, 120 ms fade in, gone after 3 s or on X. `role="status"`. Webamp's native alerts are routed here. |
| `Dialog` | – | Native `<dialog>` with `showModal`, so focus trap, Esc and the `overlay` backdrop come from the browser. Title row, body, optional footer. |
| `Field` | – | Label (UI type) over a `graphite` input with `border-rule`, `rounded-sm`, height 36. |
| `Swatches` | – | Row of 20×20 squares, `contrast` outline on the selected one. |

Do not add a component to `shared/ui` until a second feature needs it. Until then it lives inside the feature.

## 8. Motion

Almost nothing moves in the shell. The skin's own visualiser is the motion on the page.

- Dialog open: 120ms, opacity 0 to 1 and translateY 4px to 0, `ease-out`. Close is instant.
- Hover and focus: colour and border transitions only, 100ms.
- Progress bar: no transition; it tracks the audio clock directly.
- Nothing animates on load. The stage appears with the skin already drawn.
- Under `prefers-reduced-motion: reduce`, the dialog rise is removed; the opacity fade may stay.

## 9. Copy

Words exist to make the tool easier to use. Sentence case everywhere. Plain verbs. Present tense. No exclamation marks, no emoji, no marketing adjectives.

- Buttons name the result: "Export video", "Add audio", "Change template", "Use this template", "Browse files", "Remove audio". A name stays the same through the whole flow: the button says "Export video", the progress toast says "Exporting video", the finished toast says "Video exported".
- Empty states tell the person what to do: "No audio yet. Drop an MP3 or WAV here." "Add a track to hear the skin play."
- Errors state the cause and the fix in that order: "This file isn't a Winamp skin. Choose a .wsz file." Never "Oops" or "Something went wrong".
- Toasts are one sentence with no title, in the interface's voice: "That action isn't supported here." They never ask for a decision; that is a dialog.
- Data is written in mono with real units: `03:24`, `1080 × 1920`, `2.4 MB`, `30 fps`.
- The person controls a template, a track, a background and a frame. The interface never says skin file, blob, buffer, layer stack or canvas.

## 10. Accessibility floor

- Every interactive element shows a 2px `contrast` focus ring with 2px offset (`focus-visible:outline-2 outline-contrast outline-offset-2`). Never remove focus styles.
- Icon-only buttons carry `aria-label`. Decorative icons are `aria-hidden`.
- The dialog traps focus, closes on Esc, and returns focus to its trigger.
- Tiles, swatches and the background radio list are keyboard operable with arrow keys and Space.
- Dropzones are also `<button>`s that open the native file picker, so drag and drop is never the only path.
- The stage canvas has a descriptive `aria-label`. The transport exposes the current time as `aria-valuenow` on a `role="slider"`.
- Contrast is met by construction: `ash` on `ink` is 5.6:1, `paper` on `ink` is 17:1.

## 11. Code structure

Feature based. A feature owns its components, hooks and state. Shared code is anything two or more features use.

```
src/
  App.tsx                # composes AppShell with the feature regions
  main.tsx
  shared/
    index.css            # @import "tailwindcss"; @font-face Ananias; @theme tokens
    ui/                  # primitives listed in section 7, one file each, barrel index.ts
    layout/
      AppShell.tsx       # header / left / stage / right grid
    store/               # zustand, one file per store: useProject (name), useTheme (dark/light), useAudio (tracks mirrored from the skin, current, commands), useFrame (ratio, custom size), useExport (dialog open, fps, resolution), useToast (notices)
    lib/
      cn.ts              # class joiner
      formatTime.ts      # seconds to mm:ss
      formatBytes.ts     # bytes to 2.4 MB
      stripExt.ts        # "track.mp3" to "track"
      formatTime.ts      # 125 to 2:05
      presets.ts         # aspect presets, ratioLabel, exportSize
      acceptsFile.ts     # browser-style accept matching
  features/
    templates/           # TemplateSection, TemplateModal, TemplateCard, useSkins, parseWsz
    audio/               # TracksSection (playlist with Add tracks)
    background/          # BackgroundSection, useBackground
    editor/              # Editor, lib/webamp.ts (singleton, renderOnce)
    frame/               # FrameSection (ratio segmented control, custom size)
    export/              # ExportDialog (frame rate, resolution)
```

Rules:
- A feature never imports from another feature. Only from `shared/`. Cross-feature state lives in zustand stores under `shared/store/`; features read them directly and never prop-drill that state through `App.tsx`.
- Every feature exposes a single `index.ts`. Nothing outside the feature imports a deeper path.
- `shared/ui` components carry no feature knowledge. No `TemplateButton` in shared; a `Button` with a label.
- Files are named after the component they export, PascalCase for components, camelCase for hooks and utilities.

### 11.1 Assets

Static files live in `public/` and are referenced by root-relative URL.

| Asset | Path | Used by |
|---|---|---|
| Logo | `public/images/logo.png` dark, `public/images/logo-light.png` light | Header, swapped by theme |
| Ananias font | `public/fonts/ananias/` (`/fonts/ananias/…`) | `@font-face` in `src/shared/index.css` |
| Default skins | `public/default-templates/*.wsz` (`/default-templates/…`) | `features/templates` loads every file here into the Template modal; `sony-winamp-template.wsz` is the initial selection |

### 11.2 Tokens

All tokens live in `src/shared/index.css` and nowhere else.

```css
@import "tailwindcss";

@font-face {
  font-family: "Ananias";
  src: url("/fonts/ananias/Ananias.otf") format("opentype"),
       url("/fonts/ananias/Ananias.ttf") format("truetype");
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "Ananias";
  src: url("/fonts/ananias/Ananias Bold.otf") format("opentype"),
       url("/fonts/ananias/Ananias Bold.ttf") format("truetype");
  font-weight: 700;
  font-display: swap;
}

/* Tokens are roles. Dark is the default; light flips them. */
:root {
  color-scheme: dark;
  --stage: #000000; --ink: #0A0A0A; --graphite: #161616; --rule: #2A2A2A;
  --ash: #8A8A8A; --paper: #F2F2F2; --contrast: #FFFFFF;
}
:root[data-theme="light"] {
  color-scheme: light;
  --stage: #FFFFFF; --ink: #F5F5F5; --graphite: #E8E8E8; --rule: #D4D4D4;
  --ash: #6F6F6F; --paper: #0D0D0D; --contrast: #000000;
}

@theme inline {
  --color-*: initial;
  --color-stage: var(--stage);
  --color-ink: var(--ink);
  --color-graphite: var(--graphite);
  --color-rule: var(--rule);
  --color-ash: var(--ash);
  --color-paper: var(--paper);
  --color-contrast: var(--contrast);

  --font-sans: "Ananias", system-ui, sans-serif;
  --font-mono: ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  --radius-sm: 3px;
  --radius-md: 6px;
}
```

`--color-*: initial` removes Tailwind's default palette so `text-red-500` does not compile. If a colour is not in this block it does not exist in Playerz. `useTheme` in `shared/store` sets `data-theme` on `<html>`; it reads the saved choice, else the OS preference.

## 12. Do and don't

Do
- Render the skin at integer scale with `image-rendering: pixelated`.
- Keep Export as the only filled button.
- Check every screen in both themes before calling it done.
- Put numbers in mono, words in Ananias.
- Use outline for selection, never fill.
- Write errors as cause then fix.

Don't
- Add a colour. Not for errors, not for success, not for a hover.
- Add a gradient, a drop shadow, a glow or a blur anywhere but the modal overlay.
- Imitate Winamp chrome in the shell. No bevels, no fake 3D.
- Animate anything the person did not just trigger.
- Use a radius above 6px, or a font size for Ananias below 13px.
- Import from one feature into another.
- Write raw hex in a component.
