module.exports = async function handler(req, res) {
    // 1. Autoriser le CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const { full_name, phone, address, color, quantity } = body;

        if (!full_name || !phone || !address) {
            return res.status(400).json({ error: 'Veuillez remplir tous les champs obligatoires (Nom, Téléphone, Adresse).' });
        }

        const qty = parseInt(quantity, 10) || 1;
        const totalAmount = qty * 7000;
        const orderRef = 'AYN-' + Date.now() + '-' + Math.floor(Math.random() * 1000);

        // Clés d'environnement Vercel
        const apiKey = process.env.SENEPAY_API_KEY;
        const apiSecret = process.env.SENEPAY_API_SECRET;
        const supabaseUrl = process.env.SUPABASE_URL || 'https://qjjxnrdafphwvkgaxayy.supabase.co';
        const supabaseKey = process.env.SUPABASE_KEY;

        if (!apiKey || !apiSecret) {
            console.error('Clés SenePay manquantes dans process.env');
            return res.status(500).json({ error: 'Configuration SenePay manquante sur le serveur' });
        }

        // Construction dynamique de l'URL de base pour les callbacks
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const rawHost = req.headers['x-forwarded-host'] || req.headers.host || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || 'aynour.vercel.app';
        const host = rawHost.replace(/^https?:\/\//, '');
        const baseUrl = `${proto}://${host}`;

        // 2. Enregistrer la commande initiale en statut 'pending' dans Supabase (si Supabase est configuré)
        if (supabaseUrl && supabaseKey) {
            try {
                const sbRes = await fetch(`${supabaseUrl}/rest/v1/orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        order_reference: orderRef,
                        full_name: full_name.trim(),
                        phone: phone.trim(),
                        address: address.trim(),
                        color: color || 'Argent',
                        quantity: qty,
                        total_amount: totalAmount,
                        currency: 'XOF',
                        status: 'pending'
                    })
                });
                if (!sbRes.ok) {
                    const sbErr = await sbRes.text();
                    console.error('Erreur sauvegarde Supabase commande:', sbErr);
                }
            } catch (sbError) {
                console.error('Exception Supabase commande:', sbError);
            }
        }

        // 3. Création de la session de paiement SenePay
        const senepayPayload = {
            amount: totalAmount,
            currency: 'XOF',
            orderReference: orderRef,
            description: `Bracelet Ayat Al-Kursi (${color || 'Argent'}) x${qty}`,
            country: 'ML', // Mali
            returnUrl: `${baseUrl}/?success=true&order=${orderRef}`,
            cancelUrl: `${baseUrl}/?cancel=true&order=${orderRef}`,
            webhookUrl: `${baseUrl}/api/webhook`,
            metadata: {
                full_name: full_name,
                phone: phone,
                address: address,
                color: color || 'Argent',
                quantity: qty
            }
        };

        const response = await fetch('https://api.sene-pay.com/api/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey,
                'X-Api-Secret': apiSecret
            },
            body: JSON.stringify(senepayPayload)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Erreur API SenePay:', data);
            const errorMsg = data.message || data.error || (data.code ? `Erreur SenePay: ${data.code}` : 'Échec de création de la session SenePay');
            return res.status(response.status || 400).json({ error: errorMsg });
        }

        const checkoutUrl = data.checkoutUrl;
        const sessionToken = data.sessionToken;

        // 4. Mettre à jour Supabase avec le session_token
        if (supabaseUrl && supabaseKey && sessionToken) {
            try {
                await fetch(`${supabaseUrl}/rest/v1/orders?order_reference=eq.${encodeURIComponent(orderRef)}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`
                    },
                    body: JSON.stringify({
                        session_token: sessionToken,
                        updated_at: new Date().toISOString()
                    })
                });
            } catch (err) {
                console.error('Erreur mise à jour session_token Supabase:', err);
            }
        }

        return res.status(200).json({
            checkoutUrl: checkoutUrl,
            orderReference: orderRef,
            sessionToken: sessionToken
        });

    } catch (error) {
        console.error('Erreur serveur create-checkout:', error);
        return res.status(500).json({ error: 'Erreur interne du serveur: ' + error.message });
    }
};