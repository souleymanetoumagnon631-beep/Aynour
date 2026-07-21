module.exports = async function handler(req, res) {
    // Accepter uniquement les requêtes POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        const { full_name, phone, address, color, quantity } = req.body || {};

        const qty = Number(quantity) || 1;
        const totalAmount = qty * 7000;

        // Clés API SenePay (Variables d'environnement Vercel)
        const apiKey = process.env.SENEPAY_API_KEY;
        const secretKey = process.env.SENEPAY_SECRET_KEY;

        if (!apiKey || !secretKey) {
            console.error("Clés API SenePay manquantes dans les variables Vercel.");
            return res.status(500).json({ error: "Configuration serveur incomplète (Clés API manquantes)." });
        }

        // Appel direct à SenePay
        const senepayResponse = await fetch('https://api.senepay.com/v1/checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${secretKey}`,
                'X-API-KEY': apiKey
            },
            body: JSON.stringify({
                amount: totalAmount,
                currency: 'XOF',
                description: `Bracelet Ayat Al-Kursi (${color} x${qty})`,
                customer: {
                    name: full_name,
                    phone: `+223${phone}`,
                    address: address
                },
                return_url: `https://${req.headers.host}/?payment=success`,
                cancel_url: `https://${req.headers.host}/?payment=cancelled`
            })
        });

        const senepayData = await senepayResponse.json();

        if (!senepayResponse.ok) {
            console.error('Erreur SenePay:', senepayData);
            return res.status(400).json({
                error: senepayData.message || 'Échec de la création de la session SenePay.'
            });
        }

        return res.status(200).json({ checkoutUrl: senepayData.checkout_url || senepayData.url });

    } catch (error) {
        console.error('Erreur serveur API:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur lors de la création du paiement.' });
    }
};