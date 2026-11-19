# Mapa creativo de Misiones v2.3

Directorio público de diseño, producción, alquiler de equipos y espacios creativos. Usá una cuenta para administrar tu ficha, calificar un servicio contratado o gestionar el directorio. MiDi figura como gestor propuesto.

## Probar la demostración

Desde esta carpeta, ejecutá este comando.

~~~bash
python -m http.server 8000 --directory docs
~~~

Abrí http://localhost:8000. La demostración usa fichas y anuncios de ejemplo y guarda los cambios en el navegador.

1. **Titular.** Entrá por **Sumá tu perfil → Probar como titular**. Completá la ficha, guardá un borrador si vas a subir una foto y enviá a revisión.
2. **Gestión.** Cerrá sesión e ingresá como administrador. La pestaña **Gestión** queda visible en el encabezado durante la sesión, también al volver al mapa o recargar la página. En **Fichas** aparecen todas las tarjetas, incluidas las de ejemplo, y un botón **Eliminar** en cada fila. En **Solicitudes** podés aprobar altas o pedir cambios. En **Publicidad** podés crear y editar anuncios, subir una imagen, cambiar el orden, activarlos o eliminarlos. Usá **Volver al mapa** para retomar la exploración.
3. **Cliente.** Abrí cualquier ficha, tocá **Calificar un servicio**, elegí las estrellas y confirmá que contrataste el servicio. Si todavía no iniciaste sesión, ingresá como cliente de prueba y publicá la calificación. La ficha muestra el promedio y el total. Cada cuenta puede puntuar una vez a cada emprendimiento y el titular queda excluido de calificar su propia ficha.

## Actualizar desde una versión anterior

Actualizá la carpeta `docs/` del repositorio y conservá tus valores de `docs/config.js` si ya configuraste Supabase. Desde **v2.2**, esta actualización no requiere cambios en la base de datos.

- Desde **v2.1 con Supabase**, ejecutá [20261119090000_gestion_y_calificaciones.sql](supabase/migrations/20261119090000_gestion_y_calificaciones.sql). Conserva las fichas y las calificaciones existentes.
- Desde **v2.0 con Supabase**, ejecutá primero [20261118104500_perfiles_resenas_patrocinios.sql](supabase/migrations/20261118104500_perfiles_resenas_patrocinios.sql), después la migración de v2.2 y volvé a desplegar `subir-foto`.
- Si estás usando la **demo**, subí `docs/` al repositorio. Los datos locales se conservan en el navegador.

## Activar el backend de Supabase

