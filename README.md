# KLD Beauty Clinic – aplicație de management și rezervări pentru salon

Aplicație **full-stack** pentru un salon de înfrumusețare: site public, conturi de clienți, rezervări online cu calendar și panou de administrare.

```
Frontend (React + TS + Vite + Tailwind)  →  REST API (Quarkus)  →  PostgreSQL
```

* **Programare fără cont**: oricine poate rezerva doar cu nume, prenume și număr de telefon. Adminul vede aceste programări marcate distinct ( în 4 pași (serviciu → zi → oră → confirmare), „Rezervările mele”, calendar personal, profil, notificări, export/ștergere date (GDPR).
* **Admin**: dashboard cu statistici, calendar zi/săptămână/lună (drag & drop), rezervări (căutare, filtre, sortare), clienți, servicii, program și intervale blocate, statistici + export CSV, setări, jurnal de audit.
* **Fără rezervări duplicate**: verificat în frontend, în backend (tranzacție cu lock pe serviciu) **și** în PostgreSQL (constrângere `EXCLUDE USING gist`).

Documentație de arhitectură (schemă DB, API, roluri, reguli de disponibilitate, extensibilitate): [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## Pornire rapidă (Docker)

Cerințe: Docker cu Compose v2.

```bash
cp .env.example .env        # apoi (opțional) schimbă parolele și JWT_SECRET
docker compose up --build
```

| | URL |
|---|---|
| Aplicația | http://localhost:3000 |
| API + Swagger UI | http://localhost:3000/api/docs (sau direct http://localhost:8080/api/docs) |
| Schema OpenAPI | http://localhost:3000/api/openapi |

La prima pornire se creează automat schema, programul implicit, cele 4 servicii și (cu `SEED_DEMO_DATA=true`) datele demo:

| Rol | Email | Parolă |
|---|---|---|
| Admin | `admin@salon.ro` | `Admin123!` |
| Client | `client@example.com` | `Client123!` |

> Conturile demo sunt doar pentru dezvoltare. În producție setează `SEED_DEMO_DATA=false`, creează propriul administrator și schimbă `JWT_SECRET` / parola bazei de date.

Oprire: `docker compose down` (datele rămân în volumul `salon-db`; `docker compose down -v` le șterge).

---

## Dezvoltare locală

Cerințe: JDK 21+, Maven 3.9+ (sau Maven Wrapper), Node 20+, Docker (pentru PostgreSQL în dev/teste).

### Backend

```bash
cd backend
mvn quarkus:dev
```

În dev/test, Quarkus pornește singur un PostgreSQL într-un container (*Dev Services*), rulează migrațiile Flyway și creează datele demo. API: http://localhost:8080, Swagger: http://localhost:8080/api/docs.
Pentru a folosi o bază de date proprie, rulează cu profilul `prod` și variabilele `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

http://localhost:5173 — cererile `/api/*` sunt trimise automat către backend-ul de pe `localhost:8080` (proxy Vite), deci nu apar probleme de CORS.

---

## Teste

```bash
cd backend  && mvn test        # 40 de teste de integrare (necesită Docker pentru PostgreSQL)
cd frontend && npm test        # 25 de teste (Vitest + Testing Library)
cd frontend && npm run build   # verificare TypeScript + build de producție
```

Ce este acoperit:

| Backend | Frontend |
|---|---|
| înregistrare (validări, email duplicat, hash BCrypt), login, rate limit, token invalid, resetare parolă | login (validări, redirect pe rol, erori) |
| creare rezervare, **rezervare duplicată → 409**, **8 cereri simultane pentru același slot → una singură reușește**, suprapuneri la servicii de 60 min | flux de rezervare complet, calendar cu zile/ore dezactivate, slot ocupat între timp |
| pauze / intervale blocate / program modificat / zi închisă / în trecut / în afara programului | anulare rezervare cu dialog de confirmare, politica de anulare, stări loading/error/empty |
| anulare, politica de anulare, mutare rezervare, ciclu de viață admin, audit | dashboard admin |
| autorizare (client vs admin vs anonim, izolarea datelor între clienți) | formatare, validări, mesaje de eroare |
| management servicii (CRUD, soft-delete), constrângerile PostgreSQL, GDPR export/ștergere, statistici | |

---

## Configurare (variabile de mediu)

Toate secretele vin din mediu / `.env` (vezi [`.env.example`](.env.example)); nimic sensibil nu este în cod.

| Variabilă | Rol |
|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | baza de date |
| `JWT_SECRET` | cheia de semnare a token-urilor (≥ 32 caractere, **obligatorie**) |
| `CORS_ORIGINS` | origini permise (doar dacă frontend-ul e pe alt domeniu) |
| `FRONTEND_URL` | folosit în linkurile de resetare a parolei |
| `SEED_DEMO_DATA` | `true` = conturi și rezervări demo pe o bază goală |
| `SALON_TIMEZONE` | fusul orar al procesului (păstrează-l egal cu cel din Setări) |
| `FRONTEND_PORT`, `BACKEND_PORT` | porturile expuse |

Setările salonului (nume, logo, adresă, telefon, email, program, politica de anulare, durata implicită, pasul intervalelor, monedă, fus orar, confirmare automată) se modifică din **Admin → Setări** și **Admin → Program**.

---

## Structura proiectului

```
.
├── backend/               # Quarkus (Java 21)
│   ├── src/main/java/ro/salon/{resource,service,repository,entity,dto,security,exception,config}
│   ├── src/main/resources/db/migration/   # Flyway
│   ├── src/test/java/                     # teste de integrare
│   └── Dockerfile
├── frontend/              # React + TypeScript + Vite + Tailwind
│   ├── src/{components,pages,layouts,services,hooks,types,utils}
│   ├── nginx.conf, Dockerfile
├── database/              # documentație DB (migrațiile sunt în backend)
├── docs/ARCHITECTURE.md
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Securitate

* Parole hash-uite cu **BCrypt**; niciodată în clar sau în răspunsuri API.
* **JWT** (HS256) cu expirare (24 h, 30 zile cu „Ține-mă minte”); rolul este verificat în backend din baza de date, la fiecare cerere.
* Autorizare pe roluri (`@Secured`); clienții nu pot accesa endpoint-urile de admin și nu pot vedea datele altor clienți (404).
* **Rate limiting** la login (pe email și pe IP) → `429`.
* Validare strictă a intrărilor (Bean Validation) + curățare de tag-uri HTML la salvare; React escapează la afișare (XSS).
* Interogări parametrizate (JPA/Hibernate) → fără SQL injection.
* CORS configurat explicit; headere `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cache-Control: no-store` pe API.
* Resetarea parolei: token aleator de unică folosință (stocat doar ca hash SHA-256, valabil 1 h); răspuns identic dacă emailul nu există.
* **GDPR**: consimțământ la înregistrare, politică de confidențialitate / termeni / cookie-uri, export de date, dezactivare cont și ștergere (anonimizare) din profil.
* Exportul CSV neutralizează formulele de tip `=cmd|…` (CSV injection).

**Notițe pentru producție**

1. Pune aplicația în spatele HTTPS (reverse proxy / load balancer) și setează `CORS_ORIGINS` / `FRONTEND_URL` pe domeniul real.
2. Setează `SEED_DEMO_DATA=false`, un `JWT_SECRET` lung și o parolă puternică pentru baza de date; nu expune portul PostgreSQL.
3. Resetarea parolei scrie deocamdată linkul în log (nu există server de mail configurat) — implementează `PasswordResetNotifier` cu un trimițător de email.
4. `LoginRateLimiter` este în memorie (o singură instanță); pentru scalare orizontală mută contoarele în Redis/DB.
5. Textele legale din `Legal.tsx` sunt un punct de pornire și trebuie revizuite de un jurist.

---

## Extindere

Arhitectura este modulară: canale de notificare (email/SMS/WhatsApp) prin `NotificationChannel`, plăți online, mai mulți angajați/locații, loyalty, vouchere, rapoarte Excel/PDF etc. se adaugă fără a rescrie nucleul. Detalii și puncte de extensie în [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#8-extensibilitate).
