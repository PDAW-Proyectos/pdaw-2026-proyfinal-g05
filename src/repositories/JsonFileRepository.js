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

  async guardar(datos) {
    if (!Array.isArray(datos)) {
      throw new TypeError('Los datos a persistir deben ser un arreglo.');
    }

    await this.#asegurarDirectorio();

    const tempPath = `${this.#filePath}.${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`;
    const jsonString = JSON.stringify(datos, null, 2);

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
