const { ValidationError, BusinessRuleError } = require("../utils/errors");

class Usuario {
  #id;
  #nombre;
  #email;
  #passwordHash;
  #rol;
  #watchlist;
  #top4;
  #fechaRegistro;

  constructor({
    id,
    nombre,
    email,
    passwordHash,
    rol,
    watchlist = [],
    top4 = [],
    fechaRegistro,
  }) {
    if (new.target === Usuario) {
      throw new BusinessRuleError(
        "No se puede instanciar directamente la clase abstracta Usuario",
      );
    }

    if (!id || typeof id !== "string" || id.trim() === "") {
      throw new ValidationError("El id es obligatorio y debe ser un texto");
    }

    if (!nombre || typeof nombre !== "string" || nombre.trim() === "") {
      throw new ValidationError("El nombre es obligatorio y debe ser un texto");
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new ValidationError(
        "El email es obligatorio y debe tener un formato válido",
      );
    }

    if (
      !passwordHash ||
      typeof passwordHash !== "string" ||
      passwordHash.trim() === ""
    ) {
      throw new ValidationError("El passwordHash es obligatorio");
    }

    if (!rol || typeof rol !== "string" || rol.trim() === "") {
      throw new ValidationError("El rol es obligatorio");
    }

    if (!Array.isArray(watchlist)) {
      throw new ValidationError("La watchlist debe ser un arreglo");
    }

    if (!Array.isArray(top4) || top4.length > 4) {
      throw new ValidationError(
        "El Top 4 debe ser un arreglo de hasta 4 elementos",
      );
    }

    this.#id = id.trim();
    this.#nombre = nombre.trim();
    this.#email = email.trim().toLowerCase();
    this.#passwordHash = passwordHash;
    this.#rol = rol.trim();
    this.#watchlist = [...new Set(watchlist.map((p) => String(p).trim()))];
    this.#top4 = [...new Set(top4.map((p) => String(p).trim()))];
    this.#fechaRegistro = fechaRegistro || new Date().toISOString();
  }

  get id() {
    return this.#id;
  }

  get nombre() {
    return this.#nombre;
  }

  get email() {
    return this.#email;
  }

  get passwordHash() {
    return this.#passwordHash;
  }

  get rol() {
    return this.#rol;
  }

  get watchlist() {
    return [...this.#watchlist];
  }

  get top4() {
    return [...this.#top4];
  }

  get fechaRegistro() {
    return this.#fechaRegistro;
  }

  agregarAWatchlist(idPelicula) {
    if (!idPelicula || typeof idPelicula !== "string") {
      throw new ValidationError("El id de película es obligatorio");
    }
    const trimmed = idPelicula.trim();
    if (!this.#watchlist.includes(trimmed)) {
      this.#watchlist = [...this.#watchlist, trimmed];
    }
  }

  quitarDeWatchlist(idPelicula) {
    const trimmed = String(idPelicula).trim();
    this.#watchlist = this.#watchlist.filter((id) => id !== trimmed);
  }

  actualizarTop4(nuevasPeliculas) {
    if (!Array.isArray(nuevasPeliculas) || nuevasPeliculas.length > 4) {
      throw new BusinessRuleError("El Top 4 no puede tener más de 4 películas");
    }
    this.#top4 = [...new Set(nuevasPeliculas.map((p) => String(p).trim()))];
  }

  puedeModerar() {
    return false;
  }

  puedeDestacar() {
    return false;
  }

  static fromJSON(data) {
    if (!data || typeof data !== "object") {
      throw new ValidationError(
        "Los datos para reconstruir el usuario son inválidos",
      );
    }

    const { rol } = data;

    switch (rol) {
      case "Espectador":
        return new Espectador(data);
      case "Moderador":
        return new Moderador(data);
      case "Critico":
        return new Critico(data);
      default:
        throw new ValidationError(`Rol de usuario desconocido: ${rol}`);
    }
  }

  toJSON() {
    return {
      id: this.#id,
      nombre: this.#nombre,
      email: this.#email,
      passwordHash: this.#passwordHash,
      rol: this.#rol,
      watchlist: [...this.#watchlist],
      top4: [...this.#top4],
      fechaRegistro: this.#fechaRegistro,
    };
  }

  paraExponer() {
    return {
      id: this.#id,
      nombre: this.#nombre,
      email: this.#email,
      rol: this.#rol,
      watchlist: [...this.#watchlist],
      top4: [...this.#top4],
      fechaRegistro: this.#fechaRegistro,
    };
  }
}

class Espectador extends Usuario {
  constructor({
    id,
    nombre,
    email,
    passwordHash,
    watchlist,
    top4,
    fechaRegistro,
  }) {
    super({
      id,
      nombre,
      email,
      passwordHash,
      rol: "Espectador",
      watchlist,
      top4,
      fechaRegistro,
    });
  }

  crearResena(datosResena) {
    return { ...datosResena, idAutor: this.id };
  }

  editarResena(resena, nuevosDatos) {
    if (resena.idAutor !== this.id) {
      throw new BusinessRuleError("No puedes editar una reseña de otro autor");
    }
    return { ...resena, ...nuevosDatos };
  }
}

class Moderador extends Usuario {
  constructor({
    id,
    nombre,
    email,
    passwordHash,
    watchlist,
    top4,
    fechaRegistro,
  }) {
    super({
      id,
      nombre,
      email,
      passwordHash,
      rol: "Moderador",
      watchlist,
      top4,
      fechaRegistro,
    });
  }

  puedeModerar() {
    return true;
  }

  eliminarResenaOfensiva() {
    return true;
  }
}

class Critico extends Usuario {
  #medioDePrensa;

  constructor({
    id,
    nombre,
    email,
    passwordHash,
    medioDePrensa,
    watchlist,
    top4,
    fechaRegistro,
  }) {
    super({
      id,
      nombre,
      email,
      passwordHash,
      rol: "Critico",
      watchlist,
      top4,
      fechaRegistro,
    });

    if (
      !medioDePrensa ||
      typeof medioDePrensa !== "string" ||
      medioDePrensa.trim() === ""
    ) {
      throw new ValidationError(
        "El medio de prensa es obligatorio para un Crítico",
      );
    }

    this.#medioDePrensa = medioDePrensa.trim();
  }

  get medioDePrensa() {
    return this.#medioDePrensa;
  }

  puedeDestacar() {
    return true;
  }

  crearResenaDestacada(datosResena) {
    return {
      ...datosResena,
      idAutor: this.id,
      esDestacada: true,
      medioDePrensa: this.#medioDePrensa,
    };
  }

  toJSON() {
    return {
      ...super.toJSON(),
      medioDePrensa: this.#medioDePrensa,
    };
  }

  paraExponer() {
    return {
      ...super.paraExponer(),
      medioDePrensa: this.#medioDePrensa,
    };
  }
}

module.exports = {
  Usuario,
  Espectador,
  Moderador,
  Critico,
};
