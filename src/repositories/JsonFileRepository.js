const fs = require('fs/promises');
const path = require('path');

class JsonFileRepository {
  #filePath;

  constructor(filePath) {
    if (!filePath || typeof filePath !== 'string') {
      throw new TypeError('La ruta del archivo debe ser una cadena de texto válida.');
    }
    this.#filePath = path.resolve(filePath);
  }

  get filePath() {
    return this.#filePath;
  }

  async #asegurarDirectorio() {
    const dir = path.dirname(this.#filePath);
    await fs.mkdir(dir, { recursive: true });
  }

  async leer() {
    await this.#asegurarDirectorio();

    try {
      const contenido = await fs.readFile(this.#filePath, 'utf-8');
      const datos = JSON.parse(contenido);

      if (!Array.isArray(datos)) {
        throw new Error(`El archivo ${this.#filePath} no contiene un arreglo JSON válido.`);
      }

      return typeof structuredClone === 'function'
        ? structuredClone(datos)
        : JSON.parse(JSON.stringify(datos));
    } catch (error) {
      if (error.code === 'ENOENT') {
        await this.guardar([]);
        return [];
      }
      throw new Error(`Error al leer el archivo JSON (${this.#filePath}): ${error.message}`);
    }
  }

  async findByEmail(email) {
    const todos = await this.leer();
    return todos.find((u) => typeof u.email === 'string' && u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  async findById(id) {
    const todos = await this.leer();
    return todos.find((u) => u.id === id) || null;
  }

  async guardar(datos) {
    let arreglo = datos;
    if (!Array.isArray(datos)) {
      const actuales = await this.leer();
      const raw = datos && typeof datos.toJSON === 'function' ? datos.toJSON() : datos;
      const idx = actuales.findIndex((item) => item.id === raw.id);
      if (idx !== -1) {
        actuales[idx] = raw;
      } else {
        actuales.push(raw);
      }
      arreglo = actuales;
    }

    await this.#asegurarDirectorio();

    const tempPath = `${this.#filePath}.${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`;
    const jsonString = JSON.stringify(arreglo, null, 2);

    try {
      await fs.writeFile(tempPath, jsonString, 'utf-8');
      await fs.rename(tempPath, this.#filePath);
    } catch (error) {
      try {
        await fs.unlink(tempPath);
      } catch (_) {}
      throw new Error(`Error al guardar en el archivo JSON (${this.#filePath}): ${error.message}`);
    }
  }
}

module.exports = JsonFileRepository;
