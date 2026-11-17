# ADR 002: Aislamiento de la API de TMDB mediante un Adaptador y Servicio en el Backend

## Estado
Aceptado

## Contexto
La aplicación necesita consumir datos cinematográficos en tiempo real (búsqueda, catálogo popular, detalles de películas, reparto y pósters) provistos por una API de terceros (The Movie Database - TMDB), la cual requiere una clave de autenticación privada (`API Key`) y está sujeta a límites de tasa de peticiones y latencia de red.

## Alternativas consideradas
1. **Consumo directo desde el Frontend:** Realizar las peticiones HTTP a TMDB directamente desde los scripts de JavaScript en el navegador del cliente.
2. **Capa intermedia en el Backend (Patrón Adaptador/Gateway):** Encapsular las peticiones en un servicio interno de Node.js (`TmdbService`) y estandarizar la respuesta mediante un adaptador (`TmdbAdapter`).

## Criterio de elección
Se eligió la **Capa intermedia en el Backend con Adaptador** porque:
- Evita exponer credenciales y claves privadas de la API en el código fuente que corre en el navegador del cliente.
- Permite implementar mecanismos de resiliencia centralizados:
  - Timeout determinista de 5 segundos utilizando `AbortSignal` para evitar conexiones colgadas.
  - Reintentos automáticos con backoff exponencial ante errores transitorios (`429 Too Many Requests` o `5xx`).
  - Caché en memoria con tiempo de vida (TTL) de 2 minutos para optimizar tiempos de respuesta y reducir consumo de cuota externa.
- Desacopla a la aplicación de posibles cambios de esquema o contratos en la API externa, mapeando los objetos de terceros a entidades canónicas del dominio de MovieClub.

## Consecuencias
- **Ventajas:** Seguridad robusta de credenciales, mayor tolerancia a fallos ante intermitencias del proveedor externo y mejor rendimiento gracias a la caché en memoria.
- **Desafíos / Compensaciones:** Añade una capa de abstracción adicional en el backend que requiere mantenimiento de los adaptadores en caso de actualizaciones mayores de la API externa.

