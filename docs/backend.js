"use strict";

const fichaFields = [
  "id", "titular", "version", "estado", "nombre", "categoria", "localidad", "servicios", "descripcion",
  "web", "correo_publico", "whatsapp", "direccion", "latitud", "longitud", "foto_ruta",
  "telefono", "red_social", "procesos", "materiales", "escala_produccion",
  "acepta_publicar", "nota_revision", "actualizada",
].join(",");
const publicFields = [
  "id", "nombre", "categoria", "localidad", "servicios", "descripcion", "web",
  "correo_publico", "whatsapp", "direccion", "latitud", "longitud", "foto_ruta",
  "telefono", "red_social", "procesos", "materiales", "escala_produccion",
].join(",");
const sponsorFields = "id,version,titulo,texto,enlace,imagen_ruta,orden,activo";

function modoDelMapa() {
  const url = midiConfig.supabaseUrl.trim();
  const key = midiConfig.supabasePublishableKey.trim();
  if (!url && !key) return "demo";
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && parsed.hostname.endsWith(".supabase.co")
      && parsed.href === parsed.origin + "/" && /^sb_publishable_[\w-]+$/.test(key)) return "conectado";
  } catch {
    return "incompleto";
  }
  return "incompleto";
}

function dato(result) {
  if (result.error) throw result.error;
  return result.data;
}

function fichaIndividual(data) {
  return Array.isArray(data) ? data[0] : data;
}

function enlazarFicha(row, photoUrl = "", rating = null) {
  if (!Object.hasOwn(towns, row.localidad) || !Object.hasOwn(categories, row.categoria)) return null;
  const point = [row.latitud, row.longitud];
  return {
    id: row.id,
    name: row.nombre,
    town: row.localidad,
    category: row.categoria,
    services: row.servicios,
    description: row.descripcion,
    address: row.direccion,
    point: point.every(Number.isFinite) ? point : null,
    url: row.web,
    social: row.red_social,
    email: row.correo_publico,
    whatsapp: row.whatsapp,
    phone: row.telefono,
    processes: row.procesos,
    materials: row.materiales,
    scale: row.escala_produccion,
    canRate: true,
    rating: rating ? Number(rating.promedio) : 0,
    ratingCount: rating?.cantidad || 0,
    tags: [],
    photoUrl,
  };
}

