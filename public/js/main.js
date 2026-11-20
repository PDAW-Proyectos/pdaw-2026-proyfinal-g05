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

    function esRolMod(rol) {
      return String(rol || '').trim() === 'Moderador';
    }

    function inyectarLinkPanelMod() {
      const navList = document.querySelector('#navContent .navbar-nav');
      if (!navList || document.getElementById('nav-panel-mod')) return;

      const li = document.createElement('li');
      li.className = 'nav-item';
      li.id = 'nav-panel-mod';

      const link = document.createElement('a');
      link.className = 'nav-link';
      link.href = '/panel-mod.html';
      link.textContent = 'Panel Mod';

      const rutaActual = (window.location && typeof window.location.pathname === 'string')
        ? window.location.pathname
        : '';
      if (rutaActual.includes('panel-mod.html')) {
        link.classList.add('active', 'text-white');
        link.setAttribute('aria-current', 'page');
      }

      li.appendChild(link);
      navList.appendChild(li);
    }

    function removerLinkPanelMod() {
      const item = document.getElementById('nav-panel-mod');
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

        if (esRolMod(usuario.rol)) {
          inyectarLinkPanelMod();
        } else {
          removerLinkPanelMod();
        }
      } else {
        if (userNavItem) userNavItem.classList.add('d-none');
        if (userBoltItem) userBoltItem.classList.add('d-none');
        if (btnLoginNav) btnLoginNav.classList.remove('d-none');
        removerLinkPanelMod();
      }
    }

    aplicarEstadoNavbar(null);

    if (btnLogout) {
      btnLogout.addEventListener('click', async (e) => {
        if (e && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
        removerLinkPanelMod();
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
        if (pathname.includes('perfil.html') || pathname.includes('panel-mod.html')) {
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
