import getBooks from "./books.js";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function showMenu() {
  console.log(`
    Por favor, selecciona una opción:
    1. scrappear libros relacionados
    2. scrappear categorias (Modificar para que funcione)
    3. Salir
    `);
}

// Aux function
function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function handleOption(option) {
  switch (option) {
    case "1":
      const url = await askQuestion(
        `
        Ej: "https://es.singlelogin.re/users/zrecommended#959363"
        Ingresa la url que recomienda los libros: `
      );
      await getBooks(url);
      break;
    case "2":
      const category = await askQuestion("Ingresa la categoría a scrappear: ");
      console.log(`Categoría ingresada: ${category}`);
      break;
    case "3":
      console.log("Saliendo...");
      return false;
    default:
      console.log("Opción no válida. Por favor, intenta nuevamente.");
      break;
  }

  const continueResponse = await askQuestion("¿Deseas continuar? (s/n): ");
  return continueResponse.toLowerCase() === "s";
}

async function main() {
  let running = true;
  while (running) {
    showMenu();
    const option = await askQuestion("Selecciona una opción: ");
    running = await handleOption(option);
  }
  rl.close();
}

main();
