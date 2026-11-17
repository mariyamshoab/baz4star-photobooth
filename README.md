# baz4star's photobooth ♡

A little hand-drawn photobooth for baz's birthday. Friends step inside, take 4 photos (b&w or colour), watch the strip print, doodle and add stickers, then pin it to baz's cork-board wall. They can also leave 10-second video notes.

- Static site: `index.html`, `styles.css`, `app.js`, `assets/`
- Strips and video notes are saved in Supabase (`baz_entries` table + `baz-photobooth` storage bucket)
- Featured strips: auto (4 newest) or hand-picked on the wall with the owner passcode
- Font: Gochi Hand (SIL Open Font License, see `assets/gochi-hand-LICENSE.txt`)
