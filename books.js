import puppeteer from "puppeteer";
import downloadImg from "./getImage.js";
import { pool } from "./db.js";

//Aux functions
const getBookInfo = async (url, page) => {
  //go to the page of the link
  await page.goto(url);

  //Get the info
  const data = await page.evaluate(async () => {
    //Aux function
    const getTextContent = (selector) => {
      const element = document.querySelector(selector);
      return element ? element.textContent.trim() : null;
    };

    // Get book cover image
    const getCoverImageSrc = () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const hostElement = document.querySelector("z-cover");
          if (hostElement && hostElement.shadowRoot) {
            const shadowRoot = hostElement.shadowRoot;
            const imgElement = shadowRoot.querySelector("img.image.cover");
            resolve(imgElement ? imgElement.src : "default.jpg");
          } else {
            resolve(null);
          }
        }, 1600); // Espera 2 segundos
      });
    };

    const coverPath = await getCoverImageSrc();

    return {
      title: getTextContent(".col-sm-9 > h1"),
      author: getTextContent('a[itemprop="author"]'),
      description: getTextContent("div#bookDescriptionBox")
        ? getTextContent("div#bookDescriptionBox")
        : "No description",
      subcategory: getTextContent(".property_categories .property_value a")
        ? getTextContent(".property_categories .property_value a").split(
            " - "
          )[1]
        : null,
      year: getTextContent(".property_year .property_value"),
      publisher: getTextContent(".property_publisher .property_value"),
      language: getTextContent(".property_language .property_value"),
      pages: getTextContent(".property_pages .property_value span"),
      isbn: getTextContent(".property_isbn .property_value"),
      fileType: getTextContent(".property__file .property_value"),
      coverPath,
    };
  });
  return data;
};

const getListOfRecomendedBooks = async (url_recomended_zlibrary, page) => {
  // go to url
  await page.goto(url_recomended_zlibrary);

  // Save all related book's links in an array
  await page.waitForSelector('div.bPcvCb > a.item[target="_blank"]');

  const bookLinks = await page.evaluate(() => {
    const links = Array.from(
      document.querySelectorAll('div.bPcvCb > a.item[target="_blank"]')
    );
    return links.map((link) => link.href);
  });

  //return de array of related book's links
  return bookLinks;
};

const insertBookInfo = async (book) => {
  try {
    //Get image
    let file_name;
    if (book.coverPath === "default.jpg") {
      file_name = book.coverPath;
    } else {
      file_name = await downloadImg(book.coverPath);
    }

    // ==== insert into BOOK table =====
    const query_values = [
      book.isbn,
      book.title,
      book.description,
      book.year,
      //No existe vol en z-library
      null,
      book.pages,
      book.publisher,
      //file name saved in ./storage
      file_name,
    ];

    const newBook_query = await pool.query(
      "INSERT INTO BOOK (isbn, title, descriptionB, yearReleased, vol, nPages, publisher, pathBookCover) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id",
      query_values
    );

    // ==== insert into BOOK_FILES talbe =====
    // -- getting the auto increment id of BOOK
    const bookId = newBook_query.rows[0].id;

    // -- Get the paths of uploaded files
    const fileQueries = ["book.pdf, book.epub"].map((path) =>
      pool.query("INSERT INTO BOOK_FILES (idBook, pathF) VALUES ($1, $2)", [
        bookId,
        path,
      ])
    );
    await Promise.all(fileQueries);

    // ==== insert into BOOK_AUTHORS talbe =====
    const insertAuthorQueries = await pool.query(
      "INSERT INTO BOOK_AUTHORS (idBook, author) VALUES ($1, $2)",
      [bookId, book.author]
    );

    // ==== insert into BOOK_LANG talbe =====
    const insertLanguageQueries = await pool.query(
      "INSERT INTO BOOK_LANG (idBook, languageB) VALUES ($1, $2)",
      [bookId, book.language]
    );

    // ==== insert into  BOOK_IN_SUBCATEGORY table ====
    /**
     * 1. si la categoria existe, se hace un insert en   BOOK_IN_SUBCATEGORY
     */
    if (book.subcategory) {
      const verifyExistanceSubcategory = await pool.query(
        `SELECT id FROM SUBCATEGORY WHERE subcategoryname = '${book.subcategory}'`
      );
      if (verifyExistanceSubcategory.rows.length > 0) {
        const insertSubcategoryQueries = await pool.query(
          "INSERT INTO BOOK_IN_SUBCATEGORY (idBook, idSubcategory) VALUES ($1, $2)",
          [bookId, verifyExistanceSubcategory.rows[0].id]
        );
      }
    }
    console.log("Query succesfull!!!");
  } catch (error) {
    console.error("Error insertando los datos:", error);
  }
};

//Main function
/**
 * input:
 * Recibe como parametro la url que aprece en la barra del navegador
 * despues de haber seleccionado un libro para generar libros recomendados
 * en z-library
 *
 * output:
 * Hace scrapp de los 30 libros recomendados y los sube a la base de datos
 */

const getBooks = async (url) => {
  //start puppeteer
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });
  const page = await browser.newPage();

  const links = await getListOfRecomendedBooks(url, page);

  const bookData = [];
  for (const link of links) {
    const book = await getBookInfo(link, page);
    await insertBookInfo(book);
    bookData.push(book);
  }

  //print data to debug
  console.log(JSON.stringify(bookData, null, 2));

  //Guardar datos en la bd

  // Close the browser
  await browser.close();
};

export default getBooks;
