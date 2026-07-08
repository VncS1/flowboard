-- Runs once, on first container init, alongside the POSTGRES_DB database.
-- Gives the integration test suite (apps/server) an isolated database on the
-- same local Postgres instance, so tests never touch dev data.
CREATE DATABASE flowboard_test;
