import fs from 'node:fs';
import vm from 'node:vm';
import zlib from 'node:zlib';

const INDEX = 'index.html';
const CONTENT_ID = '604d4ea8-337d-46a5-8da1-1b155a783046';
const MANIFEST_TAG = '<script type="__bundler/manifest">';
const TEMPLATE_TAG = '<script type="__bundler/template">';

function payload(source, tag) {
  const start = source.indexOf(tag) + tag.length;
  const end = source.indexOf('</script>', start);
  if (start < tag.length || end < 0) throw new Error(`Missing ${tag}`);
  return { start, end, text: source.slice(start, end) };
}

function replacePayload(source, tag, value) {
  const part = payload(source, tag);
  return source.slice(0, part.start) + value + source.slice(part.end);
}

function scriptSafeJson(value) {
  // A raw </script> inside a script payload ends the element before JSON.parse runs.
  return JSON.stringify(value).replace(/</g, '\\u003C');
}

function conversational(text) {
  if (!text || /^https?:\/\//.test(text) || /^[A-Z0-9 .:&/–—-]{3,}$/.test(text)) return text;
  if (/^[“\"]/.test(text) && /[”\"]/.test(text)) return text;

  const exact = new Map([
    ['Select all that apply.', 'Choose every answer that fits.'],
    ['Select all that apply', 'Choose every answer that fits'],
    ['Select the TWO', 'Choose the TWO'],
    ['Select the THREE', 'Choose the THREE'],
    ['Select the two', 'Choose the two'],
    ['Select the three', 'Choose the three'],
    ['Which constitutional issue', 'What rights question'],
    ['Which response is best supported', 'Which answer is backed up best'],
    ['Which statement best explains', 'Which statement explains'],
    ['Which answer best explains', 'Which answer explains'],
    ['Which option best explains', 'Which option explains'],
    ['Which rule best explains', 'Which rule explains'],
    ['most directly', 'most clearly'],
    ['Therefore', 'So'],
    ['therefore', 'so'],
    ['in order to', 'to'],
    ['prior to', 'before'],
    ['with regard to', 'about'],
    ['is permitted', 'is allowed'],
    ['are permitted', 'are allowed'],
    ['is prohibited', 'is banned'],
    ['are prohibited', 'are banned'],
    ['was prohibited', 'was banned'],
    ['were prohibited', 'were banned'],
    ['is compelled', 'is forced'],
    ['are compelled', 'are forced'],
    ['was compelled', 'was forced'],
    ['were compelled', 'were forced'],
    ['infringes', 'violates'],
    ['consistent with', 'allowed by'],
    ['Use the facts you have.', 'Stick to the facts in the evidence.'],
    ['Look at what the Court actually focused on.', 'Focus on what the Court actually cared about.'],
    ['The facts decide the case.', 'The details can change the answer.'],
    ['The issue is', 'What matters is'],
    ['The question is', 'What matters is'],
    ['That treats', 'That would treat'],
    ['That is what', 'That’s what'],
    ['It is about', 'It’s about'],
    ['It is not', 'It isn’t'],
    ['It does not', 'It doesn’t'],
    ['It did not', 'It didn’t'],
    ['It has not', 'It hasn’t'],
    ['They are not', 'They aren’t'],
    ['They do not', 'They don’t'],
    ['They did not', 'They didn’t'],
    ['That is not', 'That isn’t'],
    ['That does not', 'That doesn’t'],
    ['This is not', 'This isn’t'],
    ['This does not', 'This doesn’t'],
    ['There is no', 'There’s no'],
    ['There are no', 'There aren’t any'],
    ['You are not', 'You aren’t'],
    ['You do not', 'You don’t'],
    ['You cannot', 'You can’t'],
    ['you cannot', 'you can’t'],
    ['cannot', 'can’t'],
    ['does not', 'doesn’t'],
    ['do not', 'don’t'],
    ['did not', 'didn’t'],
    ['is not', 'isn’t'],
    ['are not', 'aren’t'],
    ['will not', 'won’t'],
    ['would not', 'wouldn’t'],
    ['should not', 'shouldn’t'],
    ['has not', 'hasn’t'],
    ['have not', 'haven’t'],
  ]);

  let out = text;
  for (const [from, to] of exact) out = out.split(from).join(to);
  return out.replace(/\s{2,}/g, ' ').trim();
}

function rewriteObject(node, key = '') {
  if (typeof node === 'string') {
    if (key === 'excerpt' || key === 'u' || key === 'es' || key === 'esd') return node;
    return conversational(node);
  }
  if (Array.isArray(node)) return node.map(value => rewriteObject(value, key));
  if (node && typeof node === 'object') {
    for (const [childKey, value] of Object.entries(node)) node[childKey] = rewriteObject(value, childKey);
  }
  return node;
}

function line(s, t, e) {
  return e ? { s, e, t } : { s, t };
}

let outer = fs.readFileSync(INDEX, 'utf8');
const manifest = JSON.parse(payload(outer, MANIFEST_TAG).text);
const contentAsset = manifest[CONTENT_ID];
if (!contentAsset) throw new Error('Editable content asset is missing');

let contentBytes = Buffer.from(contentAsset.data, 'base64');
if (contentAsset.compressed) contentBytes = zlib.gunzipSync(contentBytes);
const context = { window: {} };
vm.runInNewContext(contentBytes.toString('utf8'), context);
const D = rewriteObject(context.window.RP_DATA);

// Opening: direct, clear, and energetic without trying to imitate teen slang.
D.intro.boot = [
  'CIVICLOCK STATUS: CRITICAL',
  'BILL OF RIGHTS FILES: MISSING',
  'RIGHTS RECOVERED: 0/10',
  'RECOVERY MODE: STARTING'
];
D.intro.lines = [
  line('sys', 'INCOMING MESSAGE… CITY ARCHIVES, LOWER LEVEL.'),
  line('wallace', 'Yo, Investigator — somebody wiped the Bill of Rights from the city system. Now officials are acting like there are no limits on their power.'),
  line('wallace', 'Ten amendments. Ten missing files. Real people are getting hurt while the system is down.'),
  line('wallace', 'Your job is simple: check the evidence, figure out which right is being violated, and bring each file back online.'),
  line('wallace', 'Don’t just guess. Follow the evidence.', 'happy')
];
D.intro.accept = [
  line('wallace', 'Welcome to HQ. The city map is on the left, your evidence board is on the right, and CIVICLOCK’s core is inside that vault.'),
  line('wallace', 'Someone calling themself the Null Architect caused this. If you find anything connected to them, it goes on the evidence board.'),
  line('wallace', 'Open the city map and start in Signal District. The city’s communications just went dark.')
];

const hqTopics = D.hq.hotspots.find(h => h.id === 'terminal').topics;
hqTopics[0].q = 'Quick reminder: what is the Bill of Rights?';
hqTopics[0].a = [
  line('wallace', 'It’s the first ten amendments, added in 1791. They set limits on government power and protect people’s rights.'),
  line('wallace', 'A lot of people would not support the Constitution without those protections. The promise of a Bill of Rights helped get the Constitution approved.')
];
hqTopics[1].q = 'How do I play?';
hqTopics[1].a = [
  line('wallace', 'Click objects, read the evidence, and solve each case challenge. A challenge opens when you have the clues you need.'),
  line('wallace', 'If you get stuck, use HINT or SHOW ME WHAT’S NEXT. You have unlimited time.')
];
hqTopics[2].q = 'Do these rights apply to New York City too?';
hqTopics[2].a = [
  line('wallace', 'Yes — most of them do. The Bill of Rights first limited only the federal government. After the Fourteenth Amendment, courts applied most of those rights to states and cities too.'),
  line('wallace', 'That means New Liberty officials have to follow them. The Seventh Amendment works differently, and you’ll see why later.')
];
hqTopics[3].q = 'Who is the Null Architect?';
hqTopics[3].a = [line('wallace', 'We don’t know yet. They had access to CIVICLOCK, so watch for anything they left behind.')];

const missionCopy = {
  m1: {
    explore: 'Check the newsroom and collect the clues.',
    intro: [
      line('civic', 'ALERT: The city detected speech it does not approve of. Blocking it “for public order.”'),
      line('wallace', 'Five signal towers just went dark. Each one stands for a First Amendment freedom.'),
      line('wallace', 'This newsroom controls the city feed. If you get lost, hit SHOW ME WHAT’S NEXT.')
    ]
  },
  m2: {
    explore: 'Read the case simulation and the timeline. The CORE challenge opens as you collect evidence.',
    intro: [
      line('civic', 'ERROR: Rule 2-A says government can ban every firearm. Rule 2-B says government can never regulate firearms. Marking both rules correct.'),
      line('wallace', 'Those rules say opposite things, so they can’t both be right.'),
      line('wallace', 'The real answer depends on what the Second Amendment protects and what limits the courts allow. Check the timeline.')
    ]
  },
  m3: {
    explore: 'Check the security office. First find out why the search started. Then decide whether it went too far.',
    intro: [
      line('civic', 'SEARCH APPROVED. Government does not need a reason.'),
      line('wallace', 'Yeah, that is not how the Fourth Amendment works. Check the evidence.'),
      line('wallace', 'A school searched a student’s backpack. CIVICLOCK thinks schools and police always follow the exact same rules. Let’s test that claim.')
    ]
  },
  m4: {
    explore: 'Talk to Detective Morgan and check the evidence. The RIGHTS challenge opens as you go.',
    intro: [
      line('civic', 'INTERROGATION RULE: If an investigator asks a question, the person must answer.'),
      line('morgan', 'I’m Detective Morgan. My captain says CIVICLOCK’s rules are the law now. I’m not buying it.'),
      line('morgan', 'I have a damaged interview transcript, an old not-guilty verdict the system wants to retry, and property the city took. Ask me what happened.')
    ]
  },
  m5: {
    explore: 'Check the courtroom. Every broken object points to a missing trial right.',
    intro: [
      line('civic', 'TRIAL.EXE: Fast mode. Defense lawyer removed. Courtroom closed. Witness rules disabled.'),
      line('wallace', 'The system claims a person charged with a crime does not need a lawyer.'),
      line('vega', 'Funny how “efficiency” keeps deleting people’s rights.'),
      line('vega', 'The case is People v. Marcus Bell, a burglary charge. Check the courtroom — every broken object points to a protection he is supposed to have.')
    ]
  },
  m6: {
    explore: 'Check the archive and collect the case files. Then use the SORT challenge.',
    intro: [
      line('civic', 'CASE SORTER ERROR: Treating every dispute like a crime. Civil juries deleted.'),
      line('wallace', 'Criminal case: the government says someone broke a law. Civil case: one person or group sues another, usually for money.'),
      line('wallace', 'CIVICLOCK mixed them together. Let’s sort them out.')
    ]
  },
  a3: { explore: 'Check the order on the apartment door and the clues outside.' },
  a8: { explore: 'Read the three proposed sentences and the clerk’s note.' },
  a9: { explore: 'Find the missing page, then rebuild it at the lectern.' },
  a10: { explore: 'Read the Tenth Amendment panel and the power map.' },
  vault: { explore: 'Open the main program inside the vault.' }
};
for (const mission of D.missions) {
  const update = missionCopy[mission.id];
  if (!update) continue;
  if (update.explore) mission.explore = update.explore;
  if (update.intro) mission.intro = update.intro;
}

// Every student-facing question gets a shorter, direct version. The legal idea stays the same.
const promptCopy = {
  'm1/p1/1': 'Match each case to the First Amendment freedom it threatens. Every correct match turns one signal back on.',
  'm1/p2/0': 'Three people or groups limited expression. Which ones count as government under the First Amendment? Choose every answer that fits.',
  'm1/p2/1': 'CIVICLOCK says, “FlashFeed deleted a post, so it broke the First Amendment.” What is the strongest response?',
  'm1/p3/0': 'CIVICLOCK says students have no free-speech rights at school. Which answer is backed up best by the evidence?',
  'm1/p3/1': 'Prove your answer. Choose the TWO facts showing the school punished the viewpoint, not a disruption.',
  'm1/p4/0': 'MEMORY CHECK: Without opening the Rights Database, choose all five First Amendment freedoms.',
  'm2/p1/0': 'What rights question is at the center of the Daniels case?',
  'm2/p2/0': 'The timeline is mixed up. Match each legal rule to the case that created it. You do not need to memorize the years.',
  'm2/p3/0': 'CIVICLOCK says, “If a right exists, government can never limit it.” What is the strongest response?',
  'm2/p3/1': 'Choose the case AND the fact that best support keeping the order in place.',
  'm2/p4/0': 'Which answer gives the most accurate picture of the Second Amendment today?',
  'm2/p4/1': 'Both CIVICLOCK rules are wrong. Choose the reason each one fails.',
  'm3/p1/0': 'Start with why the search happened. Choose the TWO facts that gave AP Russo a reasonable reason to suspect a school-rule violation.',
  'm3/p2/1': 'CIVICLOCK says, “No warrant means the school search was automatically unconstitutional.” What is the strongest response?',
  'm3/p3/0': 'Compare Search A and Search B. Which search is more likely to violate the Fourth Amendment?',
  'm3/p3/1': 'Choose the TWO lines showing why Search B may have gone too far.',
  'm3/p4/0': 'CIVICLOCK says police can search homes using the same rules as a school backpack search. What is the strongest response?',
  'm3/p5/0': 'MEMORY CHECK: AP Russo took a flyer because school leaders did not want students complaining to the Board of Education. Which amendment fits best?',
  'm3/p6/0': 'Build the answer: name the protection Search B may violate and choose the fact that proves it.',
  'm4/p1/0': 'For each situation, decide whether Miranda warnings were required. Ask two things: Was the person in custody? Were police questioning them?',
  'm4/p2/0': 'CIVICLOCK says a person must always answer an investigator. Which Fifth Amendment protection proves that wrong?',
  'm4/p2/1': 'Rebuild the Miranda warning. Put the four real rights in order and leave out the two fake cards.',
  'm4/p3/1': 'CIVICLOCK wants to put Teresa Lam on trial again. What is the constitutional problem?',
  'm4/p3/2': 'Choose the TWO court-record lines that prove this is a double-jeopardy problem.',
  'm4/p4/0': 'The city took Mr. Alvarez’s food cart. What is the main due-process problem?',
  'm4/p5/0': 'MEMORY CHECK: Choose the THREE Fifth Amendment protections you used in this mission.',
  'm4/p5/1': 'NEW CASE: At trial, the judge forces the defendant to testify and answer the prosecutor. Which protection applies?',
  'm5/p1/1': 'Match each broken courtroom object to the right it represents.',
  'm5/p2/0': 'The trial computer mixed rights from different amendments together. Sort out which rights really belong to the Sixth Amendment.',
  'm5/p3/0': 'The prosecution wants to use R. Cole’s written accusation while Cole stays home. Which right is at the center of this problem?',
  'm5/p3/1': 'Which simple rule fits these facts?',
  'm5/p4/0': 'Fifth, Sixth, or another amendment? Match each situation to the amendment that fits best.',
  'm5/p5/0': 'MEMORY CHECK: Police searched Marcus’s apartment with no warrant, no permission, and no emergency. Which amendment fits?',
  'm5/p6/0': 'MEMORY CHECK: Choose EVERY Sixth Amendment protection a person gets in a criminal case.',
  'm6/p1/0': 'Sort each file into one of two groups: criminal case or civil lawsuit.',
  'm6/p2/0': 'CIVICLOCK says constitutional jury rights exist only in criminal cases. What is the strongest response?',
  'm6/p2/1': 'Choose TWO pieces of evidence: the legal rule and the facts that support your answer.',
  'm6/p3/0': 'Match each situation to the Fifth, Sixth, or Seventh Amendment.',
  'm6/p4/0': 'STAGE 1: A landlord sues a former tenant in federal court for $12,000 in unpaid rent. Is this criminal or civil?',
  'm6/p4/1': 'STAGE 2: The tenant asks for a jury. Which amendment protects that right here?',
  'm6/p4/2': 'STAGE 3: Why does the Sixth Amendment NOT control this case?',
  'a3/p1/1': 'Choose the TWO lines that make this order unconstitutional.',
  'a3/p1/2': 'Why did the Founders give this problem its own amendment?',
  'a8/p1/1': 'Match each punishment proposal to the Eighth Amendment protection it breaks.',
  'a8/p1/2': 'CIVICLOCK says the Eighth Amendment guarantees bail for everyone. What is the strongest response?',
  'a9/p1/0': 'Put the real Ninth Amendment pieces in order. Leave out the two fake pieces.',
  'a9/p1/1': 'What is the Ninth Amendment saying in everyday language?',
  'a10/p1/0': 'Connect each government power to the right category.',
  'a10/p1/1': 'CIVICLOCK says the Tenth Amendment lets a state ban criticism of the governor. What is the strongest response?',
  'vault/p2/0': 'MEMORY CHECK: Match each description to the correct amendment number.',
  'vault/p2/1': 'FINAL QUESTION: Why was the Bill of Rights added to the Constitution?'
};
for (const mission of D.missions) {
  for (const puzzle of mission.puzzles) {
    puzzle.steps.forEach((step, index) => {
      const replacement = promptCopy[`${mission.id}/${puzzle.id}/${index}`];
      if (replacement) step.prompt = replacement;
    });
  }
}

// Plain-language labels in the reference cards. Original amendment text stays untouched.
for (const amendment of D.amendments) {
  amendment.remember = conversational(amendment.remember).replace(/^([0-9]+) = /, '$1 → ');
  amendment.confuse = conversational(amendment.confuse);
}

const contentSource = `/* THE RIGHTS PROTOCOL — student-facing content.\n` +
  `   Plain-language revision: constitutional quotations and case citations remain unchanged. */\n` +
  `window.RP_DATA = ${JSON.stringify(D, null, 2)};\n`;
const packedContent = contentAsset.compressed
  ? zlib.gzipSync(Buffer.from(contentSource, 'utf8'), { level: 9 })
  : Buffer.from(contentSource, 'utf8');
contentAsset.data = packedContent.toString('base64');

let template = JSON.parse(payload(outer, TEMPLATE_TAG).text);
const uiReplacements = new Map([
  ['Investigate the cases. Recover the amendments. Escape the constitutional lockdown.', 'Check the evidence. Solve each case. Bring the Bill of Rights back online.'],
  ['NEW INVESTIGATION', 'START NEW GAME'],
  ['[ ACCEPT THE MISSION ]', '[ START THE MISSION ]'],
  ['OBJECTIVE', 'WHAT TO DO'],
  ['CURRENT WHAT TO DO', 'WHAT TO DO NOW'],
  ['FILES {{ filesN }}/10', 'RIGHTS {{ filesN }}/10'],
  ['HELP / CLUE', 'NEED HELP?'],
  ['▶ NEXT STEP', '▶ SHOW ME WHAT’S NEXT'],
  ['CASE TERMINALS', 'CASE CHALLENGES'],
  ['CASE TERMINAL · {{ pzCode }}', 'CASE CHALLENGE · {{ pzCode }}'],
  ['MEMORY CHECK · DATABASE LOCKED UNTIL YOU ANSWER', 'TRY IT FROM MEMORY · YOUR NOTES UNLOCK AFTER ONE TRY'],
  ['LOCK IT IN · TYPE THE CORRECT STATEMENT', 'TYPE THE CORRECT IDEA IN YOUR OWN RHYTHM'],
  ['EVIDENCE LOCKER · {{ invCount }}', 'YOUR EVIDENCE · {{ invCount }}'],
  ['No evidence yet. Inspect objects in a room to collect clues.', 'No evidence yet. Click objects in the scene to collect clues.'],
  ['CONSTITUTIONAL DATABASE · {{ filesN }}/10', 'RIGHTS DATABASE · {{ filesN }}/10'],
  ['MEMORY CHECK IN PROGRESS', 'TRY THIS ONE FROM MEMORY'],
  ['Try this one from memory first. Submit any answer and the database unlocks right away — it’s here to help, not to lock you out.', 'Give it one try from memory. After you answer, your Rights Database unlocks right away.'],
  ['The glossary and your evidence are still available.', 'You can still use the glossary and your evidence.'],
  ['PLAIN ENGLISH', 'IN EVERYDAY WORDS'],
  ['I NEED TO REMEMBER', 'QUICK MEMORY TIP'],
  ['DON’T CONFUSE IT WITH', 'EASY TO MIX UP'],
  ['ASK ABOUT…', 'WHAT DO YOU WANT TO ASK?'],
  ['INVESTIGATOR REPORT', 'PROGRESS REPORT'],
  ['Restart investigation…', 'Start over…'],
  ['Erase all progress?', 'Erase your saved progress?'],
  ['Yes, erase', 'Yes, start over'],
  ['SYSTEM INTEGRITY RESTORED +10%', 'BILL OF RIGHTS RESTORED +10%'],
]);
for (const [from, to] of uiReplacements) template = template.split(from).join(to);

// Runtime-generated guidance and labels.
const runtimeReplacements = new Map([
  ["TERMINAL LOCKED — “", "CHALLENGE LOCKED — “"],
  ["Keep investigating the room.", "Keep checking the scene."],
  ["Next step: ", "Do this next: "],
  ["Restored — select to review.", "Done — click to review."],
  ["Opens after the previous terminal.", "Finish the challenge before this one."],
  ["FILE CORRUPTED", "FILE MISSING"],
  ["recover this file in the field", "solve its case to bring it back"],
  ["CONFIRMED", "YOU GOT IT"],
  ["NOT QUITE — HERE’S WHY", "NOT YET — HERE’S WHY"],
  ["Locked in! Press Enter or CONTINUE.", "You got it. Press Enter or CONTINUE."],
  ["The first word should be “", "Start with “"],
  ["Keep going — word order counts. Punctuation, capitals, and tiny typos don’t.", "Keep going. Word order matters, but punctuation, capitals, and small typos do not."],
  ["Click objects in each scene — or use the INVESTIGATE list beside it. Orange diamonds mark things you haven’t checked.", "Click objects in the scene, or use the CHECK THE SCENE list. Orange diamonds mark anything you have not opened yet."],
  ["Documents go into your EVIDENCE locker automatically. Some puzzles ask you to pick evidence from it.", "Clues save to YOUR EVIDENCE automatically. Some challenges ask you to choose evidence from there."],
  ["Case terminals open once you’ve found enough clues. Read the feedback when you miss — it explains why.", "Case challenges open when you have enough clues. If an answer misses, the feedback tells you what to rethink."],
  ["Finish every terminal in a location to recover an Amendment File for your DATABASE.", "Finish every challenge in a location to bring its amendment back to the Rights Database."],
  ["MEMORY CHECKS ask you to answer from memory first. The database unlocks as soon as you try.", "Memory checks ask for one try without notes. Your Rights Database unlocks as soon as you answer."],
  ["Press the orange HINT button inside the terminal. Each press gives a stronger hint, up to 3.", "Press HINT inside a challenge. You can use up to three hints, and each one gets more specific."],
  ["Inside any case terminal, press HINT. Each press gives a stronger hint (up to 3). Hints are unlimited — they’re noted on your report, but slow reading never costs you anything.", "Inside a case challenge, press HINT. Each hint gets more specific, up to three. Take your time — there is no penalty for reading slowly."],
  ["START A NEW INVESTIGATION?", "START A NEW GAME?"],
  ["This erases the saved investigation in this browser. Want a copy first? Open your Investigator Report from CONTINUE → MENU.", "This erases your saved game. Want a copy first? Open your Progress Report from CONTINUE → MENU."],
  ["YES, START OVER", "YES, START A NEW GAME"],
  ["CASE TRANSCRIPT", "WHAT HAPPENED SO FAR"],
]);
for (const [from, to] of runtimeReplacements) template = template.split(from).join(to);

outer = replacePayload(outer, MANIFEST_TAG, scriptSafeJson(manifest));
outer = replacePayload(outer, TEMPLATE_TAG, scriptSafeJson(template));
fs.writeFileSync(INDEX, outer);

const partCount = 40;
const size = Math.ceil(outer.length / partCount);
for (let i = 0; i < partCount; i++) {
  const name = `chunks/game.part.${String(i).padStart(3, '0')}`;
  fs.writeFileSync(name, outer.slice(i * size, (i + 1) * size));
}

console.log(JSON.stringify({
  bytes: outer.length,
  contentBytes: contentSource.length,
  chunks: partCount,
  chunkSize: size,
  missions: D.missions.length,
  amendments: D.amendments.length,
}, null, 2));
