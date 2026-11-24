import * as SecureStore from 'expo-secure-store';

// Se fragmenta la sesión: algunos Keychain rechazan valores de más de 2 KB.
// La cabecera cambia solo después de guardar todos los fragmentos nuevos.
const CHUNK = 400;
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work, work); queue = result.catch(() => undefined); return result;
}
type Header = {generation: string; count: number};
async function header(key: string): Promise<Header | null> {
  const value = await SecureStore.getItemAsync(key + '.header');
  if (!value) return null;
  try { const h = JSON.parse(value); return typeof h.generation === 'string' && /^[a-z0-9]+$/.test(h.generation) && Number.isInteger(h.count) && h.count > 0 && h.count < 512 ? h : null; } catch { return null; }
}
async function cleanup(key: string, h: Header | null) {
  if (h) await Promise.all(Array.from({length:h.count}, (_,i) => SecureStore.deleteItemAsync(`${key}.${h.generation}.${i}`)));
}
export const secureStorage = {
  getItem: (key: string) => serial(async () => {
    const h = await header(key); if (!h) return null;
    const pieces = await Promise.all(Array.from({length:h.count}, (_,i) => SecureStore.getItemAsync(`${key}.${h.generation}.${i}`)));
    return pieces.some(piece => piece === null) ? null : pieces.join('');
  }),
  setItem: (key: string, value: string) => serial(async () => {
    const old = await header(key), generation = Date.now().toString(36) + Math.random().toString(36).slice(2,10);
    const h = {generation, count:Math.max(1,Math.ceil(value.length/CHUNK))};
    if(h.count>=512)throw Error("La sesión supera el tamaño admitido por el almacenamiento seguro.");
    try {
      for (let i=0;i<h.count;i++) await SecureStore.setItemAsync(`${key}.${generation}.${i}`, value.slice(i*CHUNK,(i+1)*CHUNK));
      await SecureStore.setItemAsync(key+'.header',JSON.stringify(h));
    } catch (error) { await cleanup(key,h).catch(()=>undefined); throw error; }
    await cleanup(key,old).catch(()=>undefined);
  }),
  removeItem: (key: string) => serial(async () => {
    const old=await header(key); await SecureStore.deleteItemAsync(key+'.header'); await cleanup(key,old);
  }),
};
