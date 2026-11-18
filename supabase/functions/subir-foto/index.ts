import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const maxBytes = 1_500_000;
const maxDimension = 1600;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, apikey, x-client-info, content-type, x-midi-imagen",
  "Cache-Control": "no-store",
};

function response(status: number, payload: Record<string, unknown>) {
  return Response.json(payload, { status, headers: cors });
}

function defaultKey(mapName: string, legacyName: string): string {
  const value = Deno.env.get(mapName);
  return (value ? JSON.parse(value).default : null) || Deno.env.get(legacyName) || "";
}

async function readLimited(request: Request): Promise<Uint8Array | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const parts: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

const sofMarkers = new Set([0xc0, 0xc1, 0xc2]);

function jpegValido(bytes: Uint8Array) {
  if (bytes.length < 32 || bytes[0] !== 0xff || bytes[1] !== 0xd8
    || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) return false;

  let dimensionsFound = false;
  let i = 2;
  while (i + 4 < bytes.length) {
    if (bytes[i++] !== 0xff) return false;
    while (bytes[i] === 0xff) i++;
    const marker = bytes[i++];
    const length = bytes[i] * 256 + bytes[i + 1];
    if (length < 2 || i + length > bytes.length - 2) return false;
    if (sofMarkers.has(marker)) {
      if (dimensionsFound || length < 8 || bytes[i + 2] !== 8) return false;
      const height = bytes[i + 3] * 256 + bytes[i + 4];
      const width = bytes[i + 5] * 256 + bytes[i + 6];
      if (!width || !height || width > maxDimension || height > maxDimension) return false;
      dimensionsFound = true;
    }
    if (marker === 0xda) return dimensionsFound;
    i += length;
  }
  return false;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST") return response(405, { error: "Método inválido." });
  const authorization = request.headers.get("Authorization") || "";
  const token = /^Bearer ([^\s]+)$/i.exec(authorization)?.[1];
  if (!token) return response(401, { error: "Ingresá para subir una foto." });
  const destino = request.headers.get("x-midi-imagen") || "ficha";
  if (destino !== "ficha" && destino !== "patrocinio") return response(400, { error: "Destino de imagen inválido." });
  const patrocinio = destino === "patrocinio";

  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const publishable = defaultKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY");
    const secret = defaultKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !publishable || !secret) return response(503, { error: "La subida de fotos requiere configuración." });

    const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
    const userClient = createClient(url, publishable, { auth, global: { headers: { Authorization: authorization } } });
    const { data: account, error: authError } = await userClient.auth.getUser(token);
    if (authError || !account.user) return response(401, { error: "Volvé a ingresar para subir la foto." });

    const declaredSize = Number(request.headers.get("Content-Length") || 0);
    if (declaredSize > maxBytes) return response(413, { error: "La foto supera el tamaño permitido." });
    if (request.headers.get("Content-Type")?.split(";")[0] !== "image/jpeg") {
      return response(415, { error: "Subí una imagen JPEG desde el formulario." });
    }
    const bytes = await readLimited(request);
    if (!bytes || !jpegValido(bytes)) return response(422, { error: "La foto no es un JPEG válido de hasta 1600 px." });

    const { data: path, error: reserveError } = await userClient.rpc(
      patrocinio ? "reservar_imagen_patrocinio" : "reservar_foto",
    );
    if (reserveError || !path) {
      if (patrocinio) {
        return response(reserveError?.code === "42501" ? 403 : 409, {
          error: reserveError?.code === "42501"
            ? "La publicidad requiere un administrador con segundo factor."
            : "No se pudo preparar la subida de publicidad.",
        });
      }
      const messages = [
        "Guardá un borrador editable antes de subir una foto.",
        "Alcanzaste el límite de fotos por hora. Probá más tarde.",
      ];
      const message = reserveError?.message;
      return response(409, { error: message && messages.includes(message) ? message : "La ficha no está disponible para subir fotos." });
    }

    const adminClient = createClient(url, secret, { auth });
    const bucket = patrocinio ? "fotos-patrocinios" : "fotos-fichas";
    const { error: uploadError } = await adminClient.storage.from(bucket).upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: false,
      cacheControl: "300",
    });
    if (uploadError) return response(502, { error: "No se pudo guardar la foto. Probá de nuevo." });
    return response(201, { path });
  } catch {
    return response(500, { error: "No se pudo completar la subida de la foto." });
  }
});
