begin;

create table midi_privado.rubros (
  id text primary key,
  familia text not null check (familia in ('diseno', 'produccion', 'recursos'))
);
insert into midi_privado.rubros (id, familia) values
  ('graphic', 'diseno'),
  ('publicidad', 'diseno'),
  ('editorial', 'diseno'),
  ('tipografia', 'diseno'),
  ('informacion', 'diseno'),
  ('ilustracion', 'diseno'),
  ('envases', 'diseno'),
  ('digital', 'diseno'),
  ('video', 'diseno'),
  ('sonoro', 'diseno'),
  ('videojuegos', 'diseno'),
  ('inmersivo', 'diseno'),
  ('industrial', 'diseno'),
  ('movilidad', 'diseno'),
  ('moda', 'diseno'),
  ('textile', 'diseno'),
  ('accesorios', 'diseno'),
  ('architecture', 'diseno'),
  ('interiores', 'diseno'),
  ('iluminacion', 'diseno'),
  ('paisajismo', 'diseno'),
  ('expositivo', 'diseno'),
  ('senaletica', 'diseno'),
  ('servicios', 'diseno'),
  ('instruccional', 'diseno'),
  ('estrategico', 'diseno'),
  ('imprentas', 'produccion'),
  ('carteleria', 'produccion'),
  ('fabricacion-envases', 'produccion'),
  ('carpinterias', 'produccion'),
  ('metalurgicas', 'produccion'),
  ('tapicerias', 'produccion'),
  ('confeccion', 'produccion'),
  ('estampado', 'produccion'),
  ('marroquineria', 'produccion'),
  ('orfebreria', 'produccion'),
  ('ceramica-fibras', 'produccion'),
  ('vidrierias', 'produccion'),
  ('plasticos-resinas', 'produccion'),
  ('prototipado', 'produccion'),
  ('terminaciones', 'produccion'),
  ('fabricacion-iluminacion', 'produccion'),
  ('stands-escenografia', 'produccion'),
  ('gear', 'recursos'),
  ('space', 'recursos');

revoke all on midi_privado.rubros from public, anon, authenticated;

alter table public.fichas
  drop constraint fichas_categoria_check,
  add foreign key (categoria) references midi_privado.rubros(id),
  add column red_social text check (
    char_length(red_social) <= 300
    and red_social ~* $re$^https://[a-z0-9][a-z0-9.-]*\.[a-z0-9]+(:[0-9]{1,5})?([/?#][^[:space:]<>"'\\]*)?$$re$
  ),
  add column telefono text check (telefono ~ '^[1-9][0-9]{7,14}$'),
  add column procesos text check (char_length(procesos) <= 160),
  add column materiales text check (char_length(materiales) <= 160),
  add column escala_produccion text check (char_length(escala_produccion) <= 90);

alter table public.fichas_publicadas
  add foreign key (categoria) references midi_privado.rubros(id),
  add column red_social text,
  add column telefono text,
  add column procesos text,
  add column materiales text,
  add column escala_produccion text;

create or replace function public.guardar_ficha(p_version integer, p_datos jsonb)
returns public.fichas language plpgsql security definer set search_path = ''
as $fn$
declare
  usuario uuid := auth.uid();
  ficha public.fichas;
  rubro text := nullif(btrim(p_datos ->> 'categoria'), '');
  es_produccion boolean;
  ruta text := nullif(btrim(p_datos ->> 'foto_ruta'), '');
