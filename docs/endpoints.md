# Documentación de Endpoints - MovieClub API

Documento de referencia para la API REST del proyecto MovieClub (PDAW 2026 Grupo 05).

---

## Autenticación y Sesión (`authRoutes.js`)
Gestión de registro, inicio de sesión y verificación de identidad utilizando sesiones de Express (`express-session`) y cookies HttpOnly.

- `POST /api/auth/register`  
  Registra un nuevo usuario en la plataforma (`authRoutes.js`). Valida formato de email, longitud de contraseña (mínimo 6 caracteres), previene escalado de privilegios forzando por defecto el rol a `"Espectador"`, aplica hash con bcrypt (10 rounds) y regenera la sesión para evitar ataques de fijación de sesión (OWASP A07). Responde `201 Created` con los datos públicos del usuario.

- `POST /api/auth/login`  
  Autentica a un usuario existente mediante sus credenciales (email y password) en `authRoutes.js`. Valida contra el hash almacenado con `bcrypt.compare`, regenera la sesión activa y guarda el `userId` en `req.session`. Responde `200 OK` con los datos públicos del usuario (`id`, `nombre`, `email`, `rol`, `watchlist`, `top4`, `fechaRegistro`). Si las credenciales no coinciden, devuelve `401 Unauthorized` genérico.

- `POST /api/auth/logout`  
  Cierra la sesión del usuario actual (`authRoutes.js`). Destruye la sesión en el servidor, limpia la cookie de sesión (`connect.sid`) del navegador y responde `204 No Content` sin cuerpo.

- `GET /api/auth/me`  
  Realiza un chequeo de vigencia de sesión en tiempo real (`authRoutes.js`) y retorna los datos del usuario actualmente autenticado. Si existe una sesión válida, responde `200 OK`; de lo contrario, responde `401 Unauthorized`.

---

## Películas (Servicio Externo - TMDB) (`peliculasRoutes.js`)
Búsqueda y consulta de catálogo cinematográfico provisto en tiempo real por The Movie Database (TMDB) a través del adaptador y servicio interno.

- `GET /api/peliculas/buscar?q=...`  
  Busca películas por título en TMDB. El parámetro de consulta `q` es obligatorio (debe tener al menos 2 caracteres). El backend actúa como proxy/adaptador, incluye caché en memoria de 2 minutos, timeout estricto de 5 segundos con `AbortSignal` y sistema de reintentos con backoff exponencial ante errores transitorios. Responde `200 OK` con un array de películas estandarizadas.

- `GET /api/peliculas/populares`  
  Obtiene la lista de películas populares y destacadas de la semana con soporte para paginación mediante el parámetro `page`.

- `GET /api/peliculas/:id`  
  Devuelve el detalle completo de una película específica de TMDB (sinopsis, géneros, duración, fecha de estreno, calificaciones y cast principal).

---

## Reseñas y Publicaciones (`resenaRoutes.js`)
Endpoints para el ciclo de vida, filtrado y moderación de reseñas cinematográficas en la comunidad.

- `GET /api/resenas`  
  Lista todas las reseñas publicadas. Acepta filtros opcionales de búsqueda y paginación: `peliculaId`, `autorId`, `limite`, entre otros.

- `GET /api/resenas/:id`  
  Devuelve el detalle enriquecido de una reseña específica identificada por su `id`, incluyendo datos del autor, película asociada, calificación y estado de spoilers.

- `POST /api/resenas`  
  Crea una nueva reseña para una película. Requiere autenticación activa. Responde `201 Created` e incluye la cabecera `Location: /api/resenas/:id` con la representación completa del recurso recién creado.

- `PATCH /api/resenas/:id`  
  Realiza una edición parcial de la reseña: el autor original puede editar el texto o la puntuación, mientras que el usuario con rol de Moderador puede marcar o desmarcar la bandera de spoiler (`contieneSpoilers`).

- `DELETE /api/resenas/:id`  
  Elimina una reseña existente del sistema. Su ejecución está permitida exclusivamente al autor original de la reseña o a un usuario con rol de Moderador. Responde `204 No Content`.

---

## Usuarios (`usuarioRoutes.js`)
Gestión de perfiles, datos personales y privilegios de moderación dentro de la plataforma.

- `PATCH /api/usuarios/perfil`  
  Actualiza los campos permitidos (`nombre` y `@usuario`) del perfil del usuario logueado actualmente. Por motivos de seguridad e integridad, el campo `email` no se puede modificar mediante este endpoint.

- `POST /api/usuarios/favoritas/:id`  
  Alterna (agrega o remueve mediante comportamiento *toggle*) una película en la lista de favoritas del usuario autenticado en la sesión activa (`req.session.userId`). El parámetro de ruta `:id` (definido como `:peliculaId` en el enrutador) representa el identificador de la película en el catálogo. Requiere autenticación activa (`requireAuth`). Responde `200 OK` con los datos públicos del usuario y el array actualizado de `favoritas`. Si no hay sesión válida, responde `401 Unauthorized`.

- `GET /api/usuarios/:id/watchlist`  
  Devuelve el listado completo de películas pendientes en la watchlist del usuario autenticado (`{ id, watchlist }`). Valida que el usuario de la sesión activa coincida con el `:id` solicitado (prevención de IDOR / Control de Acceso Roto).

- `PATCH /api/usuarios/:id/watchlist`  
  Agrega o quita una película de la watchlist del usuario autenticado (`peliculaId` y `accion` opcional `"agregar"` | `"quitar"` | `"toggle"`).

- `PATCH /api/usuarios/:id/rol`  
  Permite la moderación de roles sobre un usuario específico. Realiza la transición bidireccional entre los roles `"Espectador"` ↔ `"Critico"`, gestionando de manera asociada la propiedad `medioDePrensa`. Requiere privilegios de Moderador.

---

## Monitoreo y Diagnóstico (`app.js`)

- `GET /api/health`  
  Provee un diagnóstico operativo y rápido del servidor (`{ status: 'ok', service: 'MovieClub API' }`) para verificar que la instancia Express se encuentra en funcionamiento.