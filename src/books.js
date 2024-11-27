import puppeteer from "puppeteer";
import cloudinary from "./config/cloudinary.js";
import fs from "fs/promises";

const CLOUDINARY_FOLDER = "bookCoverPics";
let sqlContent = "";

const getBooks = async (url) => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
  });
  const page = await browser.newPage();

  try {
    await page.goto(url);
    const links = await getRecommendedBookLinks(page);

    for (const link of links) {
      await page.goto(link);
      const book = await extractBookInfo(page);
      await generateSQLForBook(book);
    }
  } catch (error) {
    console.error("Error in getBooks:", error);
  } finally {
    await browser.close();
  }

  await fs.writeFile("books_insert.sql", sqlContent);
  console.log("SQL file written successfully!");
};

// Auxiliary declarative functions
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

const generateSQLForBook = async (book) => {
  // Upload the image to Cloudinary and get the secure URL
  book.coverPath = await uploadImageToCloudinary(book.coverPath);
  sqlContent += `
    INSERT INTO BOOK (isbn, title, description, year_released, number_of_pages, publisher, cover_img_path) 
    VALUES (${book.isbn ? `'${book.isbn}'` : "NULL"}, '${book.title.replace(
    "'",
    "''"
  )}', '${book.description.replace("'", "''")}', 
    ${book.year ? `'${book.year}'` : "NULL"}, ${
    book.pages ? `'${book.pages}'` : "NULL"
  }, 
    ${book.publisher ? `'${book.publisher.replace("'", "''")}'` : "NULL"},
    '${book.coverPath}');\n`;

  const bookIdPlaceholder = "CURRVAL('BOOK_id_seq')"; // only postgres
  sqlContent += generateSQLForBookFiles(bookIdPlaceholder);
  sqlContent += generateSQLForBookAuthor(bookIdPlaceholder, book.author);
  sqlContent += generateSQLForBookLanguage(bookIdPlaceholder, book.language);
  sqlContent += generateSQLForBookSubcategory(
    bookIdPlaceholder,
    book.subcategory
  );
};

const uploadImageToCloudinary = async (imageUrl) => {
  if (imageUrl === "default.jpg")
    return "https://res.cloudinary.com/dlja4vnrd/image/upload/v1723489266/bookCoverPics/di2bbfam1c7ncljxnfw8.jpg";
  const uploadResult = await cloudinary.uploader.upload(imageUrl, {
    folder: CLOUDINARY_FOLDER,
  });
  return uploadResult.secure_url;
};

const generateSQLForBookFiles = (bookId) => {
  const fileTypes = [
    {
      name: "book.pdf",
      url: "https://res.cloudinary.com/dlja4vnrd/image/upload/v1730140399/Documento_sin_t%C3%ADtulo_mf50ar.pdf",
    },
    {
      name: "book.epub",
      url: "https://res.cloudinary.com/dlja4vnrd/raw/upload/v1730140399/Documento_sin_t%C3%ADtulo_awm8cq.epub",
    },
  ];
  return fileTypes
    .map(
      (fileType) =>
        `INSERT INTO BOOK_FILES (id_book, original_name, file_path) VALUES (${bookId}, '${fileType.name}', '${fileType.url}');\n`
    )
    .join("");
};

const generateSQLForBookAuthor = (bookId, author) => {
  return `INSERT INTO BOOK_AUTHORS (id_book, author) VALUES (${bookId}, '${author.replace(
    "'",
    "''"
  )}');\n`;
};

const generateSQLForBookLanguage = (bookId, language) => {
  return `INSERT INTO BOOK_LANG (id_book, language) VALUES (${bookId}, '${language.replace(
    "'",
    "''"
  )}');\n`;
};

const generateSQLForBookSubcategory = (bookId, subcategory) => {
  if (!subcategory) return "";
  return `INSERT INTO BOOK_IN_SUBCATEGORY (id_book, id_subcategory) 
      SELECT ${bookId}, id FROM SUBCATEGORY WHERE name = '${subcategory.replace(
    "'",
    "''"
  )}';\n`;
};

export default getBooks;
