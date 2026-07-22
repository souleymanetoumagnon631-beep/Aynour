const crypto = require('crypto');

// Désactiver le parser par défaut de Vercel pour obtenir le Buffer binaire brut (Raw Body)
module.exports.config = {
    api: {
        bodyParser: false,
    },
};

function getRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', (err) => reject(err));
    });
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        const rawBody = await getRawBody(req);
        const signature = req.headers['x-senepay-signature'] || req.headers['X-SenePay-Signature'];
        const webhookSecret = process.env.SENEPAY_WEBHOOK_SECRET;

        // 1. Vérification de la signature HMAC-SHA256
        if (webhookSecret) {
            if (!signature) {
                console.error('Webhook SenePay rejeté: En-tête X-SenePay-Signature manquant');
                return res.status(401).json({ error: 'Signature manquante' });
            }

            const expected = crypto
                .createHmac('sha256', webhookSecret)
                .update(rawBody)
                .digest('hex');

            const sigBuffer = Buffer.from(signature.toLowerCase());
            const expBuffer = Buffer.from(expected.toLowerCase());

            if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
                console.error('Webhook SenePay rejeté: Signature invalide');
                return res.status(401).json({ error: 'Signature invalide' });
            }
        } else {
            console.warn('SENEPAY_WEBHOOK_SECRET non configuré. Validation de signature ignorée.');
        }

        // 2. Parser le payload JSON
        const payload = JSON.parse(rawBody.toString('utf8'));
        console.log('Webhook SenePay reçu:', payload.event, 'pour commande:', payload.orderReference);

        const { event, orderReference, sessionToken, status, transactionId, netAmount, customer_phone, metadata } = payload;

        const supabaseUrl = process.env.SUPABASE_URL || 'https://qjjxnrdafphwvkgaxayy.supabase.co';
        const supabaseKey = process.env.SUPABASE_KEY;

        let orderData = null;

        // 3. Traitement selon le type d'événement
        if (event === 'checkout.session.completed' || status === 'Complete') {
            // Mettre à jour Supabase
            if (supabaseUrl && supabaseKey && orderReference) {
                try {
                    const sbPatch = await fetch(`${supabaseUrl}/rest/v1/orders?order_reference=eq.${encodeURIComponent(orderReference)}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({
                            status: 'paid',
                            transaction_id: transactionId || null,
                            net_amount: netAmount || null,
                            customer_phone: customer_phone || null,
                            updated_at: new Date().toISOString()
                        })
                    });
                    
                    if (sbPatch.ok) {
                        const rows = await sbPatch.json();
                        if (rows && rows.length > 0) {
                            orderData = rows[0];
                        }
                    }
                } catch (sbErr) {
                    console.error('Erreur mise à jour Supabase webhook:', sbErr);
                }
            }

            // Notification Telegram Backend
            await sendTelegramNotification({
                orderReference: orderReference,
                fullName: metadata?.full_name || orderData?.full_name || 'Client Aynour',
                phone: metadata?.phone || orderData?.phone || customer_phone || 'N/A',
                address: metadata?.address || orderData?.address || 'N/A',
                color: metadata?.color || orderData?.color || 'Argent',
                quantity: metadata?.quantity || orderData?.quantity || 1,
                amountPaid: payload.amount || orderData?.total_amount || 7000,
                transactionId: transactionId || 'N/A',
                status: 'PAYÉ (SenePay)'
            });

        } else if (event === 'checkout.session.failed' || status === 'Failed') {
            if (supabaseUrl && supabaseKey && orderReference) {
                try {
                    await fetch(`${supabaseUrl}/rest/v1/orders?order_reference=eq.${encodeURIComponent(orderReference)}`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`
                        },
                        body: JSON.stringify({
                            status: 'failed',
                            updated_at: new Date().toISOString()
                        })
                    });
                } catch (sbErr) {
                    console.error('Erreur MAJ échec Supabase webhook:', sbErr);
                }
            }
        }

        // 4. Toujours répondre HTTP 200 à SenePay pour confirmer la réception
        return res.status(200).json({ received: true });

    } catch (error) {
        console.error('Erreur webhook SenePay:', error);
        return res.status(500).json({ error: 'Erreur traitement webhook' });
    }
};

async function sendTelegramNotification(data) {
    const telegramToken = process.env.TELEGRAM_BOT_TOKEN || '8644277619:AAFKvPn3fRgV6gCyMVUC-ZaPts4hlI4q3e8';
    const telegramChatId = process.env.TELEGRAM_CHAT_ID || '7148319409';

    if (!telegramToken || !telegramChatId) return;

    const msg = `
✅ *PAIEMENT CONFIRMÉ (SenePay)* — Aynour

💳 *Réf Commande :* \`${data.orderReference}\`
🆔 *Tx ID :* \`${data.transactionId}\`
👤 *Nom :* ${data.fullName}
📞 *Téléphone :* ${data.phone}
📍 *Adresse :* ${data.address}
🎨 *Couleur :* ${data.color}
📦 *Quantité :* ${data.quantity}
💰 *Montant :* ${data.amountPaid.toLocaleString('fr-FR')} FCFA

_Paiement validé via SenePay & Aynour Shop_
    `.trim();

    try {
        await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: telegramChatId,
                text: msg,
                parse_mode: 'Markdown'
            })
        });
    } catch (e) {
        console.warn('Erreur envoi Telegram Webhook:', e.message);
    }
}
