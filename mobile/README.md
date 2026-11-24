# MiDi Conecta · app móvil

Aplicación nativa para Android e iPhone. Su código está en `src/`, con Expo SDK 58, React Native y Expo Router. La web conserva el mapa y el tablón de oportunidades; el matching se usa desde la app.

## Qué incluye

- Ingreso por el mismo correo y código del mapa. Usa el mismo proyecto de Supabase, sin crear otra cuenta desde la app.
- Perfil leído de `fichas_publicadas`: nombre, tipo, rubro, localidad, servicios, descripción y foto. No hay otro formulario de perfil.
- Participación voluntaria: **Activar mi perfil en Conecta**. Se puede pausar desde Mi perfil.
- Descubrimiento de perfiles con filtros por tipo, rubro y localidad. Solo aparecen fichas publicadas de participantes activos, nunca la propia ni cuentas administradoras.
- Deslizamiento a la izquierda para pasar y a la derecha para expresar interés. Los botones **Pasar** y **Me interesa** ofrecen la misma acción accesible. Si una petición falla, la tarjeta permanece disponible.
- Match exclusivamente por interés mutuo. **Conexiones** muestra las fichas y sus contactos públicos. El contacto continúa por correo, teléfono, WhatsApp, web o red social; esta versión no incorpora un chat interno.
- Reportes revisables desde Gestión y bloqueo de perfiles. Bloquear retira la conexión y excluye a ambas partes de sus búsquedas. Los bloqueos de este MVP se mantienen; no hay pantalla para deshacerlos.
- Sesión guardada en SecureStore, en fragmentos para admitir sesiones largas. La renovación se suspende cuando la app pasa a segundo plano.

## Preparar Supabase

Usá **el mismo proyecto** de la web. Deben estar ejecutadas las seis migraciones del directorio `../supabase/migrations`, incluida `20261124100000_oportunidades_matching.sql`. El SMTP y las plantillas de códigos se comparten con el mapa.

Una cuenta necesita una ficha aprobada y publicada para participar. Si está incompleta, pendiente, pausada o eliminada, la app indica que hay que revisar el perfil en el mapa. Las cuentas administradoras usan Gestión en la web.

El correo de ingreso puede ser distinto del correo comercial público de la ficha. Ingresá con el correo de **Authentication**, el mismo usado para crearla. Compartir cuenta y base de datos no transfiere la sesión entre el navegador y el teléfono: la primera vez se inicia sesión en la app.

## Probar en un teléfono

1. Instalá Node.js 22.13 o posterior compatible con SDK 58.
2. En esta carpeta, copiá `.env.example` como `.env` y completá:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TU_CLAVE_PUBLICA
   EXPO_PUBLIC_MAP_URL=https://laiondi.github.io/midimap/
   ```

   Son la misma URL y clave **publicable** de `../docs/config.js`. La clave `service_role`, las claves secretas, la contraseña de la base y las credenciales SMTP no van en la app.

3. Desde una terminal abierta en `mobile`, ejecutá:

   ```bash
   npm ci
   npx expo start
   ```

4. Abrí el proyecto en un teléfono con una versión de Expo Go compatible con SDK 58. También podés usar un development build compatible. Mantené el teléfono y la computadora en una red que permita esa conexión. El QR de desarrollo abre el proyecto en el teléfono; no es un instalador público.
5. Ingresá con una cuenta del mapa con ficha aprobada, activá su participación y repetí con otra cuenta en otro teléfono. Marcá interés en ambos perfiles y comprobá Conexiones. Para probar sin esperar perfiles ajenos, usá cuentas de prueba del mismo proyecto de Supabase; la app no trae datos simulados.

Si cambiás `.env`, reiniciá el servidor de desarrollo. La app está configurada para Android e iOS; no ofrece un comando de publicación web.

## Generar versiones instalables

Este ZIP incluye el **código fuente**, configuración de compilación y dependencias fijadas en `package-lock.json`. No incluye un APK firmado ni un instalador de iPhone. Los archivos `.hbc` generados por las comprobaciones de Metro tampoco son instaladores.

Antes de distribuir:

- Vinculá el proyecto con una cuenta de Expo que controle MiDi.
- Revisá `app.json`: nombre, `slug`, identificadores `ar.midi.conecta`, icono y versión. Los identificadores deben corresponder a las cuentas con las que se va a publicar.
- Cargá las mismas variables `EXPO_PUBLIC_…` en el entorno de compilación correspondiente. `.env` está excluido del repositorio; no hay credenciales incrustadas en este paquete.
- Usá las credenciales de firma propias de MiDi para la distribución nativa.

Los siguientes comandos se ejecutan desde esta carpeta y requieren tu sesión de Expo:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

`preview` está preparado para generar un APK Android de prueba. Cuando la compilación termine, su enlace de instalación puede cargarse en **Gestión → App → Android**. Ese enlace debe ser HTTPS.

Para pruebas internas de iPhone, registrá los teléfonos autorizados y generá la versión con las credenciales Apple correspondientes:

```bash
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile preview
```

La distribución interna de iOS solo instala en los dispositivos incluidos en el aprovisionamiento. Para distribución pública, prepará la publicación en las tiendas con el perfil `production` y cargá los enlaces definitivos desde Gestión → App. Completar una compilación no publica automáticamente en una tienda.

[Instaladores APK](https://docs.expo.dev/build-reference/apk/) · [Distribución interna](https://docs.expo.dev/build/internal-distribution/) · [Instalación de Expo Router](https://docs.expo.dev/router/installation/) · [Supabase Auth para React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native).

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm run bundle:android
npm run bundle:ios
```

Las comprobaciones de código, tipos y exportación de los bundles Android e iOS se completaron. También se probaron los permisos y el matching en PostgreSQL con las migraciones reales y el almacenamiento seguro con un adaptador simulado. No se ejecutó una compilación firmada, una sesión de producción en teléfonos físicos ni una publicación en tiendas; esos pasos requieren las cuentas, configuración y dispositivos de MiDi.
