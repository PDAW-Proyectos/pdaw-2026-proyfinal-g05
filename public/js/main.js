'use strict';

(() => {
  document.addEventListener('DOMContentLoaded', () => {
    try {
      sessionStorage.removeItem('cerrandoSesion');
    } catch (_) {}

    const usuarioNombre = localStorage.getItem('usuarioNombre');
    const userNavItem = document.getElementById('user-nav-item');
    const userBoltItem = document.getElementById('user-bolt-item');
    const userNavName = document.getElementById('user-nav-name');
    const btnLoginNav = document.getElementById('btn-login-nav');
    const btnLogout = document.getElementById('btn-logout');

    if (usuarioNombre && userNavItem && userNavName && btnLoginNav) {
      userNavName.textContent = usuarioNombre.toUpperCase();
      userNavItem.classList.remove('d-none');
      if (userBoltItem) userBoltItem.classList.remove('d-none');
      btnLoginNav.classList.add('d-none');
    } else {
      if (userNavItem) userNavItem.classList.add('d-none');
      if (userBoltItem) userBoltItem.classList.add('d-none');
      if (btnLoginNav) btnLoginNav.classList.remove('d-none');
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', async (e) => {
        if (e && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
        try {
          sessionStorage.setItem('cerrandoSesion', 'true');
        } catch (_) {}

        if (typeof window.API !== 'undefined' && typeof window.API.limpiarSesion === 'function') {
          window.API.limpiarSesion();
        } else {
          try {
            localStorage.removeItem('userId');
            localStorage.removeItem('token');
            localStorage.removeItem('usuarioNombre');
            localStorage.removeItem('usuarioRol');
            localStorage.removeItem('usuario');
          } catch (_) {}
        }

        try {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
        } catch (_) {}

        if (window.location && typeof window.location.pathname === 'string' && window.location.pathname.includes('perfil.html')) {
          window.location.href = '/index.html';
        } else {
          window.location.reload();
        }
      });
    }
  });
})();
