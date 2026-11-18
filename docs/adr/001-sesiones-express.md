# ADR 001: Uso de sesiones de Express con cookies HttpOnly en lugar de JWT


## Contexto
Necesitamos gestionar la autenticación de usuarios y mantener el estado de la sesión activa entre peticiones en una aplicación web con servidor Node.js/Express y vistas controladas mediante JavaScript Vanilla en el cliente, asegurando control de roles (Espectador, Crítico, Moderador).

## Alternativas consideradas
1. **JSON Web Tokens (JWT):** Almacenar un token firmado en el almacenamiento local del cliente (`localStorage`) o en cookies, validándolo en cada petición mediante middleware sin estado.
2. **Sesiones de Express (`express-session`) con cookies `HttpOnly`:** Guardar el estado de la sesión en el servidor y enviar únicamente un identificador de sesión firmado (`connect.sid`) mediante una cookie con las banderas `HttpOnly` y `SameSite=Lax`.

## Criterio de elección
Se eligió **Sesiones de Express con cookies HttpOnly** porque:
- Otorga mayor seguridad frente a ataques XSS al impedir que scripts maliciosos de terceros accedan al identificador de sesión desde el cliente (`localStorage` o `document.cookie`).
- Simplifica la invalidación inmediata de sesiones directamente desde el servidor al hacer logout (`req.session.destroy()`) o al degradar permisos.
- Permite mitigar ataques de fijación de sesión (OWASP A07) regenerando el identificador (`req.session.regenerate()`) tanto en el inicio de sesión como en el registro de nuevos usuarios.
- Facilita la expiración proactiva y controlada de la sesión por inactividad (`maxAge`).

## Consecuencias
- **Ventajas:** Mayor seguridad en el manejo de credenciales de sesión, protección contra robo de tokens y simplicidad en la implementación del backend.
- **Desafíos / Compensaciones:** Las sesiones se almacenan en el almacén del servidor, por lo que requieren persistencia compartida en caso de escalar horizontalmente a múltiples instancias (aceptado para la arquitectura actual basada en una única instancia).

