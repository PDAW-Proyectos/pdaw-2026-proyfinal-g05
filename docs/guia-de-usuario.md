# Guía de Uso — MovieClub

**Nombre de la aplicación:** MovieClub  
**Acceso a la aplicación:** Ejecución local en `http://localhost:3000`  
**Versión:** 1.0.0  
**Cátedra:** Proyecto de Desarrollo de Aplicaciones Web (PDAW 2026) — DCIC — Universidad Nacional del Sur  
**Equipo:** Grupo 05  

---

## 1. ¿Para quién es?

MovieClub es una plataforma web orientada a la comunidad cinematográfica: amantes del cine, cinéfilos empedernidos, periodistas culturales y críticos que desean registrar sus visionados, redactar opiniones detalladas y participar en debates cinematográficos en un entorno seguro y libre de spoilers involuntarios.

### Roles de usuario del sistema

- **Visitante (Usuario Anónimo):** Cualquier persona interesada en el cine. Puede explorar el catálogo de películas en tendencia, realizar búsquedas de títulos en TMDB y leer reseñas comunitarias abiertas.
- **Espectador (Usuario Autenticado):** Miembro registrado de la comunidad. Puede calificar películas (de 0.5 a 5 estrellas), escribir y editar sus propias reseñas, registrar fechas de visionado, marcar películas como favoritas o vistas previamente (*rewatch*), dar *likes* y configurar su perfil.
- **Crítico de Cine:** Periodista o cinéfilo avalado ante un medio de prensa. Posee todos los privilegios del Espectador y, adicionalmente, sus publicaciones son catalogadas como **Reseñas Destacadas** dentro de la comunidad.
- **Moderador:** Miembro responsable del cuidado comunitario. Puede marcar o retirar advertencias de spoiler sobre reseñas de cualquier usuario para proteger a los lectores, eliminar publicaciones inadecuadas y gestionar los roles de la comunidad (promover a Crítico o degradar a Espectador).

---

## 2. Primeros pasos

### Cómo ingresar y requisitos
1. **Acceso al sistema:** Abra un navegador web moderno (Google Chrome, Mozilla Firefox, Microsoft Edge o Safari) e ingrese a `http://localhost:3000` con el servidor en ejecución (`npm run dev`).
2. **Requisitos de red:** Conexión a internet estable (necesaria para el consumo en tiempo real del catálogo de The Movie Database - TMDB).
3. **Registro de nueva cuenta:** Si no dispone de un usuario, haga clic en el botón **"Registrarse"** de la barra de navegación superior, complete su nombre, email y contraseña (mínimo 6 caracteres). El sistema iniciará su sesión automáticamente con el rol `"Espectador"`.

### Datos de prueba iniciales (Cuentas predeterminadas)

Para facilitar la evaluación integral del proyecto sin necesidad de crear cuentas nuevas, el sistema cuenta con los siguientes usuarios de prueba ya cargados en la base de datos (`data/usuarios.json`):

| Rol | Nombre | Correo Electrónico | Contraseña | Propósito en la Evaluación |
| :--- | :--- | :--- | :--- | :--- |
| **Moderador** | Thomas Anderson | `neo@movieclub.com` | `password123` | Evaluar control de spoilers en cualquier reseña y cambio de roles de usuarios. |
| **Espectador** | Maxi Martinez | `maxi@movieclub.com` | `password123` | Evaluar flujo estándar de reseñas, favoritos y edición de perfil. |
| **Espectador** | Tyler Durden | `tyler@movieclub.com` | `password123` | Cuenta candidata para probar la promoción a Crítico por parte del Moderador. |
| **Espectador** | Mia Wallace | `mia@movieclub.com` | `password123` | Pruebas de interacción comunitaria y lectura protegida de spoilers. |

---

## 3. Tareas principales (Paso a paso)

---

### Tarea 1: Explorar el catálogo y películas populares

Permite descubrir títulos cinematográficos destacados en tiempo real.

- **Paso a paso:**
  1. Diríjase a la página principal (`index.html`) mediante el logo o la opción **"Inicio"**.
  2. En la sección **"Películas Populares"**, observará una cuadrícula con los títulos en tendencia provistos por la API de TMDB.
  3. Cada tarjeta muestra el póster oficial, el título y el año de estreno.
  4. Haga clic sobre cualquier tarjeta de película para acceder a su ficha técnica completa.
