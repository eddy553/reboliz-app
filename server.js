const express = require('express');
const cors = require('cors');
const path = require('path');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(__dirname));

// ESTA ES LA LÍNEA NUEVA QUE ABRE TU FRONTEND DIRECTO
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

const client = new MercadoPagoConfig({ 
    accessToken: process.env.MP_ACCESS_TOKEN || 'TU_ACCESS_TOKEN_DE_MERCADO_PAGO' 
});

let publicacionesDestacadas = [];

app.post('/api/crear-pago', async (req, res) => {
    try {
        const { plan, precio, usuario } = req.body;

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [
                    {
                        title: `Reboliz - ${plan}`,
                        quantity: 1,
                        unit_price: Number(precio),
                        currency_id: 'BRL'
                    }
                ],
                back_urls: {
                    success: `${req.protocol}://${req.get('host')}/?pago=exitoso`,
                    failure: `${req.protocol}://${req.get('host')}/?pago=fallido`,
                    pending: `${req.protocol}://${req.get('host')}/?pago=pendiente`
                },
                auto_return: 'approved',
                notification_url: `${req.protocol}://${req.get('host')}/api/webhook`
            }
        });

        res.json({ init_point: result.init_point });
    } catch (error) {
        console.error('Error creando pago:', error);
        res.status(500).json({ error: 'No se pudo generar el enlace de pago' });
    }
});

app.post('/api/webhook', async (req, res) => {
    const { type, data } = req.body;

    if (type === 'payment') {
        try {
            const payment = new Payment(client);
            const pagoInfo = await payment.get({ id: data.id });

            if (pagoInfo.status === 'approved') {
                console.log(`✅ ¡DINERO RECIBIDO! Pago ID: ${data.id} aprobado por ${pagoInfo.transaction_amount}`);
                
                publicacionesDestacadas.push({
                    pagoId: data.id,
                    monto: pagoInfo.transaction_amount,
                    fecha: new Date(),
                    activa: true
                });
            }
        } catch (error) {
            console.error('Error verificando el webhook:', error);
        }
    }

    res.sendStatus(200);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor Reboliz corriendo en http://localhost:${PORT}`);
});
