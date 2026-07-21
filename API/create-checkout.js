export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        const { full_name, phone, address, color, quantity } = req.body;

        // Calcul du montant total (7 000 FCFA par unité)
        const amount = Number(quantity) * 7000;
        const orderReference = 'AYN-' + Date.now();

        // Détermination dynamique du domaine pour les URLs de retour
        const protocol = req.headers['x-forwarded-proto'] || 'https';
        const host = req.headers.host;
        const baseUrl = `${protocol}://${host}`;

        // Appeler l'API SenePay POST /api/v1/checkout/sessions
        const senepayRes = await fetch('https://api.sene-pay.com/api/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': process.env.SENEPAY_API_KEY,
                'X-Api-Secret': process.env.SENEPAY_API_SECRET
            },
            body: JSON.stringify({
                amount: amount,
                currency: 'XOF', // Devise obligatoire ISO 4217
                orderReference: orderReference,
                description: `Achat Bracelet Ayat Al-Kursi (${color} x${quantity})`,
                returnUrl: `${baseUrl}/?payment=success&ref=${orderReference}`,
                cancelUrl: `${baseUrl}/?payment=cancelled`,
                webhookUrl: `${baseUrl}/api/webhook`,
                country: 'ML', // Ou 'SN' / absent selon votre ciblage
                expiresInMinutes: 30,
                metadata: {
                    full_name,
                    phone,
                    address,
                    color,
                    quantity: String(quantity)
                }
            })
        });

        const data = await senepayRes.json();

        if (!senepayRes.ok) {
            return res.status(senepayRes.status).json({
                error: data.message || data.error || 'Erreur lors de la création de la session SenePay'
            });
        }

        // Renvoie checkoutUrl au frontend
        return res.status(200).json({
            checkoutUrl: data.checkoutUrl,
            sessionToken: data.sessionToken,
            orderReference: orderReference
        });

    } catch (error) {
        console.error('Erreur SenePay Session:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
}