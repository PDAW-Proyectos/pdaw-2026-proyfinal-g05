# Arquitectura del Sistema — MovieClub

Documento técnico de arquitectura para la plataforma MovieClub (PDAW 2026 — Grupo 05 — DCIC — UNS).

---

## 1. Diagrama de Contexto

El sistema se estructura en torno a tres límites claramente definidos, comunicados mediante estándares abiertos de la web:

- **Referencia gráfica:** [`docs/Diagrama-de-contexto.jpeg`](Diagrama-de-contexto.jpeg)

### Componentes e Interfaces
1. **Cliente Web (Frontend SPA / Vanilla JS):**
   - Interfaz de usuario ejecutada en el navegador web.
   - Consume la API propia mediante peticiones asíncronas HTTP/HTTPS intercambiando datos en formato JSON.
   - Maneja la autenticación y estado del usuario mediante cookies de sesión seguras (`HttpOnly`, `SameSite=Lax`).

2. **Backend MovieClub API (Node.js / Express):**
   - Servidor central que encapsula la lógica de negocio, control de acceso por roles y persistencia local.
   - Expone rutas REST y respuestas de error normalizadas según **RFC 9457**.
   - Almacena datos de forma atómica en archivos locales (`data/usuarios.json` y `data/resenas.json`) mediante la abstracción de repositorios.

3. **API Externa de The Movie Database (TMDB):**
   - Servicio externo de catálogo cinematográfico (metadatos, pósters, sinopsis, reparto).
   - El cliente web nunca accede a TMDB directamente: el backend actúa como intermediario (Gateway), manteniendo la clave de API (`TMDB_API_KEY`) resguardada en variables de entorno del servidor.

---

## 2. Diagrama de Capas

El backend adopta una arquitectura en capas desacopladas con flujo unidireccional y control de dependencias centralizado en `src/container.js`:

**Rutas y Middlewares** ➔ **Controladores** ➔ **Servicios de Aplicación** ➔ **Repositorios / Adaptadores**

### Descripción concisa de cada capa:

1. **Rutas y Middlewares (`src/routes/`, `src/middlewares/`):**
   - Mapea las solicitudes HTTP hacia los controladores.
   - Aplica middlewares transversales:
     - `requestContext`: asigna un identificador único (`req.id` / `X-Request-Id`) para trazabilidad.
     - `requireAuth`: verifica la existencia de `req.session.userId` antes de permitir operaciones protegidas.
     - `errorHandler`: captura excepciones y las serializa bajo el estándar **RFC 9457**.

2. **Controladores (`src/controllers/`):**
   - Reciben `req` y `res`, extraen parámetros validados (`body`, `params`, `query`) e invocan a los servicios.
   - Devuelven respuestas con códigos HTTP canónicos (`200 OK`, `201 Created` con encabezado `Location`, `204 No Content`). No contienen reglas de negocio ni lógica de persistencia.

3. **Servicios de Aplicación (`src/services/`):**
   - Implementan los casos de uso del sistema: registro con hash bcrypt (10 rounds), login, creación y edición de reseñas, promoción o degradación de roles y búsqueda en TMDB.
   - Orquestan la interacción entre las entidades del dominio y los adaptadores de datos.

4. **Repositorios y Adaptadores (`src/repositories/`, `src/services/tmdbAdapter.js`):**
   - **`JsonFileRepository`:** Abstrae la lectura y escritura sobre el sistema de archivos JSON (`data/`), asegurando serialización defensiva.
   - **`TmdbAdapter`:** Adapta la API de TMDB al dominio local incorporando resiliencia técnica: timeout estricto de 5 segundos con `AbortSignal`, reintentos con backoff exponencial ante respuestas `429/5xx` y caché en memoria con expiración de 2 minutos.

5. **Inyección de Dependencias (`src/container.js`):**
   - Instancia y vincula las capas al iniciar la aplicación, permitiendo sustituir repositorios o servicios externos por implementaciones en memoria durante la ejecución de pruebas unitarias y de integración.

---

## 3. Modelo de Clases de Dominio (POO)

El dominio modela las reglas centrales del negocio aplicando Programación Orientada a Objetos con encapsulamiento estricto mediante campos privados (`#`) y polimorfismo.

- **Referencia gráfica:** [`docs/Diagrama-de-clases.jpeg`](Diagrama-de-clases.jpeg)

### 3.1. Jerarquía de Usuarios y Roles
- **`Usuario` (Clase Abstracta):**
  - No puede instanciarse directamente (`new.target === Usuario` arroja error de regla de negocio).
  - Campos privados: `#id`, `#nombre`, `#usuario` (handle `@`), `#email`, `#passwordHash`, `#rol`, `#watchlist`, `#favoritas`, `#top4`, `#fechaRegistro`.
  - Métodos abstractos/polimórficos: `puedeModerar()`, `puedeDestacar()`.
  - Métodos de negocio: `actualizarPerfil({ nombre, usuario })`, `cambiarRol(nuevoRol, moderadorId)`, `paraExponer()` (proyección pública sin passwordHash).
  - Método fábrica: `Usuario.crear(datos)` instancia la subclase correspondiente según el rol.
- **`Espectador` (extiende `Usuario`):**
  - Rol inicial por defecto en el registro. `puedeModerar()` y `puedeDestacar()` devuelven `false`.
- **`Critico` (extiende `Usuario`):**
  - Incorpora el atributo privado `#medioDePrensa`.
  - `puedeModerar()` devuelve `false`; `puedeDestacar()` devuelve `true`.
  - Genera reseñas marcadas como destacadas dentro del club.
- **`Moderador` (extiende `Usuario`):**
  - `puedeModerar()` y `puedeDestacar()` devuelven `true`.
  - Posee métodos de negocio para moderar contenido ajeno (marcado/desmarcado de spoilers) y cambiar roles de otros usuarios (`"Espectador"` ↔ `"Critico"`).

### 3.2. Entidad Reseña
- **`Resena`:**
  - Campos privados: `#id`, `#peliculaId`, `#autorId`, `#puntuacion` (entre 0.5 y 5 en pasos de 0.5), `#texto` (mínimo 10 caracteres), `#contieneSpoilers`, `#vistaPreviamente`, `#esFavorita`, `#fechaVisionado` (no admite fechas futuras), `#fechaCreacion`, `#likes`, `#esDestacada`.
  - Métodos de negocio:
    - `esAutor(userId)`: comprueba propiedad de la reseña.
    - `actualizar(cambios)`: actualiza datos editoriales o estado de spoilers validando invariantes.
    - `toggleLike(userId)`: agrega o retira likes de forma idempotente por usuario.
    - `paraExponer()`: serializa los atributos canónicos para su consumo seguro por la API.
