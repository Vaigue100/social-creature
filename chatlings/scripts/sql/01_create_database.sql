-- Chatlings Database Setup Script
-- PostgreSQL Database

-- Create database (run this as postgres superuser)
DROP DATABASE IF EXISTS chatlings;
CREATE DATABASE chatlings
    WITH
    OWNER = postgres
    ENCODING = 'UTF8'
    LC_COLLATE = 'English_United States.1252'
    LC_CTYPE = 'English_United States.1252'
    TABLESPACE = pg_default
    CONNECTION LIMIT = -1;

COMMENT ON DATABASE chatlings IS 'Chatlings - Social Media Collecting Game Database';
