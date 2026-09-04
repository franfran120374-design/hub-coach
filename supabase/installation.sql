-- Synchronisation du coach entre l'ordinateur et le téléphone.
-- À coller une seule fois dans l'éditeur SQL de ton projet Supabase,
-- puis cliquer sur Run. Il n'y a rien d'autre à faire côté serveur.
--
-- Principe : la table n'est jamais accessible directement. Seules deux
-- fonctions le sont, et elles exigent le code de 32 caractères généré
-- par l'application sur ton premier appareil. Sans ce code, il n'y a
-- rien à lire ni à écrire.

create table if not exists public.coach_etat (
  code    text primary key,
  donnees jsonb       not null default '{}'::jsonb,
  maj     timestamptz not null default now()
);

-- Verrou : aucune politique n'est créée, donc aucun accès direct à la table.
alter table public.coach_etat enable row level security;

create or replace function public.coach_lire(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  resultat jsonb;
begin
  if p_code is null or length(p_code) < 24 then
    raise exception 'code invalide';
  end if;
  select donnees into resultat from public.coach_etat where code = p_code;
  return resultat;
end;
$$;

create or replace function public.coach_ecrire(p_code text, p_donnees jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_code is null or length(p_code) < 24 then
    raise exception 'code invalide';
  end if;
  insert into public.coach_etat (code, donnees, maj)
  values (p_code, p_donnees, now())
  on conflict (code) do update
    set donnees = excluded.donnees,
        maj     = now();
end;
$$;

revoke all on function public.coach_lire(text)          from public;
revoke all on function public.coach_ecrire(text, jsonb) from public;

grant execute on function public.coach_lire(text)          to anon, authenticated;
grant execute on function public.coach_ecrire(text, jsonb) to anon, authenticated;
