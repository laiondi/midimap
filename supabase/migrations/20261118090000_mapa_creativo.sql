begin;

create schema midi_privado;
revoke all on schema midi_privado from public, anon, authenticated;
grant usage on schema midi_privado to anon, authenticated;

create table midi_privado.localidades (
  id text primary key,
  nombre text not null,
  latitud double precision not null,
  longitud double precision not null
);

insert into midi_privado.localidades (id, nombre, latitud, longitud) values
  ('localidad-54014060', '1º de Mayo', -27.16799, -55.02906),
  ('localidad-54119060', '25 de Mayo', -27.37818, -54.74488),
  ('localidad-54042050', '9 de Julio Kilómetro 20', -26.41472, -54.49586),
  ('localidad-54042040', '9 de Julio Kilómetro 28', -26.43028, -54.46647),
  ('localidad-54119010', 'Alba Posse', -27.56895, -54.68304),
  ('localidad-54119020', 'Alicia Alta', -27.37782, -54.3521),
  ('localidad-54119025', 'Alicia Baja', -27.4394, -54.35371),
  ('localidad-54070010', 'Almafuerte', -27.50812, -55.40352),
  ('apostoles', 'Apóstoles', -27.91414, -55.75486),
  ('localidad-54014010', 'Aristóbulo del Valle', -27.09568, -54.89342),
  ('localidad-54070020', 'Arroyo del Medio', -27.69826, -55.40486),
  ('localidad-54007020', 'Azara', -28.06071, -55.67707),
  ('localidad-54084007', 'Bario Ita', -26.52952, -54.7068),
  ('localidad-54035010', 'Barra Concepción', -28.1167, -55.58152),
  ('localidad-54084003', 'Barrio Cuatro Bocas', -26.5503, -54.68055),
  ('localidad-54021005', 'Barrio del Lago', -27.46652, -55.79899),
  ('localidad-54091013', 'Barrio Escuela 461', -27.62446, -55.03947),
  ('localidad-54091017', 'Barrio Escuela 633', -27.47036, -55.08059),
  ('localidad-54084005', 'Barrio Guatambu', -26.60552, -54.69871),
  ('localidad-54007025', 'Barrio Rural', -27.88112, -55.78728),
  ('localidad-54098005', 'Barrio Tungoil', -27.11482, -55.38387),
  ('localidad-54049020', 'Bernardo de Irigoyen', -26.25533, -53.64673),
  ('localidad-54021010', 'Bonpland', -27.4854, -55.48009),
  ('localidad-54070030', 'Caá - Yarí', -27.48488, -55.29896),
  ('localidad-54049025', 'Caburei', -25.68213, -54.14136),
  ('localidad-54014020', 'Campo Grande', -27.20796, -54.9797),
  ('localidad-54091020', 'Campo Ramón', -27.45427, -55.02295),
  ('localidad-54091030', 'Campo Viera', -27.33097, -55.05425),
  ('localidad-54021020', 'Candelaria', -27.46122, -55.74396),
  ('localidad-54077010', 'Capioví', -26.92832, -55.0573),
  ('localidad-54077015', 'Capioviciño', -26.89171, -55.07224),
  ('localidad-54084010', 'Caraguatay', -26.65728, -54.73918),
  ('localidad-54070040', 'Cerro Azul', -27.63358, -55.49742),
  ('localidad-54021030', 'Cerro Corá', -27.51192, -55.60961),
  ('localidad-54091010', 'Colonia Alberdi', -27.36003, -55.23133),
  ('localidad-54119030', 'Colonia Aurora', -27.47372, -54.52411),
  ('localidad-54098010', 'Colonia Polana', -26.98199, -55.31823),
  ('localidad-54042010', 'Colonia Victoria', -26.33369, -54.62461),
  ('localidad-54063040', 'Colonia Wanda', -25.97337, -54.56304),
  ('localidad-54049010', 'Comandante Andresito', -25.66716, -54.04986),
  ('localidad-54035020', 'Concepción de la Sierra', -27.98058, -55.52159),
  ('localidad-54098020', 'Corpus', -27.12947, -55.51083),
  ('localidad-54112010', 'Cruce Caballero', -26.5421, -53.94188),
  ('localidad-54098030', 'Domingo Savio', -27.35543, -55.33847),
  ('localidad-54070050', 'Dos Arroyos', -27.69908, -55.25182),
  ('localidad-54014030', 'Dos de Mayo', -27.01994, -54.68453),
  ('localidad-5401403001', 'Dos de Mayo Núcleo I', -27.0221, -54.68561),
  ('localidad-5401403002', 'Dos de Mayo Núcleo II', -27.03186, -54.66491),
  ('localidad-54014050', 'Dos de Mayo Nucleo III (Bº Bernardino Rivadavia)', -27.01334, -54.60816),
  ('localidad-54049030', 'Dos Hermanas', -26.29308, -53.75693),
  ('localidad-54077020', 'El Alcázar', -26.71365, -54.81405),
  ('localidad-54091040', 'El Salto', -27.49519, -55.19873),
  ('localidad-54056010', 'El Soberbio', -27.29751, -54.19755),
  ('eldorado', 'Eldorado', -26.40888, -54.60705),
  ('localidad-54007030', 'Estación Apóstoles', -27.91153, -55.80922),
  ('localidad-54105010', 'Florentino Ameghino', -27.63362, -55.08553),
  ('localidad-54056020', 'Fracrán', -26.74343, -54.29745),
  ('localidad-54077030', 'Garuhapé', -26.82113, -54.95775),
  ('localidad-54028010', 'Garupá', -27.48378, -55.8297),
  ('localidad-54091050', 'General Alvear', -27.42635, -55.1696),
  ('localidad-54098040', 'General Urquiza', -27.10787, -55.37662),
  ('localidad-54070060', 'Gobernador López', -27.66636, -55.21347),
  ('localidad-54098050', 'Gobernador Roca', -27.19006, -55.46932),
  ('localidad-54091060', 'Guaraní', -27.52318, -55.15765),
  ('localidad-54098060', 'Helvecia', -27.10973, -55.34446),
  ('localidad-54098070', 'Hipólito Yrigoyen', -27.08571, -55.28742),
  ('localidad-54049040', 'Integración', -25.77096, -53.85518),
  ('localidad-54105020', 'Itacaruaré', -27.8714, -55.26221),
  ('localidad-54098080', 'Jardín América', -27.04316, -55.22702),
  ('localidad-54014055', 'Kilómetro 17', -27.31574, -54.90273),
  ('localidad-54035030', 'La Corita', -27.89253, -55.35555),
  ('localidad-54084020', 'Laharrague', -26.53539, -54.64974),
  ('alem', 'Leandro N. Alem', -27.60373, -55.32362),
  ('localidad-54021040', 'Loreto', -27.33295, -55.52225),
  ('localidad-54091070', 'Los Helechos', -27.55766, -55.07626),
  ('localidad-54042030', 'María Magdalena', -26.23728, -54.6029),
  ('localidad-54021050', 'Mártires', -27.42313, -55.3773),
  ('localidad-54077040', 'Mbopicuá', -26.86385, -55.04516),
  ('localidad-54105030', 'Mojón Grande', -27.71204, -55.15743),
  ('localidad-54084030', 'Montecarlo', -26.56665, -54.76613),
  ('localidad-54028020', 'Nemesio Parma', -27.35648, -56.01722),
  ('localidad-54042035', 'Nueva Delicia', -26.18173, -54.59122),
  ('localidad-54098090', 'Oasis', -26.97173, -55.24972),
  ('obera', 'Oberá', -27.48679, -55.12006),
  ('localidad-54070080', 'Olegario V. Andrade', -27.56759, -55.50228),
  ('localidad-54091090', 'Panambí', -27.72203, -54.91483),
  ('localidad-54091105', 'Panambi Kilómetro 15', -27.70915, -54.96745),
  ('localidad-54091100', 'Panambí Kilómetro 8', -27.6685, -54.98268),
  ('localidad-54112020', 'Paraíso', -26.68707, -54.20307),
  ('localidad-54049043', 'Piñalito Norte', -25.93311, -53.93296),
  ('localidad-54112030', 'Piñalito Sur', -26.4261, -53.84143),
  ('localidad-54007040', 'Pindapoy', -27.74942, -55.79478),
  ('localidad-54084040', 'Piray Kilómetro 18', -26.51605, -54.59142),
  ('posadas', 'Posadas', -27.36643, -55.89398),
  ('localidad-54028040', 'Posadas (Extensión)', -27.45243, -55.85271),
  ('localidad-54021060', 'Profundidad', -27.56172, -55.70457),
  ('localidad-54014070', 'Pueblo Illia', -27.15258, -54.56074),
  ('localidad-54042055', 'Pueblo Nuevo', -26.24341, -54.59122),
  ('localidad-54049045', 'Puerto Andresito', -25.59621, -54.00241),
  ('localidad-54049047', 'Puerto Deseado', -25.78584, -54.03895),
  ('localidad-54063010', 'Puerto Esperanza', -26.02061, -54.6152),
  ('iguazu', 'Puerto Iguazú', -25.59721, -54.57722),
  ('localidad-54077050', 'Puerto Leoni', -26.98985, -55.16588),
  ('localidad-54063020', 'Puerto Libertad', -25.92147, -54.58432),
  ('localidad-54042060', 'Puerto Mado', -26.22974, -54.62355),
  ('localidad-54042070', 'Puerto Pinares', -26.42734, -54.68296),
  ('localidad-54084050', 'Puerto Piray', -26.46734, -54.71803),
  ('localidad-54077060', 'Puerto Rico', -26.80859, -55.02213),
  ('localidad-54021070', 'Puerto Santa Ana', -27.33565, -55.58313),
  ('localidad-54007050', 'Rincón de Azara', -28.11362, -55.62953),
  ('localidad-54098100', 'Roca Chica', -27.21425, -55.42002),
  ('localidad-54077070', 'Ruiz de Montoya', -26.97043, -55.05222),
  ('localidad-54014080', 'Salto Encantado', -27.08732, -54.83337),
  ('localidad-54077080', 'San Alberto', -26.80824, -54.98947),
  ('localidad-54049050', 'San Antonio', -26.05737, -53.73412),
  ('localidad-54119040', 'San Francisco de Asís', -27.46265, -54.74532),
  ('localidad-54077090', 'San Gotardo', -26.92373, -55.12375),
  ('localidad-54098110', 'San Ignacio', -27.25861, -55.53897),
  ('localidad-54105040', 'San Javier', -27.86948, -55.13872),
  ('localidad-54007060', 'San José', -27.76999, -55.7803),
  ('localidad-54091110', 'San Martín', -27.46604, -55.27554),
  ('localidad-54077100', 'San Miguel', -26.85366, -54.88879),
  ('localidad-54112040', 'San Pedro', -26.62553, -54.1163),
  ('vicente', 'San Vicente', -26.9933, -54.48662),
  ('localidad-54021080', 'Santa Ana', -27.36921, -55.58171),
  ('localidad-54035040', 'Santa María', -27.93451, -55.40733),
  ('localidad-54119050', 'Santa Rita', -27.52032, -54.72791),
  ('localidad-54042080', 'Santiago de Liniers', -26.40119, -54.41565),
  ('localidad-54098120', 'Santo Pipó', -27.14012, -55.40851),
  ('localidad-54084060', 'Tarumá', -26.71744, -54.72006),
  ('localidad-54112050', 'Tobuna', -26.46997, -53.89113),
  ('localidad-54007070', 'Tres Capones', -28.00425, -55.6094),
  ('localidad-54042090', 'Valle Hermoso', -26.38442, -54.46346),
  ('localidad-54077110', 'Villa Akerman', -26.94333, -55.09552),
  ('localidad-54091120', 'Villa Bonita', -27.4829, -54.96483),
  ('localidad-54063035', 'Villa Cooperativa', -25.9442, -54.54494),
  ('localidad-54070090', 'Villa Libertad', -27.56544, -55.3202),
  ('localidad-54084070', 'Villa Parodi', -26.4989, -54.6783),
  ('localidad-54042100', 'Villa Roulet', -26.44237, -54.64047),
  ('localidad-54077120', 'Villa Urrutia', -26.83689, -54.75306);

