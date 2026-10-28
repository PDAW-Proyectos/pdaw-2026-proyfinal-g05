'use strict';

(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const toggleButtons = document.querySelectorAll('.btn-toggle-password');
    const form = document.getElementById('form-registro');
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

      const nombreInput = document.getElementById('nombre');
      const emailInput = document.getElementById('email');
      const passwordInput = document.getElementById('password');

      const nombre = nombreInput ? nombreInput.value.trim() : '';
      const email = emailInput ? emailInput.value.trim() : '';
      const password = passwordInput ? passwordInput.value : '';

      if (!nombre) {
        if (alertaError) {
          alertaError.textContent = 'El nombre es obligatorio';
          alertaError.classList.remove('d-none');
        }
        return;
      }

      if (!email || !email.includes('@')) {
        if (alertaError) {
          alertaError.textContent = 'El email es obligatorio y debe tener formato válido';
          alertaError.classList.remove('d-none');
        }
        return;
      }

      if (!password || password.length < 6) {
        if (alertaError) {
          alertaError.textContent = 'La contraseña debe tener al menos 6 caracteres';
          alertaError.classList.remove('d-none');
        }
        return;
      }

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
      }

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ nombre, email, password })
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(data.error || 'Ocurrió un error al registrar la cuenta');
        }

        const nombreUsuario = data.nombre || data.email || 'Usuario';
        localStorage.setItem('usuarioNombre', nombreUsuario);
        localStorage.setItem('usuario', JSON.stringify(data));

        window.location.assign('/');
      } catch (err) {
        if (alertaError) {
          alertaError.textContent = err.message || 'Error al conectar con el servidor';
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
