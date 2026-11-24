"use strict";
(() => {
  let pending = null;
  const button=document.getElementById('install'),dialog=document.getElementById('install-dialog'),steps=document.getElementById('install-steps');
  const installed=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  const sync=()=>{button.hidden=installed();};
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pending=event;sync();});
  window.addEventListener('appinstalled',()=>{pending=null;sync();if(dialog.open)dialog.close();});
  button.addEventListener('click',async()=>{
    if(pending){const event=pending;pending=null;try{await event.prompt();await event.userChoice;}catch{/* El menú del navegador sigue disponible. */}sync();return;}
    const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    steps.innerHTML=ios?'<p>En tu iPhone o iPad:</p><ol><li>Abrí Conecta en <strong>Safari</strong>.</li><li>Tocá <strong>Compartir</strong>.</li><li>Elegí <strong>Agregar a pantalla de inicio</strong> y confirmá con <strong>Agregar</strong>.</li></ol>':'<p>En tu teléfono Android:</p><ol><li>Abrí Conecta en <strong>Chrome</strong>.</li><li>Abrí el menú de los <strong>tres puntos</strong>.</li><li>Elegí <strong>Instalar aplicación</strong> o <strong>Agregar a pantalla de inicio</strong> y confirmá.</li></ol><p class="small muted">El nombre de la opción puede variar según el navegador. En una computadora, buscá la opción de instalar en el menú del navegador.</p>';
    dialog.showModal();
  });
  window.matchMedia('(display-mode: standalone)').addEventListener?.('change',sync);
  sync();
  if('serviceWorker' in navigator&&window.isSecureContext)window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>{/* Conecta también funciona sin almacenamiento sin conexión. */});});
})();
