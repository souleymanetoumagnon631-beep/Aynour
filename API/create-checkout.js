module.exports = async function handler(req, res) {
    // 1. Autoriser le CORS (pour éviter les blocages de navigateur)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 2. Vérifier que c'est une requête POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        const { full_name, phone, address, color, quantity } = req.body || {};

        const qty = parseInt(quantity, 10) || 1;
        const totalAmount = qty * 7000;
        const orderRef = 'AYN-' + Date.now();

        // Récupération sécurisée des clés d'environnement Vercel
        const apiKey = process.env.SENEPAY_API_KEY;
        const apiSecret = process.env.SENEPAY_API_SECRET;

        if (!apiKey || !apiSecret) {
            return res.status(500).json({ error: 'Clés API SenePay non configurées sur Vercel' });
        }

        // Déterminer l'URL de base pour les callbacks (supporte Vercel et dev local)
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : (req.headers.host ? `https://${req.headers.host}` : 'http://localhost:3000');

        // 3. Appel à l'API SenePay
        const response = await fetch('https://api.sene-pay.com/api/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey,
                'X-Api-Secret': apiSecret
            },
            body: JSON.stringify({
                amount: totalAmount,
                currency: 'XOF',
                orderReference: orderRef,
                description: `Bracelet Ayat Al-Kursi (${color}) x${qty}`,
                country: 'ML',
                returnUrl: `${baseUrl}/?success=true`,
                cancelUrl: `${baseUrl}/?cancel=true`,
                webhookUrl: `${baseUrl}/api/webhook`,
                metadata: {
                    full_name: full_name,
                    phone: phone,
                    address: address,
                    color: color,
                    quantity: qty
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Erreur SenePay:', data);
            // Fallback : la doc SenePay prévoit deux formats d'erreur
            const errorMsg = data.message || data.error || 'Erreur lors de la création de la session SenePay';
            return res.status(response.status).json({ error: errorMsg });
        }

        return res.status(200).json({ checkoutUrl: data.checkoutUrl });

    } catch (error) {
        console.error('Erreur serveur:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
};