create table midi_privado.administradores (
  usuario uuid primary key references auth.users(id) on delete cascade
);

create table public.fichas (
  id uuid primary key default gen_random_uuid(),
  titular uuid not null unique references auth.users(id) on delete cascade,
  version integer not null default 0 check (version >= 0),
  estado text not null default 'borrador'
    check (estado in ('borrador', 'en_revision', 'correcciones', 'publicada', 'pausada')),
  nombre text not null default '' check (char_length(nombre) <= 70),
  categoria text check (categoria in ('industrial', 'graphic', 'architecture', 'textile', 'video', 'gear', 'space')),
  localidad text references midi_privado.localidades(id),
  servicios text not null default '' check (char_length(servicios) <= 160),
  descripcion text not null default '' check (char_length(descripcion) <= 1200),
  web text check (
    char_length(web) <= 300
    and web ~* $re$^https://[a-z0-9][a-z0-9.-]*\.[a-z0-9]+(:[0-9]{1,5})?([/?#][^[:space:]<>"'\\]*)?$$re$
  ),
  correo_publico text check (
    char_length(correo_publico) <= 160
    and correo_publico ~* '^[a-z0-9_.+%-]+@[a-z0-9-]+(\.[a-z0-9-]+)+$'
  ),
  whatsapp text check (whatsapp ~ '^[1-9][0-9]{7,14}$'),
  direccion text check (char_length(direccion) <= 150),
  latitud double precision,
  longitud double precision,
  foto_ruta text check (char_length(foto_ruta) <= 90),
  acepta_publicar boolean not null default false,
  nota_revision text check (char_length(nota_revision) <= 500),
  actualizada timestamptz not null default now(),
  check (
    (latitud is null and longitud is null)
    or (latitud is not null and longitud is not null
        and latitud between -28.4 and -25.3 and longitud between -56.3 and -53.3)
  )
);

