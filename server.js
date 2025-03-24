const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const WebSocket = require("ws");
const path = require("path");  // <--- Importa path
require("dotenv").config();

const app = express();

const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const SECRET_KEY = process.env.SECRET_KEY || "mi_clave_secreta_muy_segura";


// Configuración de CORS y JSON
app.use(cors({
    origin: "*",
    methods: "GET,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
}));
app.use(express.json());

// Conexión a PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});

// Configuración de WebSocket
const wss = new WebSocket.Server({ noServer: true });
wss.on("connection", (ws) => {
    console.log("Nuevo cliente conectado");
    ws.on("close", () => {
        console.log("Cliente desconectado");
    });
});

// Rutas API (definir primero)
app.get("/pedidos", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM pedidos");
        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener pedidos:", error);
        res.status(500).json({ error: "Error al obtener pedidos" });
    }
});

app.post("/pedidos", async (req, res) => {
    try {
        console.log("POST /pedidos recibido"); // Para depuración
        const { nombre, cantidad, precio } = req.body;
        const result = await pool.query(
            "INSERT INTO pedidos (nombre, cantidad, precio) VALUES ($1, $2, $3) RETURNING *",
            [nombre, cantidad, precio]
        );
        // Enviar a los clientes WebSocket
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(result.rows[0]));
            }
        });
        res.status(201).json({ mensaje: "Pedido agregado", pedido: result.rows[0] });
    } catch (error) {
        console.error("Error al agregar pedido:", error);
        res.status(500).json({ error: "Error al agregar pedido" });
    }
});

app.delete("/pedidos/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM pedidos WHERE id = $1", [id]);
        res.json({ mensaje: "Pedido eliminado" });
    } catch (error) {
        console.error("Error al eliminar pedido:", error);
        res.status(500).json({ error: "Error al eliminar pedido" });
    }
});

// Iniciar el servidor
const PORT = process.env.PORT || 3001;
app.server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Configuración del WebSocket
app.server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
    });
});

app.options("/admin/login", cors({
    origin: "*",
    methods: "GET,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
}));

app.options("/admin/login", (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.sendStatus(204);
  });
  

app.post("/admin/login", async (req, res) => {
    const { username, password } = req.body;
  
    try {
      // Busca el administrador en la tabla admins
      const result = await pool.query("SELECT * FROM admins WHERE username = $1", [username]);
      
      if (result.rows.length === 0) {
        // Si no existe el usuario, responde con error
        return res.status(401).json({ error: "Credenciales inválidas" });
      }
      
      const admin = result.rows[0];
      
      // Compara la contraseña enviada con la hasheada almacenada
      const isValid = await bcrypt.compare(password, admin.password);
      if (!isValid) {
        return res.status(401).json({ error: "Credenciales inválidas" });
      }
      
      // Si es válido, genera un token JWT
      const token = jwt.sign(
        { id: admin.id, username: admin.username },
        SECRET_KEY,
        { expiresIn: "1h" }  // El token expira en 1 hora (ajusta según sea necesario)
      );
      
      // Devuelve el token al cliente
      res.json({ token });
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      res.status(500).json({ error: "Error al iniciar sesión" });
    }
  });


// Rutas para servir archivos estáticos (esto va al final)
app.use(express.static("public"));
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});
