-- 20261107202000_add_source_to_appointments.sql
ALTER TABLE public.appointments
ADD COLUMN source text NULL;
-- Limit length to 255 characters
ALTER TABLE public.appointments
ALTER COLUMN source TYPE varchar(255);