create table public.fichas_publicadas (
  id uuid primary key references public.fichas(id) on delete cascade,
  nombre text not null,
  categoria text not null,
  localidad text not null references midi_privado.localidades(id),
  servicios text not null,
  descripcion text not null,
  web text,
  correo_publico text,
  whatsapp text,
  direccion text,
  latitud double precision not null,
  longitud double precision not null,
  foto_ruta text,
  publicada timestamptz not null default now()
);

create index fichas_en_revision on public.fichas (actualizada) where estado = 'en_revision';
create index fichas_publicadas_por_nombre on public.fichas_publicadas (nombre, id);
create index fichas_foto_publicada on public.fichas_publicadas (foto_ruta) where foto_ruta is not null;

create table midi_privado.actividad (
  id bigint generated always as identity primary key,
  ficha uuid not null,
  actor uuid not null,
  evento text not null,
  fecha timestamptz not null default now()
);

create table midi_privado.cuotas_de_fotos (
  titular uuid primary key references auth.users(id) on delete cascade,
  ventana timestamptz not null,
  cantidad integer not null check (cantidad between 1 and 12)
);

revoke all on all tables in schema midi_privado from public, anon, authenticated;
revoke all on public.fichas, public.fichas_publicadas from public, anon, authenticated;
grant select on public.fichas to authenticated;
grant select on public.fichas_publicadas to anon, authenticated;

