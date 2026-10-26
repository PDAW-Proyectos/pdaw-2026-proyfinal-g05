'use strict';

(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const toggleButtons = document.querySelectorAll('.btn-toggle-password');
    const form = document.getElementById('form-login');
    const alertaError = document.getElementById('alerta-error');

    toggleButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        const icon = btn.querySelector('i');
        if (input.type === 'password') {
          input.type = 'text';
          icon.classList.replace('bi-eye', 'bi-eye-slash');
        } else {
          input.type = 'password';
          icon.classList.replace('bi-eye-slash', 'bi-eye');
        }
      });
    });

    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (alertaError) {
        alertaError.classList.add('d-none');
        alertaError.textContent = '';
      }

      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');

      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!email || !password) {
        if (alertaError) {
          alertaError.textContent = 'Correo o contraseña incorrectos';
          alertaError.classList.remove('d-none');
        }
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
      }

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error('Correo o contraseña incorrectos');
        }

        const nombre = data.nombre || data.email || 'Usuario';
        localStorage.setItem('usuarioNombre', nombre);
        localStorage.setItem('usuario', JSON.stringify(data));

        window.location.assign('/');
      } catch (err) {
        if (alertaError) {
          alertaError.textContent = 'Correo o contraseña incorrectos';
          alertaError.classList.remove('d-none');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
        }
      }
    });
  });
})();
