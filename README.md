# Bill of Rights Game

Source and tracking backend for **The Rights Protocol**, a classroom Bill of Rights game.

- The live Apps Script web app accepts Northside staff (`@northsidechs.org`) and student (`@students.northsidechs.org`) Google accounts.
- Student state is autosaved after every meaningful game action and restored on return.
- Exact puzzle attempts are appended to the teacher's `Attempt Log` sheet.
- `Student Progress` shows unfinished and completed work in near real time.
- Puzzle answer order reshuffles on each opening and case reset. After a wrong check, students get a clue and a 10-second pause; three misses restart that case, not the mission. Teacher progress includes a review flag and case-reset count.
- The first three main missions unlock optional arcade challenges: Freedom Defender (Amendment I), Precision Range (II), and Warrant Run (IV). Students can play immediately or return via Menu → Bonus Arcade. Arcade progress and completion are included in the saved school-account state.

The Apps Script deployment fetches the 40 `chunks/game.part.*` files from this repository. `Code.gs` contains the Sheet-backed progress API. The three supplied standalone games live in `minigames/`; `build-arcade.mjs` embeds them into the generated bundle.
