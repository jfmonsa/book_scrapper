import puppeteer from "puppeteer";
import pkg from "pg";
const { Client } = pkg;

const getQuotes = async () => {
  // Conexión a la base de datos
  //TODO: arreglar el archivo para que funcione importando el pool y hacerlo más modular

  const client = new Client({});

  await client.connect();

  // Start a Puppeteer session with:
  // - a visible browser (`headless: false` - easier to debug because you'll see the browser in action)
  // - no default viewport (`defaultViewport: null` - website page will in full width and height)
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  // Open a new page
  const page = await browser.newPage();

  // On this new page:
  // - open the "http://quotes.toscrape.com/" website
  // - wait until the dom content is loaded (HTML is ready)
  await page.goto("https://es.singlelogin.re/categories", {
    waitUntil: "domcontentloaded",
  });

  // Get page data
  // Extrae los datos
  const data = await page.evaluate(() => {
    const containers = document.querySelectorAll("div.subcategories-container");
    const result = [];

    containers.forEach((container) => {
      const categoryName = container
        .querySelector("h3.category-name")
        ?.textContent.trim();
      const subcategoryElements = container.querySelectorAll(
        "li.subcategory-name"
      );
      const subcategories = Array.from(subcategoryElements).map((el) =>
        el.textContent.trim().replace(/\s*\(\d+\)$/, "")
      );

      // return ;
      result.push({
        category_name: categoryName,
        subcategories: subcategories,
      });
    });

    return result;
  });

  //display data
  console.log(JSON.stringify(data, null, 2));

  // Inserta los datos en la base de datos
  try {
    for (const category of data) {
      // Inserta la categoría
      const resCategory = await client.query(
        "INSERT INTO CATEGORY (categoryName) VALUES ($1) RETURNING id",
        [category.category_name]
      );

      const categoryId = resCategory.rows[0].id;

      // Inserta las subcategorías
      for (const subcategory of category.subcategories) {
        await client.query(
          "INSERT INTO SUBCATEGORY (subCategoryName, idCategoryFather) VALUES ($1, $2)",
          [subcategory, categoryId]
        );
      }
    }
    console.log("Query succesfull!!!");
  } catch (error) {
    console.error("Error insertando los datos:", error);
  } finally {
    // Cierra la conexión a la base de datos
    await client.end();
  }

  // Close the browser
  await browser.close();
};

// Start the scraping
getQuotes();
