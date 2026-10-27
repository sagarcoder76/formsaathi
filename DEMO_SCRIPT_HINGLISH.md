# FormSaathi — Complete Demo Script (Hinglish)

> **Is script ka use:** project demo, video walkthrough, ya college viva/presentation ke liye.
> **Total time:** ~10–12 minutes. **Tone:** confident, simple, student-friendly.
> Format: `[Screen pe ye dikhao]` = action cue; neeche ka paragraph = bolne wali line (Hinglish narration).

---

## 0. Recording/presentation se pehle (2 minute checklist)

- [ ] Website khuli hai: **https://formsaathi-ten.vercel.app**
- [ ] Ek test account se sign-in ho chuka hai (magic link email), aur 4–5 saved/tracked listings hain (taaki Tracker aur Insights khaali na dikhein)
- [ ] Do saved searches banayi hui hain (notification digest demo ke liye)
- [ ] Browser desktop + mobile dono view test kar liya (DevTools → device toolbar)
- [ ] Demo mode ki baat honestly explain karni hai: bina research API key ke sample `[DEMO]` listings dikhti hain — koi fake data real nahi dikhaya jata
- [ ] Optional: phone pe "Add to Home Screen" karke PWA install demo

---

## 1. Opening — problem aur solution (~45 sec)

[Homepage khula rakho, hero section pe cursor rakho]

"Hello everyone! Aaj main **FormSaathi** present kar raha hoon — ek internship aur campus placement portal jo specially Indian students ke liye banaya gaya hai.

Problem ye hai ki students ko 10 alag-alag websites, WhatsApp groups aur emails mein opportunities dhoondhni padti hain. Kahin scam listings hain, kahin deadlines nikal jaati hain, aur applications track karna bhi mushkil hai.

FormSaathi in sab cheezon ko **ek hi verified platform** pe laata hai — live job discovery, scam protection, resume-based matching, application tracker, smart notifications, aur ek admin moderation system. Chaliye shuru karte hain."

---

## 2. Header aur navigation (~1 min)

[Header ke elements pe ek-ek karke point karo]

"Header mein sabse upar humara logo hai, phir primary navigation — **Home, Browse Jobs, Companies, Tracker, Saved** aur **Insights**. Admin users ko ek extra **Moderation** option dikhta hai.

Right side pe teal color ka **Find Opportunities** button hai — yahi humara main call-to-action hai. Uske baad profile icon, notification bell, dark mode toggle, aur **Sign in** button hai.

Sign-in password-less hai — sirf email daalo, aur **magic link** se login ho jaata hai. Koi password yaad rakhne ki zaroorat nahi. Dark mode se poora app night-friendly ho jaata hai, aur ye preference browser mein save rehti hai."

[Mobile view pe switch karke hamburger menu dikhao]

"Mobile pe saari navigation ek clean drawer menu mein aa jaati hai — app fully responsive hai."

---

## 3. Homepage aur live search (~1.5 min)

[Hero ka search box dikhao; ek query type karo, e.g. "React developer internship in Bengaluru"]

"Homepage ka design deliberately simple rakha hai — ek centered search jahan aap keyword aur location daal sakte ho. Neeche role chips bhi hain jisse ek click mein search start ho jaati hai.

Ye section ke neeche jo **stats** dikh rahe hain — open roles, hiring companies, tracked listings — ye sab **real database se aate hain**. Hum koi bhi number fabricate nahi karte; agar data nahi hai to number zero hi dikhega.

Ab main search karta hoon…"

[Search run hone do, loading state dikhao, phir results]

"Backend real-time web research karta hai — live websites se pages fetch hote hain. Yahan ek important quality rule hai: portal mein sirf do tarah ki listings aati hain — **Internship aur Placement**. Scholarship, hackathon, course, ya koi error page / CAPTCHA page / 404 page kabhi listing nahi ban sakta. Ye filter extraction pipeline mein automatically lagta hai."

---

## 4. Browse Jobs — filters aur sorting (~1 min)

[Filter panel open karke ek-ek filter point karo]

"Results page pe left side mein powerful filters hain — **category, role, skill, city/location, work mode** yaani remote/hybrid/in-person, **deadline status**, aur **compensation band** jaise unpaid, ₹10k tak, ₹25k+ — ye monthly INR mein normalize hoke filter hota hai, jabki original stipend wording card pe waise hi dikhti hai.

