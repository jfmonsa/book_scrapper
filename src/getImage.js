import fs from "fs";
import path from "path";
import axios from "axios";

const __dirname = import.meta.dirname;

const downloadImg = async (url) => {
  try {
    const response = await axios({
      method: "get",
      url: url,
      responseType: "stream",
    });

    const file_name = path.basename(url);
    const filePath = path.resolve(__dirname, "storage", file_name);
    response.data.pipe(fs.createWriteStream(filePath));

    return file_name;
  } catch (error) {
    throw error;
  }
};

export default downloadImg;
