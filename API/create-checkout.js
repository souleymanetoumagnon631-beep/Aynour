export default async function handler(req, res) {
    // S'assurer que seule la méthode POST est acceptée
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        const { full_name, phone, address, color, quantity } = req.body;

        const qty = Number(quantity) || 1;
        const totalAmount = qty * 7000;
        const orderRef = 'AYN-' + Date.now();

        // Clés SenePay (à récupérer dans les variables d'environnement Vercel ou en dur pour tester)
        const apiKey = process.env.SENEPAY_API_KEY || 'VOTRE_API_KEY_ICI';
        const apiSecret = process.env.SENEPAY_API_SECRET || 'VOTRE_API_SECRET_ICI';

        // Appel à l'API SenePay pour créer la session
        const response = await fetch('https://api.sene-pay.com/api/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey,
                'X-Api-Secret': apiSecret,
            },
            body: JSON.stringify({
                amount: totalAmount,
                currency: 'XOF',
                orderReference: orderRef,
                description: `Bracelet Ayat Al-Kursi (${color}) x${qty}`,
                country: 'ML', // Mali
                metadata: {
                    customer_name: full_name,
                    phone: phone,
                    address: address,
                    color: color,
                    quantity: qty
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Erreur SenePay API:', data);
            return res.status(response.status).json({
                error: data.message || data.error || 'Erreur lors de l’initialisation SenePay.'
            });
        }

        // Renvoie l'URL de paiement générée par SenePay
        return res.status(200).json({ checkoutUrl: data.checkoutUrl });

    } catch (error) {
        console.error('Erreur Serveur Vercel:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur' });
    }
}