# API de catálogo | El Mundo del Hogar

API del catálogo de la tienda, construida con Strapi 5.52.3 y TypeScript. El proyecto Strapi existente vive en la raíz del repositorio y usa PostgreSQL, según la configuración local ya existente.

## Requisitos

- Node.js 20 a 26 (probado durante el desarrollo con Node 24).
- npm.
- PostgreSQL local con una base de datos y usuario configurados en `.env`.

## Arranque limpio en Windows PowerShell

Desde la carpeta del repositorio:

```powershell
npm ci
Copy-Item .env.example .env
```

Antes del primer arranque, reemplazá los valores `replace-me-*` de `.env` por los secretos y datos de conexión de tu PostgreSQL local. Podés generar cada secreto de Strapi con:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Usá dos valores separados por coma para `APP_KEYS`. No compartás ni subás `.env`. La base PostgreSQL la prepara el servicio local; `.env` y las cargas locales están ignorados por Git.

En esta instalación PostgreSQL corre en Docker Desktop y publica el puerto `5432:5432`. Iniciá ese contenedor antes de Strapi. Si clonás el repositorio, ajustá `DATABASE_NAME`, `DATABASE_USERNAME` y `DATABASE_PASSWORD` en `.env` para que coincidan con los valores configurados en tu contenedor; los valores del `.env.example` son solo una plantilla.

### Levantar Strapi

Con PostgreSQL en ejecución y desde la raíz del repositorio, iniciá el CMS con:

```powershell
npm run develop
```

Abrí <http://localhost:1337/admin>. La API queda en <http://localhost:1337/api>. En desarrollo, Swagger UI estará en <http://localhost:1337/documentation/v1.0.0> después de que Strapi genere la documentación al iniciar. En producción queda deshabilitado por defecto.

### Acceso al panel de administración

El correo de la cuenta administradora actual es `hector7chess@gmail.com`. La contraseña se definió al crear esa cuenta y no se guarda en este README, en `.env` ni en `.env.example`.

Si olvidás la contraseña, restablecela desde PowerShell en la raíz del proyecto. El comando solicita correo y contraseña nueva de forma interactiva:

```powershell
npm run strapi -- admin:reset-user-password
```

No guardés contraseñas en archivos versionados ni en el historial de comandos. Para producción, configurá una contraseña nueva y almacenala en un gestor de contraseñas.

## Modelos del catálogo

- **Categoría** (`api::categoria.categoria`, ruta de administración `/content-manager/collection-types/api::categoria.categoria`): `nombre`, `descripcion`, `icono` (texto opcional existente), `iconoImagen` (media opcional), `activo`.
- **Marca** (`api::marca.marca`): `nombre`, `descripcion`, `logo`, `activo`.
- **Producto** (`api::producto.producto`): `nombre`, `codigoInterno` (único), `descripcion` (Blocks), `caracteristicas` (componentes repetibles en su orden), `categoria`, `marca`, `precio`, `mostrarPrecio`, `disponibilidad`, `activo`, `destacado`, `imagenPrincipal`, `galeria`.

Cada producto tiene una categoría y una marca. `galeria` admite hasta cuatro imágenes adicionales. `disponibilidad` acepta exactamente `Disponible` o `Consultar en tienda`. La publicación de Strapi (Draft & Publish) es independiente de `activo` y de la disponibilidad comercial.

El contenido administrable vive en Strapi y PostgreSQL. El producto es el registro central del catálogo; categoría y marca son relaciones requeridas. Las características son componentes repetibles que conservan el orden configurado. Las imágenes se administran desde el Media Library nativo de Strapi.

También están disponibles los modelos **Promoción** (`titulo`, `descripcion`, `tipo`, `valor`, `imagen`, `fechaInicio`, `fechaFin`, `activo`), **Banner** (`titulo`, `descripcion`, `imagen`, `enlaceDestino`, `ordenVisualizacion`, `activo`) y **Sucursal** (`nombre`, `ciudad`, `telefono`, `direccion`, `diasAtencion`, `horaApertura`, `horaCierre`, `latitud`, `longitud`, `activo`). Los tipos de promoción son `descuento`, `dos-por-uno`, `envio-gratis` y `especial`; el valor del descuento porcentual admite de 0 a 100, sin incluir 0. Los tres modelos usan Draft & Publish. Solo contenido publicado y activo aparece públicamente. Las promociones se muestran solo durante su vigencia en la zona horaria de El Salvador.

## Datos de ejemplo y comprobación

En una terminal, con Strapi en ejecución, cargá datos locales idempotentes:

```powershell
npm run seed:examples
```

El seed crea una categoría, una marca, un producto visible y destacado, un producto publicado con precio oculto, un borrador y un producto inactivo. Son registros ficticios, sin imágenes.

