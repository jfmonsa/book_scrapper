import puppeteer from "puppeteer";
import fs from "fs/promises";

// Aux functions
const getCategories = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
  });

  const page = await browser.newPage();
  await page.goto("https://z-library.sk/categories", {
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

      result.push({
        category_name: categoryName,
        subcategories: subcategories,
      });
    });

    return result;
  });

  await browser.close();
  return data;
};

const writeSQLFile = async (data) => {
  // Variable para almacenar el contenido SQL
  let sqlContent = "";

  let categoryId = 1;
  for (const category of data) {
    sqlContent += `INSERT INTO CATEGORY (name) VALUES ('${category.category_name.replace(
      "'",
      "''"
    )}');\n`;

    for (const subcategory of category.subcategories) {
      sqlContent += `INSERT INTO SUBCATEGORY (name, id_category_father) VALUES ('${subcategory.replace(
        "'",
        "''"
      )}', ${categoryId});\n`;
    }

    categoryId += 1;
  }

  // Escribir en el archivo SQL
  await fs.writeFile("categories_insert.sql", sqlContent);
  console.log("SQL file written successfully!");
};

const getAndWriteCategories = async () => {
  const data = await getCategories();
  console.log(JSON.stringify(data, null, 2));
  await writeSQLFile(data);
};

export default getAndWriteCategories;
