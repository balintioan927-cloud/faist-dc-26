# FAIST DC 26

Proiectul are două părți separate:

- **Demo web** — fișierele `index.html`, `styles.css` și `app.js` din rădăcină. Acesta rămâne prototipul web local publicat pe Render și folosește stocare locală în browser.
- **Aplicație mobilă** — proiectul Expo / React Native din `mobile/`, pregătit pentru Android și iPhone.
- **Backend** — migrarea Supabase și politicile RLS din `supabase/`.

## Stadiul actual

Codul nativ și schema de backend sunt pregătite în repository. Aplicația mobilă nu este încă legată de un proiect Supabase dedicat: nu există fișier `.env` în Git și nu a fost publicată o versiune Android/iOS.

Vezi [instrucțiunile aplicației mobile](mobile/README.md) și [instrucțiunile Supabase](supabase/README.md).

**Important:** demo-ul web existent nu devine automat o aplicație mobilă și nu sincronizează conturi sau fotografii cu backend-ul. Conectarea reală se face din proiectul Expo, după crearea și configurarea proiectului Supabase dedicat FAIST DC 26.