En otra terminal:

```powershell
npm run verify:catalog
```

El verificador hace solicitudes HTTP a la API local y comprueba publicación, estado activo, precio oculto, búsqueda, filtros combinados, resultados vacíos, destacados, orden y paginación. Se puede cambiar el host con `$env:CATALOG_API_URL` (por defecto `http://localhost:1337/api`).

## API pública para Josué

Los identificadores de ruta son los de Strapi 5: el detalle usa `documentId` (no el `id` numérico). Campos de respuesta están aplanados directamente dentro de `data`. Las respuestas REST incluyen `meta.pagination` en listados.

### Listado y detalle

```http
GET /api/productos
GET /api/productos/:documentId
```

Las lecturas públicas solo devuelven documentos publicados y `activo=true`. No hay rutas públicas de escritura; la edición se realiza desde el panel de administración autorizado. El servidor elimina `precio` de cada producto cuyo `mostrarPrecio` sea `false`, también al consultar el detalle o pedir campos explícitos.

Incluí relaciones y medios cuando los necesités con `populate`:

```http
GET /api/productos?populate[categoria]=true&populate[marca]=true&populate[imagenPrincipal]=true&populate[galeria]=true
```

### Búsqueda, filtros, destacados, orden y páginas

Strapi REST admite `filters`, `sort` y `pagination`; estos parámetros se pueden combinar. Para buscar nombre o código:

```http
GET /api/productos?filters[$or][0][nombre][$containsi]=micro&filters[$or][1][codigoInterno][$containsi]=micro
```

Filtros de relación usando los `documentId` de la categoría y marca:

```http
GET /api/productos?filters[categoria][documentId][$eq]=ID_CATEGORIA&filters[marca][documentId][$eq]=ID_MARCA
```

Destacados, orden por precio ascendente y paginación:

```http
GET /api/productos?filters[destacado][$eq]=true&sort=precio:asc&pagination[page]=1&pagination[pageSize]=12
```

Ejemplo copiable en PowerShell (reemplazá los IDs por los `documentId` de categoría y marca):

