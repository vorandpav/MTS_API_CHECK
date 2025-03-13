require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TRUE_TABS_TOKEN = process.env.TRUE_TABS_TOKEN;
const ORS_API_KEY = process.env.ORS_API_KEY;
const START_POINT = process.env.START_POINT; // Начальная точка (lon,lat)

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
        return `${lon},${lat}`;
    } catch (error) {
        console.error("Ошибка при геокодировании:", error.message);
        return null;
    }
}

app.post("/get-travel-time", async (req, res) => {
    const { address, dstId, recordId } = req.body;
    
    if (!address || !dstId || !recordId) {
        return res.status(400).json({ error: "Необходимы адрес, dstId и recordId" });
    }

    try {
        const endPoint = await getCoordinates(address);
        if (!endPoint) return res.status(400).json({ error: "Не удалось найти адрес" });

        const routeResponse = await axios.post(
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

        const route = routeResponse.data.routes[0];
        if (!route) return res.status(500).json({ error: "Не удалось рассчитать маршрут" });

        const travelTime = Math.round(route.summary.duration / 60);

        // Обновление записи в Tabs Sale
        await axios.post(
            `https://true.tabs.sale/fusion/v1/datasheets/${dstId}/records`,
            [{
                recordId: recordId,
                fields: {
                    'Время доставки': `${travelTime} мин`
                }
            }],
            {
                headers: {
                    Authorization: `Bearer ${TRUE_TABS_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({
            from: START_POINT,
            to: address,
            travel_time: `${travelTime} мин`,
            updateStatus: "success"
        });

    } catch (error) {
        console.error("Ошибка:", error.response?.data || error.message);
        const statusCode = error.response?.status || 500;
        res.status(statusCode).json({
            error: error.response?.data?.error || "Ошибка сервера"
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