alter table public.fichas enable row level security;
alter table public.fichas_publicadas enable row level security;

create function midi_privado.es_administrador()
returns boolean language sql stable security definer set search_path = ''
as $fn$
  select exists (
    select 1 from midi_privado.administradores where usuario = auth.uid()
  );
$fn$;

create function midi_privado.puede_moderar()
returns boolean language sql stable security definer set search_path = ''
as $fn$
  select coalesce(auth.jwt() ->> 'aal' = 'aal2', false)
    and midi_privado.es_administrador();
$fn$;

revoke all on function midi_privado.es_administrador(), midi_privado.puede_moderar()
  from public, anon, authenticated;
grant execute on function midi_privado.puede_moderar() to authenticated;

create policy fichas_lectura_propia_o_moderacion on public.fichas
for select to authenticated
using (titular = (select auth.uid()) or (select midi_privado.puede_moderar()));

create policy mapa_lectura_publica on public.fichas_publicadas
for select to anon, authenticated using (true);

create function public.contexto_de_cuenta()
returns jsonb language sql stable security definer set search_path = ''
as $fn$
  select jsonb_build_object(
    'es_administrador', midi_privado.es_administrador(),
    'puede_moderar', midi_privado.puede_moderar()
  );
$fn$;

-- La función acepta solamente los campos editables. Titular, versión y estado
-- se toman de la sesión y de la fila que se bloquea dentro de esta transacción.
create function public.guardar_ficha(p_version integer, p_datos jsonb)
returns public.fichas language plpgsql security definer set search_path = ''
as $fn$
declare
  usuario uuid := auth.uid();
  ficha public.fichas;
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

  update public.fichas set
    nombre = coalesce(btrim(p_datos ->> 'nombre'), ''),
    categoria = nullif(btrim(p_datos ->> 'categoria'), ''),
    localidad = nullif(btrim(p_datos ->> 'localidad'), ''),
    servicios = coalesce(btrim(p_datos ->> 'servicios'), ''),
    descripcion = coalesce(btrim(p_datos ->> 'descripcion'), ''),
    web = nullif(btrim(p_datos ->> 'web'), ''),
    correo_publico = nullif(btrim(p_datos ->> 'correo_publico'), ''),
    whatsapp = nullif(btrim(p_datos ->> 'whatsapp'), ''),
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

