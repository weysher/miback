// registerAdmin.js
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
require("dotenv").config();

// Configura el pool de conexión
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Datos del administrador (estos valores pueden venir de un formulario o estar hardcodeados para la inicialización)
const username = "admin123";
const password = "123456";

// Hashea la contraseña y registra el administrador
bcrypt.hash(password, 10, async (err, hashedPassword) => {
  if (err) {
    console.error("Error al hashear la contraseña", err);
  } else {
    try {
      await pool.query(
        "INSERT INTO admins (username, password) VALUES ($1, $2)",
        [username, hashedPassword]
      );
      console.log("Administrador registrado");
      process.exit(0); // Termina el script
    } catch (error) {
      console.error("Error al registrar admin:", error);
      process.exit(1);
    }
  }
});
