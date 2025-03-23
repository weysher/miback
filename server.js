const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const WebSocket = require("ws");
require("dotenv").config();

const app = express();

// Permitir CORS para todas las fuentes
app.use(cors({
    origin: "*", // Esto permite solicitudes desde cualquier origen
    methods: "GET,POST,DELETE,OPTIONS",
    allowedHeaders: "Content-Type, Authorization",
}));

app.use(express.json()); // Para procesar JSON en las solicitudes

// Conexión a PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Importante para Railway
    },
});

// Crear un servidor WebSocket
const wss = new WebSocket.Server({ noServer: true });

// Mantener track de los clientes conectados
wss.on("connection", (ws) => {
    console.log("Nuevo cliente conectado");
    ws.on("close", () => {
        console.log("Cliente desconectado");
    });
});

// Ruta para obtener todos los pedidos
app.get("/pedidos", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM pedidos");
        res.json(result.rows);
    } catch (error) {
        console.error("Error al obtener pedidos:", error);
        res.status(500).json({ error: "Error al obtener pedidos" });
    }
});

// Ruta para agregar un nuevo pedido
app.post("/pedidos", async (req, res) => {
    try {
        const { nombre, cantidad, precio } = req.body;
        const result = await pool.query(
            "INSERT INTO pedidos (nombre, cantidad, precio) VALUES ($1, $2, $3) RETURNING *",
            [nombre, cantidad, precio]
        );

        // Enviar el nuevo pedido a todos los clientes conectados
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

// Ruta para borrar un pedido por ID
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

// Iniciar servidor en el puerto 3001 o el de Railway
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
