const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json()); // Para procesar JSON en las solicitudes

// Simulación de pedidos en memoria
let pedidos = [
    {
        "nombre": "Manda tu gaaaa",
        "cantidad": 2,
        "precio": 10.99
    }
];

// Ruta para obtener pedidos
app.get("/pedidos", (req, res) => {
    res.json(pedidos);
});

// Ruta para agregar un nuevo pedido
app.post("/pedidos", (req, res) => {
    const nuevoPedido = req.body;
    pedidos.push(nuevoPedido);
    res.status(201).json({ mensaje: "Pedido agregado", pedido: nuevoPedido });
});

// Ruta para borrar un pedido por índice
app.delete("/pedidos/:index", (req, res) => {
    const index = req.params.index;
    if (index >= 0 && index < pedidos.length) {
        pedidos.splice(index, 1);
        res.json({ mensaje: "Pedido eliminado" });
    } else {
        res.status(404).json({ mensaje: "Pedido no encontrado" });
    }
});

// Iniciar servidor en el puerto 5000
const PORT = process.env.PORT || 3001; // Usa el puerto de Railway o el 3001 por defecto
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
