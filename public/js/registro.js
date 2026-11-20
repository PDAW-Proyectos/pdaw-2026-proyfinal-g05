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

    const nombreInput = document.getElementById('nombre');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const errorNombre = document.getElementById('error-nombre');
    const errorEmail = document.getElementById('error-email');
    const errorPassword = document.getElementById('error-password');
    const errorConfirmPassword = document.getElementById('error-confirm-password');

    let registerAbortController = null;

    function mostrarErrorCampo(input, errorElem, mensaje) {
      if (errorElem) {
        errorElem.textContent = mensaje;
        errorElem.classList.add('d-block');
      }
      if (input) {
        input.classList.add('is-invalid');
      }
    }

    function limpiarErrorCampo(input, errorElem) {
      if (errorElem) {
        errorElem.textContent = '';
        errorElem.classList.remove('d-block');
      }
      if (input) {
        input.classList.remove('is-invalid');
      }
    }

    function mostrarAlerta(mensaje) {
      if (alertaError) {
        alertaError.textContent = mensaje;
        alertaError.classList.remove('d-none');
      }
    }

    function ocultarAlerta() {
      if (alertaError) {
        alertaError.classList.add('d-none');
        alertaError.textContent = '';
      }
    }

    function validarNombreEnTiempoReal() {
      const val = nombreInput ? nombreInput.value.trim() : '';
      if (val.length > 20) {
        const msg = 'El nombre no puede tener más de 20 caracteres';
        mostrarErrorCampo(nombreInput, errorNombre, msg);
        mostrarAlerta(msg);
        return false;
      }
      limpiarErrorCampo(nombreInput, errorNombre);
      if (alertaError && alertaError.textContent === 'El nombre no puede tener más de 20 caracteres') {
        ocultarAlerta();
      }
      return true;
    }

    function validarPasswordReglas(password) {
      if (!password || password.length < 6) {
        return { valida: false, mensaje: 'La contraseña debe tener al menos 6 caracteres' };
      }
      if (!/[A-Z]/.test(password) || !/\d/.test(password)) {
        return { valida: false, mensaje: 'La contraseña debe incluir al menos una mayúscula y un número' };
      }
      return { valida: true, mensaje: '' };
    }

    function validarPasswordEnTiempoReal(mostrarSiInvalida = false) {
      const password = passwordInput ? passwordInput.value : '';
      if (!password && !mostrarSiInvalida) {
        limpiarErrorCampo(passwordInput, errorPassword);
        return true;
      }
      const { valida, mensaje } = validarPasswordReglas(password);
      if (valida) {
        limpiarErrorCampo(passwordInput, errorPassword);
        if (
          alertaError &&
          (alertaError.textContent === 'La contraseña debe tener al menos 6 caracteres' ||
            alertaError.textContent === 'La contraseña debe incluir al menos una mayúscula y un número')
        ) {
          ocultarAlerta();
        }
        return true;
      }
      if (mostrarSiInvalida) {
        mostrarErrorCampo(passwordInput, errorPassword, mensaje);
      }
      return false;
    }

    function validarConfirmacionEnTiempoReal() {
      const password = passwordInput ? passwordInput.value : '';
      const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value : '';
      if (confirmPassword && password !== confirmPassword) {
        mostrarErrorCampo(confirmPasswordInput, errorConfirmPassword, 'Las contraseñas no coinciden');
        return false;
      }
      limpiarErrorCampo(confirmPasswordInput, errorConfirmPassword);
      if (alertaError && alertaError.textContent === 'Las contraseñas no coinciden') {
        ocultarAlerta();
      }
      return true;
    }

    if (nombreInput) {
      nombreInput.addEventListener('input', validarNombreEnTiempoReal);
      nombreInput.addEventListener('blur', validarNombreEnTiempoReal);
    }

    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        const yaTeniaError = passwordInput.classList.contains('is-invalid');
        validarPasswordEnTiempoReal(yaTeniaError);
        validarConfirmacionEnTiempoReal();
      });
      passwordInput.addEventListener('blur', () => {
        if (passwordInput.value) {
          validarPasswordEnTiempoReal(true);
        }
      });
    }

    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', validarConfirmacionEnTiempoReal);
      confirmPasswordInput.addEventListener('blur', validarConfirmacionEnTiempoReal);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      ocultarAlerta();

      limpiarErrorCampo(nombreInput, errorNombre);
      limpiarErrorCampo(emailInput, errorEmail);
      limpiarErrorCampo(passwordInput, errorPassword);
      limpiarErrorCampo(confirmPasswordInput, errorConfirmPassword);

      const formData = new FormData(form);
      const nombre = String(formData.get('nombre') || '').trim();
      const email = String(formData.get('email') || '').trim();
      const password = String(formData.get('password') || '');
      const confirmPassword = String(formData.get('confirmPassword') || '');

      if (!nombre) {
        const msg = 'El nombre es obligatorio';
        mostrarErrorCampo(nombreInput, errorNombre, msg);
        if (nombreInput) nombreInput.focus();
        mostrarAlerta(msg);
        return;
      }

      if (nombre.length < 2) {
        const msg = 'El nombre debe tener al menos 2 caracteres';
        mostrarErrorCampo(nombreInput, errorNombre, msg);
        if (nombreInput) nombreInput.focus();
        mostrarAlerta(msg);
        return;
      }

      if (nombre.length > 20) {
        const msg = 'El nombre no puede tener más de 20 caracteres';
        mostrarErrorCampo(nombreInput, errorNombre, msg);
        if (nombreInput) nombreInput.focus();
        mostrarAlerta(msg);
        return;
      }

      if (!email || !email.includes('@')) {
        const msg = 'El email es obligatorio y debe tener formato válido';
        mostrarErrorCampo(emailInput, errorEmail, msg);
        if (emailInput) emailInput.focus();
        mostrarAlerta(msg);
        return;
      }

      const checkPassword = validarPasswordReglas(password);
      if (!checkPassword.valida) {
        mostrarErrorCampo(passwordInput, errorPassword, checkPassword.mensaje);
        if (passwordInput) passwordInput.focus();
        mostrarAlerta(checkPassword.mensaje);
        return;
      }

      if (!confirmPassword) {
        const msg = 'Debés repetir la contraseña';
        mostrarErrorCampo(confirmPasswordInput, errorConfirmPassword, msg);
        if (confirmPasswordInput) confirmPasswordInput.focus();
        mostrarAlerta(msg);
        return;
      }

      if (password !== confirmPassword) {
        const msg = 'Las contraseñas no coinciden';
        mostrarErrorCampo(confirmPasswordInput, errorConfirmPassword, msg);
        if (confirmPasswordInput) confirmPasswordInput.focus();
        mostrarAlerta(msg);
        return;
      }

      if (registerAbortController) {
        registerAbortController.abort();
      }
      registerAbortController = new AbortController();

      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
      }

      try {
        if (typeof API !== 'undefined' && typeof API.register === 'function') {
          await API.register(
            { nombre, email, password, confirmPassword },
            { signal: registerAbortController.signal }
          );
        } else {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, email, password, confirmPassword }),
            signal: registerAbortController.signal
          });

          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            throw new Error(data.error || 'Ocurrió un error al registrar la cuenta');
          }

          const nombreUsuario = data.nombre || data.email || 'Usuario';
          if (data.id) {
            localStorage.setItem('userId', String(data.id));
          }
          localStorage.setItem('usuarioNombre', nombreUsuario);
          localStorage.removeItem('usuario');
          localStorage.removeItem('usuarioRol');
        }

        window.location.assign('/');
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        mostrarAlerta(err.message || 'Error al conectar con el servidor');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
        }
      }
    });
  });
})();