create function midi_privado.validar_alta(ficha public.fichas)
returns void language plpgsql set search_path = ''
as $fn$
begin
  if char_length(ficha.nombre) < 2 or ficha.categoria is null or ficha.localidad is null
     or char_length(ficha.servicios) < 5 or char_length(ficha.descripcion) < 20 then
    raise exception 'Completá el nombre, rubro, localidad, servicios y una descripción de al menos 20 caracteres.';
  end if;
  if ficha.web is null and ficha.correo_publico is null and ficha.whatsapp is null then
    raise exception 'Agregá un medio de contacto público.';
  end if;
  if not ficha.acepta_publicar then
    raise exception 'Confirmá que querés publicar los datos indicados.';
  end if;
end;
$fn$;
revoke all on function midi_privado.validar_alta(public.fichas) from public, anon, authenticated;

create function public.enviar_a_revision(p_version integer)
returns public.fichas language plpgsql security definer set search_path = ''
as $fn$
declare
  ficha public.fichas;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Ingresá para enviar a revisión.';
  end if;
  select * into ficha from public.fichas where titular = auth.uid() for update;
  if not found or ficha.version is distinct from p_version
    or ficha.estado not in ('borrador', 'correcciones', 'pausada') then
    raise exception 'Volvé a abrir el borrador para enviarlo a revisión.';
  end if;
  perform midi_privado.validar_alta(ficha);
  update public.fichas set estado = 'en_revision', nota_revision = null,
    version = ficha.version + 1, actualizada = now()
  where id = ficha.id returning * into ficha;
  insert into midi_privado.actividad (ficha, actor, evento)
    values (ficha.id, auth.uid(), 'enviada');
  return ficha;
end;
$fn$;

create function public.retirar_de_revision(p_version integer)
returns public.fichas language plpgsql security definer set search_path = ''
as $fn$
declare
  ficha public.fichas;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Ingresá para retirar la ficha.';
  end if;
  update public.fichas set estado = 'borrador', version = version + 1, actualizada = now()
  where titular = auth.uid() and estado = 'en_revision' and version = p_version
  returning * into ficha;
  if not found then
    raise exception 'La revisión cambió. Volvé a abrir tu ficha.';
  end if;
  insert into midi_privado.actividad (ficha, actor, evento)
    values (ficha.id, auth.uid(), 'retirada');
  return ficha;
end;
$fn$;

create function public.resolver_revision(p_ficha uuid, p_version integer, p_aprobar boolean, p_nota text default null)
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
        direccion, latitud, longitud, foto_ruta)
    values
      (ficha.id, ficha.nombre, ficha.categoria, ficha.localidad, ficha.servicios, ficha.descripcion,
        ficha.web, ficha.correo_publico, ficha.whatsapp, ficha.direccion,
        coalesce(ficha.latitud, lugar.latitud), coalesce(ficha.longitud, lugar.longitud), ficha.foto_ruta)
    on conflict (id) do update set
      nombre = excluded.nombre, categoria = excluded.categoria, localidad = excluded.localidad,
      servicios = excluded.servicios, descripcion = excluded.descripcion, web = excluded.web,
      correo_publico = excluded.correo_publico, whatsapp = excluded.whatsapp,
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

