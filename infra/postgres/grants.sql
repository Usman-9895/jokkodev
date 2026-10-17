-- À rejouer après chaque `prisma migrate deploy`, avec le rôle jokkodev_migrator :
--   psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f infra/postgres/grants.sql
-- Le rôle applicatif lit et écrit les données métier mais n'a aucun droit sur l'historique des migrations.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jokkodev_app;
REVOKE ALL ON TABLE public."_prisma_migrations" FROM jokkodev_app;
