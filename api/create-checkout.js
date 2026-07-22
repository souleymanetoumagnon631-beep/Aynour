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

        // Récupération des clés d'environnement Vercel
        const apiKey = (process.env.SENEPAY_API_KEY || '').trim();
        const apiSecret = (process.env.SENEPAY_API_SECRET || '').trim();
        const supabaseUrl = (process.env.SUPABASE_URL || 'https://qjjxnrdafphwvkgaxayy.supabase.co').trim();
        const supabaseKey = (process.env.SUPABASE_KEY || '').trim();

        if (!apiKey || !apiSecret) {
            console.error('Clés SenePay manquantes dans process.env (SENEPAY_API_KEY ou SENEPAY_API_SECRET)');
            return res.status(500).json({
                error: 'Clés API SenePay non configurées. Veuillez ajouter SENEPAY_API_KEY et SENEPAY_API_SECRET dans Vercel Environment Variables.'
            });
        }

        // Construction dynamique de l'URL de base pour les callbacks
        const proto = req.headers['x-forwarded-proto'] || 'https';
        const rawHost = req.headers['x-forwarded-host'] || req.headers.host || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || 'aynour.vercel.app';
        const host = rawHost.replace(/^https?:\/\//, '');
        const baseUrl = `${proto}://${host}`;

        // 2. Sauvegarde de la commande initiale en statut 'pending' dans Supabase
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
                    console.error('Supabase save order error:', sbErr);
                }
            } catch (sbError) {
                console.error('Supabase exception:', sbError);
            }
        }

        // 3. Payload de création de session SenePay
        // NOTE IMPORTANTE : Les valeurs de l'objet metadata DOIVENT TOUTES ÊTRE DES CHAINES (String) pour l'API SenePay (C# Dictionary<string, string>)
        const senepayPayload = {
            amount: totalAmount,
            currency: 'XOF',
            orderReference: orderRef,
            description: `Bracelet Ayat Al-Kursi (${color || 'Argent'}) x${qty}`,
            returnUrl: `${baseUrl}/?success=true&order=${orderRef}`,
            cancelUrl: `${baseUrl}/?cancel=true&order=${orderRef}`,
            webhookUrl: `${baseUrl}/api/webhook`,
            metadata: {
                full_name: String(full_name || ''),
                phone: String(phone || ''),
                address: String(address || ''),
                color: String(color || 'Argent'),
                quantity: String(qty)
            }
        };

        // Envoi de la requête à SenePay
        const response = await fetch('https://api.sene-pay.com/api/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': apiKey,
                'X-Api-Secret': apiSecret
            },
            body: JSON.stringify(senepayPayload)
        });

        // Lecture sécurisée de la réponse (Text puis JSON)
        const rawResponseText = await response.text();
        let data = {};
        try {
            data = JSON.parse(rawResponseText);
        } catch (e) {
            data = { rawText: rawResponseText };
        }

        if (!response.ok) {
            console.error(`Erreur SenePay HTTP ${response.status}:`, data);

            let detailedError = data.message || data.Message || data.error || data.detail || data.title;
            if (!detailedError && data.errors) {
                if (typeof data.errors === 'object') {
                    detailedError = Object.entries(data.errors)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                        .join(' | ');
                } else {
                    detailedError = String(data.errors);
                }
            }
            if (!detailedError && data.code) {
                detailedError = `Code SenePay: ${data.code}`;
            }
            if (!detailedError) {
                detailedError = data.rawText ? data.rawText.substring(0, 200) : JSON.stringify(data);
            }

            return res.status(response.status || 400).json({
                error: `SenePay (HTTP ${response.status}): ${detailedError}`
            });
        }

        const checkoutUrl = data.checkoutUrl || data.redirectUrl || data.checkout_url;
        const sessionToken = data.sessionToken || data.session_token;

        if (!checkoutUrl) {
            console.error('checkoutUrl manquant dans la réponse SenePay:', data);
            return res.status(500).json({ error: 'URL de paiement non renvoyée par SenePay' });
        }

        // 4. Mettre à jour Supabase avec le sessionToken
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
                console.error('Mise à jour sessionToken Supabase error:', err);
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