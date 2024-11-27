// file for data base connection (postgresql)
import pg from "pg";
const { Pool } = pg;
// loadEnv.js
import dotenv from "dotenv";
dotenv.config();

let pool = null;

const BD = "remota"; // "local" o "remota

if (BD == "remota") {
  pool = new Pool({
    connectionString: process.env.POSTGRES_URL,
  });
} else {
  pool = new Pool({
    user: process.env.LOCALDB_USER,
    host: process.env.LOCALDB_HOST,
    database: process.env.LOCALDB_NAME,
    password: process.env.LOCALDB_PASSWORD,
    port: process.env.LOCALDB_PORT,
  });
}
pool.connect((err) => {
  if (err) throw err;
});

export { pool };
