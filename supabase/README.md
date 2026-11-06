# Supabase — FAIST DC 26

Migrarea `migrations/20261106115000_faist_social_core.sql` definește schema pentru rețeaua socială și trebuie aplicată numai într-un proiect Supabase dedicat FAIST DC 26.

## Ce creează

- profiluri legate de `auth.users`, cu username unic
- postări cu vizibilitate `public`, `followers` sau `private`
- aprecieri unice per utilizator și postare
- comentarii
- relații de urmărire
- conversații, membri și mesaje private
- bucket privat `faist-photos`, limită 10 MB, doar JPEG/PNG/WebP
- politici Row Level Security pentru toate tabelele și obiectele media
- trigger care creează profilul la înregistrarea unui cont

## Aplicare

Într-un proiect Supabase nou, dedicat FAIST DC 26, rulează migrarea prin Supabase CLI sau copiază conținutul fișierului SQL în SQL Editor și execută-l. Verifică apoi Authentication, Storage și Security Advisor.

Nu aplica migrarea peste proiectul Supabase care conține deja migrarea `faist_work_core_schema`; acela pare să fie proiectul FAIST WORK și nu trebuie amestecat cu rețeaua socială.

## Setări Auth recomandate

În Authentication → Sign In / Providers → Email:

- confirmare email activată;
- parolă minim 12 caractere;
- literă mică, literă mare, cifră și simbol;
- rate limits păstrate active;
- protecția parolelor compromise activată dacă planul permite.

Cheia publicabilă Supabase poate fi folosită în aplicația mobilă împreună cu RLS. Cheia `service_role` și parola bazei de date nu trebuie incluse niciodată în aplicație sau repository.
