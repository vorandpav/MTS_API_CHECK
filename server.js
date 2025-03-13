require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const START_POINT = "Red Square, Moscow"; // Начальная точка

app.post("/get-travel-time", async (req, res) => {
    const { address } = req.body;

    if (!address) {
        return res.status(400).json({ error: "Введите адрес назначения" });
    }

    try {
        const response = await axios.get("https://maps.googleapis.com/maps/api/distancematrix/json", {
            params: {
                origins: START_POINT,
                destinations: address,
                mode: "driving",
                key: GOOGLE_MAPS_API_KEY
            }
        });

        const data = response.data;
        
        if (data.status !== "OK") {
            return res.status(500).json({ error: "Ошибка запроса к Google Maps", details: data });
        }

        const travelTime = data.rows[0].elements[0].duration.text; // Время в пути

        res.json({ from: START_POINT, to: address, travel_time: travelTime });
    } catch (error) {
        console.error("Ошибка запроса:", error.message);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
