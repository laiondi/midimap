import 'react-native-url-polyfill/auto';
import {createClient} from '@supabase/supabase-js';
import {secureStorage} from './secure-storage';

const url=process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() || '';
const key=process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || '';
export const mapUrl=process.env.EXPO_PUBLIC_MAP_URL?.trim() || 'https://laiondi.github.io/midimap/';
export const configured=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url) && /^sb_publishable_[\w-]+$/.test(key);
export const supabase=configured ? createClient(url,key,{auth:{storage:secureStorage,storageKey:'midi.conecta.auth',persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}}) : null;
export function client() { if(!supabase) throw new Error('Completá la configuración de Supabase de la app antes de probarla.');return supabase; }
export async function rpc<T>(name:string,args?:Record<string,unknown>):Promise<T> {
  const result=await client().rpc(name,args);if(result.error)throw result.error;return result.data as T;
}
export type Profile={id:string;nombre:string;tipo_perfil:string;categoria:string;localidad:string;servicios:string;descripcion:string;foto_ruta:string|null;web:string|null;red_social:string|null;correo_publico:string|null;whatsapp:string|null;telefono:string|null;};
export type Community={ficha:Profile|null;puede_publicar:boolean;matching_activo:boolean};
export type Connection={id:string;ficha:Profile;creada:string};
export type Filters={categoria:string;localidad:string;tipo:string};
export const emptyFilters:Filters={categoria:'',localidad:'',tipo:''};
export function messageOf(error:unknown) {
  const e=error as {message?:string;code?:string};
  if(e?.code==='otp_expired')return 'El código venció o es incorrecto. Pedí uno nuevo.';
  if(e?.code==='over_email_send_rate_limit')return 'Esperá un momento antes de pedir otro código.';
  if(e?.code==='42501' || e?.code==='P0001' || error instanceof Error)return e.message || 'No se pudo completar la acción.';
  return 'No se pudo completar la acción. Revisá la conexión e intentá de nuevo.';
}
export function safeHttps(value:string|null|undefined) {
  try { if(!value || !/^https:\/\//i.test(value) || /[\s<>"'\\]/.test(value))return null;const u=new URL(value);return u.protocol==='https:' && !u.username && !u.password && u.hostname.includes('.') ? value:null;}catch{return null;}
}
