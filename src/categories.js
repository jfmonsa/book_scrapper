import puppeteer from "puppeteer";
import { pool } from "./db.js";

//Aux functions
/*
  output
  * return an array of objects such as each object has the form:
    cat = {
      categorie: <str>,
      subcategories: [<str1>, <str2>, ... <strn>]
    }
*/
const getCategories = async () => {
  // Start a Puppeteer session
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });

  // Open a new page
  const page = await browser.newPage();

  await page.goto("https://es.singlelogin.re/categories", {
    waitUntil: "domcontentloaded",
  });

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
  // Close the browser
  await browser.close();

  return data;
};

const queryCategories = async (data) => {
  // Inserta los datos en la base de datos
  try {
    for (const category of data) {
      // Inserta la categoría
      const resCategory = await pool.query(
        "INSERT INTO CATEGORY (categoryName) VALUES ($1) RETURNING id",
        [category.category_name]
      );

      const categoryId = resCategory.rows[0].id;

      // Inserta las subcategorías
      for (const subcategory of category.subcategories) {
        await pool.query(
          "INSERT INTO SUBCATEGORY (subCategoryName, idCategoryFather) VALUES ($1, $2)",
          [subcategory, categoryId]
        );
      }
    }
    console.log("Query succesfull!!!");
  } catch (error) {
    console.error("Error insertando los datos:", error);
  } finally {
  }
};

const getAndQueryCategories = async () => {
  const data = await getCategories();
  //display data
  console.log(JSON.stringify(data, null, 2));
  await queryCategories(data);
};

export default getAndQueryCategories;
