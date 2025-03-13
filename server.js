const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Привет, Render API работает! 🚀");
});

// Добавление пользователя (пример)
app.post("/add-user", async (req, res) => {
  const { name, address } = req.body;
  if (!name || !address) {
    return res.status(400).json({ error: "Введите имя и адрес" });
  }
  
  res.json({ message: `Пользователь ${name} добавлен с адресом ${address}` });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
