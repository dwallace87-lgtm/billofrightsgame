# Bill of Rights Game

Source and tracking backend for **The Rights Protocol**, a classroom Bill of Rights game.

- The live Apps Script web app is restricted to `@northsidechs.org` Google accounts.
- Student state is autosaved after every meaningful game action and restored on return.
- Exact puzzle attempts are appended to the teacher's `Attempt Log` sheet.
- `Student Progress` shows unfinished and completed work in near real time.

The Apps Script deployment fetches `index.html` from this repository. `Code.gs` contains the Sheet-backed progress API.