- **Descripción visual:** Cuadrícula responsiva de pósters cinematográficos con tarjetas limpias y bordes sutiles sin efectos distorsionantes.
- **¿Qué hacer si algo sale mal?**
  - *Si las películas no cargan:* Verifique su conexión a internet. Si el proveedor TMDB tiene intermitencias temporales, el sistema responderá con un error `502 Bad Gateway`. Aguarde unos instantes mientras el mecanismo de reintentos restablece la conexión.

---

### Tarea 2: Buscar películas en TMDB

Permite localizar cualquier obra dentro de la base de datos cinematográfica global.

- **Paso a paso:**
  1. Ingrese al buscador desde el campo de la barra superior o navegando a `buscador.html`.
  2. Escriba al menos 2 caracteres del título buscado (ej: *"Matrix"*, *"Inception"*, *"Pulp Fiction"*).
  3. El sistema realizará una consulta en tiempo real mediante el adaptador del backend y listará las coincidencias con póster, título original, año y sinopsis.
  4. Seleccione la película deseada para ver el reparto, duración, géneros y el botón de escribir reseña.
- **¿Qué hacer si algo sale mal?**
  - *Mensaje "El parámetro de búsqueda (q) es obligatorio":* Ingrese al menos 2 caracteres válidos en la caja de búsqueda.

---

### Tarea 3: Escribir y publicar una reseña

Permite expresar una opinión crítica y calificar una obra visionada.

- **Paso a paso:**
  1. Asegúrese de haber iniciado sesión con su cuenta.
  2. Desde la ficha de la película seleccionada, haga clic en **"Escribir Reseña"** (o desde `resenas.html` en **"Nueva Reseña"**).
  3. **Puntuación:** Elija una nota entre **0.5 y 5 estrellas** (admite medias estrellas para mayor fidelidad crítica).
  4. **Texto:** Escriba su análisis crítico (mínimo obligatorio: 10 caracteres).
  5. **Opciones adicionales:**
     - Marque **"Contiene spoilers"** si revela eventos cruciales de la trama.
     - Marque **"Vista previamente"** si se trata de un revisionado (*rewatch*).
     - Marque **"Película favorita"** para sumarla a su colección destacada.
     - Indique la **Fecha de visionado** (el calendario no permite seleccionar fechas futuras).
  6. Presione **"Publicar Reseña"**.
  7. El sistema guardará la reseña (`201 Created`), la integrará al feed público y la marcará con insignia **"Destacada"** si su usuario posee rol de Crítico.
- **¿Qué hacer si algo sale mal?**
  - *Mensaje "Acceso no autorizado: se requiere iniciar sesión":* Inicie sesión con su usuario y contraseña antes de enviar el formulario.
  - *Mensaje "La puntuación debe ser un número entre 0.5 y 5":* Seleccione una calificación válida con las estrellas del formulario.
  - *Mensaje "La fecha de visionado no puede ser futura":* Verifique que la fecha ingresada sea igual o anterior a la fecha actual.

---

### Tarea 4: Edición y eliminación de reseñas propias

Permite actualizar o borrar una publicación creada anteriormente.

- **Paso a paso para editar:**
  1. Ingrese a la reseña que desea modificar (desde el feed o desde su perfil).
  2. Si usted es el autor original, verá el botón **"Editar Reseña"**.
  3. Modifique la puntuación, el texto o las marcas de spoiler y favoritos.
  4. Haga clic en **"Guardar Cambios"**. La actualización se aplicará de forma parcial e instantánea (`PATCH`).
- **Paso a paso para eliminar:**
  1. En el detalle de su reseña, presione el botón **"Eliminar"**.
  2. Confirme el diálogo de advertencia para completar la eliminación definitiva (`204 No Content`).
- **¿Qué hacer si algo sale mal?**
  - *Error 403 Forbidden:* Ocurre si intenta editar o borrar una reseña que pertenece a otro miembro de la comunidad. Solo el autor original o un Moderador tienen permisos de gestión sobre el contenido.