begin
  if usuario is null then
    raise exception using errcode = '42501', message = 'Ingresá para guardar tu ficha.';
  end if;
  if p_datos is null or jsonb_typeof(p_datos) <> 'object' then
    raise exception 'Los campos de la ficha son inválidos.';
  end if;

  if p_version = 0 then
    insert into public.fichas (titular) values (usuario)
    on conflict (titular) do nothing;
  end if;
  select * into ficha from public.fichas where titular = usuario for update;
  if not found or ficha.version is distinct from p_version then
    raise exception 'La ficha cambió. Volvé a abrirla antes de guardar.';
  end if;
  if ficha.estado = 'en_revision' then
    raise exception 'Retirá la ficha de revisión para editarla.';
  end if;
  if ruta is not null and not exists (
    select 1 from storage.objects
    where bucket_id = 'fotos-fichas' and name = ruta
      and ruta ~ ('^' || ficha.id::text || '/[a-f0-9-]{36}\.jpg$')
  ) then
    raise exception 'Subí una foto desde tu ficha.';
  end if;

  es_produccion := exists (
    select 1 from midi_privado.rubros where id = rubro and familia = 'produccion'
  );

  update public.fichas set
    nombre = coalesce(btrim(p_datos ->> 'nombre'), ''),
    categoria = rubro,
    localidad = nullif(btrim(p_datos ->> 'localidad'), ''),
    servicios = coalesce(btrim(p_datos ->> 'servicios'), ''),
    descripcion = coalesce(btrim(p_datos ->> 'descripcion'), ''),
    web = nullif(btrim(p_datos ->> 'web'), ''),
    correo_publico = nullif(btrim(p_datos ->> 'correo_publico'), ''),
    whatsapp = nullif(btrim(p_datos ->> 'whatsapp'), ''),
    telefono = nullif(btrim(p_datos ->> 'telefono'), ''),
    red_social = nullif(btrim(p_datos ->> 'red_social'), ''),
    procesos = case when es_produccion then nullif(btrim(p_datos ->> 'procesos'), '') end,
    materiales = case when es_produccion then nullif(btrim(p_datos ->> 'materiales'), '') end,
    escala_produccion = case when es_produccion then nullif(btrim(p_datos ->> 'escala_produccion'), '') end,
    direccion = nullif(btrim(p_datos ->> 'direccion'), ''),
    latitud = nullif(p_datos ->> 'latitud', '')::double precision,
    longitud = nullif(p_datos ->> 'longitud', '')::double precision,
    foto_ruta = ruta,
    acepta_publicar = (p_datos -> 'acepta_publicar') is not distinct from 'true'::jsonb,
    estado = case when ficha.estado = 'correcciones' then 'correcciones' else 'borrador' end,
    version = ficha.version + 1,
    actualizada = now()
  where id = ficha.id returning * into ficha;
  return ficha;
end;
$fn$;

create or replace function midi_privado.validar_alta(ficha public.fichas)
returns void language plpgsql set search_path = ''
as $fn$
begin
  if char_length(ficha.nombre) < 2 or ficha.categoria is null or ficha.localidad is null
     or char_length(ficha.servicios) < 5 or char_length(ficha.descripcion) < 20 then
    raise exception 'Completá el nombre, rubro, localidad, servicios y una descripción de al menos 20 caracteres.';
  end if;
  if ficha.web is null and ficha.correo_publico is null and ficha.whatsapp is null
     and ficha.telefono is null and ficha.red_social is null then
    raise exception 'Agregá un medio de contacto público.';
  end if;
  if not ficha.acepta_publicar then
    raise exception 'Confirmá que querés publicar los datos indicados.';
  end if;
end;
$fn$;

create or replace function public.resolver_revision(p_ficha uuid, p_version integer, p_aprobar boolean, p_nota text default null)
returns public.fichas language plpgsql security definer set search_path = ''
as $fn$
declare
  ficha public.fichas;
  lugar midi_privado.localidades;
  comentario text := nullif(btrim(p_nota), '');