create function public.pausar_ficha(p_ficha uuid, p_version integer)
returns public.fichas language plpgsql security definer set search_path = ''
as $fn$
declare
  ficha public.fichas;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Ingresá para pausar la ficha.';
  end if;
  select * into ficha from public.fichas where id = p_ficha
    and (titular = auth.uid() or midi_privado.puede_moderar())
    for update;
  if not found then
    raise exception using errcode = '42501', message = 'Tu cuenta no administra esta ficha.';
  end if;
  if ficha.version is distinct from p_version then
    raise exception 'La ficha cambió. Volvé a abrirla.';
  end if;

  delete from public.fichas_publicadas where id = ficha.id;
  update public.fichas set estado = 'pausada', version = ficha.version + 1, actualizada = now()
    where id = ficha.id returning * into ficha;
  insert into midi_privado.actividad (ficha, actor, evento)
    values (ficha.id, auth.uid(), 'pausada');
  return ficha;
end;
$fn$;

create function public.reservar_foto()
returns text language plpgsql security definer set search_path = ''
as $fn$
declare
  usuario uuid := auth.uid();
  ficha_id uuid;
  ventana_actual timestamptz := date_trunc('hour', now());
begin
  if usuario is null then
    raise exception using errcode = '42501', message = 'Ingresá para subir una foto.';
  end if;
  select id into ficha_id from public.fichas
    where titular = usuario and estado <> 'en_revision';
  if not found then
    raise exception 'Guardá un borrador editable antes de subir una foto.';
  end if;
  insert into midi_privado.cuotas_de_fotos (titular, ventana, cantidad)
    values (usuario, ventana_actual, 1)
  on conflict (titular) do update set
    cantidad = case when cuotas_de_fotos.ventana = ventana_actual
      then cuotas_de_fotos.cantidad + 1 else 1 end,
    ventana = ventana_actual
  where cuotas_de_fotos.ventana <> ventana_actual or cuotas_de_fotos.cantidad < 12;
  if not found then
    raise exception 'Alcanzaste el límite de fotos por hora. Probá más tarde.';
  end if;
  return ficha_id::text || '/' || gen_random_uuid()::text || '.jpg';
end;
$fn$;

revoke all on function public.contexto_de_cuenta(), public.guardar_ficha(integer, jsonb),
  public.enviar_a_revision(integer), public.retirar_de_revision(integer),
  public.resolver_revision(uuid, integer, boolean, text), public.pausar_ficha(uuid, integer),
  public.reservar_foto() from public, anon, authenticated;
grant execute on function public.contexto_de_cuenta(), public.guardar_ficha(integer, jsonb),
  public.enviar_a_revision(integer), public.retirar_de_revision(integer),
  public.resolver_revision(uuid, integer, boolean, text), public.pausar_ficha(uuid, integer),
  public.reservar_foto() to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-fichas', 'fotos-fichas', false, 1500000, array['image/jpeg']);

create function midi_privado.puede_leer_foto(ruta text)
returns boolean language sql stable security definer set search_path = ''
as $fn$
  select exists (select 1 from public.fichas_publicadas where foto_ruta = ruta)
    or exists (
      select 1 from public.fichas
      where titular = auth.uid() and ruta like id::text || '/%'
    )
    or midi_privado.puede_moderar();
$fn$;
revoke all on function midi_privado.puede_leer_foto(text) from public, anon, authenticated;
grant execute on function midi_privado.puede_leer_foto(text) to anon, authenticated;

-- La escritura de objetos se realiza desde la función subir-foto tras validar la sesión y el archivo.
create policy fotos_fichas_lectura_autorizada on storage.objects
for select to anon, authenticated
using (bucket_id = 'fotos-fichas' and midi_privado.puede_leer_foto(name));

commit;