---

### Tarea 5: Control y moderación de spoilers (Rol Moderador)

Permite proteger a la comunidad de revelaciones no advertidas en el argumento de las películas.

- **Comportamiento visual para el lector:**
  - Cuando una reseña está marcada con spoilers, su contenido aparece velado con un filtro de desenfoque y una etiqueta de advertencia:  
     *"Esta reseña contiene spoilers. Haz clic para revelarla."*
  - El texto solo se vuelve legible si el lector hace clic explícito sobre la advertencia.
- **Acción del Moderador (Paso a paso):**
  1. Inicie sesión con una cuenta de Moderador .
  2. En el detalle de cualquier reseña comunitaria, verá los botones de moderación:
     - Si la reseña revela la trama sin advertencia: presione **"Marcar como Spoiler"**.
     - Si fue marcada por error: presione **"Quitar marca de Spoiler"**.
  3. El sistema actualizará el estado de la reseña en tiempo real sin modificar el texto editorial del autor.
- **¿Qué hacer si algo sale mal?**
  - *Los botones de moderación no aparecen:* Verifique haber iniciado sesión con una cuenta que posea el rol `"Moderador"`. Los usuarios estándar (`"Espectador"`) no pueden moderar reseñas ajenas.

---

### Tarea 6: Gestión comunitaria de roles (Rol Moderador)

Permite promover o degradar el rol comunitario de los miembros del club.

- **Paso a paso:**
  1. Inicie sesión como Moderador .
  2. Acceda a la vista de miembros de la comunidad o perfil de usuario.
  3. Ubique al usuario destino .
  4. Presione **"Cambiar Rol"**:
     - **Para promover a Crítico:** Seleccione `"Hacer Critico"` . A partir de ese momento, sus reseñas serán publicadas como destacadas.
     - **Para degradar a Espectador:** Seleccione `"Espectador"` y confirme. El usuario perderá la atribución de reseñas destacadas.
- **¿Qué hacer si algo sale mal?**
  - *Error 400 Bad Request:* Asegúrese de seleccionar un rol válido (`"Espectador"` o `"Critico"`). El sistema no permite auto-moderar el propio rol de moderador para evitar pérdidas accidentales de acceso administrativo.

---

## 4. Preguntas frecuentes (FAQ)


### ¿Por qué me apareció un cartel de "Sesión Expirada"?
Por motivos de seguridad y resguardo de la cuenta, MovieClub implementa una política de expiración activa tras **15 minutos de inactividad**. Además, un proceso en segundo plano (*heartbeat* cada 3 segundos) comprueba la vigencia de la sesión. Si caduca, la pantalla se bloquea con un modal obligatorio que lo redirige a `login.html` para reautenticarse.

### ¿Puedo cambiar mi correo electrónico en el perfil?
No. Por diseño de integridad y consistencia de las cuentas en el dominio, el correo electrónico es inmutable. En su perfil (`perfil.html`) usted puede modificar libremente su nombre visible y su alias `@usuario`.

### ¿Por qué algunas reseñas aparecen con la insignia "Destacada"?
Pertenecen a usuarios con rol de **Crítico de Cine** o **Moderador**. El sistema utiliza polimorfismo en el modelo de dominio para asignar automáticamente el atributo `esDestacada: true` a las opiniones de miembros con dicho rol.

---

## 5. Contacto / Soporte

Esta aplicación fue desarrollada como trabajo final integrador para la cátedra de **Proyecto de Desarrollo de Aplicaciones Web (PDAW 2026)** de la Universidad Nacional del Sur (DCIC - UNS).

**Equipo de desarrollo (Grupo 05):**
- **Máximo Martínez** — Referente de Producto y Desarrollo (`Maximomartine6294`)
- **Branco Chamusco** — Facilitación y Desarrollo (`Chamus12`)
- **Lucas Safe** — Calidad, Pruebas y Desarrollo (`Lucassafe`)

*Repositorio oficial:* [https://github.com/Maximomartine6294/pdaw-2026-proyfinal-g05](https://github.com/Maximomartine6294/pdaw-2026-proyfinal-g05)