begin
  if not midi_privado.puede_moderar() then
    raise exception using errcode = '42501', message = 'La revisión requiere un administrador con segundo factor.';
  end if;
  select * into ficha from public.fichas where id = p_ficha for update;
  if not found or ficha.version is distinct from p_version or ficha.estado <> 'en_revision' then
    raise exception 'La ficha ya cambió. Actualizá la lista de revisión.';
  end if;
  if p_aprobar is null then
    raise exception 'Seleccioná una resolución.';
  end if;

  if p_aprobar then
    perform midi_privado.validar_alta(ficha);
    select * into strict lugar from midi_privado.localidades where id = ficha.localidad;
    insert into public.fichas_publicadas
      (id, nombre, categoria, localidad, servicios, descripcion, web, correo_publico, whatsapp,
       red_social, telefono, procesos, materiales, escala_produccion, direccion, latitud, longitud, foto_ruta)
    values
      (ficha.id, ficha.nombre, ficha.categoria, ficha.localidad, ficha.servicios, ficha.descripcion,
        ficha.web, ficha.correo_publico, ficha.whatsapp,
       ficha.red_social, ficha.telefono, ficha.procesos, ficha.materiales, ficha.escala_produccion,
       ficha.direccion, coalesce(ficha.latitud, lugar.latitud), coalesce(ficha.longitud, lugar.longitud), ficha.foto_ruta)
    on conflict (id) do update set
      nombre = excluded.nombre, categoria = excluded.categoria, localidad = excluded.localidad,
      servicios = excluded.servicios, descripcion = excluded.descripcion, web = excluded.web,
      correo_publico = excluded.correo_publico, whatsapp = excluded.whatsapp,
      red_social = excluded.red_social, telefono = excluded.telefono, procesos = excluded.procesos,
      materiales = excluded.materiales, escala_produccion = excluded.escala_produccion,
      direccion = excluded.direccion, latitud = excluded.latitud, longitud = excluded.longitud,
      foto_ruta = excluded.foto_ruta, publicada = now();
  elsif comentario is null or char_length(comentario) > 500 then
    raise exception 'Escribí una indicación de hasta 500 caracteres.';
  end if;

  update public.fichas set
    estado = case when p_aprobar then 'publicada' else 'correcciones' end,
    nota_revision = case when p_aprobar then null else comentario end,
    version = ficha.version + 1, actualizada = now()
  where id = ficha.id returning * into ficha;
  insert into midi_privado.actividad (ficha, actor, evento)
    values (ficha.id, auth.uid(), case when p_aprobar then 'publicada' else 'correcciones' end);
  return ficha;
end;
$fn$;

create function public.eliminar_ficha(p_ficha uuid, p_version integer)
returns void language plpgsql security definer set search_path = ''
as $fn$
declare
  ficha public.fichas;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Ingresá para eliminar la ficha.';
  end if;
  select * into ficha from public.fichas
    where id = p_ficha and (titular = auth.uid() or midi_privado.puede_moderar())
    for update;
  if not found then
    raise exception using errcode = '42501', message = 'Tu cuenta no administra esta ficha.';
  end if;
  if ficha.version is distinct from p_version then
    raise exception 'La ficha cambió. Volvé a abrirla.';
  end if;

  delete from public.fichas where id = ficha.id;
  insert into midi_privado.actividad (ficha, actor, evento) values (ficha.id, auth.uid(), 'eliminada');
end;
$fn$;

create table midi_privado.invitaciones_resena (
  ficha uuid references public.fichas(id) on delete cascade,
  correo text not null check (char_length(correo) <= 254),
  codigo uuid not null default gen_random_uuid() unique,
  vence timestamptz not null default (now() + interval '30 days'),
  primary key (ficha, correo)
);

create table midi_privado.resenas (
  ficha uuid references public.fichas(id) on delete cascade,
  cliente uuid references auth.users(id) on delete cascade,
  puntaje integer not null check (puntaje between 1 and 5),
  primary key (ficha, cliente)
);

revoke all on midi_privado.invitaciones_resena, midi_privado.resenas from public, anon, authenticated;

create function public.invitar_a_calificar(p_ficha uuid, p_correo text)
returns uuid language plpgsql security definer set search_path = ''
as $fn$
declare
  ficha public.fichas;
  correo_cliente text := lower(btrim(p_correo));
  codigo_invitacion uuid;
