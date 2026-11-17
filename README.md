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

- **Categoría** (`api::categoria.categoria`, ruta de administración `/content-manager/collection-types/api::categoria.categoria`): `nombre`, `descripcion`, `icono`, `activo`.
- **Marca** (`api::marca.marca`): `nombre`, `descripcion`, `logo`, `activo`.
- **Producto** (`api::producto.producto`): `nombre`, `codigoInterno` (único), `descripcion` (Blocks), `caracteristicas` (componentes repetibles en su orden), `categoria`, `marca`, `precio`, `mostrarPrecio`, `disponibilidad`, `activo`, `destacado`, `imagenPrincipal`, `galeria`.

Cada producto tiene una categoría y una marca. `galeria` admite hasta cuatro imágenes adicionales. `disponibilidad` acepta exactamente `Disponible` o `Consultar en tienda`. La publicación de Strapi (Draft & Publish) es independiente de `activo` y de la disponibilidad comercial.

El contenido administrable vive en Strapi y PostgreSQL. El producto es el registro central del catálogo; categoría y marca son relaciones requeridas. Las características son componentes repetibles que conservan el orden configurado. Las imágenes se administran desde el Media Library nativo de Strapi. Este repositorio no incluye el sitio Next.js ni módulos de promociones, banners o sucursales.

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

## Alcance actual y siguiente pendiente

Incluye el CMS Strapi nativo y el API público del catálogo. No incluye el frontend Next.js, un dashboard personalizado, promociones, banners ni sucursales. Antes de conectar el sitio, verificá manualmente el usuario administrador, la carga de imágenes en el Media Library y las relaciones pobladas desde el navegador. El siguiente pendiente es conectar el consumo de estos endpoints desde el frontend de Josué.
