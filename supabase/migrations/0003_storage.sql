-- =============================================================================
-- 0003 - ARMAZENAMENTO DE ARQUIVOS (Supabase Storage)
-- -----------------------------------------------------------------------------
-- Um único bucket PRIVADO ("arquivos") para não estourar o plano gratuito.
-- Convenção de caminho:  <codigo_da_tela>/<AAAA-MM>/<arquivo>
--   ex.: tes_conciliacao/2026-10/extrato_banco_x.pdf
-- O acesso ao arquivo segue a MESMA permissão da tela (pode_acessar_tela),
-- então quem não vê a tela também não baixa seus arquivos.
-- Limite: 10 MB por arquivo (ajuste em file_size_limit se precisar).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values ('arquivos', 'arquivos', false, 10485760)
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit;

create policy athena_arquivos_select on storage.objects
  for select to authenticated
  using (bucket_id = 'arquivos' and public.pode_acessar_tela((storage.foldername(name))[1]));

create policy athena_arquivos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'arquivos' and public.pode_acessar_tela((storage.foldername(name))[1]));

create policy athena_arquivos_update on storage.objects
  for update to authenticated
  using (bucket_id = 'arquivos' and public.pode_acessar_tela((storage.foldername(name))[1]));

create policy athena_arquivos_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'arquivos' and public.pode_acessar_tela((storage.foldername(name))[1]));
