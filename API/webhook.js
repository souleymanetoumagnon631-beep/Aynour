import crypto from 'crypto';

// Nécessaire sous Vercel pour lire le raw body et vérifier la signature HMAC
export const config = {
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

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Méthode non autorisée');
    }

    try {
        const rawBody = await getRawBody(req);
        const bodyText = rawBody.toString('utf8');

        // 1. Vérification de la signature SenePay
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

        // 2. Traitement de l'événement checkout.session.completed
        if (payload.event === 'checkout.session.completed' && payload.status === 'Complete') {
            const { orderReference, amount, transactionId, customer_phone, metadata } = payload;

            // Inscription dans Supabase
            const supabaseRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/orders`, {
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

            if (!supabaseRes.ok) {
                console.error('Erreur sauvegarde Supabase via Webhook');
            }
        }

        // Toujours répondre 200 OK
        return res.status(200).json({ received: true });

    } catch (err) {
        console.error('Erreur Webhook:', err);
        return res.status(500).send('Erreur Webhook Server');
    }
}