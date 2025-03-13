require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const ORS_API_KEY = process.env.ORS_API_KEY;
const START_POINT = process.env.START_POINT; // Начальная точка (lon,lat)

// Функция для получения координат по адресу через ORS Geocoding API
async function getCoordinates(address) {
    try {
        const response = await axios.get("https://api.openrouteservice.org/geocode/search", {
            params: {
                api_key: ORS_API_KEY,
                text: address,
                size: 1
            }
        });

        const features = response.data.features;
        if (!features.length) return null;

        const [lon, lat] = features[0].geometry.coordinates;
        return `${lon},${lat}`; // ORS требует lon,lat
    } catch (error) {
        console.error("Ошибка при геокодировании:", error.message);
        return null;
    }
}

// API-метод для получения времени в пути
app.post("/get-travel-time", async (req, res) => {
    const { address } = req.body;
    if (!address) return res.status(400).json({ error: "Введите адрес назначения" });

    try {
        const endPoint = await getCoordinates(address);
        if (!endPoint) return res.status(400).json({ error: "Не удалось найти адрес" });

        const response = await axios.post(
            "https://api.openrouteservice.org/v2/directions/driving-car",
            {
                coordinates: [
                    START_POINT.split(",").map(Number),
                    endPoint.split(",").map(Number)
                ]
            },
            {
                headers: { Authorization: `Bearer ${ORS_API_KEY}` }
            }
        );

        const route = response.data.routes[0];
        if (!route) return res.status(500).json({ error: "Не удалось рассчитать маршрут" });

        const travelTime = Math.round(route.summary.duration / 60); // Минуты

        res.json({ from: START_POINT, to: address, travel_time: `${travelTime} мин` });
    } catch (error) {
        console.error("Ошибка маршрута:", error.message);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