begin
  select * into ficha from public.fichas where id = p_ficha and titular = auth.uid() for update;
  if not found then
    raise exception using errcode = '42501', message = 'Solo el titular puede invitar a un cliente.';
  end if;
  if not exists (select 1 from public.fichas_publicadas where id = ficha.id) then
    raise exception 'Publicá tu ficha antes de invitar a un cliente.';
  end if;
  if correo_cliente is null or char_length(correo_cliente) > 254
     or correo_cliente !~* '^[a-z0-9_.+%-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$' then
    raise exception 'Revisá el correo del cliente.';
  end if;
  if exists (select 1 from auth.users where id = auth.uid() and lower(email) = correo_cliente) then
    raise exception 'Ingresá el correo de un cliente distinto al de tu cuenta.';
  end if;
  if exists (
    select 1 from midi_privado.resenas r join auth.users u on u.id = r.cliente
    where r.ficha = ficha.id and lower(u.email) = correo_cliente
  ) then
    raise exception 'Ese cliente ya calificó esta ficha.';
  end if;

  delete from midi_privado.invitaciones_resena where invitaciones_resena.ficha = p_ficha and vence <= now();
  insert into midi_privado.invitaciones_resena (ficha, correo) values (p_ficha, correo_cliente)
    on conflict on constraint invitaciones_resena_pkey do nothing;
  select codigo into codigo_invitacion from midi_privado.invitaciones_resena
    where invitaciones_resena.ficha = p_ficha and correo = correo_cliente;
  return codigo_invitacion;
end;
$fn$;

create function public.calificar_ficha(p_ficha uuid, p_codigo uuid, p_puntaje integer)
returns void language plpgsql security definer set search_path = ''
as $fn$
declare
  usuario uuid := auth.uid();
  titular_ficha uuid;
  correo_cliente text;
begin
  if usuario is null then
    raise exception using errcode = '42501', message = 'Ingresá para calificar.';
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
  select lower(email) into correo_cliente from auth.users where id = usuario and email_confirmed_at is not null;
  delete from midi_privado.invitaciones_resena
    where ficha = p_ficha and codigo = p_codigo and correo = correo_cliente and vence > now();
  if not found then
    raise exception 'El enlace no está disponible para este correo. Revisá tu invitación.';
  end if;

  insert into midi_privado.resenas (ficha, cliente, puntaje) values (p_ficha, usuario, p_puntaje)
    on conflict (ficha, cliente) do nothing;
  if not found then
    raise exception 'Ya calificaste esta ficha.';
  end if;
end;
$fn$;

create function public.calificaciones_visibles(p_fichas uuid[])
returns table (ficha uuid, promedio numeric, cantidad integer)
language sql stable security definer set search_path = ''
as $fn$
  select r.ficha, round(avg(r.puntaje), 1), count(*)::integer
  from midi_privado.resenas r
  join public.fichas_publicadas f on f.id = r.ficha
  where r.ficha = any(p_fichas)
  group by r.ficha;
$fn$;

create table public.patrocinios (
  id uuid primary key default gen_random_uuid(),
  version integer not null default 1 check (version > 0),
  titulo text not null check (char_length(titulo) between 2 and 80),
  texto text check (char_length(texto) <= 140),
  enlace text check (
    char_length(enlace) <= 300
    and enlace ~* $re$^https://[a-z0-9][a-z0-9.-]*\.[a-z0-9]+(:[0-9]{1,5})?([/?#][^[:space:]<>"'\\]*)?$$re$
  ),
  imagen_ruta text check (imagen_ruta ~ '^[a-f0-9-]{36}/[a-f0-9-]{36}\.jpg$'),
  orden integer not null default 0 check (orden between 0 and 999),
  activo boolean not null default false,
  actualizado timestamptz not null default now()
);

create index patrocinios_activos_por_orden on public.patrocinios (orden, id) where activo;
create index patrocinios_imagen_publica on public.patrocinios (imagen_ruta) where activo and imagen_ruta is not null;

