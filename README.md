# D Lingo — Real Multi-Phone Demo (via Render.com)

## 🚀 Deploy Steps (GitHub → Render, ~5 minutes)

1. **GitHub లో repo create చేయండి** — ఈ ఫోల్డర్ లో ఉన్న 3 items (`server.js`, `package.json`, `public/index.html` ఫోల్డర్ తో సహా) అన్నీ ఆ repo లో upload చేయండి. Folder structure exactly ఇలా ఉండాలి:
   ```
   your-repo/
     server.js
     package.json
     public/
       index.html
   ```
2. https://render.com కి వెళ్ళి, free account తో sign up చేయండి (GitHub తోనే login చేయొచ్చు)
3. **"New +" → "Web Service"** → మీ GitHub repo select చేయండి
4. Settings:
   - **Build Command:** ఖాళీగా వదలండి (లేదా `npm install` రాయొచ్చు, ఇది తప్పు కాదు, idi just నో-ఆప్ అవుతుంది ఎందుకంటే dependencies లేవు)
   - **Start Command:** `node server.js`
   - **Instance Type:** Free
5. "Create Web Service" నొక్కండి — 1-2 నిమిషాల్లో build అవుతుంది
6. Render మీకు ఇస్తుంది ఒక URL: `https://your-app-name.onrender.com` — ఇది **HTTPS తో వస్తుంది automatic గా**, కాబట్టి microphone permission సరిగ్గా పనిచేస్తుంది
7. ఈ URL ని ఎన్ని phones లోనైనా (ఏ WiFi/mobile data అయినా) తెరవండి

## 👥 ఎంతమంది వరకు join కావచ్చు?

**Unlimited.** Room logic prati participant ని ఒక list లో track చేస్తుంది, hardcoded 2-phone limit ఏదీ లేదు — ఎంతమంది అయినా ఒకే room code తో join అవ్వొచ్చు, ప్రతి ఒక్కరు తమ తమ language లో వింటారు/మాట్లాడతారు. (Render free tier మాత్రం చిన్న scale కోసమే సరిపోతుంది — చాలామంది ఒకేసారి heavy గా వాడితే upgrade అవసరం పడొచ్చు, కానీ testing/demo/small group కోసం బాగానే పనిచేస్తుంది.)

## ఏమి మారింది (What changed)
మీ original `index.html` లో meeting room feature `BroadcastChannel` వాడింది — అది **ఒకే browser లో** మాత్రమే పనిచేస్తుంది (రెండు tabs), వేరే phones మధ్య కాదు.

ఇప్పుడు దాని స్థానంలో ఒక చిన్న **WebSocket relay server** (`server.js`) జోడించాను — idi ఎంతమంది phones అయినా ఒకే room code తో connect అయితే, వాళ్ళ మధ్య messages పంపుతుంది. **ఏ npm install అవసరం లేదు** — server.js Node.js built-in modules మాత్రమే వాడుతుంది (Render meeda kuda dependency install కోసం wait చేయాల్సిన అవసరం లేదు).

UI, translation logic (Claude API), Speech-to-Text/Text-to-Speech — ఇవన్నీ అలాగే ఉన్నాయి, మార్చలేదు.

## Local Testing (Optional — deploy ముందు)

1. ఈ ఫోల్డర్ ని మీ laptop లో ఉంచండి (Node.js ఇన్‌స్టాల్ అయి ఉండాలి — https://nodejs.org)
2. Terminal తెరిచి ఈ ఫోల్డర్ లోకి వెళ్ళండి, తర్వాత:
   ```
   node server.js
   ```
3. ఇది ఇలా చూపిస్తుంది: `D Lingo relay server running on http://localhost:3000`
4. మీ laptop యొక్క LAN IP కనుక్కోండి:
   - Windows: `ipconfig` → "IPv4 Address" (ఉదా: 192.168.1.5)
   - Mac/Linux: `ifconfig` లేదా `ip a`
5. రెండు ఫోన్లు అదే WiFi కి connect అయ్యి ఉండాలి. ఫోన్ Chrome లో తెరవండి:
   ```
   http://<laptop-IP>:3000
   ```
   ఉదా: `http://192.168.1.5:3000`

## ⚠️ ముఖ్యమైన గమనిక — Microphone Permission

Plain `http://` (HTTPS కాదు) మీద, చాలా mobile browsers **microphone access block చేస్తాయి** security కారణంగా. Render.com link (`https://...`) వాడితే ఈ సమస్య రాదు — automatic HTTPS వల్ల మైక్ permission సరిగ్గా పనిచేస్తుంది.

## Test చేయడం ఎలా
1. Phone A: "Host a Meeting" → name, language ఎంచుకుని → "Start" → room code వస్తుంది (ఉదా: DL-AB12)
2. Phone B: "Join a Meeting" → ఆ code enter చేసి → name, language ఎంచుకుని → "Join"
3. Room header కింద **🟢 Connected — live** అని కనిపించాలి రెండు ఫోన్లలో
4. Phone A లో 🎤 tap చేసి మాట్లాడండి → Phone B లో అది translate అయి, text + voice రూపంలో రావాలి
5. అదే విధంగా రివర్స్ లో

## పరిమితులు (Limitations of this demo)
- ఇది group voice-call కాదు — ఇది "speak → STT → relay text → translate → TTS" pattern, ఇది meeting room లో already ఉంది. Real-time continuous WebRTC audio streaming (అసలు మాట్లాడే గొంతు నేరుగా వినిపించడం) వేరే, పెద్ద feature — అది కావాలంటే చెప్పండి, దాని కోసం వేరే ప్లాన్ చేయాల్సి ఉంటుంది.
- Render free tier ~15 నిమిషాలు idle అయితే sleep అవుతుంది — తిరిగి ఎవరైనా open చేస్తే 30-50 సెకన్లు "wake up" అవ్వడానికి పట్టొచ్చు. ఇది paid plan లో జరగదు.
- Server restart అయితే (deploy update లేదా sleep వల్ల), అందరూ room నుండి disconnect అవుతారు — తిరిగి join చేయాల్సి ఉంటుంది. App లో automatic-reconnect logic ఉంది, కానీ room state (participants list) reset అవుతుంది.
- ఇది production-scale architecture కాదు — demo/testing/small-group కోసం. పెద్ద scale కోసం (వేలమంది users) Firebase లేదా dedicated infrastructure అవసరం పడుతుంది.
