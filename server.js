require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const YANDEX_API_KEY = process.env.YANDEX_API_KEY;
const START_POINT = process.env.START_POINT; // Координаты старта (lat,lon)

// Функция для получения координат по адресу
async function getCoordinates(address) {
    try {
        const response = await axios.get("https://geocode-maps.yandex.ru/1.x/", {
            params: {
                apikey: YANDEX_API_KEY,
                geocode: address,
                format: "json"
            }
        });

        const geoObject = response.data.response.GeoObjectCollection.featureMember[0]?.GeoObject;
        if (!geoObject) return null;

        const [lon, lat] = geoObject.Point.pos.split(" "); // Яндекс отдаёт lon,lat
        return `${lat},${lon}`; // Нужно lat,lon
    } catch (error) {
        console.error("Ошибка при получении координат:", error.message);
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

        const response = await axios.get("https://api.routing.yandex.net/v2/routes", {
            params: {
                apikey: YANDEX_API_KEY,
                waypoints: `${START_POINT}|${endPoint}`,
                mode: "driving"
            }
        });

        const route = response.data.routes[0];
        if (!route) return res.status(500).json({ error: "Не удалось рассчитать маршрут" });

        const travelTime = Math.round(route.legs[0].duration.value / 60); // Минуты

        res.json({ from: START_POINT, to: address, travel_time: `${travelTime} мин` });
    } catch (error) {
        console.error("Ошибка маршрута:", error.message);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