function backendSupabase() {
  const client = supabase.createClient(midiConfig.supabaseUrl.trim(), midiConfig.supabasePublishableKey.trim(), {
    auth: { storageKey: "midi.auth.v2", detectSessionInUrl: false },
  });
  const photos = client.storage.from("fotos-fichas");
  const sponsorPhotos = client.storage.from("fotos-patrocinios");
  const rpc = async (name, args) => dato(await client.rpc(name, args));
  const mutate = async (name, args) => fichaIndividual(await rpc(name, args));
  const getUser = async () => dato(await client.auth.getSession())?.session?.user ?? null;

  async function allRows(query) {
    const entries = [];
    for (let start = 0; ; start += 200) {
      const page = dato(await query().range(start, start + 199));
      entries.push(...page);
      if (page.length < 200) return entries;
    }
  }

  async function signedImages(bucket, paths) {
    const images = new Map();
    for (let i = 0; i < paths.length; i += 100) {
      const { data: signedUrls } = await bucket.createSignedUrls(paths.slice(i, i + 100), 1200);
      for (const { path, signedUrl } of signedUrls || []) {
        if (signedUrl) images.set(path, signedUrl);
      }
    }
    return images;
  }

  async function getRatings(rows) {
    const summaries = new Map();
    for (let i = 0; i < rows.length; i += 200) {
      const ratings = await rpc("calificaciones_visibles", { p_fichas: rows.slice(i, i + 200).map((row) => row.id) });
      for (const rating of ratings) summaries.set(rating.ficha, rating);
    }
    return summaries;
  }

  async function listaPublica() {
    const data = await allRows(() => client.from("fichas_publicadas").select(publicFields).order("nombre").order("id"));
    const [images, ratings] = await Promise.all([
      signedImages(photos, data.map((row) => row.foto_ruta).filter(Boolean)),
      getRatings(data),
    ]);
    return data.map((row) => enlazarFicha(row, images.get(row.foto_ruta), ratings.get(row.id))).filter(Boolean);
  }

  async function listSponsors(publicOnly) {
    const rows = await allRows(() => {
      const query = client.from("patrocinios").select(sponsorFields).order("orden").order("id");
      return publicOnly ? query.eq("activo", true) : query;
    });
    if (!publicOnly) return rows;
    const images = await signedImages(sponsorPhotos, [...new Set(rows.map((row) => row.imagen_ruta).filter(Boolean))]);
    return rows.map((row) => ({ ...row, imageUrl: images.get(row.imagen_ruta) }));
  }

  async function upload(blob, target = "ficha") {
    const { data, error } = await client.functions.invoke("subir-foto", {
      body: blob, headers: { "Content-Type": blob.type, "x-midi-imagen": target },
    });
    if (error) {
      const payload = await error.context?.json?.().catch(() => null);
      throw Error(payload?.error || "No se pudo subir la imagen. Revisá la conexión y el despliegue de subir-foto.");
    }
    if (!data?.path) throw Error("La imagen no se pudo guardar.");
    return data.path;
  }

  return {
    mode: "conectado",
    watch: (callback) => client.auth.onAuthStateChange(() => setTimeout(callback, 0)),
    user: getUser,
    logout: async () => dato(await client.auth.signOut({ scope: "local" })),
    context: () => rpc("contexto_de_cuenta"),
    manifesto: async () => dato(await client.from("manifiesto").select("id,version,titulo,bajada,contenido,cierre,actualizado").eq("id", true).single()),
    saveManifesto: (version, model) => mutate("guardar_manifiesto", { p_version: version, p_datos: model }),
    notifications: () => allRows(() => client.rpc("notificaciones_de_gestion")),
    markRequestRead: (id, version) => rpc("marcar_solicitud_leida", { p_ficha: id, p_version: version }),
    sendCode: async (email) => dato(await client.auth.signInWithOtp({ email })),
    checkCode: async (email, token) => dato(await client.auth.verifyOtp({ email, token, type: "email" })),
    publicList: listaPublica,
    ownerDraft: async (userId) => dato(await client.from("fichas").select(fichaFields).eq("titular", userId).maybeSingle()),
    publicVisible: async (id) => Boolean(dato(await client.from("fichas_publicadas").select("id").eq("id", id).maybeSingle())),
    save: (version, model) => mutate("guardar_ficha", { p_version: version, p_datos: model }),
    submit: (draft) => mutate("enviar_a_revision", { p_version: draft.version }),
    withdraw: (draft) => mutate("retirar_de_revision", { p_version: draft.version }),
    pause: (draft) => mutate("pausar_ficha", { p_ficha: draft.id, p_version: draft.version }),
    resolve: (draft, approved, note) => mutate("resolver_revision", {
      p_ficha: draft.id, p_version: draft.version, p_aprobar: approved, p_nota: note || null,
    }),
    remove: (draft) => rpc("eliminar_ficha", { p_ficha: draft.id, p_version: draft.version }),
    rate: (id, score, hired) => rpc("calificar_ficha", { p_ficha: id, p_puntaje: score, p_contrato: hired }),
    queue: (status) => allRows(() => {
      const query = client.from("fichas").select(fichaFields).order("actualizada", { ascending: false }).order("id");
      return status ? query.eq("estado", status) : query;
    }),
    photoUrl: async (path) => path ? dato(await photos.createSignedUrl(path, 1200)).signedUrl : "",
    upload,
    publicSponsors: () => listSponsors(true),
    sponsors: () => listSponsors(false),
    saveSponsor: (id, version, model) => mutate("guardar_patrocinio", { p_id: id, p_version: version, p_datos: model }),
    removeSponsor: (row) => rpc("eliminar_patrocinio", { p_id: row.id, p_version: row.version }),
    sponsorPhoto: async (path) => path ? dato(await sponsorPhotos.createSignedUrl(path, 1200)).signedUrl : "",
    mfaFactors: async () => dato(await client.auth.mfa.listFactors()),
    mfaStart: async (factors) => {
      const label = "Mapa creativo · Administración";
      for (const factor of factors.all) {
        if (factor.factor_type === "totp" && factor.status === "unverified" && factor.friendly_name === label) {
          dato(await client.auth.mfa.unenroll({ factorId: factor.id }));
        }
      }
      return dato(await client.auth.mfa.enroll({ factorType: "totp", friendlyName: label }));
    },
    mfaVerify: async (factorId, code) => dato(await client.auth.mfa.challengeAndVerify({ factorId, code })),
  };
}

