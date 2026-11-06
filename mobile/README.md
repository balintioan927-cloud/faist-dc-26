# FAIST DC 26 — aplicația mobilă

Aceasta este baza nativă Expo / React Native pentru Android și iPhone. Interfața web din rădăcina repository-ului rămâne demo-ul existent; aplicația mobilă este în acest director.

## Cerințe

- Node.js 22.13 sau mai nou
- npm
- Expo CLI (se folosește prin `npx expo`)
- Un proiect Supabase dedicat FAIST DC 26, cu migrarea din `../supabase/migrations` aplicată

## Instalare

Din acest director:

```bash
npm install
npx expo install --fix
cp .env.example .env
```

Completează `.env` cu URL-ul și cheia publicabilă ale proiectului Supabase FAIST DC 26. Nu folosi cheia `service_role` în aplicația mobilă.

Pornește aplicația:

```bash
npx expo start
```

Pentru testare pe iPhone sau Android folosește un development build compatibil cu SDK 57 dacă versiunea Expo Go instalată pe dispozitiv nu acceptă acest SDK.

## Funcții implementate în această etapă

- Autentificare Supabase prin email și parolă
- Înregistrare deschisă, cu username și profil creat automat prin trigger SQL
- Validare locală a parolei: minimum 12 caractere, literă mică, literă mare, cifră și simbol
- Sesiune păstrată în Expo SecureStore, cu împărțirea tokenului în fragmente mici criptate pentru compatibilitate cu limitele platformelor
- Feed cu postări accesibile conform politicilor RLS
- Încărcare fotografie în bucket privat `faist-photos`, cu normalizare automată HEIC/PNG/WebP la JPEG pentru compatibilitate între iPhone și Android
- Vizibilitate postare: public, urmăritori sau privat
- Buton unic de confirmare/retragere a aprecierii
- Comentarii
- Editare profil
- Conversații și mesaje private

## Configurare de securitate obligatorie în Supabase

În Authentication → Sign In / Providers → Email:

1. Păstrează confirmarea emailului activată pentru lansarea publică.
2. Setează lungimea minimă a parolei la 12.
3. Cere literă mică, literă mare, cifră și simbol.
4. Păstrează limitarea încercărilor de autentificare activă.
5. Activează protecția pentru parole compromise dacă planul Supabase o permite.

Validarea din aplicație este un prim filtru; setările din Supabase trebuie configurate și pe server.

## Limite cunoscute

- Aplicația nu este încă legată de un proiect Supabase dedicat FAIST DC 26; fișierul `.env` nu este inclus în Git.
- Migrarea SQL este pregătită în repository, dar nu a fost aplicată automat unui proiect Supabase, pentru a nu modifica proiectul FAIST WORK existent.
- Nu au fost create build-uri Android/iOS, conturi de magazin sau publicări în App Store / Google Play.
- Mesajele sunt private prin RLS, dar nu sunt criptate end-to-end.
- Pentru lansarea publică mai sunt necesare testare pe dispozitive, flux de resetare parolă, raportare/blocare utilizatori, moderare și politici de confidențialitate.
