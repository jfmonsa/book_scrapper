import getBooks from "./books.js";
import getAndQueryCategories from "./categories.js";
import readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function showMenu() {
  console.log(`
    Menú:
    1. scrappear libros relacionados
    2. scrappear categorias
    3. Salir
    
    Por favor, selecciona una opción: `);
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
      const conf = await askQuestion(
        `El scrapping de categorias solo debe realizarlo una vez, presione 's' para continuar: `
      );
      if (conf.trim().toLowerCase() === "s") {
        await getAndQueryCategories();
      } else {
        console.log("No se realizará el scrapping de categorías.");
      }
      break;
    case "3":
      console.log("Saliendo...");
      return false;
    default:
      console.log("Opción no válida. Por favor, intenta nuevamente.");
      break;
  }

  let cotinue = await askQuestion("¿Deseas continuar? (s/n): ");
  if (cotinue.trim().toLowerCase() != "s") return false;
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