function backendDemo() {
  const stateKey = "midi.demo.fichas.2";
  const sessionKey = "midi.demo.sesion.2";
  const accounts = {
    titular: { id: "titular-de-prueba", email: "Titular de prueba" },
    admin: { id: "administracion-de-prueba", email: "Administrador de prueba" },
    cliente: { id: "cliente-de-prueba", email: "cliente@ejemplo.test" },
  };
  const sampleAds = [
    {
      id: "53d13b20-8294-4924-8a0e-19dfce6c0001", version: 1, titulo: "Tinta Norte",
      texto: "Impresión y terminaciones para proyectos gráficos.", imagen_ruta: "assets/photos/graphic.webp", orden: 10, activo: true,
    },
    {
      id: "53d13b20-8294-4924-8a0e-19dfce6c0002", version: 1, titulo: "Toma Abierta",
      texto: "Cámaras, lentes e iluminación para tu próxima producción.", imagen_ruta: "assets/photos/gear.webp", orden: 20, activo: true,
    },
  ];
  const sampleDrafts = Object.fromEntries(initialProfiles.map((profile) => {
    const titular = "ejemplo:" + profile.id;
    return [titular, {
      id: profile.id, titular, version: 1, estado: "publicada", es_ejemplo: true,
      nombre: profile.name, categoria: profile.category, localidad: profile.town,
      servicios: profile.services, descripcion: profile.description, web: profile.url || "",
      red_social: profile.social || "", telefono: profile.phone || "", whatsapp: profile.whatsapp || "",
      correo_publico: profile.email || "", direccion: profile.address || "",
      procesos: profile.processes || "", materiales: profile.materials || "", escala_produccion: profile.scale || "",
      foto_ruta: profile.image === "midi" ? "assets/midi-marca.webp" : profile.image ? "assets/photos/" + profile.image + ".webp" : "",
      latitud: profile.point?.[0] ?? null, longitud: profile.point?.[1] ?? null,
      actualizada: "2026-11-18T00:00:00.000Z",
    }];
  }));

  function read() {
    let data;
    try {
      data = JSON.parse(localStorage.getItem(stateKey));
    } catch {
      data = null;
    }
    return {
      drafts: data?.drafts || {}, published: data?.published || {},
      examples: data?.examples || structuredClone(sampleDrafts), ratings: data?.ratings || [],
      sponsors: data?.sponsors || Object.fromEntries(sampleAds.map((row) => [row.id, { ...row }])),
      manifesto: data?.manifesto || structuredClone(initialManifesto),
      notificationReads: data?.notificationReads || {},
    };
  }
  function write(state) {
    localStorage.setItem(stateKey, JSON.stringify(state));
  }
  let session = localStorage.getItem(sessionKey);
  function current() {
    return accounts[session] || null;
  }
  function requireUser() {
    if (!current()) throw Error("Ingresá para administrar una ficha.");
    return current();
  }
  function moderation() {
    if (session !== "admin") throw Error("Ingresá como administrador.");
  }
  function requireOwner() {
    const user = requireUser();
    if (session === "admin") throw Error("La cuenta administradora se usa para Gestión. Usá una cuenta titular para publicar una ficha.");
    return user;
  }
  function notificationRows(storage) {
    const viewed = storage.notificationReads[current().id] || {};
    return [...Object.values(storage.drafts), ...Object.values(storage.examples)]
      .filter((row) => row.estado === "en_revision")
      .sort((a, b) => b.actualizada.localeCompare(a.actualizada) || a.id.localeCompare(b.id))
      .map((row) => ({ ficha: row.id, version: row.version, nombre: row.nombre, actualizada: row.actualizada,
        tipo: storage.published[row.id] ? "modificacion" : "alta", leida: (viewed[row.id] || 0) >= row.version }));
  }
  function currentVersion(row, expected) {
    if (!row || row.version !== expected) throw Error("La ficha cambió. Volvé a abrirla.");
  }
  function transition(expected, apply, titular = requireUser().id) {
    const storage = read();
    const row = storage.drafts[titular] || storage.examples[titular];
    currentVersion(row?.id === expected.id ? row : null, expected.version);
    apply(row, storage);
    row.version += 1;
    row.actualizada = new Date().toISOString();
    write(storage);
    return row;
  }
  function summaries(state, row) {
    const scores = state.ratings.filter((rating) => rating.id === row.id);
    return scores.length ? {
      promedio: Math.round(10 * scores.reduce((total, rating) => total + rating.score, 0) / scores.length) / 10,
      cantidad: scores.length,
    } : null;
  }
  function sortedSponsors(state) {
    return Object.values(state.sponsors).sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id));
  }

  return {
    mode: "demo",
    watch: () => {},
    user: async () => current(),
    loginDemo: async (role) => {
      if (!Object.hasOwn(accounts, role)) throw Error("Elegí una cuenta de prueba.");
      localStorage.setItem(sessionKey, role);
      session = role;
    },
    logout: async () => {
      session = null;
      localStorage.removeItem(sessionKey);
    },
    context: async () => ({ es_administrador: session === "admin", puede_moderar: session === "admin" }),
    manifesto: async () => read().manifesto,
    saveManifesto: async (version, model) => {
      moderation();
      const storage = read();
      if (storage.manifesto.version !== version) throw Error("El manifiesto cambió. Recargalo antes de volver a guardar.");
      const row = { ...model, id: true, version: version + 1, actualizado: new Date().toISOString() };
      storage.manifesto = row;
      write(storage);
      return row;
    },
    notifications: async () => { moderation(); return notificationRows(read()); },
    markRequestRead: async (id, version) => {
      moderation();
      const storage = read();
      if (!notificationRows(storage).some((row) => row.ficha === id && row.version === version)) return false;
      const viewed = storage.notificationReads[current().id] || {};
      viewed[id] = Math.max(viewed[id] || 0, version);
      storage.notificationReads[current().id] = viewed;
      write(storage);
      return true;
    },
    publicList: async () => {
      const storage = read();
      const examples = initialProfiles.filter((profile) => storage.examples["ejemplo:" + profile.id]?.estado === "publicada")
        .map((profile) => {
          const rating = summaries(storage, profile);
          return { ...profile, canRate: true, rating: rating ? Number(rating.promedio) : 0, ratingCount: rating?.cantidad || 0 };
        });
      return [...examples, ...Object.values(storage.published)
        .map((row) => enlazarFicha(row, row.foto_ruta, summaries(storage, row))).filter(Boolean)];
    },
    ownerDraft: async (id) => requireOwner().id === id ? read().drafts[id] || null : null,
    publicVisible: async (id) => {
      const storage = read();
      return Boolean(storage.published[id] || storage.examples["ejemplo:" + id]?.estado === "publicada");
    },
    save: async (version, model) => {
      const { id: titular } = requireOwner();
      const storage = read();
      const before = storage.drafts[titular];
      if ((before?.version ?? 0) !== version) throw Error("La ficha cambió. Volvé a abrirla.");
      if (before?.estado === "en_revision") throw Error("Retirá la ficha de revisión para editarla.");
      const row = {
        ...model, id: before?.id || crypto.randomUUID(),
        titular, version: version + 1, estado: before?.estado === "correcciones" ? "correcciones" : "borrador",
        nota_revision: before?.nota_revision || null, actualizada: new Date().toISOString(),
      };
      storage.drafts[titular] = row;
      write(storage);
      return row;
    },
    submit: async (draft) => { requireOwner(); return transition(draft, (row) => { row.estado = "en_revision"; row.nota_revision = null; }); },
    withdraw: async (draft) => transition(draft, (row) => { row.estado = "borrador"; }),
    pause: async (draft) => transition(draft, (row, storage) => {
      row.estado = "pausada";
      delete storage.published[row.id];
    }, session === "admin" ? draft.titular : requireUser().id),
    remove: async (draft) => {
      const titular = session === "admin" ? draft.titular : requireUser().id;
      const storage = read();
      const row = storage.drafts[titular] || storage.examples[titular];
      currentVersion(row?.id === draft.id ? row : null, draft.version);
      delete storage.drafts[titular];
      delete storage.examples[titular];
      delete storage.published[row.id];
      storage.ratings = storage.ratings.filter((rating) => rating.id !== row.id);
      write(storage);
    },
    queue: async (status) => {
      moderation();
      const storage = read();
      return [...Object.values(storage.drafts), ...Object.values(storage.examples)]
        .filter((row) => !status || row.estado === status)
        .sort((a, b) => b.actualizada.localeCompare(a.actualizada) || a.id.localeCompare(b.id));
    },
    resolve: async (draft, approved, note) => {
      moderation();
      return transition(draft, (row, storage) => {
        if (row.estado !== "en_revision") throw Error("La ficha ya cambió. Actualizá la lista.");
        row.estado = approved ? "publicada" : "correcciones";
        row.nota_revision = approved ? null : note;
        if (approved) storage.published[row.id] = { ...row };
      }, draft.titular);
    },
    rate: async (id, score, hired) => {
      const account = requireUser();
      const storage = read();
      const example = storage.examples["ejemplo:" + id];
      const published = storage.published[id] || (example?.estado === "publicada" ? example : null);
      if (!published) throw Error("Esta ficha no está publicada.");
      if (published.titular === account.id) throw Error("El titular no puede calificar su propia ficha.");
      if (hired !== true) throw Error("Confirmá que contrataste este servicio.");
      if (!Number.isInteger(score) || score < 1 || score > 5) throw Error("Elegí entre 1 y 5 estrellas.");
      if (storage.ratings.some((entry) => entry.id === id && entry.client === account.id)) {
        throw Error("Ya calificaste esta ficha.");
      }
      storage.ratings.push({ id, client: account.id, score, hired: true });
      write(storage);
    },
    publicSponsors: async () => sortedSponsors(read()).filter((row) => row.activo)
      .map((row) => ({ ...row, imageUrl: row.imagen_ruta })),
    sponsors: async () => {
      moderation();
      return sortedSponsors(read());
    },
    saveSponsor: async (id, version, model) => {
      moderation();
      const storage = read();
      const previous = storage.sponsors[id];
      if ((previous?.version ?? 0) !== version) throw Error("El anuncio cambió. Volvé a abrirlo.");
      const row = { ...model, id, version: version + 1 };
      storage.sponsors[id] = row;
      write(storage);
      return row;
    },
    removeSponsor: async (row) => {
      moderation();
      const storage = read();
      if (storage.sponsors[row.id]?.version !== row.version) throw Error("El anuncio cambió. Volvé a abrirlo.");
      delete storage.sponsors[row.id];
      write(storage);
    },
    sponsorPhoto: async (path) => {
      moderation();
      return path || "";
    },
    photoUrl: async (path) => path || "",
    upload: async (blob, target) => new Promise((resolve, reject) => {
      if (target === "patrocinio") moderation();
      else requireOwner();
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(Error("No se pudo leer la foto."));
      reader.readAsDataURL(blob);
    }),
  };
}