revoke all on public.patrocinios from public, anon, authenticated;
grant select on public.patrocinios to anon, authenticated;
alter table public.patrocinios enable row level security;
create policy patrocinios_lectura_publica on public.patrocinios
for select to anon, authenticated using (activo);
create policy patrocinios_lectura_moderacion on public.patrocinios
for select to authenticated using ((select midi_privado.puede_moderar()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-patrocinios', 'fotos-patrocinios', false, 1500000, array['image/jpeg']);

create function midi_privado.puede_leer_patrocinio(ruta text)
returns boolean language sql stable security definer set search_path = ''
as $fn$
  select exists (select 1 from public.patrocinios where activo and imagen_ruta = ruta)
    or midi_privado.puede_moderar();
$fn$;
revoke all on function midi_privado.puede_leer_patrocinio(text) from public, anon, authenticated;
grant execute on function midi_privado.puede_leer_patrocinio(text) to anon, authenticated;

create policy fotos_patrocinios_lectura_autorizada on storage.objects
for select to anon, authenticated
using (bucket_id = 'fotos-patrocinios' and midi_privado.puede_leer_patrocinio(name));

create function public.reservar_imagen_patrocinio()
returns text language plpgsql security definer set search_path = ''
as $fn$
begin
  if not midi_privado.puede_moderar() then
    raise exception using errcode = '42501', message = 'La publicidad requiere un administrador con segundo factor.';
  end if;
  return auth.uid()::text || '/' || gen_random_uuid()::text || '.jpg';
end;
$fn$;

create function public.guardar_patrocinio(p_id uuid, p_version integer, p_datos jsonb)
returns public.patrocinios language plpgsql security definer set search_path = ''
as $fn$
declare
  anuncio public.patrocinios;
  ruta text := nullif(btrim(p_datos ->> 'imagen_ruta'), '');
  nombre text := btrim(p_datos ->> 'titulo');
  contenido text := nullif(btrim(p_datos ->> 'texto'), '');
  url text := nullif(btrim(p_datos ->> 'enlace'), '');
  posicion integer := coalesce((p_datos ->> 'orden')::integer, 0);
  publicado boolean := (p_datos -> 'activo') is not distinct from 'true'::jsonb;
begin
  if not midi_privado.puede_moderar() then
    raise exception using errcode = '42501', message = 'La publicidad requiere un administrador con segundo factor.';
  end if;
  if nombre is null or char_length(nombre) not between 2 and 80 then
    raise exception 'Ingresá el nombre del patrocinador.';
  end if;
  if ruta is not null and not exists (
    select 1 from storage.objects where bucket_id = 'fotos-patrocinios' and name = ruta
  ) then
    raise exception 'Subí la imagen desde el formulario de publicidad.';
  end if;

  if p_version = 0 then
    insert into public.patrocinios (id, titulo, texto, enlace, imagen_ruta, orden, activo)
      values (p_id, nombre, contenido, url, ruta, posicion, publicado)
      on conflict (id) do nothing returning * into anuncio;
  else
    update public.patrocinios set
      titulo = nombre, texto = contenido, enlace = url, imagen_ruta = ruta,
      orden = posicion, activo = publicado, version = version + 1, actualizado = now()
    where id = p_id and version = p_version returning * into anuncio;
  end if;
  if not found then
    raise exception 'El anuncio cambió. Volvé a abrirlo.';
  end if;
  return anuncio;
end;
$fn$;

create function public.eliminar_patrocinio(p_id uuid, p_version integer)
returns void language plpgsql security definer set search_path = ''
as $fn$
begin
  if not midi_privado.puede_moderar() then
    raise exception using errcode = '42501', message = 'La publicidad requiere un administrador con segundo factor.';
  end if;
  delete from public.patrocinios where id = p_id and version = p_version;
  if not found then
    raise exception 'El anuncio cambió. Volvé a abrirlo.';
  end if;
end;
$fn$;

revoke all on function public.eliminar_ficha(uuid, integer), public.invitar_a_calificar(uuid, text),
  public.calificar_ficha(uuid, uuid, integer), public.calificaciones_visibles(uuid[]),
  public.reservar_imagen_patrocinio(), public.guardar_patrocinio(uuid, integer, jsonb),
  public.eliminar_patrocinio(uuid, integer) from public, anon, authenticated;

grant execute on function public.eliminar_ficha(uuid, integer), public.invitar_a_calificar(uuid, text),
  public.calificar_ficha(uuid, uuid, integer), public.reservar_imagen_patrocinio(),
  public.guardar_patrocinio(uuid, integer, jsonb), public.eliminar_patrocinio(uuid, integer) to authenticated;
grant execute on function public.calificaciones_visibles(uuid[]) to anon, authenticated;

commit;
