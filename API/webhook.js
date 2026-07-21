const crypto = require('crypto');

module.exports.config = {
    api: {
        bodyParser: false,
    },
};

async function getRawBody(req) {
    return new Promise((resolve, reject) => {
        let chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', (err) => reject(err));
    });
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Méthode non autorisée');
    }

    try {
        const rawBody = await getRawBody(req);
        const bodyText = rawBody.toString('utf8');

        const signature = req.headers['x-senepay-signature'];
        const expectedSignature = crypto
            .createHmac('sha256', process.env.SENEPAY_WEBHOOK_SECRET)
            .update(bodyText)
            .digest('hex');

        if (signature !== expectedSignature) {
            console.error('Signature Webhook Invalide');
            return res.status(401).send('Signature invalide');
        }

        const payload = JSON.parse(bodyText);

        if (payload.event === 'checkout.session.completed' && payload.status === 'Complete') {
            const { orderReference, amount, transactionId, customer_phone, metadata } = payload;

            await fetch(`${process.env.SUPABASE_URL}/rest/v1/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': process.env.SUPABASE_KEY,
                    'Authorization': `Bearer ${process.env.SUPABASE_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    order_reference: orderReference,
                    full_name: metadata?.full_name || 'Client',
                    phone: metadata?.phone || customer_phone,
                    address: metadata?.address || 'Non spécifiée',
                    color: metadata?.color || 'Non spécifiée',
                    quantity: Number(metadata?.quantity || 1),
                    total_price: amount,
                    status: 'paid',
                    transaction_id: transactionId
                })
            });
        }

        return res.status(200).json({ received: true });

    } catch (err) {
        console.error('Erreur Webhook:', err);
        return res.status(500).send('Erreur Webhook Server');
    }
};