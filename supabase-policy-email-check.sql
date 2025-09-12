// Supabase Policy für User-Existenz-Check (SQL)
-- Erlaube SELECT auf auth.users für E-Mail-Abfrage
-- Achtung: Nur für Registrierung, ggf. mit Rate-Limit!
-- Supabase RLS Policy für E-Mail-Existenz-Check auf auth.users
-- Diese Policy erlaubt SELECT auf die E-Mail-Spalte für alle (anon) Nutzer
-- ACHTUNG: User Enumeration möglich! Optional mit Rate-Limit oder Captcha absichern.

CREATE POLICY "Allow anon email check for registration" ON auth.users
FOR SELECT
USING (true);

-- Policy aktivieren:
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;