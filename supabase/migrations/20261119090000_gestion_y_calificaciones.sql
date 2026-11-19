begin;

alter table midi_privado.resenas
  add column contratacion_declarada boolean not null default false;

create function public.calificar_ficha(p_ficha uuid, p_puntaje integer, p_contrato boolean)
returns void language plpgsql security definer set search_path = ''
as $fn$
declare
  usuario uuid := auth.uid();
  titular_ficha uuid;
begin
  if usuario is null then
    raise exception using errcode = '42501', message = 'Ingresá para calificar.';
  end if;
  if not exists (
    select 1 from auth.users where id = usuario and email_confirmed_at is not null
  ) then
    raise exception using errcode = '42501', message = 'Verificá tu correo para calificar.';
  end if;
  if p_contrato is distinct from true then
    raise exception 'Confirmá que contrataste este servicio.';
  end if;
  if p_puntaje is null or p_puntaje not between 1 and 5 then
    raise exception 'Elegí entre 1 y 5 estrellas.';
  end if;

  select titular into titular_ficha from public.fichas where id = p_ficha for update;
  if not found or not exists (select 1 from public.fichas_publicadas where id = p_ficha) then
    raise exception 'Esta ficha no está publicada.';
  end if;
  if titular_ficha = usuario then
    raise exception 'El titular no puede calificar su propia ficha.';
  end if;

  insert into midi_privado.resenas (ficha, cliente, puntaje, contratacion_declarada)
    values (p_ficha, usuario, p_puntaje, true)
    on conflict (ficha, cliente) do nothing;
  if not found then
    raise exception 'Ya calificaste esta ficha.';
  end if;
end;
$fn$;

revoke all on function public.calificar_ficha(uuid, integer, boolean) from public, anon, authenticated;
grant execute on function public.calificar_ficha(uuid, integer, boolean) to authenticated;

-- Las calificaciones anteriores se conservan. Las invitaciones dejan de intervenir en el alta.
revoke all on function public.invitar_a_calificar(uuid, text),
  public.calificar_ficha(uuid, uuid, integer) from public, anon, authenticated;

commit;