Sorting mein relevance ke alawa **'Best match for you'** option hai — ye aapke student profile ke hisaab se listings rank karta hai.

Har card pe kuch instant signals hain: deadline ka color-coded badge — open, closing soon, ya expired — match score percentage, aur agar listing suspicious hui to red scam warning. Scroll karke **Load more** se pagination bhi milti hai."

---

## 5. Job details — transparency aur safety (~2 min)

[Kisi listing pe "View Details" click karo]

"Details modal mein har listing ka **structured data** hai — role, hiring company, required skills, eligibility, location, mode, deadline, aur compensation — sab kuch source page se deterministically extract hua. Jo field source pe nahi mili, wahan honestly 'unknown' likha hai, kabhi guess nahi kiya gaya.

Ab teen cheezein specifically dikhata hoon:"

**(a) Match score** — [score badge pe hover karke reasons dikhao]
"Ye 0–100% score explainable hai: **70% skills overlap, 15% location, 15% work mode**. Hover karne pe exact reason milta hai — kaun se skills match hue, kaun se nahi."

**(b) Fraud protection** — [agar current listing pe warning nahi to ek flagged listing kholo]
"Humara backend registration fees, deposits, pay-to-join asks aur suspicious UPI payments detect karta hai. Lekin smartly — agar page pe likha hai 'no registration fee', to wo false alarm nahi banega. Negation phrases handle hui hain. Har details page pe ek permanent safety note bhi hai, aur koi problem lage to student **Report listing** kar sakta hai — wo report seedha admin moderation queue mein jaati hai."

**(c) Apply + link health + calendar** — [buttons point karo]
"Apply hamesha **official company site** pe hota hai — FormSaathi khud applications collect nahi karta. Apply link pe ek **re-check button** hai jo live probe karke batata hai link ok hai, broken hai, ya bot-protection ki wajah se unknown hai. Hum kabhi bhi bot-wall ko broken declare nahi karte.

Agar confirmed deadline hai to ek click mein **.ics calendar file** download hoti hai jo Google/Apple Calendar mein add ho jaati hai."

---

## 6. Companies view (~30 sec)

[Companies nav pe click karo]

"Companies view mein saari listings **organizer yaani hiring company ke hisaab se grouped** hain, verification badges ke saath. Agar source page pe company ka naam nahi tha, to hum domain se infer karte hain — aur agar wahan bhi nahi mila, to 'unstated' hi rehne dete hain, koi naam invent nahi karte."

---

## 7. Resume-driven discovery (~1.5 min)

[Homepage wapas jao, ResumeUploader pe click karke sample PDF upload karo]

"Ab FormSaathi ka sabse smart feature — **resume se job discovery**. Aap PDF, DOCX ya TXT resume upload karte ho, maximum 5MB.

Yahan privacy ka bada point hai: **resume kabhi server pe upload hi nahi hota**. Parsing poori tarah aapke browser mein chalti hai — PDF.js aur Mammoth libraries se. Sirf nikalा hua structured data store hota hai.

Upload ke baad ye **review screen** aati hai jahan detected skills, role, degree, batch aur cities dikhte hain — aur student kuch bhi edit kar sakta hai. Kyunki extraction ko perfect kabhi nahi maana jaata."

[Confirm karo]

"Confirm karte hi resume khud research query bana deta hai, student profile prefill ho jaata hai, aur results automatically **best-match sorting** pe aa jaate hain. Agar scanned/image-only PDF hui jisme text layer nahi hai, to system clear message deta hai — chupchaap fail nahi hota."

---

## 8. Student profile (~30 sec)

[Profile modal kholo]

"Profile mein aap apni skills, preferred cities, work modes, batch aur degree save karte ho. Yahi profile match score, sorting aur notifications ko power karta hai. Data device pe localStorage mein rehta hai, aur sign-in pe cloud se sync bhi ho jaata hai."

---

## 9. Saved aur Application Tracker — kanban pipeline (~1.5 min)

[Pehle ek listing save karo, phir Tracker kholo]

"Kisi bhi listing ko bookmark/save kar sakte ho. **Saved view** mein bookmarks milte hain.

Asli power **Tracker** mein hai — ek kanban board with 5 stages: **Saved → Applied → Interview → Offer → Rejected**. Aap drag-style stage change kar sakte ho, har application ke saath **notes** likh sakte ho, aur upar live stage counts dikhte hain.

