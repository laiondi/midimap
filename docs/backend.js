"use strict";

const fichaFields = [
  "id", "titular", "version", "estado", "tipo_perfil", "nombre", "categoria", "localidad", "servicios", "descripcion",
  "web", "correo_publico", "whatsapp", "direccion", "latitud", "longitud", "foto_ruta", "cv_ruta", "galeria_rutas",
  "telefono", "red_social", "procesos", "materiales", "escala_produccion",
  "acepta_publicar", "nota_revision", "actualizada",
].join(",");
const publicFields = [
  "id", "tipo_perfil", "nombre", "categoria", "localidad", "servicios", "descripcion", "web",
  "correo_publico", "whatsapp", "direccion", "latitud", "longitud", "foto_ruta", "cv_ruta", "galeria_rutas",
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
    profileType: row.tipo_perfil || "profesional",
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
    cvPath: row.tipo_perfil === "profesional" ? row.cv_ruta || "" : "",
    galleryPaths: Array.isArray(row.galeria_rutas) ? row.galeria_rutas.slice(0, 4) : [],
  };
}

function backendSupabase() {
  const client = supabase.createClient(midiConfig.supabaseUrl.trim(), midiConfig.supabasePublishableKey.trim(), {
    auth: { storageKey: "midi.auth.v2", detectSessionInUrl: false },
  });
  const photos = client.storage.from("fotos-fichas");
  const sponsorPhotos = client.storage.from("fotos-patrocinios");
  const cvs = client.storage.from("cv-fichas");
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

  async function cvUrl(path) {
    return path ? dato(await cvs.createSignedUrl(path, 1200, { download: "curriculum.pdf" })).signedUrl : "";
  }
  async function profileMedia(row) {
    const paths = row.galleryPaths || row.galeria_rutas || [];
    const cv = (row.profileType || row.tipo_perfil) === "profesional" ? row.cvPath || row.cv_ruta : "";
    const [images, document] = await Promise.all([
      signedImages(photos, paths.slice(0, 4)),
      cvUrl(cv).catch(() => ""),
    ]);
    const galleryUrls = paths.map(path => images.get(path)).filter(Boolean);
    return {galleryUrls, cvUrl: document, incomplete: galleryUrls.length !== paths.length || Boolean(cv && !document)};
  }
  async function uploadCv(blob) {
    const {data, error} = await client.functions.invoke("subir-cv", {body: blob, headers: {"Content-Type": "application/pdf"}});
    if (error) {
      const payload = await error.context?.json?.().catch(() => null);
      throw Error(payload?.error || "No se pudo subir el CV. Revisá el despliegue de subir-cv.");
    }
    if (!data?.path) throw Error("No se pudo guardar el CV.");
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
    notifications: async () => (await Promise.all([
      allRows(() => client.rpc("notificaciones_de_gestion")),
      allRows(() => client.rpc("notificaciones_oportunidades")),
    ])).flat(),
    community: () => rpc("contexto_comunidad"),
    opportunities: (view = "board") => allRows(() => {
      const q = client.from("oportunidades").select("*").neq("estado", "eliminada").order("actualizada", {ascending: false}).order("id");
      if (view === "board") return q.eq("estado", "publicada").gte("fecha_cierre", new Date().toLocaleDateString("en-CA"));
      return q;
    }),
    saveOpportunity: (id, version, model) => mutate("guardar_oportunidad", {p_id: id, p_version: version, p_datos: model}),
    actOpportunity: (row, action, note = null) => mutate("accion_oportunidad", {p_id: row.id, p_version: row.version, p_accion: action, p_nota: note}),
    applyOpportunity: (id, message) => mutate("postular_oportunidad", {p_id: id, p_mensaje: message}),
    applications: () => allRows(() => client.from("postulaciones").select("*").order("actualizada", {ascending: false}).order("id")),
    actApplication: (row, status) => mutate("accion_postulacion", {p_id: row.id, p_version: row.version, p_estado: status}),
    markOpportunityRead: (id, version) => rpc("leer_oportunidad", {p_id: id, p_version: version}),
    appDownloads: async () => dato(await client.from("descargas_app").select("*").eq("id",true).single()),
    saveDownloads: (android, ios) => mutate("guardar_descargas_app", {p_android: android, p_ios: ios}),
    appReports: () => allRows(() => client.from("matching_reportes").select("*").eq("revisado",false).order("creada").order("id")),
    reviewReport: (id) => rpc("revisar_reporte", {p_id:id}),
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
    uploadCv,
    cvUrl,
    profileMedia,
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
    organizacion: { id: "organizacion-de-prueba", email: "Organización de prueba" },
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
      opportunities: data?.opportunities || {}, applications: data?.applications || {},
      downloads: data?.downloads || {android_url: "", ios_url: ""}, opportunityReads: data?.opportunityReads || {},
    };
  }
  function write(state) {
    try { localStorage.setItem(stateKey, JSON.stringify(state)); }
    catch (error) { if (error?.name === "QuotaExceededError") throw Error("El almacenamiento de la demo está lleno. Usá archivos más livianos para probar o conectá Supabase."); throw error; }
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
  function ensureDemoOrganization(role) {
    if (role !== "organizacion") return;
    const s=read(), id=accounts.organizacion.id;
    if (s.drafts[id]) return;
    const row={id,titular:id,tipo_perfil:"estudio",version:1,estado:"publicada",nombre:"Estudio MiDi de prueba",categoria:"industrial",localidad:"posadas",servicios:"Diseño y producción",descripcion:"Estudio de ejemplo para probar oportunidades y postulaciones.",correo_publico:"estudio@example.org",acepta_publicar:true,actualizada:new Date().toISOString()};
    s.drafts[id]=row; s.published[id]={...row}; write(s);
  }
  function demoCommunity() {
    const account=current(), s=read();
    const ficha=account && session!=="admin" ? Object.values(s.published).find(r=>r.titular===account.id) : null;
    return {ficha:ficha || null,puede_publicar:!!ficha && ["empresa","estudio","taller","espacio"].includes(ficha.tipo_perfil),matching_activo:false};
  }
  function requireCommunity(publishing=false) {
    const c=demoCommunity();
    if (!c.ficha || (publishing && !c.puede_publicar)) throw Error(publishing ? "Necesitás una ficha aprobada de organización para publicar." : "Necesitás una ficha aprobada para ver las oportunidades.");
    return c;
  }
  function demoOpportunityNotifications() {
    const s=read(), viewed=s.opportunityReads[current()?.id] || {};
    return Object.values(s.opportunities).filter(r=>r.estado==="en_revision").map(r=>({ficha:r.id,version:r.version,nombre:r.titulo,actualizada:r.actualizada,tipo:"oportunidad",leida:(viewed[r.id] || 0)>=r.version}));
  }
  function demoCommunityApi() { return {
    community:async()=>demoCommunity(),
    opportunities:async(view="board")=>{
      if(session!=="admin") requireCommunity();
      return Object.values(read().opportunities).filter(r=>r.estado!=="eliminada" && (session==="admin" || r.titular===current().id || (r.estado==="publicada" && r.fecha_cierre>=new Date().toLocaleDateString("en-CA"))))
        .filter(r=>view!=="board" || (r.estado==="publicada" && r.fecha_cierre>=new Date().toLocaleDateString("en-CA"))).sort((a,b)=>b.actualizada.localeCompare(a.actualizada));
    },
    saveOpportunity:async(id,version,model)=>{
      const c=requireCommunity(true),s=read(),old=s.opportunities[id];
      if(id && (!old || old.titular!==current().id || old.version!==version || ["en_revision","eliminada"].includes(old.estado))) throw Error("La oportunidad cambió o está en revisión.");
      if(model.titulo.trim().length<4 || model.descripcion.trim().length<30 || !model.fecha_cierre || model.fecha_cierre<new Date().toLocaleDateString("en-CA")) throw Error("Completá título, descripción y fecha de cierre.");
      const row={...model,id:id || crypto.randomUUID(),version:(old?.version || 0)+1,titular:current().id,organizacion:c.ficha.id,estado:"borrador",nota_revision:null,actualizada:new Date().toISOString()};
      s.opportunities[row.id]=row;write(s);return row;
    },
    actOpportunity:async(expected,action,note)=>{
      const s=read(),row=s.opportunities[expected.id];
      if(!row || row.version!==expected.version || row.estado==="eliminada") throw Error("La oportunidad cambió. Actualizá la lista.");
      const owner=row.titular===current()?.id && demoCommunity().puede_publicar,admin=session==="admin";
      if(!owner && !admin) throw Error("Esta cuenta no puede gestionar la oportunidad.");
      let state;
      if(action==="enviar" && owner && ["borrador","correcciones","cerrada"].includes(row.estado)) state="en_revision";
      else if(action==="retirar" && owner && row.estado==="en_revision") state="borrador";
      else if(action==="aprobar" && admin && row.estado==="en_revision") state="publicada";
      else if(action==="correcciones" && admin && row.estado==="en_revision" && note?.trim().length>=3) state="correcciones";
      else if(action==="cerrar") state="cerrada";
      else if(action==="eliminar") state="eliminada";
      else throw Error("La acción no está disponible para esta versión.");
      if(["publicada","en_revision"].includes(state) && row.fecha_cierre<new Date().toLocaleDateString("en-CA")) throw Error("Actualizá la fecha de cierre.");
      Object.assign(row,{estado:state,nota_revision:state==="correcciones"?note:null,version:row.version+1,actualizada:new Date().toISOString()});write(s);return row;
    },
    applications:async()=>{
      if(session!=="admin") requireCommunity();const s=read();
      return Object.values(s.applications).filter(r=>session==="admin" || r.titular===current().id || s.opportunities[r.oportunidad]?.titular===current().id);
    },
    applyOpportunity:async(id,message)=>{
      const c=requireCommunity(),s=read(),o=s.opportunities[id];
      if(!o || o.estado!=="publicada" || o.fecha_cierre<new Date().toLocaleDateString("en-CA") || o.titular===current().id) throw Error("No podés postularte a esta oportunidad.");
      const key=id+":"+c.ficha.id, old=s.applications[key];
      if(old && old.estado!=="retirada") throw Error("Ya te postulaste a esta oportunidad.");
      const row={id:old?.id || crypto.randomUUID(),oportunidad:id,ficha:c.ficha.id,titular:current().id,mensaje:message,estado:"enviada",version:(old?.version || 0)+1,actualizada:new Date().toISOString()};
      s.applications[key]=row;write(s);return row;
    },
    actApplication:async(expected,status)=>{
      const s=read(),r=Object.values(s.applications).find(v=>v.id===expected.id);
      if(!r || r.version!==expected.version) throw Error("La postulación cambió.");
      if(!(status==="retirada" && r.titular===current()?.id) && !(["seleccionada","descartada"].includes(status) && r.estado!=="retirada" && s.opportunities[r.oportunidad]?.titular===current()?.id)) throw Error("No podés cambiar esta postulación.");
      Object.assign(r,{estado:status,version:r.version+1,actualizada:new Date().toISOString()});write(s);return r;
    },
    markOpportunityRead:async(id,version)=>{
      moderation();const s=read(),r=s.opportunities[id];if(!r || r.version!==version || r.estado!=="en_revision")return false;
      s.opportunityReads[current().id] ||= {};s.opportunityReads[current().id][id]=version;write(s);return true;
    },
    appDownloads:async()=>read().downloads,
    saveDownloads:async(android,ios)=>{moderation();const s=read();s.downloads={android_url:android,ios_url:ios};write(s);return s.downloads;},
    appReports:async()=>{moderation();return [];},reviewReport:async()=>{moderation();},
  }; }

  function sortedSponsors(state) {
    return Object.values(state.sponsors).sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id));
  }

  return {
    ...demoCommunityApi(),
    mode: "demo",
    watch: () => {},
    user: async () => current(),
    loginDemo: async (role) => {
      if (!Object.hasOwn(accounts, role)) throw Error("Elegí una cuenta de prueba.");
      localStorage.setItem(sessionKey, role);
      session = role;
      ensureDemoOrganization(role);
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
    notifications: async () => { moderation(); return [...notificationRows(read()), ...demoOpportunityNotifications()]; },
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
      const profileType = model.tipo_perfil || before?.tipo_perfil || "profesional";
      if (model.cv_ruta && profileType !== "profesional") throw Error("El CV está disponible solo para profesionales independientes.");
      const gallery = model.galeria_rutas ?? before?.galeria_rutas ?? [];
      if (!Array.isArray(gallery) || gallery.length > 4 || new Set(gallery).size !== gallery.length) throw Error("La galería admite hasta 4 imágenes diferentes.");
      const row = {
        ...model, tipo_perfil: profileType, cv_ruta: profileType === "profesional" ? (Object.hasOwn(model, "cv_ruta") ? model.cv_ruta : before?.cv_ruta ?? null) : null,
        galeria_rutas: [...gallery], id: before?.id || crypto.randomUUID(),
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
        if (approved) storage.published[row.id] = structuredClone(row);
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
    profileMedia: async (row) => ({galleryUrls: row.galleryPaths || row.galeria_rutas || [], cvUrl: (row.profileType || row.tipo_perfil) === "profesional" ? row.cvPath || row.cv_ruta || "" : "", incomplete: false}),
    cvUrl: async (path) => path || "",
    uploadCv: async (blob) => new Promise((resolve, reject) => {
      const owner = requireOwner();
      const draft = read().drafts[owner.id];
      if (!draft || draft.tipo_perfil !== "profesional" || draft.estado === "en_revision") return reject(Error("Guardá un borrador de profesional independiente antes de subir tu CV."));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(Error("No se pudo leer el CV."));
      reader.readAsDataURL(blob);
    }),
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