1. **Creá un proyecto de Supabase para el mapa.** En **SQL Editor**, ejecutá primero [20261118090000_mapa_creativo.sql](supabase/migrations/20261118090000_mapa_creativo.sql) después [20261118104500_perfiles_resenas_patrocinios.sql](supabase/migrations/20261118104500_perfiles_resenas_patrocinios.sql) y finalmente [20261119090000_gestion_y_calificaciones.sql](supabase/migrations/20261119090000_gestion_y_calificaciones.sql). El directorio conectado suma fichas a medida que se aprueban y anuncios a medida que se activan.
2. **Configurá el ingreso por código.** En Authentication, activá el proveedor Email y configurá un SMTP para el envío a cuentas del público. En la plantilla **Magic Link** usá un código de un solo uso como el ejemplo de abajo. Si el alta inicial usa **Confirm signup**, usá el mismo contenido en esa plantilla. En **URL Configuration**, poné como Site URL la dirección definitiva de GitHub Pages. [Ingreso por código](https://supabase.com/docs/guides/auth/auth-email-passwordless#with-otp) · [Correo SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

   ~~~html
   <p>Tu código para ingresar al Mapa creativo de Misiones es <strong>{{ .Token }}</strong>.</p>
   ~~~

3. **Publicá la función de imágenes.** Desde la carpeta del proyecto, con Node.js 20 o posterior, ejecutá los comandos de abajo. La referencia es la parte anterior a `.supabase.co` en la URL del proyecto. La misma función recibe fotos de fichas e imágenes de anuncios. [Inicio rápido de Edge Functions](https://supabase.com/docs/guides/functions/quickstart).

   ~~~bash
   npx supabase login
   npx supabase functions deploy subir-foto --project-ref REFERENCIA_DEL_PROYECTO
   ~~~

4. **Conectá el frontend.** Editá [docs/config.js](docs/config.js) con la URL `https://TU-REFERENCIA.supabase.co` y la clave publicable `sb_publishable_…` del mismo proyecto. Las credenciales de administración quedan en Supabase.
5. **Designá la cuenta administradora.** Ingresá una vez con esa cuenta desde la web y copiá su ID en **Authentication → Users**. En el SQL Editor, reemplazá `UUID_DE_LA_CUENTA` y ejecutá esta consulta.

   ~~~sql
   insert into midi_privado.administradores (usuario)
   values ('UUID_DE_LA_CUENTA'::uuid)
   on conflict (usuario) do nothing;
   ~~~

   Desde **Cuenta → Gestión**, esa persona configura un autenticador TOTP con el QR y valida su código. La base comprueba el rol y el segundo factor para moderar fichas y gestionar anuncios. [Autenticación multifactor](https://supabase.com/docs/guides/auth/auth-mfa).

## Subirlo a GitHub Pages

1. Descomprimí el ZIP y subí el contenido de `midi-mapa-creativo-v2.3` a la raíz de tu repositorio, incluyendo `docs/` y `supabase/`. Conservá `docs/.nojekyll`.
2. Entrá a **Settings → Pages**. Elegí **Deploy from a branch**, la rama que uses (por ejemplo `main`) y la carpeta **`/docs`**. Guardá y abrí la URL que GitHub muestra al completar el despliegue. [Publicar desde una rama](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
3. Probá el mapa desde una ventana sin sesión. Creá una ficha y aprobala con la cuenta administradora. Usá otro correo para calificar la ficha y activá un anuncio de prueba desde **Publicidad**.

## Datos y permisos

- **Mapa.** Lee `fichas_publicadas`, con los datos y la foto autorizados para difusión. Los correos de ingreso quedan en Supabase Auth.
- **Mi ficha.** Usa `fichas`, con una por cuenta. El identificador del titular se toma de la sesión. Eliminar una ficha retira su publicación y borra sus invitaciones y calificaciones.
- **Revisión.** Registra la acción y actualiza la ficha pública en la misma transacción de base de datos. Las versiones permiten detectar que una ficha cambió mientras alguien la revisaba.
- **Calificaciones.** Cada cliente ingresa con un correo verificado, declara que contrató el servicio y puede puntuar una vez por ficha. La contratación es una declaración del cliente. El sistema comprueba la cuenta, la confirmación, la existencia de la ficha publicada y la unicidad del puntaje. Los enlaces de invitación anteriores siguen abriendo la ficha para calificar. El mapa muestra los totales y promedios de las fichas publicadas.
- **Publicidad.** El carrusel muestra los anuncios activos en el orden indicado. El equipo administrador controla el contenido, la imagen, el enlace y el estado de cada anuncio.
- **Imágenes.** Los archivos se guardan en buckets privados y se ven con enlaces temporales. La función valida sesión, permisos, tamaño y dimensiones del JPEG. Las imágenes que quedan sin referencia se pueden purgar desde Storage. [Archivos privados](https://supabase.com/docs/guides/storage/serving/downloads).
- **Respaldo.** Copiá PostgreSQL y guardá una copia de los objetos de Storage. [Backups de Supabase](https://supabase.com/docs/guides/platform/backups).

Cartografía de Natural Earth y localidades del servicio [Georef de la Argentina](https://www.argentina.gob.ar/georef). Las licencias de Leaflet, Supabase JS y las tipografías están junto a los recursos. Los créditos de las fotos de ejemplo están en `docs/assets/photos/credits.txt`.