```powershell
$base = 'http://localhost:1337/api/productos'
Invoke-RestMethod -Uri $base
Invoke-RestMethod -Uri "$base?filters[`$or][0][nombre][`$containsi]=micro&filters[`$or][1][codigoInterno][`$containsi]=micro"
Invoke-RestMethod -Uri "$base?filters[categoria][documentId][`$eq]=ID_CATEGORIA&filters[marca][documentId][`$eq]=ID_MARCA&sort=nombre:asc&pagination[page]=1&pagination[pageSize]=12"
Invoke-RestMethod -Uri "$base?filters[destacado][`$eq]=true&sort=nombre:asc&pagination[page]=1&pagination[pageSize]=12"
```

Para consultar una ficha directamente:

```powershell
$producto = (Invoke-RestMethod -Uri "$base?filters[codigoInterno][`$eq]=DEMO-LIC-002").data[0]
Invoke-RestMethod -Uri "$base/$($producto.documentId)?populate=*"
```

La ficha del producto `DEMO-LIC-002` no incluye la propiedad `precio` en el JSON, aunque se solicite directamente.

## API interna de usuarios

Las rutas de administración requieren un JWT de una cuenta con rol `panel-admin`; las cuentas Editor reciben `403`.

- `GET /api/admin/usuarios`: listado, búsqueda y filtros.
- `POST /api/admin/usuarios`: crea un usuario; requiere `nombre`, `correo`, `contrasena` (mínimo 12 caracteres) y `rol` (`panel-admin` o `panel-editor`). `activo` es opcional y por defecto `true`; `permisos` también es opcional.
- `PUT /api/admin/usuarios/:id`: actualiza `nombre`, `correo`, `contrasena`, `rol`, `activo` o `permisos`. `:id` es el ID numérico de Users & Permissions, no `documentId`.

Para preparar el primer usuario `panel-admin`, ingresá al panel técnico de Strapi, abrí Content Manager > User y creá la cuenta con rol `Admin`. Después el administrador interno podrá gestionar las demás cuentas mediante estas rutas. El registro público continúa deshabilitado.

Parámetros opcionales: `q` busca por nombre de usuario o correo; `role` acepta `panel-admin` o `panel-editor`; `estado` acepta `activo` o `inactivo`; `page` y `pageSize` controlan la paginación (`pageSize` máximo 100).

```powershell
$token = 'JWT_DEVUELTO_POR_LOGIN'
$headers = @{ Authorization = "Bearer $token" }
Invoke-RestMethod -Uri 'http://localhost:1337/api/admin/usuarios?q=maria&role=panel-editor&estado=activo&page=1&pageSize=10' -Headers $headers
```

Los módulos de `permisos` son `productos`, `categorias`, `marcas`, `promociones`, `banners`, `sucursales`, `informacionNegocio` y `usuarios`; cada valor es booleano. En esta etapa son accesos por módulo, no acciones CRUD separadas. Editor no puede recibir el permiso `usuarios`. La política `global::permiso-modulo` ya protege las rutas internas de productos, categorías y marcas; ocultar controles en Next.js no reemplaza esa validación.

La respuesta incluye `id` numérico, `nombre`, `correo`, `rol`, `rolNombre`, `activo`, `confirmado` y el mapa `permisos`. `ultimoAcceso` se devuelve como `null` porque el modelo actual no guarda ese dato. `meta.pagination` contiene los totales y `meta.resumen` los conteos generales. El usuario no puede cambiar su propio rol, permisos ni estado, y no se permite desactivar o degradar el último Admin activo.

## API del catálogo para el panel interno

Las rutas `/api/admin/...` requieren un JWT de Users & Permissions. Admin tiene acceso a los tres módulos; Editor necesita el permiso individual correspondiente (`productos`, `categorias` o `marcas`). Strapi rechaza con `403` tanto al usuario público sin permiso como al Editor sin autorización para el módulo. Estos permisos habilitan todas las operaciones del módulo, incluida la eliminación y publicación.

### Lecturas públicas de categorías y marcas

```http
GET /api/categorias
GET /api/categorias/:id
GET /api/marcas
GET /api/marcas/:id
```

Solo se devuelven elementos publicados y con `activo=true`. En las rutas de detalle, `:id` recibe el `documentId` de Strapi 5. Los listados aceptan los filtros, orden y paginación REST de Strapi.

### Administración de productos

```http
GET    /api/admin/productos
GET    /api/admin/productos/:documentId
POST   /api/admin/productos
PUT    /api/admin/productos/:documentId
DELETE /api/admin/productos/:documentId
POST   /api/admin/productos/:documentId/publicar
POST   /api/admin/productos/:documentId/despublicar
```

El listado admite `q` (nombre o código), `categoria` y `marca` (sus `documentId`), `activo`, `destacado`, `status`, `page`, `pageSize` y `sort`. El detalle incluye categoría, marca, imagen principal, galería y características. `pageSize` va de 1 a 100. Los campos de escritura son los del modelo Producto y las relaciones/media usan los formatos de Strapi.

### Administración de categorías y marcas

```http
GET    /api/admin/categorias
GET    /api/admin/categorias/:documentId
POST   /api/admin/categorias
PUT    /api/admin/categorias/:documentId
DELETE /api/admin/categorias/:documentId
POST   /api/admin/categorias/:documentId/publicar
POST   /api/admin/categorias/:documentId/despublicar

