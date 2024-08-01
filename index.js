import getBooks from "./books.js";
import getAndQueryCategories from "./categories.js";
//import readline from "readline";
import readline from "readline-sync";

/*const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});*/

function showMenu() {
  console.log(`
    Menú:
    1. scrappear libros relacionados
    2. scrappear categorias
    3. Salir
    
    Por favor, selecciona una opción: `);
}

// Aux function
/*function askQuestion(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}*/

async function handleOption(option) {
  switch (option) {
    case "1":
      const url = readline.question(
        `
        Ej: "https://es.singlelogin.re/users/zrecommended#959363"
        Ingresa la url que recomienda los libros: `
      );
      await getBooks(url);
      break;
    case "2":
      const conf = readline.question(
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

  let cotinue = readline.question("¿Deseas continuar? (s/n): ");
  if (cotinue.trim().toLowerCase() != "s") return false;
  return true;
}

async function main() {
  let running = true;
  while (running) {
    showMenu();
    const option = readline.question("Selecciona una opción: ");
    running = await handleOption(option);
  }
}

main();
