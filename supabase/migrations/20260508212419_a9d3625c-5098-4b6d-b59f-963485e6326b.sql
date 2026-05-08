-- Create extensions schema if not exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_trgm to extensions schema
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Ensure the search path includes extensions
ALTER DATABASE postgres SET search_path TO "$user", public, extensions;
