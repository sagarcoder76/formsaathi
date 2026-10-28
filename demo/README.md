# Demo resume (fictional sample)

Files for live demos of FormSaathi's in-browser resume parsing:

- `Aarav_Mehta_Resume_Sample.pdf` — text-layer PDF (recommended for demos; the app rejects scanned/image-only PDFs)
- `Aarav_Mehta_Resume_Sample.docx` — Word version, same content
- `Aarav_Mehta_Resume_Sample.txt` — plain-text fallback

This is a **fictional person** (`example.com` email, fake phone/links) created only for demonstrations — not a real candidate.

## Expected parser output (verified against `frontend/src/lib/dictionaries.ts`)

| Field | Detected value |
|---|---|
| Role | Frontend Developer |
| Degree | B.Tech / B.E. |
| Batch | 2027 |
| Locations | New Delhi, Gurugram |
| Skills (12) | JavaScript, TypeScript, Python, HTML, CSS, SQL, React, Next.js, Tailwind, Node.js, REST API, Git |

## Demo flow

1. Open the app homepage and upload `Aarav_Mehta_Resume_Sample.pdf` in the resume uploader.
2. On the review screen, confirm/edit the detected fields (extraction is never treated as perfect).
3. Confirm — the profile is prefilled, and a search runs in "Best match for you" order using the query
   `Frontend Developer JavaScript TypeScript Python New Delhi internship India`.
4. Open any matching listing to show the explainable match score (skills 70% / location 15% / mode 15%).

Tip: to demo the scanned-PDF warning, upload any image-only PDF — the app asks for a text-based file instead of failing silently.
