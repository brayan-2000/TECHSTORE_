# TechStore Perú — Parcial de Desarrollo de Aplicaciones Web

Proyecto académico de demostración con **Vite + JavaScript** y **Express + API REST**. Frontend de varias rutas, catálogo desde la API, búsqueda, filtros, detalles, carrito, formulario de pedido y consulta de pedidos.

## Inicio local

Necesitas Node.js instalado.

1. Abre esta carpeta en Visual Studio Code.
2. En la terminal ejecuta `npm install`.
3. Descarga una clave privada de Firebase y guárdala como `server/firebase-service-account.json.json` (no la publiques).
4. Abre una terminal y ejecuta `npm run api` (puerto 3001).
5. Abre otra terminal y ejecuta `npm run dev` (puerto 5173).
6. Visita http://localhost:5173/ . **Mantén abiertas ambas terminales.**

## Instalar como aplicación

TechStore Perú se puede instalar desde Chrome o Edge con el botón **Instalar app** del menú de navegación o desde el icono de instalación del navegador. La aplicación instalada se abre en una ventana propia con el ícono de TechStore. En Safari para iPhone/iPad, usa **Compartir → Añadir a pantalla de inicio**.

La app conserva el catálogo visto recientemente para consultarlo sin conexión, pero para actualizar datos o registrar pedidos necesita que la API y Firebase estén disponibles. En este proyecto local, mantén abiertas las terminales de `npm run api` y `npm run dev`. Para instalarla en otros equipos, publícala en una URL HTTPS; `localhost` solo funciona en el propio equipo.

## Rutas

`/` inicio; `/productos` catálogo; `/producto/:id` detalle; `/ofertas` promociones; `/carrito` carrito; `/checkout` pedido de prueba; `/pedidos` registros de prueba; `/nosotros` presentación; `/contacto` consulta ilustrativa.

## Recursos API

- `GET /api` descripción y rutas
- `GET /api/productos` (parámetros: `buscar`, `categoria`, `destacados`, `ordenar`)
- `GET /api/productos/:id`
- `POST /api/productos` para crear un producto (requiere todos los campos editables)
- `PUT /api/productos/:id` para reemplazar los campos editables de un producto
- `DELETE /api/productos/:id` para eliminar un producto
- `GET`, `POST`, `PUT /:id` y `DELETE /:id` para `/api/categorias` y `/api/promociones`
- `GET`, `POST`, `PUT /:id` y `DELETE /:id` para `/api/clientes` (la lista pública solo expone nombres e IDs)
- `GET`, `POST`, `PUT /:id` y `DELETE /:id` para `/api/pedidos`; los pedidos nuevos se validan con el flujo de checkout
- Abrir `/api/productos`, `/api/categorias`, `/api/promociones`, `/api/clientes` o `/api/pedidos` directamente en un navegador muestra un editor web; las solicitudes `fetch` siguen recibiendo JSON.
- `POST /api/pedidos` con JSON `{ "nombre":"...", "email":"...", "direccion":"...", "articulos":[{"id":1,"cantidad":2}] }`
- `GET /api/prueba-firebase` comprueba la conexión con Cloud Firestore.

Los recursos se almacenan en las colecciones `productos`, `categorias`, `promociones`, `clientes` y `pedidos` de Cloud Firestore. Si una colección inicial está vacía, la API carga los datos de demostración de `server/data.js` una sola vez.

## Publicar en Render (un solo Web Service)

El archivo `render.yaml` define el servicio web y los comandos de build/inicio. Sube el proyecto a un repositorio de GitHub sin `node_modules`, `dist` ni claves privadas; luego, en Render, crea un **Blueprint** y selecciona ese repositorio. Al crear el servicio, Render solicitará `FIREBASE_SERVICE_ACCOUNT`: pega allí el contenido completo del JSON de la cuenta de servicio de Firebase como variable secreta. No publiques esa clave en GitHub ni en el código.

Render proporciona HTTPS y `PORT` automáticamente; Express sirve tanto `/api/*` como la aplicación web. Al completar el despliegue, abre la URL `https://...onrender.com`, instala TechStore desde Chrome o Edge y podrás usarla desde otros dispositivos. La URL también sirve para comprobar la API, por ejemplo `https://tu-servicio.onrender.com/api`. El plan gratuito puede suspender el servicio tras un periodo sin actividad y tardar al primer acceso en volver a iniciar.

## Importante

Este proyecto es una **demostración**, no una tienda comercial. El carrito se guarda en el navegador y el catálogo, pedidos y clientes se almacenan en Cloud Firestore. No se manejan pagos ni se deben ingresar datos personales reales en la demo. Las imágenes son referencias de Unsplash y dependen de conexión a internet. Los nombres, características y precios son ficticios. El formulario de contacto no envía correos. No se incluye autenticación: el editor web y las operaciones de escritura son para demostración local y no deben exponerse a Internet sin protección.

## Explicación para el parcial

- La API cuenta con 5 recursos: productos, categorías, promociones, clientes y pedidos.
- El frontend obtiene el catálogo mediante `fetch('/api/productos')`, recibe JSON y lo convierte en tarjetas HTML.
- Se muestran estados de carga, errores de conexión, listas vacías y errores HTTP.
- El recurso pedidos muestra una demostración del método POST con validación de servidor.
- La interfaz usa CSS Grid, media queries, navegación con History API y eventos delegados.
- Para el informe: documenta User Persona, propuesta de valor, estructura técnica, capturas, endpoints y despliegue.
