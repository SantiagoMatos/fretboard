# Fretboard

Chords, scales and printable chord charts for timple, guitar, ukulele, bass, mandolin, bandurria/laúd and cavaquinho.

Built with [Svelte 5](https://svelte.dev) + [Vite](https://vite.dev), plain JavaScript, no other dependencies.

## Run it

```bash
npm install        # first time only
npm run dev        # dev server with live reload → http://localhost:5173
npm run build      # production files in dist/ — upload that folder anywhere (GitHub Pages, Netlify…)
```

Node is installed in `~/.local/node` and linked into `~/.local/bin`, so `npm` works in any terminal.

## Features

- **Chords**: 20 chord types from any root, with every playable shape found automatically (tap to hear and highlight it)
- **Shape tools**: switch strings off (e.g. only the top 4), filter by neck position, and edit a shape by tapping the board — the chord name follows your edits
- **Scales**: 15 scales, plus the triads and 7th chords that belong to each 7-note scale
- **Identify**: tap frets on the board and get the chord name (including slash chords)
- **Song sheet**: slide-in panel (drag its left edge to resize) to collect chord diagrams, reorder them, export as PNG / SVG or print
- **Play the song**: plays the sheet's chords in order with a tempo, beats per chord and strum pattern (one strum, downs, down-up, folk, arpeggio), optionally looped; the chord playing is highlighted
- **Transpose and capo**: move a whole song up or down a semitone, or put a capo on — names stay in concert pitch, shapes are re-found nearby, and diagrams show the shape you play (“F shape”)
- **Songs library**: every song saves automatically in the browser; open, duplicate or delete them from “☰ Songs”
- **Song files**: “Save file” downloads one song as `.json`, “Back up all” downloads every song; “Open file…” loads them back (other devices, sharing)
- Notes / intervals / no labels, D♭ (default) / C♯ / Do-Re-Mi names, show/hide single intervals
- Custom tunings, left-handed mode, flipped strings, 12–22 frets
- Full-width fretboard that stays in view while scrolling; vertical neck on phones
- Sound: physically-modelled plucked strings (Karplus-Strong, no samples) with a voice per instrument — doubled courses on mandolin/bandurria, long sustain on bass — plus body resonance and room reverb; dark mode
- Settings are saved in the browser; the URL is shareable (`#i=guitar&m=chord&r=2&c=m7`)

## Where things live

```
src/
  lib/music/theory.js       notes, intervals, CHORDS, SCALES, chord identification   ← pure JS, no UI
  lib/music/instruments.js  INSTRUMENTS and tunings, note parsing
  lib/music/voicings.js     chord-shape finder
  lib/diagram.js            chord-box SVG (used on screen and in exports)
  lib/export.js             song sheet → SVG / PNG download
  lib/audio.js              string synth and instrument voices, song player and strum patterns
  lib/state.svelte.js       app state, songs library, song files, transpose/capo, saving, URL hash
  components/
    TopBar.svelte           instrument, tuning, mode, display settings, sheet button
    Picker.svelte           piano-style root picker, chord/scale columns by family (tabs on phones), interval toggles
    Board.svelte            fretboard card: markers, play, add, shape editing
    Fretboard.svelte        the SVG neck (horizontal, or vertical on narrow screens)
    Shapes.svelte           chord-shape strip with string and position filters
    SidePanel.svelte        scale chords and identify results
    SongSheet.svelte        slide-in song sheet, songs list, export
```

### Adding things

- **A chord or scale**: add one line to `CHORDS` or `SCALES` in `theory.js`, e.g. `{ id: '11', name: 'Eleventh', symbol: '11', formula: ['1', '3', '5', 'b7', '9', '11'] }`
- **An instrument or tuning**: add an entry to `INSTRUMENTS` in `instruments.js`, strings listed from the thumb side (`'E2 A2 D3 G3 B3 E4'`)
- **A new feature/panel**: create a component in `components/`, read from `app` (state.svelte.js), and add it to `App.svelte`
