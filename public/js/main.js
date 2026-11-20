'use strict';

(() => {
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      sessionStorage.removeItem('cerrandoSesion');
    } catch (_) {}

    const userNavItem = document.getElementById('user-nav-item');
    const userBoltItem = document.getElementById('user-bolt-item');
    const userNavName = document.getElementById('user-nav-name');
    const btnLoginNav = document.getElementById('btn-login-nav');
    const btnLogout = document.getElementById('btn-logout');

    function esRolAdmin(rol) {
      return String(rol || '').trim() === 'Moderador';
    }

    function inyectarLinkPanelAdmin() {
      const navList = document.querySelector('#navContent .navbar-nav');
      if (!navList || document.getElementById('nav-panel-admin')) return;

      const li = document.createElement('li');
      li.className = 'nav-item';
      li.id = 'nav-panel-admin';

      const link = document.createElement('a');
      link.className = 'nav-link';
      link.href = '/panel-admin.html';
      link.textContent = 'Panel Admin';

      const rutaActual = (window.location && typeof window.location.pathname === 'string')
        ? window.location.pathname
        : '';
      if (rutaActual.includes('panel-admin.html')) {
        link.classList.add('active', 'text-white');
        link.setAttribute('aria-current', 'page');
      }

      li.appendChild(link);
      navList.appendChild(li);
    }

    function removerLinkPanelAdmin() {
      const item = document.getElementById('nav-panel-admin');
      if (item && item.parentNode) {
        item.parentNode.removeChild(item);
      }
    }

    function aplicarEstadoNavbar(usuario) {
      const nombre = usuario && usuario.nombre ? String(usuario.nombre).trim() : '';
      if (usuario && nombre && userNavItem && userNavName && btnLoginNav) {
        userNavName.textContent = nombre.toUpperCase();
        userNavItem.classList.remove('d-none');
        if (userBoltItem) userBoltItem.classList.remove('d-none');
        btnLoginNav.classList.add('d-none');

        if (esRolAdmin(usuario.rol)) {
          inyectarLinkPanelAdmin();
        } else {
          removerLinkPanelAdmin();
        }
      } else {
        if (userNavItem) userNavItem.classList.add('d-none');
        if (userBoltItem) userBoltItem.classList.add('d-none');
        if (btnLoginNav) btnLoginNav.classList.remove('d-none');
        removerLinkPanelAdmin();
      }
    }

    aplicarEstadoNavbar(null);

    if (btnLogout) {
      btnLogout.addEventListener('click', async (e) => {
        if (e && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
        removerLinkPanelAdmin();
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

        const pathname = window.location && typeof window.location.pathname === 'string'
          ? window.location.pathname
          : '';
        if (pathname.includes('perfil.html') || pathname.includes('panel-admin.html')) {
          window.location.href = '/index.html';
        } else {
          window.location.reload();
        }
      });
    }

    let usuarioServidor = null;
    if (typeof window.API !== 'undefined' && typeof window.API.obtenerUsuarioActual === 'function') {
      usuarioServidor = await window.API.obtenerUsuarioActual();
    } else {
      try {
        const resp = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'same-origin',
          headers: { Accept: 'application/json' }
        });
        if (resp.ok) {
          usuarioServidor = await resp.json();
        }
      } catch (_) {}
    }

    aplicarEstadoNavbar(usuarioServidor);
  });
})();