GET    /api/admin/marcas
GET    /api/admin/marcas/:documentId
POST   /api/admin/marcas
PUT    /api/admin/marcas/:documentId
DELETE /api/admin/marcas/:documentId
POST  /api/admin/marcas/:documentId/publicar
POST  /api/admin/marcas/:documentId/despublicar
```

Los listados admiten `q`, `activo`, `status`, `page`, `pageSize` y `sort`; también incluyen `cantidadProductos`. No se permite eliminar una categoría o marca que esté relacionada con productos: la API responde `409`, por lo que debe desactivarse si ya está en uso.

Para los tres recursos, `status=draft|published` selecciona la versión de lectura; por defecto es `draft`. Crear y actualizar siempre guardan un borrador. La publicación es explícita con la ruta `/publicar`; `/despublicar` devuelve el documento a borrador. El cuerpo puede enviarse con los campos en la raíz o dentro de `{ "data": { ... } }`.

Ejemplo con PowerShell:

```powershell
$token = 'JWT_DEVUELTO_POR_LOGIN'
$headers = @{ Authorization = "Bearer $token" }
$base = 'http://localhost:1337/api/admin'
Invoke-RestMethod -Uri "$base/productos?q=refrigeradora&activo=true&page=1&pageSize=10" -Headers $headers
Invoke-RestMethod -Uri "$base/categorias?status=draft" -Headers $headers
```

Las cargas se hacen como `multipart/form-data`, adjuntando el archivo en el campo `files`. Se admite una imagen por solicitud para categorías y marcas, y hasta cinco para productos (imagen principal más galería); cada archivo puede pesar hasta 10 MB. Se permiten imágenes y se rechazan otros tipos antes de guardarlos. La respuesta es la lista de medios creada por el plugin Upload de Strapi; usá el `id` numérico para relacionar cada medio en el siguiente `POST` o `PUT` del contenido.

```http
POST /api/admin/productos/media
POST /api/admin/categorias/media
POST /api/admin/marcas/media
```

Cada ruta requiere el mismo permiso del módulo al que pertenece. Ejemplo con `curl.exe` en PowerShell:

```powershell
$token = 'JWT_DEVUELTO_POR_LOGIN'
$headers = @{ Authorization = "Bearer $token" }
curl.exe -X POST 'http://localhost:1337/api/admin/productos/media' -H "Authorization: Bearer $token" -F 'files=@C:\imagenes\producto.jpg'
```

La política de seguridad del plugin también bloquea SVG. Para relacionar el medio devuelto, enviá su ID en el campo correspondiente, por ejemplo `imagenPrincipal: 42`, `galeria: [42, 43]` o `iconoImagen: 42`.

## APIs de promociones, banners y sucursales

Las lecturas públicas son:

```http
GET /api/promociones
GET /api/banners
GET /api/sucursales
GET /api/public/inicio
```

`/api/promociones` solo incluye promociones publicadas, activas y vigentes hoy en `America/El_Salvador`; permite solicitar `populate[imagen]=true`. `/api/banners` devuelve los banners publicados y activos en `ordenVisualizacion` ascendente. `/api/sucursales` devuelve sucursales publicadas y activas. `/api/public/inicio` entrega en una respuesta las listas `banners`, `categorias`, `productos`, `marcas`, `promociones` y `sucursales`; incluye productos destacados y limita el precio con la misma regla de privacidad que los endpoints del catálogo. Los límites opcionales son `limiteBanners`, `limiteCategorias`, `limiteProductos`, `limiteMarcas`, `limitePromociones` y `limiteSucursales` (enteros de 1 a 20).

Ejemplos:

```powershell
$api = 'http://localhost:1337/api'
Invoke-RestMethod -Uri "$api/public/inicio?limiteProductos=4&limiteBanners=3"
Invoke-RestMethod -Uri "$api/promociones?populate[imagen]=true"
Invoke-RestMethod -Uri "$api/banners?populate[imagen]=true"
Invoke-RestMethod -Uri "$api/sucursales"
```

La gestión requiere `Authorization: Bearer <JWT>` de una cuenta autenticada del panel interno. Admin puede operar todos los módulos; Editor necesita el permiso correspondiente (`promociones`, `banners` o `sucursales`). Para cada recurso hay listado, detalle por `documentId`, creación, edición, eliminación, publicación y despublicación bajo `/api/admin/<recurso>`. Los listados aceptan `q`, `activo`, `status=draft|published`, `page`, `pageSize` y `sort` según el recurso. Las escrituras aceptan campos en la raíz o dentro de `{ "data": { ... } }`; crear y editar guardan borradores y publicar es una acción explícita.

```http
GET    /api/admin/promociones
GET    /api/admin/promociones/:documentId
POST   /api/admin/promociones
PUT    /api/admin/promociones/:documentId
DELETE /api/admin/promociones/:documentId
POST   /api/admin/promociones/:documentId/publicar
POST   /api/admin/promociones/:documentId/despublicar

GET    /api/admin/banners
GET    /api/admin/banners/:documentId
POST   /api/admin/banners
PUT    /api/admin/banners/:documentId
DELETE /api/admin/banners/:documentId
POST   /api/admin/banners/:documentId/publicar
POST   /api/admin/banners/:documentId/despublicar

GET    /api/admin/sucursales
GET    /api/admin/sucursales/:documentId
POST   /api/admin/sucursales
PUT    /api/admin/sucursales/:documentId
DELETE /api/admin/sucursales/:documentId
POST   /api/admin/sucursales/:documentId/publicar
POST   /api/admin/sucursales/:documentId/despublicar
```

Las rutas `POST /api/admin/promociones/media` y `POST /api/admin/banners/media` aceptan una imagen (`multipart/form-data`, campo `files`, máximo 10 MB). El banner exige imagen, destino y orden; el destino debe ser una ruta local o una URL HTTP/HTTPS. Las promociones requieren fechas `YYYY-MM-DD`, no permiten fin anterior al inicio y limitan el descuento porcentual a 100. Las sucursales requieren ciudad, teléfono, dirección, días y horas de atención. Las rutas del API aceptan horas `HH:mm` o `HH:mm:ss` y las normalizan al formato de almacenamiento de Strapi. Latitud y longitud son opcionales pero deben enviarse juntas.

## Alcance actual y siguiente pendiente

Incluye el CMS Strapi nativo, APIs públicas del catálogo y de inicio, CRUD interno de productos, categorías, marcas, promociones, banners, sucursales y usuarios, y carga autenticada de imágenes. No incluye el frontend Next.js, información editable del negocio, formulario de contacto, notificaciones ni dashboard personalizado. El siguiente pendiente de la API es modelar la información institucional/contacto y su lectura pública; luego se podrá conectar el sitio de Next.js.
