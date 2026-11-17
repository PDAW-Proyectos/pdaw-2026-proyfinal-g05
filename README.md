# MovieClub

> Una comunidad para escribir reseñas y sumar nuevas peliculas para ver en el futuro.

Proyecto del equipo 5 para _7513 · Proyecto de Desarrollo de Aplicaciones Web_
(Tecnicatura Universitaria en Programación Web y Móvil — DCIC — UNS).

## Ficha del proyecto

| Aspecto                | Descripción                                                     |
| ---------------------- | --------------------------------------------------------------- |
| Problema               | La necesidad de conocer la opinion de los consumidores del cine |
| Usuarios               | Cualquier persona interesada en peliculas                       |
| Funcionalidades núcleo | 1. Puntuar peliculas 2. Agregar a una Watchlist                 |
| Reglas de negocio      | 1. Evitar spoilers 2. Conectar personas                         |
| API externa            | TheMovieDB (https://www.themoviedb.org/)                        |

## Equipo y roles del sprint actual

| Integrante       | Usuario de GitHub | Rol en el sprint      |
| ---------------- | ----------------- | --------------------- |
| Martinez, Maximo | Maximomartine6294 | Referente de producto |
| Chamusco, Branco | Chamus12          | Facilitación          |
| Todos            | \*                | Repositorio           |
| Safe, Lucas      | Lucassafe         | Calidad               |

## Cómo ejecutar el proyecto

```bash
npm install
cp .env.example .env
npm run dev
```

## Cómo ejecutar las pruebas

```bash
npm test
```

## Documentación

- Guía de uso para usuarios (Manual): [`docs/guia-de-usuario.md`](docs/guia-de-usuario.md)
- Especificación de la API (Endpoints): [`docs/endpoints.md`](docs/endpoints.md)
- Arquitectura del sistema: [`docs/arquitectura.md`](docs/arquitectura.md)
- Decisiones de arquitectura (ADRs): [`docs/adr/`](docs/adr/)
  - [ADR 001: Sesiones de Express con cookies HttpOnly vs. JWT](docs/adr/001-sesiones-express.md)
  - [ADR 002: Aislamiento de TMDB mediante Adaptador y Servicio](docs/adr/002-adaptador-tmdb.md)
- Diagramas y wireframes: [`docs/`](docs/)
- Acuerdos de trabajo y convenciones: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- Riesgos: [`docs/riesgos.md`](docs/riesgos.md)

## Declaración de uso de herramientas de IA

## Herramientas utilizadas

| Herramienta | Versión o plan | Integrantes |
| :--- | :--- | :--- |
| Figma AI / Plugins | Gratuito / Web | Todos |
| Gemini (Google) | Gratuito / Web | Todos |

## Usos

| Tarea | Qué se pidió | Qué se adoptó | Cómo se verificó |
| :--- | :--- | :--- | :--- |
| *Ideación y UX* | Maquetación de vistas y wireframes en Figma | Sugerencias de grillas, disposición de componentes y estructura visual para las pantallas | Revisión manual y adaptación a la paleta de colores y componentes propios de MovieClub |
| *Desarrollo Frontend* | Desarrollo de interfaces con Bootstrap 5 y Vanilla JS (catálogo, feed, perfiles) | Componentes adaptados al diseño responsivo y clases utilitarias de Bootstrap | Ejecución local de la aplicación y validación visual en navegador |
| *Pruebas y QA* | Creación de pruebas unitarias e integrales (Jest) abarcando casos límite (edge cases) y manejo de errores | Estructuras de testeo robustas para validar escenarios de fallo y lógica de negocio | Ejecución de ⁠ npm test ⁠ verificando que todas las suites pasen en verde |
| *Seguridad y Refactorización* | Auditoría de código, corrección de vulnerabilidades y cumplimiento OWASP | Pautas de refactorización para erradicar ⁠ innerHTML ⁠ por ⁠ .textContent ⁠ y sanitizar entradas | Revisión estricta de código, análisis con linter y ejecución de tests de integración |

## Compromiso

Todas las personas del equipo comprendemos el código del repositorio, podemos explicarlo y modificarlo sin asistencia, y las partes generadas o sugeridas fueron revisadas, probadas y adaptadas por el equipo.
