'use strict';

(() => {
  document.addEventListener('DOMContentLoaded', () => {
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
      btnLogout.addEventListener('click', async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' });
        } catch {}
        localStorage.removeItem('usuarioNombre');
        localStorage.removeItem('usuario');
        window.location.reload();
      });
    }
  });
})();
