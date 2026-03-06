-- =====================================================
-- SENDS160 — SQL de Setup para Produção
-- Execute no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/zcpvknzktfmotvrybxdf/sql/new
-- =====================================================

-- 1. INSERIR SETTINGS INICIAIS (se vazio)
INSERT INTO settings (key_name, key_value, description) VALUES
('capmonster_key', '', 'CapMonster API Key'),
('security_question', '', 'Pergunta de segurança DS-160'),
('security_answer', '', 'Resposta de segurança DS-160')
ON CONFLICT (key_name) DO NOTHING;

-- 2. VERIFICAR RLS (se alguma tabela não tiver, habilitar)
-- Descomente e execute se necessário:

-- ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- 3. POLÍTICAS DE ACESSO
-- Applicants: todos podem ler/inserir/atualizar, só auth deleta
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='applicants' AND policyname='public_read_applicants') THEN
    CREATE POLICY "public_read_applicants" ON applicants FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='applicants' AND policyname='public_insert_applicants') THEN
    CREATE POLICY "public_insert_applicants" ON applicants FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='applicants' AND policyname='public_update_applicants') THEN
    CREATE POLICY "public_update_applicants" ON applicants FOR UPDATE USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='applicants' AND policyname='auth_delete_applicants') THEN
    CREATE POLICY "auth_delete_applicants" ON applicants FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- Companies: todos leem, auth escreve
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='companies' AND policyname='public_read_companies') THEN
    CREATE POLICY "public_read_companies" ON companies FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='companies' AND policyname='auth_all_companies') THEN
    CREATE POLICY "auth_all_companies" ON companies FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- Members: auth full, todos leem
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='members' AND policyname='public_read_members') THEN
    CREATE POLICY "public_read_members" ON members FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='members' AND policyname='auth_all_members') THEN
    CREATE POLICY "auth_all_members" ON members FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- Settings: todos leem, auth escreve
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='settings' AND policyname='public_read_settings') THEN
    CREATE POLICY "public_read_settings" ON settings FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='settings' AND policyname='auth_all_settings') THEN
    CREATE POLICY "auth_all_settings" ON settings FOR ALL TO authenticated USING (true);
  END IF;
END $$;

-- Error Logs: auth lê/atualiza, todos inserem
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='error_logs' AND policyname='auth_read_errors') THEN
    CREATE POLICY "auth_read_errors" ON error_logs FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='error_logs' AND policyname='public_insert_errors') THEN
    CREATE POLICY "public_insert_errors" ON error_logs FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='error_logs' AND policyname='auth_update_errors') THEN
    CREATE POLICY "auth_update_errors" ON error_logs FOR UPDATE TO authenticated USING (true);
  END IF;
END $$;

-- 4. VERIFICAÇÃO FINAL
SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
