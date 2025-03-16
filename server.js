require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TRUE_TABS_TOKEN = process.env.TRUE_TABS_TOKEN;
const ORS_API_KEY = process.env.ORS_API_KEY;

async function getCoordinates(address) {
    try {
        const response = await axios.get("https://api.openrouteservice.org/geocode/search", {
            params: {
                api_key: ORS_API_KEY,
                text: address,
                size: 1
            }
        });
        return response.data.features[0]?.geometry.coordinates;
    } catch (error) {
        console.error("Ошибка при геокодировании:", error.message);
        return null;
    }
}

app.post("/get-travel-time", async (req, res) => {
    const {from, to, dstId, recordId } = req.body;
    
    if (!from || !to || !dstId || !recordId) {
        return res.status(400).json({ error: "Необходимы адрес, dstId и recordId" });
    }

    try {
        const fromCoords = await getCoordinates(from);
        const toCoords = await getCoordinates(to);
        if (!coords) return res.status(400).json({ error: "Адрес не найден" });
        const endPoint = coords.join(',');

        const routeResponse = await axios.post(
            "https://api.openrouteservice.org/v2/directions/driving-car",
            {
                coordinates: [
                    formCoords,
                    toCoords
                ]
            },
            { 
                headers: { 
                    Authorization: `Bearer ${ORS_API_KEY}` 
                } 
            }
        );

        const travelTime = Math.round(routeResponse.data.routes[0].summary.duration / 60);

       const tabsResponse = await axios.patch(
            `https://aitable.ai/fusion/v1/datasheets/${dstId}/records`,
            {
                records: [{
                    recordId: recordId,
                    fields: {
                        'Время доставки': `${travelTime} мин`
                    }
                }],
                'fieldKey': 'name'
            },
            {
                headers: {
                    Authorization: `Bearer ${TRUE_TABS_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        // Формирование ответа с данными Tabs
        res.json({
            route: {
                from: from,
                to: to,
                travel_time: `${travelTime} мин`
            },
            deliveryStatus: {
                status: "success",
                httpStatus: tabsResponse.status,
                responseData: tabsResponse.data,
                updatedAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error("Ошибка:", error.response?.data || error.message);
        
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.error || "Internal Server Error",
            deliveryStatus: {
                status: "error",
                httpStatus: error.response?.status || 500,
                errorDetails: error.response?.data || error.message
            }
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Сервер запущен на порту ${PORT}`));