Ye data browser localStorage mein bhi rehta hai, matlab bina account ke bhi kaam karta hai — aur jaise hi sign-in karte ho, **Supabase cloud pe cross-device sync** ho jaata hai. Purane bookmarks automatically migrate ho jaate hain."

---

## 10. Authentication aur cloud sync (~1 min)

[Sign-out karke wapas sign-in karo, magic link flow dikhao]

"Authentication Supabase pe hai — email magic link, koi password nahi. Sign-up pe profile automatically ban jaati hai.

Database level pe **Row Level Security (RLS)** lagi hui hai — har student ka data sirf wahi padh ya likh sakta hai, Postgres policies se enforced, sirf UI se hidden nahi. Service-role key kabhi browser tak pahunchti hi nahi — wo backend-only secret hai."

---

## 11. Notification Suite — 4 alerts, 3 channels (~2 min)

[Notification bell pe click karo, phir gear icon se preferences kholo]

"Bell icon mein real-time in-app notifications aati hain — Supabase ke through, bina page refresh ke. Unread badge aur mark-all-read bhi hai.

Gear icon pe click karte hi **notification preferences** khulti hain — ek matrix jisme 4 tarah ke alerts hain, har ek ke liye 3 channels independently on/off kar sakte ho. Default mein sirf in-app on hai; email aur push opt-in based hain."

[Matrix ki rows ek-ek point karo]

"Chaar alert kinds:
1. **Deadline reminders** — saved/tracked listing 48 ghante mein band hone wali ho to reminder, rejected listings exclude hain.
2. **Saved-search match digest** — har din ek digest, naye matches jo aapki saved search ke hisaab se aaye — wahi 0.6 token-overlap aur location rule jo app mein use hota hai.
3. **Application follow-ups** — agar koi 'applied' application 7 din se nahi hili, to polite follow-up nudge.
4. **Listing health alerts** — agar aapki saved listing repeatedly fail hoke hide hoti hai, to information milti hai."

[Browser push enable karo]

"Teeno channels: **in-app**, **email** — Resend service ke through, aur **browser push** — VAPID-based Web Push, service worker se, browser band hone pe bhi notification aati hai. Safari ya unsupported browser pe push option gracefully hide ho jaata hai, baaki channels chalte rehte hain.

Backend mein ek **dedup ledger** hai — unique constraint ke saath, isliye ek alert do baar kabhi nahi jaata. Ye sab daily scheduled **cron jobs** se chalte hain, ek secret token se protected — bina token ke endpoint 401 deta hai."

---

## 12. Insights dashboard (~1 min)

[Insights nav pe click karo]

"Insights page pure tracker data se **deterministic analytics** deta hai:
- **Application funnel** — saare 5 stages ka visual breakdown
- **Conversion rates** — applied rate, interview rate, offer rate — har rate ke saath uska exact denominator hota hai, aur jab tak enough data nahi hota, wahan dash '—' dikhta hai, fake percentage nahi
- **6-month pipeline activity** chart
- Aapke pipeline ki **top skills aur cities**
- **Upcoming deadlines** — sabse paas wali deadline pehle

Khaali data pe ye page ek friendly empty state dikhata hai — koi fabricated statistic nahi."

---

## 13. Catalogue health automation (~45 sec)

[Admin/moderation context mein explain karo, ya seedha narration]

"Background mein ek daily **catalogue-health cron** chalta hai. Teen din se check nahi hui listings ke links re-probe hote hain — wahi HEAD-then-GET fallback logic jo manual recheck mein hai.

Past deadlines automatically 'expired' ho jaati hain. Agar ek listing **lagataar 3 baar broken** prove hoti hai, to wo catalogue se auto-hide ho jaati hai, aur jitne students ne use save kiya tha un sabko ek-ek health notification milti hai — unki tracker history delete nahi hoti. Bot-walls aur timeouts 'unknown' rehte hain, kisi listing ke against count nahi hote."

---

## 14. PWA — installable aur offline (~45 sec)

[Mobile/desktop pe install prompt dikhao; phir network off karke offline page]

"FormSaathi ek **Progressive Web App** hai — browser menu se 'Add to Home Screen' karo to ye native app jaisa standalone install ho jaata hai, apne icon aur splash screen ke saath.

Service worker navigation ko network-first rakhta hai taaki updates turant milti rahein, lekin **internet chala jaaye to branded offline page** dikhta hai. Hashed build assets background mein cache hote hain. Supabase aur API traffic kabhi cache nahi hota — security aur fresh data dono maintain rehte hain. Yahi service worker push notifications bhi deliver karta hai."

