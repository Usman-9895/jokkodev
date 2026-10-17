-- Rôles et base de production. À exécuter une seule fois par un superutilisateur :
--   psql -v ON_ERROR_STOP=1 -v migrator_password="..." -v app_password="..." -f infra/postgres/roles.sql
-- jokkodev_migrator possède le schéma et applique les migrations ; jokkodev_app ne fait que lire et écrire les données.
CREATE ROLE jokkodev_migrator LOGIN PASSWORD :'migrator_password';
CREATE ROLE jokkodev_app LOGIN PASSWORD :'app_password' CONNECTION LIMIT 20;
CREATE DATABASE jokkodev OWNER jokkodev_migrator;
\connect jokkodev
ALTER SCHEMA public OWNER TO jokkodev_migrator;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO jokkodev_app;
-- Tables créées plus tard par les migrations : droits DML accordés automatiquement au rôle applicatif.
ALTER DEFAULT PRIVILEGES FOR ROLE jokkodev_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO jokkodev_app;
