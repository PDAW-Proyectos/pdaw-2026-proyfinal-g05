# Documentación de Endpoints - MovieClub API

Documento de referencia para la API REST del proyecto MovieClub (PDAW 2026 Grupo 05).

---

## Autenticación y Sesión
Gestión de registro, inicio de sesión y verificación de identidad utilizando sesiones de Express (`express-session`) y cookies HttpOnly.

* `POST /api/auth/register`  
  Registra un nuevo usuario en la plataforma. Valida formato de email, longitud de contraseña (mínimo 6 caracteres), previene escalado de privilegios forzando el rol a "Espectador", aplica hash con bcrypt (10 rounds) y regenera la sesión para evitar ataques de fijación de sesión (OWASP A07). Responde `201 Created` con los datos públicos del usuario (`paraExponer()`).

* `POST /api/auth/login`  
  Autentica a un usuario existente mediante sus credenciales (email y password). Valida contra el hash almacenado con `bcrypt.compare`, regenera la sesión activa y guarda el `userId` en `req.session`. Responde `200 OK` con los datos públicos del usuario (`id`, `nombre`, `email`, `rol`, `watchlist`, `top4`, `fechaRegistro`). Si las credenciales no coinciden, devuelve `401 Unauthorized` genérico.

* `POST /api/auth/logout`  
  Cierra la sesión del usuario actual. Destruye la sesión en el servidor, limpia la cookie de sesión (`connect.sid`) del navegador y responde `204 No Content` sin cuerpo.

* `GET /api/auth/me`  
  Devuelve los datos del usuario actualmente autenticado según su sesión activa. Si existe sesión válida, responde `200 OK` con los datos públicos del perfil; de lo contrario, responde `401 Unauthorized`.

---

## Películas (Servicio Externo - TMDB)
Búsqueda y consulta de catálogo cinematográfico provisto en tiempo real por The Movie Database (TMDB).

* `GET /api/peliculas/buscar?q=...`  
  Busca películas por título en TMDB. El parámetro de consulta `q` es obligatorio (debe tener al menos 2 caracteres). El backend actúa como proxy/adaptador (patrón Gateway), incluye caché en memoria de 2 minutos para no saturar la API externa, timeout estricto de 5 segundos con `AbortSignal` y sistema de reintentos con backoff exponencial ante errores transitorios (429, 5xx). Responde `200 OK` con un array de películas estandarizadas (`id`, `titulo`, `sinopsis`, `posterPath`, `fechaEstreno`, `calificacion`). Ante caída del proveedor devuelve `502 Bad Gateway`.

---

## Reseñas y Publicaciones (Próximos Endpoints del Dominio)
Endpoints previstos para el ciclo de vida de reseñas cinematográficas dentro del club.

* `GET /api/resenas`  
  Lista todas las reseñas publicadas. Acepta filtros opcionales de búsqueda y paginación: `peliculaId`, `autorId`, `spoilers`, `pagina`, `limite`.

* `GET /api/resenas/:id`  
  Devuelve el detalle de una reseña específica identificada por su `id`, incluyendo autor, película asociada, calificación (1 a 5 estrellas), texto y estado de spoilers.

* `POST /api/resenas`  
  Crea una nueva reseña para una película. Requiere autenticación activa (sesión `req.session.userId`). Responde `201 Created`, incluye el header `Location` con la URL del nuevo recurso creado (`/api/resenas/:id`) y devuelve el JSON con la representación completa de la reseña recién creada.

* `PUT /api/resenas/:id`  
  Reemplaza o actualiza completamente una reseña existente. Valida que el usuario autenticado sea el autor original de la misma (o un Moderador/Administrador). Responde `200 OK`.

* `DELETE /api/resenas/:id`  
  Elimina una reseña existente. Valida permisos del autor o moderador. Responde `204 No Content` sin cuerpo.

---

## Usuarios
Gestión de perfiles de cinéfilos y sus listas personales.

* `GET /api/usuarios`  
  Lista los miembros de la comunidad con sus perfiles públicos.

* `GET /api/usuarios/:id`  
  Devuelve el perfil público de un usuario específico (`nombre`, `rol`, `watchlist`, `top4`, `fechaRegistro`), excluyendo hashes de contraseñas.

* `GET /api/usuarios/:id/watchlist`  
  Devuelve el listado de películas que el usuario tiene guardadas para ver en su Watchlist.

* `POST /api/usuarios/:id/watchlist`  
  Agrega una película a la Watchlist del usuario autenticado. Responde `201 Created` o `200 OK`.

* `DELETE /api/usuarios/:id/watchlist/:peliculaId`  
  Elimina una película de la Watchlist del usuario. Responde `204 No Content`.

---

## Monitoreo y Diagnóstico

* `GET /api/health`  
  Endpoint de diagnóstico y verificación de estado (Health Check). Devuelve `200 OK` con `{ "status": "ok", "service": "MovieClub API" }` para comprobar que el servidor Express se encuentra operativo.

