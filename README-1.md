# D Lingo v2 — Minimal Rebuild (3 Screens Only)

ఇది మీ "One App. One Purpose." vision ప్రకారం పూర్తిగా కొత్తగా రాసిన version. పాత features (History, Phrasebook, Premium, Profile, Onboarding slides) అన్నీ తీసివేయబడ్డాయి.

## 3 Screens మాత్రమే
1. **Home** — Create Meeting / Join Meeting / Settings (gear icon) — ఇంతే
2. **Meeting Room** — room name, participants strip, live translated transcript, big mic, share, leave
3. **Settings** — My language, Auto-detect speaker language, Auto-speak, Voice speed/volume, Auto-reconnect, Privacy/Terms/Report/Contact, Logout

## ఏమి Reuse చేసాను (already tested, పని చేస్తున్నవి)
- **`server.js`** — మార్చలేదు, idi already real, zero-dependency WebSocket relay, unlimited participants తో పనిచేస్తుంది
- **Translation fix** — MyMemory + Lingva fallback (ముందు bug ఫిక్స్ చేసినది) — idi ఇప్పుడు auto-detect feature తో కూడా పనిచేస్తుంది

## కొత్తగా Added
- **Auto-detect speaker language** (Settings లో toggle) — ఆన్ చేస్తే, ఎదుటి వ్యక్తి యొక్క language picker ని trust చేయకుండా, MyMemory తన autodetect feature వాడి, మాట్లాడిన టెక్స్ట్ యొక్క భాష ని గుర్తించి translate చేస్తుంది. ఆఫ్ చేస్తే (default), ప్రతి ఒక్కరు తాము ఎంచుకున్న language నే నమ్మి translate చేస్తుంది (idi వేగంగా ఉంటుంది, ఎందుకంటే ఒక extra API call avasaram లేదు).
- **Invite link via `?join=CODE`** — link తెరిచిన వెంటనే Join sheet auto-తెరుచుకుంటుంది, code నే మళ్ళీ టైప్ చేయాల్సిన అవసరం లేదు
- **Voice speed/volume settings** — ఇప్పుడు genuinely TTS output ని affect చేస్తాయి (rate/volume params)

## Skip చేసినవి (మీ instruction ప్రకారం)
- ❌ Save Transcript (file download) — app minimal గా ఉండాలని మీరు చెప్పారు కాబట్టి

## Deploy Steps (ఇంతకుముందు లాగే — GitHub → Render)
1. ఈ 3 files అన్నీ root లోనే GitHub repo లో upload చేయండి:
   ```
   your-repo/
     server.js
     package.json
     index.html
   ```
2. మీ ఇప్పటికే ఉన్న Render service లో, ఈ కొత్త `index.html` మరియు `server.js` ని commit చేస్తే, Render automatic గా redeploy చేస్తుంది (కొత్త repo అవసరం లేదు)
3. 1-2 నిమిషాలు wait చేసి, మీ existing URL (`https://dlingo-calling.onrender.com`) తిరిగి తెరవండి

## నేను Test చేసినవి (Playwright తో, ఈ సందర్భంలో)
- ✅ Home → Create Meeting flow (room name, name, language grid)
- ✅ Real WebSocket connect — "🟢 Live" status
- ✅ రెండు browser tabs (Phone A: Telugu, Phone B: English) ఒకే room లో join అయి, ఒకరినొకరు participants list లో చూడగలగడం
- ✅ Phone A speech → Phone B కి (mocked translation API తో) సరైన English translation చేరడం, mariyu `speakOut` సరైన text+language తో call అవ్వడం (idi మీరు report చేసిన bug కి exact fix)
- ✅ Settings toggles (auto-detect, auto-speak) సరిగ్గా state మారడం
- ✅ Privacy/Terms sheet తెరవడం
- ✅ HTML/JS syntax validity

## నేను Test చేయలేనివి (no internet access ఈ sandbox లో)
- నిజమైన MyMemory/Lingva API calls (mocked responses తోనే test చేసాను, code logic correct అని confirm చేసాను)
- నిజమైన phone మైక్ permission flow
- నిజమైన TTS audio output (browser API call సరిగ్గా జరుగుతుందని confirm చేసాను, kాని actual sound వినలేను)

కాబట్టి దయచేసి deploy చేసిన తర్వాత రెండు ఫోన్లలో నిజంగా మాట్లాడి test చేయండి — ఏదైనా బగ్ కనిపిస్తే వెంటనే చెప్పండి.
