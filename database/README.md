# Baza de date

PostgreSQL 16. Schema este versionată cu **Flyway**, direct în backend:

```
backend/src/main/resources/db/migration/
└── V1__init.sql      # tabele, chei străine, CHECK-uri, indexuri, constrângerea anti-suprapunere
```

Migrațiile rulează automat la pornirea backend-ului (`quarkus.flyway.migrate-at-start=true`); nu trebuie rulat niciun script manual.
Pentru o modificare viitoare adaugă un fișier nou (`V2__descriere.sql`) — nu edita migrațiile deja aplicate.

Diagrama entitate-relație și lista constrângerilor: [`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md#2-schema-bazei-de-date).

## Date inițiale

* **Întotdeauna** (la prima pornire): programul implicit (L–V 09–18, Joi 09–20, Sâmbătă 10–15, Duminică închis) și cele 4 servicii.
* **Doar dacă `SEED_DEMO_DATA=true`** și nu există utilizatori: `admin@salon.ro` / `Admin123!`, `client@example.com` / `Client123!`, alți 4 clienți demo, o pauză zilnică 12:00–13:00 și rezervări demo (ultimele 3 săptămâni și următoarele 2).

Implementarea: `backend/src/main/java/ro/salon/config/DataInitializer.java`.

## Acces direct (Docker Compose)

```bash
docker compose exec db psql -U salon -d salon
```

## Backup / restore

```bash
docker compose exec db pg_dump -U salon salon > backup.sql
docker compose exec -T db psql -U salon -d salon < backup.sql
```
