"use strict";
const CACHE_PREFIX='midi-conecta-shell-';
const CACHE=CACHE_PREFIX+'2.5.0';
const ROOT=new URL('./',self.location.href);
const SHELL=['./','index.html','styles.css?v=2.5.0','app.mjs?v=2.5.0','core.mjs?v=2.5.0','labels.mjs?v=2.5.0','install.js?v=2.5.0','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/maskable-512.png','../assets/vendor/supabase/supabase.js?v=2.5.0','../assets/fonts/bricolage.woff2','../assets/fonts/instrument-sans.woff2'].map(p=>new URL(p,ROOT).href);
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));});
self.addEventListener('activate',event=>{event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith(CACHE_PREFIX)&&name!==CACHE)await caches.delete(name);await self.clients.claim();})());});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  // Sin interceptar Supabase, autenticación, fotos firmadas, contactos ni config.js.
  if(request.method!=='GET'||url.origin!==ROOT.origin)return;
  if(request.mode==='navigate'&&url.pathname.startsWith(ROOT.pathname)){
    event.respondWith(fetch(request).catch(async()=>{const cache=await caches.open(CACHE);return await cache.match(new URL('index.html',ROOT).href)||Response.error();}));return;
  }
  if(!SHELL.includes(url.href))return;
  event.respondWith((async()=>{const cache=await caches.open(CACHE),cached=await cache.match(request);if(cached)return cached;const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;})());
});
