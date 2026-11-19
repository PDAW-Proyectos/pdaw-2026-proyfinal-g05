## Lecciones Aprendidas

### 1. Comunicación técnica y modularización del trabajo
En un desarrollo grupal, la disparidad de conocimientos previos y disponibilidad horaria es inevitable. Aprendimos que la clave para delegar eficientemente no radica solo en la empatía, sino en *desacoplar las tareas* y fomentar la escucha activa antes de escribir código. Analizar la factibilidad técnica de las propuestas de cada integrante y dividir el sistema en módulos independientes nos permitió avanzar en paralelo sin bloquear el flujo de trabajo cuando algún miembro tenía menor disponibilidad.

### 2. Primera integración con una API externa compleja (TMDB)
Integrar por primera vez una API externa de gran escala y riqueza de datos como **TMDB (The Movie Database)** implicó ir mucho más allá de realizar peticiones HTTP simples; nos exigió diseñar la arquitectura completa alrededor del consumo, transformación y presentación de esa información:

* **Lectura de documentación y diseño de contratos:** Aprendimos a navegar documentación oficial extensa para identificar los endpoints adecuados según cada caso de uso.
* **Protección de credenciales y capa de servicio:** Comprendimos la importancia de centralizar las consultas en un servicio dedicado del lado del servidor (`tmdbService`), gestionando la clave de acceso (`TMDB_API_KEY`) mediante variables de entorno para evitar su exposición en el cliente y normalizar los datos antes de enviarlos al frontend.
* **Optimización de peticiones y experiencia de usuario:** Enfrentamos problemas reales de rendimiento y consistencia visual al consumir datos externos. Esto nos llevó a implementar técnicas como *debounce* en el buscador para evitar saturar la API con cada pulsación de tecla, y buffers de paginación para garantizar cantidad de peticiones adecuadas y uniformes.