---

## 15. Admin moderation (~1 min)

[Moderation nav pe click karo — admin account se]

"Moderation sirf admins ko dikhta hai, aur ye sirf UI hiding nahi hai — **Postgres RLS policies** non-admin ke saare reads aur writes block karti hain, chahe koi manually request bhi bheje.

Yahan do cheezein manage hoti hain:
1. **Listing reports** — students ki reports, reason aur timestamp ke saath. Admin listing ko hide karke report resolve kar sakta hai, sirf dismiss kar sakta hai, ya reopen kar sakta hai.
2. **Hidden listings** — auto-hidden ya manually hidden listings ki list, ek click mein restore ka option.

Hidden listings public catalogue se sabke liye gayab ho jaati hain — sirf admin dekh sakta hai."

---

## 16. Architecture, security aur testing (~1 min)

[Architecture diagram ya code editor briefly dikha sakte ho]

"Technical side briefly: frontend **React + TypeScript + Vite + Tailwind**, backend **FastAPI (Python)**, database **Supabase Postgres**, live research **TinyFish Search/Fetch** ke through, deployment **Vercel** pe — frontend aur backend dono, daily cron jobs ke saath.

Security highlights:
- Service-role key sirf backend pe; browser mein sirf anon/publishable key
- URL validation with **SSRF guard** — localhost/private IPs block
- Research API pe **rate limiting** — 10 requests per minute per IP
- RLS on every user table; admin actions policy-gated
- Push keys (VAPID) ka private part server-only

Testing: backend pe **44 automated tests** passing hain — extraction, fraud rules, compensation parsing, notification dispatch, dedup, cron auth, catalogue health. Frontend pe TypeScript type-check, oxlint zero warnings, aur production build clean hai."

---

## 17. Closing (~30 sec)

[Homepage pe wapas aao]

"To FormSaathi ka poora loop ye hai: **discover karo → resume se match karo → scam se bacho → apply karo → track karo → reminders pao → apni progress ka analysis karo** — aur ye sab ek secure, installable, mobile-friendly app mein.

Future roadmap mein email digests (Resend key integrate hote hi), interview prep section aur referral tracking jaise ideas hain. Thank you! Ab main questions ke liye ready hoon."

---

## 18. Viva / Q&A ke liye ready answers (Hinglish)

**Q: Fake listings kaise rukti hain?**
"Do layers pe — extraction pipeline non-job pages (error, CAPTCHA, 404) drop karti hai, aur rule-based fraud detector fees/deposit/UPI scams flag karta hai. Students reports bhi kar sakte hain, admin hide karta hai. Broken links auto-hide hote hain 3 failed checks ke baad."

**Q: Data kahan store hota hai?**
"Dual mode — bina login ke localStorage, login ke baad Supabase Postgres with RLS. Dono sync mein rehte hain, migration automatic hai."

**Q: Notification do baar kaise nahi jaati?**
"`notification_events` table pe `unique(user_id, kind, dedup_key)` constraint hai — same alert insert hi nahi ho sakta doosri baar."

**Q: Push notification kaise kaam karta hai bina app store ke?**
"Web Push standard + VAPID keys + service worker. Browser push service deliver karta hai; private key server pe, public key browser pe."

**Q: Demo mode kya hai?**
"Bina TinyFish API key ke clearly-labelled `[DEMO]` sample records (example.com URLs). Live key set hote hi real research shuru — kabhi demo data ko live nahi dikhaya jaata."

**Q: Admin kaise banta hai?**
"Database mein `profiles.is_admin` flag se — UI aur RLS dono isi pe gate hain. Self-signup se koi admin nahi ban sakta."

**Q: Offline mein kya kaam karta hai?**
"Cached app shell aur saved local data; live search/sync/push ke liye network chahiye. API traffic cache nahi hota."

---

### Timing cheat-sheet

| Section | Time |
|---|---|
| 1–2. Intro + header | 1.5 min |
| 3–5. Search, filters, details/safety | 4.5 min |
| 6–8. Companies, resume, profile | 2.5 min |
| 9–11. Tracker, auth, notifications | 4.5 min |
| 12–15. Insights, health, PWA, admin | 3.5 min |
| 16–17. Architecture + closing | 1.5 min |
| **Total** | **~18 min (full) / 10–12 min if sections 6, 13, 16 condensed** |
