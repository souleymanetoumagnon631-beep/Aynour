module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { orderReference } = req.query || {};

    if (!orderReference) {
        return res.status(400).json({ error: 'orderReference est requis' });
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL || 'https://qjjxnrdafphwvkgaxayy.supabase.co';
        const supabaseKey = process.env.SUPABASE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return res.status(500).json({ error: 'Supabase non configuré' });
        }

        const sbRes = await fetch(`${supabaseUrl}/rest/v1/orders?order_reference=eq.${encodeURIComponent(orderReference)}&select=*`, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        });

        if (!sbRes.ok) {
            return res.status(500).json({ error: 'Erreur recherche Supabase' });
        }

        const orders = await sbRes.json();
        if (!orders || orders.length === 0) {
            return res.status(404).json({ error: 'Commande non trouvée' });
        }

        const order = orders[0];
        return res.status(200).json({
            order_reference: order.order_reference,
            status: order.status, // 'pending', 'paid', 'failed'
            full_name: order.full_name,
            total_amount: order.total_amount,
            quantity: order.quantity,
            color: order.color,
            created_at: order.created_at
        });

    } catch (err) {
        console.error('Erreur verify-order:', err);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
};
