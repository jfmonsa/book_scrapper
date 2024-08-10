import puppeteer from "puppeteer";
import cloudinary from "./config/cloudinary.js";
import { pool } from "./db.js";

const CLOUDINARY_FOLDER = "bookCoverPics";

const getBooks = async (url) => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  });
  const page = await browser.newPage();

  try {
    await page.goto(url);
    const links = await getRecommendedBookLinks(page);

    for (const link of links) {
      await page.goto(link);
      const book = await extractBookInfo(page);
      await insertBookInfo(book);
    }
  } catch (error) {
    console.error("Error in getBooks:", error);
  } finally {
    await browser.close();
  }
};

// aux declarative functions
const getRecommendedBookLinks = async (page) => {
  await page.waitForSelector('div.bPcvCb > a.item[target="_blank"]');
  return page.evaluate(() =>
    Array.from(
      document.querySelectorAll('div.bPcvCb > a.item[target="_blank"]')
    ).map((link) => link.href)
  );
};

const extractBookInfo = async (page) => {
  return page.evaluate(async () => {
    const getTextContent = (selector) =>
      document.querySelector(selector)?.textContent.trim() || null;
    const getCoverImageSrc = () =>
      new Promise((resolve) => {
        setTimeout(() => {
          const hostElement = document.querySelector("z-cover");
          const imgElement =
            hostElement?.shadowRoot?.querySelector("img.image.cover");
          resolve(imgElement?.src || "default.jpg");
        }, 1600);
      });

    return {
      title: getTextContent(".col-sm-9 > h1"),
      author: getTextContent("a.color1"),
      description: getTextContent("div#bookDescriptionBox") || "No description",
      subcategory:
        getTextContent(".property_categories .property_value a")?.split(
          " - "
        )[1] || null,
      year: getTextContent(".property_year .property_value"),
      publisher: getTextContent(".property_publisher .property_value"),
      language: getTextContent(".property_language .property_value"),
      pages: getTextContent(".property_pages .property_value span"),
      isbn: getTextContent(".property_isbn .property_value"),
      fileType: getTextContent(".property__file .property_value"),
      coverPath: await getCoverImageSrc(),
    };
  });
};

const insertBookInfo = async (book) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    book.coverPath = await uploadImageToCloudinary(book.coverPath);
    const bookId = await insertBookRecord(client, book);
    await insertBookFiles(client, bookId);
    await insertBookAuthor(client, bookId, book.author);
    await insertBookLanguage(client, bookId, book.language);
    await insertBookSubcategory(client, bookId, book.subcategory);
    await client.query("COMMIT");
    console.log("Book inserted successfully:", book.title);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error inserting book data:", error);
  } finally {
    client.release();
  }
};

const uploadImageToCloudinary = async (imageUrl) => {
  if (imageUrl === "default.jpg") return imageUrl;
  const uploadResult = await cloudinary.uploader.upload(imageUrl, {
    folder: CLOUDINARY_FOLDER,
  });
  return uploadResult.secure_url;
};

const insertBookRecord = async (client, book) => {
  const { rows } = await client.query(
    `INSERT INTO BOOK (isbn, title, descriptionB, yearReleased, nPages, publisher, pathBookCover) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [
      book.isbn,
      book.title,
      book.description,
      book.year,
      book.pages,
      book.publisher,
      book.coverPath,
    ]
  );
  return rows[0].id;
};

const insertBookFiles = async (client, bookId) => {
  const fileTypes = ["book.pdf", "book.epub"];
  await Promise.all(
    fileTypes.map((fileType) =>
      client.query("INSERT INTO BOOK_FILES (idBook, pathF) VALUES ($1, $2)", [
        bookId,
        fileType,
      ])
    )
  );
};

const insertBookAuthor = async (client, bookId, author) => {
  await client.query(
    "INSERT INTO BOOK_AUTHORS (idBook, author) VALUES ($1, $2)",
    [bookId, author]
  );
};

const insertBookLanguage = async (client, bookId, language) => {
  await client.query(
    "INSERT INTO BOOK_LANG (idBook, languageB) VALUES ($1, $2)",
    [bookId, language]
  );
};

const insertBookSubcategory = async (client, bookId, subcategory) => {
  if (!subcategory) return;
  const { rows } = await client.query(
    "SELECT id FROM SUBCATEGORY WHERE subcategoryname = $1",
    [subcategory]
  );
  if (rows.length > 0) {
    await client.query(
      "INSERT INTO BOOK_IN_SUBCATEGORY (idBook, idSubcategory) VALUES ($1, $2)",
      [bookId, rows[0].id]
    );
  }
};

export default getBooks;
