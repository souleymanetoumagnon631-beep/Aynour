# Documentation API SenePay

Intégrez facilement les paiements mobile money (Wave, Orange Money, Free Money, MTN, Moov, etc.) dans votre site, application mobile ou plateforme. 16 pays africains, marketplace, remboursements, et envois mass-payouts.

**URL de base https://api.sene-pay.com**

> **💰 Modèle tarifaire (depuis mai 2026)** — Sene-Pay prélève **3,6 %** de commission *au moment du payin* (1,8 % payin + 1,8 % réserve payout). Les payouts ne supportent ensuite **que les frais provider mobile money** (~2,5 %) ; Sene-Pay ne prélève aucune commission additionnelle sur les retraits.

### 🛒 Deux façons d'accepter un paiement (Payin)

Choisissez la méthode adaptée à votre intégration :

| Méthode | Pour qui ? | Le client est… |
| --- | --- | --- |
| **🅰️ Checkout hébergé** Recommandé | Marchands qui veulent une intégration **rapide**, sans gérer le formulaire (pays, opérateur, téléphone). | Redirigé vers `checkout.sene-pay.com` qui s'occupe de tout. |
| **🅱️ API Direct** Avancé | Marchands qui veulent **leur propre interface de paiement** et garder le client sur leur site/app. | Sur votre interface ; vous appelez l'API en passant directement pays, opérateur et téléphone. |

Les deux méthodes partagent les mêmes clés API, le même format de webhook et le même environnement Sandbox.

> **📐 Conventions de nommage** — **En entrée (corps des requêtes), notre API accepte toutes les casses** : `snake_case`, `camelCase` et `PascalCase` sont tous acceptés (ex. `customer_phone`, `customerPhone` et `CustomerPhone` sont équivalents). Nos exemples utilisent le `snake_case` par convention. **En sortie (réponses)** : les réponses *payin* (Checkout & API Direct) utilisent `camelCase` (`sessionToken`, `redirectUrl`, `nextAction`…), les réponses *payout* utilisent `snake_case` (`disbursement_id`, `external_id`…). Lisez les champs tels qu'affichés dans chaque exemple de réponse. **Codes pays et opérateurs** : insensibles à la casse (`sn` = `SN`, `wave` = `WAVE`).

## 1. Prérequis

### 1.1 Créer un compte marchand

1. Inscrivez-vous sur [sene-pay.com](https://sene-pay.com)
2. Complétez votre profil marchand (KYC)
3. Attendez la validation de votre compte

### 1.2 Obtenir vos clés API

Une fois votre compte validé:

1. Connectez-vous à votre tableau de bord
2. Allez dans **Api & Dev** → **Clés API**
3. Cliquez sur **Générer des clés**
4. Notez vos clés: `X-Api-Key`: Clé publique (identifiant) `X-Api-Secret`: Clé secrète (à garder confidentielle)

> **Important:** Ne partagez jamais votre `X-Api-Secret`. Elle doit rester côté serveur uniquement.

## 2. Créer une session de paiement

`POST /api/v1/checkout/sessions`

#### Headers requis

```
Content-Type: application/json
X-Api-Key: votre_api_key
X-Api-Secret: votre_api_secret
```

#### Corps de la requête

```
{
    "amount": 10000,
    "currency": "XOF",
    "orderReference": "CMD-12345",
    "description": "Achat sur MonSite.sn",
    "returnUrl": "https://monsite.sn/paiement/success",
    "cancelUrl": "https://monsite.sn/paiement/cancel",
    "webhookUrl": "https://monsite.sn/api/webhooks/senepay",
    "country": "SN",
    "metadata": {
        "client_id": "123",
        "product": "T-shirt"
    },
    "expiresInMinutes": 60
}
```

#### Paramètres

| Paramètre | Type | Requis | Description |
| --- | --- | --- | --- |
| `amount` | number | Oui | Montant à encaisser. Minimum 200. Le maximum dépend de la devise, du pays et des limites marchand (par défaut 10 000 000 XOF). |
| `currency` | string | Oui | Devise ISO 4217 (ex. `"XOF"`, `"XAF"`, `"GNF"`, `"CDF"`, `"GMD"`). **Aucune valeur par défaut** : une requête sans `currency` est rejetée en HTTP 400. |
| `orderReference` | string | Oui | Votre référence de commande côté marchand. Retournée dans la réponse, dans le webhook, et dans le statut de la session. |
| `country` | string | Non | **Pays fixe** (code ISO sur 2 lettres, ex: `"SN"`). - Si ce champ est présent, la page de paiement affichera **uniquement les opérateurs de ce pays** et l’étape de sélection du pays sera masquée. - S’il est absent, le client pourra choisir son pays parmi tous ceux supportés. *Liste des codes pays supportés : voir tableau ci-dessous.* |
| `description` | string | Non | Description affichée au client sur la page de paiement. |
| `returnUrl` | string | Non | URL de redirection après paiement réussi. |
| `cancelUrl` | string | Non | URL de redirection en cas d'annulation. |
| `webhookUrl` | string | Non | URL HTTPS recevant les notifications événements ([§ 4](#webhooks)). Le payload est signé via `X-SenePay-Signature`. |
| `metadata` | object | Non | Données personnalisées (clé/valeur). Renvoyées dans la réponse statut et le webhook. |
| `expiresInMinutes` | number | Non | Durée de validité de la session en minutes. **Défaut : 30 minutes**. Au-delà, la session passe en statut `Expired` et ne peut plus être payée. |

### Pays et méthodes de paiement supportés

| Pays | Code pays | Devises supportées | Opérateurs disponibles |
| --- | --- | --- | --- |
| Bénin | BJ | XOF | moov, mtn, celtiis, coris |
| Burkina Faso | BF | XOF | orange, moov, wligdicash |
| Cameroun | CM | XAF | mtn, orange |
| Centrafrique | CF | XAF | orange |
| République du Congo | CG | XAF | airtel, mtn |
| Côte d'Ivoire | CI | XOF | wave, orange, mtn, moov |
| Gabon | GA | XAF | airtel, moov |
| Gambie | GM | GMD | afrimoney |
| Guinée | GN | GNF | orange, mtn |
| Guinée-Bissau | GW | XOF | orange |
| Mali | ML | XOF | orange, moov |
| Niger | NE | XOF | airtel, moov, amanata, nita, zamani, wligdicash |
| R.D. Congo | CD | CDF | airtel, mpesa, orange, vodacom, afrimoney |
| Sénégal | SN | XOF | wave, orange, free, emoney |
| Tchad | TD | XAF | airtel, moov |
| Togo | TG | XOF | moov, tmoney |

*Note : les codes opérateurs s'utilisent indifféremment en minuscules ou majuscules (`wave` = `WAVE`). Cette liste est donnée à titre indicatif — la **source de vérité à jour** (pays, méthodes, code USSD, disponibilité) est l'endpoint public [`GET /api/v1/countries`](#api-pays-methodes).*

#### Réponse succès (200)

```
{
    "sessionToken": "chk_abc123xyz789",
    "checkoutUrl": "https://api.sene-pay.com/checkout.html?session=chk_abc123xyz789",
    "amount": 10000,
    "currency": "XOF",
    "orderReference": "CMD-12345",
    "status": "Open",
    "expiresAt": "2026-05-13T15:00:00Z",
    "createdAt": "2026-05-13T14:30:00Z"
}
```

*Note : en mode **sandbox** (clés `pk_test_*` / `sk_test_*`), `checkoutUrl` pointe vers `https://api.sene-pay.com/checkoutSandBox.html?session=...`. Rediriger toujours le client vers la valeur renvoyée par l'API plutôt que de la construire vous-même.*

#### Exemples d'intégration

```
const response = await fetch('https://api.sene-pay.com/api/v1/checkout/sessions', {
    method: 'POST',
    headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': 'votre_api_key',
                    'X-Api-Secret': 'votre_api_secret'
    },
    body: JSON.stringify({
        amount: 10000,
        orderReference: 'CMD-12345',
        returnUrl: 'https://monsite.sn/success',
        webhookUrl: 'https://monsite.sn/webhooks/senepay'
    })
});

const data = await response.json();

// Rediriger le client vers la page de paiement
window.location.href = data.checkoutUrl;
```

```
<?php
$curl = curl_init();

curl_setopt_array($curl, [
    CURLOPT_URL => "https://api.sene-pay.com/api/v1/checkout/sessions",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
                    "Content-Type: application/json",
                    "X-Api-Key: votre_api_key",
                    "X-Api-Secret: votre_api_secret"
    ],
    CURLOPT_POSTFIELDS => json_encode([
                    "amount" => 10000,
                    "orderReference" => "CMD-12345",
                    "returnUrl" => "https://monsite.sn/success",
                    "webhookUrl" => "https://monsite.sn/webhooks/senepay"
    ])
]);

$response = curl_exec($curl);
$data = json_decode($response, true);

// Rediriger le client
header("Location: " . $data['checkoutUrl']);
exit;
```

```
using System.Net.Http;
using System.Text;
using System.Text.Json;

var client = new HttpClient();
client.DefaultRequestHeaders.Add("X-Api-Key", "votre_api_key");
client.DefaultRequestHeaders.Add("X-Api-Secret", "votre_api_secret");

var payload = new
{
    amount = 10000,
    orderReference = "CMD-12345",
    returnUrl = "https://monsite.sn/success",
    webhookUrl = "https://monsite.sn/webhooks/senepay"
};

var json = JsonSerializer.Serialize(payload);
var content = new StringContent(json, Encoding.UTF8, "application/json");

var response = await client.PostAsync(
                    "https://api.sene-pay.com/api/v1/checkout/sessions", content);

var result = await response.Content.ReadAsStringAsync();
var data = JsonSerializer.Deserialize<JsonElement>(result);
var checkoutUrl = data.GetProperty("checkoutUrl").GetString();
// Rediriger le client vers checkoutUrl
```

```
import requests

response = requests.post(
                    'https://api.sene-pay.com/api/v1/checkout/sessions',
    headers={
                    'Content-Type': 'application/json',
                    'X-Api-Key': 'votre_api_key',
                    'X-Api-Secret': 'votre_api_secret'
    },
    json={
                    'amount': 10000,
                    'orderReference': 'CMD-12345',
                    'returnUrl': 'https://monsite.sn/success',
                    'webhookUrl': 'https://monsite.sn/webhooks/senepay'
    }
)

data = response.json()
checkout_url = data['checkoutUrl']
# Rediriger le client vers checkout_url
```

## 3. Vérifier le statut d'une session

`GET /api/v1/checkout/sessions/{sessionToken}`

#### Headers requis

```
X-Api-Key: votre_api_key
X-Api-Secret: votre_api_secret
```

#### Réponse

```
{
    "sessionToken": "chk_abc123xyz789",
    "status": "Complete",
    "amount": 10000,
    "currency": "XOF",
    "orderReference": "CMD-12345",
    "createdAt": "2026-05-13T14:00:00Z",
    "completedAt": "2026-05-13T14:05:00Z",
    "payment": {
        "transactionId": "SENEPAY_PAYIN_a1b2c3d4e5f60718",
        "operator": "wave",
        "country": "SN",
        "phoneNumber": "77*****67",
        "amountPaid": 10000,
        "fees": 360,
        "netAmount": 9640,
        "paidAt": "2026-05-13T14:05:00Z"
    }
}
```

*Le `transactionId` commence toujours par `SENEPAY_PAYIN_` suivi d'un identifiant hexadécimal. Les frais affichés (`fees`) correspondent à 3,6 % du montant — Sene-Pay prélève l'intégralité de la commission (payin + réserve payout) au moment de l'encaissement.*

#### Statuts possibles

| Statut | Description |
| --- | --- |
| Open | Session créée, en attente de paiement. |
| Processing | Paiement initié, en cours de traitement par l'opérateur mobile money. |
| Complete | Paiement réussi. Fonds crédités au wallet marchand. |
| Failed | Paiement échoué (refus, solde insuffisant, OTP erroné, etc.). |
| Cancelled | Annulé par le client. |
| Expired | Session expirée (`expiresInMinutes` dépassé sans paiement). |

## 4. Notifications Webhook

Quand un paiement est complété ou échoue, SenePay envoie une notification HTTP POST à votre `webhookUrl` (signée HMAC-SHA256). Si votre endpoint ne répond pas en HTTP 2xx, Sene-Pay **réessaie automatiquement pendant ~3 jours** (jusqu'à 14 tentatives à intervalles croissants, de quelques secondes à plusieurs heures). La notification n'est jamais perdue : les échecs définitifs restent visibles et **rejouables manuellement** côté Sene-Pay.

### Payload du webhook

```
{
    "event": "checkout.session.completed",
    "sessionToken": "chk_abc123xyz789",
    "orderReference": "CMD-12345",
    "status": "Complete",
    "amount": 10000,
    "currency": "XOF",
    "fees": 360,
    "netAmount": 9640,
    "transactionId": "SENEPAY_PAYIN_a1b2c3d4e5f60718",
    "customer_phone": "221771234567",
    "metadata": {
        "client_id": "123",
        "product": "T-shirt"
    },
    "timestamp": "2026-05-13T14:05:00Z"
}
```

*Le `status` reflète le statut de la session : `"Complete"` (sans 'd'), `"Failed"`, etc. — pas `"Completed"`. Le `transactionId` reprend l'`InternalId` du payin (préfixé `SENEPAY_PAYIN_`).*

#### Types d'événements

| Événement | Status associé | Description |
| --- | --- | --- |
| `checkout.session.completed` | `Complete` | Paiement réussi, fonds crédités au wallet marchand. |
| `checkout.session.failed` | `Failed` | Paiement refusé (solde insuffisant, OTP erroné, rejet provider). |

### Vérifier la signature

Chaque webhook est signé avec votre `webhookSigningSecret` (préfixé `whsec_`), retourné une seule fois à la création de la clé API. La signature est transmise dans le header `X-SenePay-Signature` (hexadécimal en minuscules) et le type d'événement dans `X-SenePay-Event`.

```
// Node.js — vérification de la signature
const crypto = require('crypto');

app.post('/webhooks/senepay', express.raw({ type: 'application/json' }), (req, res) => {
    const signature = req.headers['x-senepay-signature'];
    const body = req.body.toString('utf8');
    const expected = crypto
        .createHmac('sha256', process.env.SENEPAY_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

    if (signature !== expected) {
        return res.status(401).send('Signature invalide');
    }

    const payload = JSON.parse(body);
    // ... traitement de l'événement
    res.status(200).json({ received: true });
});
```

> **Important :** calculez le HMAC sur le **corps brut** de la requête (avant tout parsing JSON), avec votre `webhookSigningSecret` (jamais votre `X-Api-Secret`). Si vous l'avez perdu, appelez `POST /api/v1/merchant/api-credentials/{id}/rotate-webhook-secret` pour en générer un nouveau.

### Exemple de traitement

```
// Express.js
app.post('/api/webhooks/senepay', (req, res) => {
                    const payload = req.body;
    
                    if (payload.event === 'checkout.session.completed') {
                    // Paiement réussi
                    const orderRef = payload.orderReference;
                    const netAmount = payload.netAmount;
        
                    // Mettre à jour votre base de données
                    // updateOrder(orderRef, { status: 'paid' });
    }
    
                    if (payload.event === 'checkout.session.failed') {
                    // Paiement échoué - notifier le client
    }
    
                    // Toujours répondre 200 OK
    res.status(200).json({ received: true });
});
```

```
<?php
$payload = json_decode(file_get_contents('php://input'), true);

if ($payload['event'] === 'checkout.session.completed') {
                    // Paiement réussi
    $orderRef = $payload['orderReference'];
    $netAmount = $payload['netAmount'];
    
                    // Mettre à jour la commande dans votre BDD
                    // $db->query("UPDATE orders SET status='paid' WHERE reference='$orderRef'");
}

// Répondre 200 OK
http_response_code(200);
echo json_encode(['received' => true]);
```

```
// ASP.NET Core Controller
[HttpPost("/api/webhooks/senepay")]
public IActionResult HandleWebhook([FromBody] JsonElement payload)
{
                    var eventType = payload.GetProperty("event").GetString();
    
                    if (eventType == "checkout.session.completed")
    {
                    var orderRef = payload.GetProperty("orderReference").GetString();
                    var netAmount = payload.GetProperty("netAmount").GetDecimal();
        
                    // Mettre à jour la commande
                    // _orderService.MarkAsPaid(orderRef);
    }
    
                    return Ok(new { received = true });
}
```

```
# Flask
@app.route('/api/webhooks/senepay', methods=['POST'])
def handle_webhook():
    payload = request.get_json()
    
                    if payload['event'] == 'checkout.session.completed':
        order_ref = payload['orderReference']
        net_amount = payload['netAmount']
        
                    # Mettre à jour la commande
                    # update_order(order_ref, status='paid')
    
                    return jsonify({'received': True}), 200
```

> **Bonnes pratiques:** Toujours répondre **200 OK** rapidement Vérifier que le sessionToken existe dans votre système Gérer les doublons (le webhook peut être envoyé plusieurs fois)

## 5. Gestion des erreurs

#### Codes HTTP

| Code | Description |
| --- | --- |
| `400` | Requête invalide (paramètres manquants, devise incompatible, opérateur non supporté, etc.). Code métier souvent `INVALID_PARAMETER`. |
| `401` | Authentification échouée. Code métier précis selon le cas : `MISSING_API_KEY`, `MISSING_API_SECRET`, `INVALID_API_KEY_FORMAT`, `INVALID_API_SECRET_FORMAT`, `INVALID_CREDENTIALS`, `API_KEY_NOT_FOUND`, `API_KEY_REVOKED`. |
| `403` | Accès refusé. Code métier : `NO_KYC_PROFILE` (KYC non démarré), `KYC_NOT_VERIFIED` (KYC non validé), `ACCOUNT_NOT_ACTIVE` (compte suspendu), `IP_NOT_WHITELISTED` (IP appelante non autorisée pour cette clé). |
| `404` | Ressource introuvable (session, payout, batch). Code métier : `NOT_FOUND`. |
| `429` | Trop de requêtes ou limite quotidienne atteinte. Code métier : `LIMIT_REACHED`. |
| `500` | Erreur serveur interne. Code métier : `INTERNAL_ERROR` (contactez le support en indiquant le timestamp). |
| `409` | Opération refusée ou incertaine côté provider mobile money (ex. float opérateur insuffisant). Codes : `PROVIDER_ERROR`, `PROVIDER_EXCEPTION`. Erreur métier, à ne pas rejouer automatiquement (le wallet est remboursé pour un rejet terminal). |
| `504` | Timeout en attente du provider. Code : `PROVIDER_TIMEOUT` — le wallet a été remboursé. |

#### Format des erreurs

Format **préféré** (toutes les erreurs métier et celles renvoyées par le middleware d'authentification) :

```
{
    "code": "INVALID_PARAMETER",
    "message": "Le champ 'currency' est requis."
}
```

Format **fallback** (renvoyé par certaines exceptions internes 500) :

```
{
    "error": "Description courte de l'erreur"
}
```

Code à écrire défensivement : essayez d'abord `response.code`, puis fallback sur `response.error`.

## 6. Environnement de test

### Appels API

Vous appelez **les mêmes endpoints** qu'en production. Notre système détecte automatiquement l'environnement (Sandbox ou Production) en fonction de vos clés API :

- Clés **Sandbox** (ex: `pk_test_*` / `sk_test_*`) → Environnement de test
- Clés **Production** (ex: `pk_live_*` / `sk_live_*`) → Environnement réel

### Numéros de test (Sandbox)

En mode Sandbox, utilisez les numéros de téléphone suivants pour simuler différents comportements de paiement. L'API reproduira le comportement correspondant (succès, échec, attente).

> **Préfixe pays** — La colonne "Numéro local" liste le numéro **sans** l'indicatif international. Sur la page Checkout hébergée, l'indicatif est ajouté automatiquement. Si vous appelez l'API en direct (sans utiliser le Checkout), envoyez le **numéro complet avec indicatif** indiqué dans la colonne "Numéro complet API".

| Pays | Numéro local (saisi sur Checkout) | Numéro complet API (appel direct API) | Résultat simulé |
| --- | --- | --- | --- |
| Sénégal (SN) | `700000001` | `221700000001` | Succès (Complete) |
| Sénégal (SN) | `700000002` | `221700000002` | En attente (Processing → Complete après 10 s) |
| Sénégal (SN) | `700000003` | `221700000003` | Échec (Failed) |
| Côte d'Ivoire (CI) | `2100000001` | `2252100000001` | Succès |
| Côte d'Ivoire (CI) | `2100000002` | `2252100000002` | En attente |
| Côte d'Ivoire (CI) | `2100000003` | `2252100000003` | Échec |
| Burkina Faso (BF) | `60000001` | `22660000001` | Succès |
| Burkina Faso (BF) | `60000002` | `22660000002` | En attente |
| Burkina Faso (BF) | `60000003` | `22660000003` | Échec |
| Cameroun (CM) | `660000001` | `237660000001` | Succès |
| Cameroun (CM) | `660000002` | `237660000002` | En attente |
| Cameroun (CM) | `660000003` | `237660000003` | Échec |
| Guinée (GN) | `600000001` | `224600000001` | Succès |
| Guinée (GN) | `600000002` | `224600000002` | En attente |
| Guinée (GN) | `600000003` | `224600000003` | Échec |
| R.D. Congo (CD) – CDF | `120000011` | `243120000011` | Succès |
| R.D. Congo (CD) – CDF | `120000012` | `243120000012` | En attente |
| R.D. Congo (CD) – CDF | `120000013` | `243120000013` | Échec |
| Togo (TG) | `60000001` | `22860000001` | Succès |
| Togo (TG) | `60000002` | `22860000002` | En attente |
| Togo (TG) | `60000003` | `22860000003` | Échec |
| Bénin (BJ) | `60000001` | `22960000001` | Succès |
| Bénin (BJ) | `60000002` | `22960000002` | En attente |
| Bénin (BJ) | `60000003` | `22960000003` | Échec |
| Mali (ML) | `60000001` | `22360000001` | Succès |
| Mali (ML) | `60000002` | `22360000002` | En attente |
| Mali (ML) | `60000003` | `22360000003` | Échec |
| Niger (NE) | `60000001` | `22760000001` | Succès |
| Niger (NE) | `60000002` | `22760000002` | En attente |
| Niger (NE) | `60000003` | `22760000003` | Échec |
| Gabon (GA) | `60000001` | `24160000001` | Succès |
| Gabon (GA) | `60000002` | `24160000002` | En attente |
| Gabon (GA) | `60000003` | `24160000003` | Échec |
| Congo (CG) | `60000001` | `24260000001` | Succès |
| Congo (CG) | `60000002` | `24260000002` | En attente |
| Congo (CG) | `60000003` | `24260000003` | Échec |
| Gambie (GM) | `60000001` | `22060000001` | Succès |
| Gambie (GM) | `60000002` | `22060000002` | En attente |
| Gambie (GM) | `60000003` | `22060000003` | Échec |
| Guinée-Bissau (GW) | `60000001` | `24560000001` | Succès |
| Guinée-Bissau (GW) | `60000002` | `24560000002` | En attente |
| Guinée-Bissau (GW) | `60000003` | `24560000003` | Échec |

#### Test des codes OTP

Pour les opérateurs nécessitant un OTP (Orange, MTN, Moov), utilisez n'importe quel code à 6 chiffres (ex: `123456`) pour simuler un succès, sauf les codes suivants qui déclenchent un échec :

- `000000`
- `111111`
- `222222`
- `333333`
- `444444`

> **Sur la page Checkout :** saisissez juste la colonne "Numéro local", l'indicatif est ajouté automatiquement. **Via appel API direct (sans Checkout) :** envoyez le "Numéro complet API" (indicatif + numéro local concaténé). Le matching est effectué exactement sur cette chaîne.

### Webhooks en mode test

Les webhooks sont envoyés **normalement** en mode Sandbox, avec exactement le **même format que la production** (mêmes champs, même signature HMAC dans `X-SenePay-Signature`). Traitez-les exactement comme en production et répondez rapidement avec un `200 OK`. La même règle de réessais (jusqu'à ~3 jours) s'applique aussi en sandbox.

> **Conseil :** Testez d'abord en Sandbox, vérifiez les webhooks, la signature et la logique d'idempotence, puis passez en production.

## 7. Checklist d'intégration

- Compte marchand créé et validé
- Clés API générées
- Endpoint de création de session implémenté
- Redirection vers checkoutUrl fonctionnelle
- Webhook endpoint configuré et accessible
- Traitement des événements webhook
- Gestion des erreurs
- Tests effectués

# API Payin Direct – sans page de checkout

Construisez votre propre interface de paiement (choix du pays, sélection de l'opérateur Mobile Money, saisie du téléphone, OTP éventuel) et appelez Sene-Pay directement depuis votre backend. Le client ne quitte jamais votre site/app — sauf pour Wave qui exige une redirection vers le lien fourni par le PSP.

> **Quand choisir l'API Direct plutôt que le Checkout ?** — Vous voulez maîtriser l'UX (charte graphique, langue, parcours custom), garder le client sur votre domaine, ou intégrer le paiement dans une app mobile native sans WebView. Sinon, le Checkout hébergé reste plus simple à intégrer.

### Endpoints exposés

| Endpoint | Méthode | Description |
| --- | --- | --- |
| `/api/v1/payments/initiate` | POST | Initie le paiement (push USSD, lien Wave, ou demande OTP). |
| `/api/v1/payments/{token}/status` | GET | Statut courant d'un paiement. |
| `/api/v1/payments/search/by-token?token=…` | GET | Recherche par token. |
| `/api/v1/payments/search/by-order?orderId=…` | GET | Toutes les tentatives liées à un `orderId`. |
| `/api/v1/payments/list?page=1&pageSize=20` | GET | Liste paginée des paiements du marchand. |

## 1. Initier un paiement

`POST /api/v1/payments/initiate`

#### Headers requis

```
Content-Type: application/json
X-Api-Key: votre_api_key
X-Api-Secret: votre_api_secret
```

#### Corps de la requête

| Champ | Type | Obligatoire | Description |
| --- | --- | --- | --- |
| `amount` | number | ✅ Oui | Montant à débiter. Minimum **200** (FCFA équivalent). |
| `currency` | string | Non | `XOF` (défaut), `XAF`, `GNF`, `CDF`. |
| `country_code` | string | ✅ Oui | ISO 2 lettres : `SN`, `CI`, `BF`, `ML`, `BJ`, `TG`, `NE`, `GN`, `CM`, `GA`, `CG`, `CF`, `TD`, `CD`, `GM`, `GW`. Insensible à la casse. Défaut : `SN`. |
| `operator` | string | ✅ Oui | Code de la méthode de paiement (insensible à la casse). Varie selon le pays — consultez [`GET /api/v1/countries`](#api-pays-methodes) pour la liste à jour. Défaut : `wave`. |
| `customer_phone` | string | ✅ Oui | Numéro du client au format international recommandé (ex. `+221770000000`). Sene-Pay le normalise automatiquement avant traitement. |
| `otp_code` | string | Conditionnel | Requis lorsque la méthode exige un OTP saisi côté API (cas d'Orange Money dans `SN`, `CI`, `BF`, `GN`). Voir [section OTP / USSD](#api-direct-otp). |
| `order_id` | string | Non | Référence de commande côté marchand (max 100 caractères). Plusieurs tentatives peuvent partager le même `order_id`. |
| `customer_name` | string | Non | Nom du client (affichage informatif). |
| `return_url` | string | Non | URL de retour utilisée par Wave (redirection après paiement). |
| `cancel_url` | string | Non | URL appelée en cas d'annulation côté PSP. |
| `webhook_url` | string | Non | URL de webhook spécifique à ce paiement (sinon webhook global utilisé). |
| `metadata` | object | Non | Clés/valeurs libres sérialisables. |

💡 Les noms de champs sont indiqués en `snake_case` (recommandé), mais l'API accepte aussi le `camelCase` (`countryCode`, `customerPhone`…) — cf. [Conventions de nommage](#introduction).

#### Exemple (MTN Côte d'Ivoire — déclenche un push USSD sur le téléphone)

```
curl -X POST https://api.sene-pay.com/api/v1/payments/initiate \
  -H "Content-Type: application/json" \
  -H "X-Api-Key: pk_live_..." \
  -H "X-Api-Secret: sk_live_..." \
  -d '{
    "amount": 5000,
    "currency": "XOF",
    "country_code": "CI",
    "operator": "mtn",
    "customer_phone": "+2250700000001",
    "customer_name": "Moussa Diallo",
    "order_id": "CMD-2026-00123",
    "webhook_url": "https://votre-site.com/api/webhook/senepay"
  }'
```

#### Réponse (200 OK)

📥 Les champs de réponse sont en `camelCase` (comme pour le Checkout). Les réponses de l'API Payout, elles, sont en `snake_case`.

```
{
    "statut": true,
    "message": "Paiement initié.",
    "token": "afp_tx_abc123def456",
    "redirectUrl": null,
    "internalId": "SENEPAY_PAYIN_8f3a1b2c4d5e6f7a8b9c0d1e2f3a4b5c",
    "status": "Pending",
    "errorCode": null,
    "failedReason": null,
    "nextAction": "USSD_PUSH",
    "otpRequired": false
}
```

#### Champs de la réponse

| Champ | Type | Description |
| --- | --- | --- |
| `statut` | boolean | Toujours `true` sur HTTP 200 (compatibilité historique). Pour détecter un échec, inspecter `status`. |
| `message` | string | Message lisible. En cas d'échec, contient `failedReason`. |
| `token` | string | ID transaction côté provider (`tokenPay`). À conserver pour le suivi. |
| `redirectUrl` | string \\| null | Lien fourni par le provider. **Non-null uniquement pour Wave** (lien QR / page paiement). |
| `internalId` | string | ID interne Sene-Pay (`SENEPAY_PAYIN_{GUID}`). Pour vos logs et le rapprochement comptable. |
| `status` | string | `Pending`, `Completed`, `Cancelled` ou `Failed`. |
| `errorCode` | string \\| null | Code d'erreur normalisé si `status = Failed` (ex. `PAYMENT_FAILED`, `INVALID_OTP`, `EXCEPTION`). |
| `failedReason` | string \\| null | Message d'erreur traduit en français, prêt à afficher. |
| `nextAction` | string | Action attendue côté marchand. Voir [section suivante](#api-direct-next-action). |
| `otpRequired` | boolean | Raccourci : `true` si `nextAction == "OTP_REQUIRED"`. |

> **Codes HTTP & cas particulier de l'initiation** — Sene-Pay utilise des codes HTTP **standard** : `200` (succès), `400` (requête invalide), `401` (authentification), `403` (KYC / compte), `404`, `429` (quota / rate-limit), `500` (erreur serveur). **Particularité de l'API Direct** : quand un paiement est *refusé par l'opérateur* (numéro invalide, solde insuffisant, OTP erroné…), la requête reste techniquement valide — `/payments/initiate` répond donc `200 OK` avec `status: "Failed"`, `nextAction: "NONE"` et le détail dans `errorCode`/`failedReason`. **Inspectez toujours le champ `status`** (et non `statut`, toujours `true` sur un 200) pour savoir si le paiement a abouti.

## 2. Le champ `nextAction`

Ce champ pilote toute l'UX côté marchand après l'`initiate`. Quatre valeurs possibles :

| `nextAction` | Quand | Que faire côté marchand |
| --- | --- | --- |
| **`REDIRECT_TO_PROVIDER_LINK`** | Opérateur = `wave` et `redirectUrl` retourné. | Rediriger le client vers `redirectUrl` (web) ou afficher le QR code (mobile). |
| **`USSD_PUSH`** | MTN, Moov, Free, Expresso, Airtel, T-Money — ou Orange après OTP. | Afficher « Confirmez la transaction sur votre téléphone » + spinner. Poller `GET /api/v1/payments/{token}/status` toutes les 3–5 s, ou attendre le webhook. |
| **`OTP_REQUIRED`** | Orange dans `SN`, `CI`, `BF`, `GN` quand `otpCode` est absent. | Demander au client de composer le code USSD opérateur (ex. `#144#391#`), récupérer l'OTP par SMS, puis ré-appeler `/payments/initiate` avec `otpCode`. |
| **`NONE`** | `status ∈ {Failed, Cancelled, Completed}`. | Pas d'action immédiate. Lire `failedReason` / `errorCode` en cas d'échec. |

*Astuce : traitez `nextAction` comme une enum dans votre code et faites un `switch` dessus — vous n'aurez plus à hard-coder la liste des opérateurs nécessitant un OTP ou un redirect.*

## 3. USSD & OTP

> **USSD ≠ propre à Orange.** Beaucoup de méthodes mobile money demandent au client de **valider sur son téléphone**. Deux cas : **Push USSD (`nextAction: USSD_PUSH`)** — une notification/prompt arrive sur le téléphone ; le client confirme avec son code secret. Rien à renvoyer à l'API. Concerne la plupart des méthodes ayant un `ussdCode` (cf. [`GET /api/v1/countries`](#api-pays-methodes)). **OTP saisi côté API (`nextAction: OTP_REQUIRED`)** — le client génère un code OTP par USSD et *vous* le renvoyez dans `otp_code`. C'est le cas d'**Orange Money** en `SN`, `CI`, `BF`, `GN`. Détaillé ci-dessous. Pour savoir si une méthode nécessite un USSD, vérifiez si son `ussdCode` est non vide dans [`/api/v1/countries`](#api-pays-methodes).

### Flux OTP (Orange Money — SN, CI, BF, GN)

#### Étape 1 — Première tentative sans OTP

```
POST /api/v1/payments/initiate
{
    "amount": 5000,
    "currency": "XOF",
    "country_code": "SN",
    "operator": "orange",
    "customer_phone": "+221770000001"
}
```

Réponse :

```
{
    "statut": true,
    "token": "afp_tx_xyz",
    "status": "Pending",
    "nextAction": "OTP_REQUIRED",
    "otpRequired": true
}
```

### Étape 2 — Le client génère son OTP

Affichez ce message à votre client (à adapter selon le pays — le code USSD exact dépend de l'opérateur local) :

#### Étape 3 — Seconde tentative avec OTP

Ré-appelez `/payments/initiate` avec le même `customer_phone` et le champ `otp_code` rempli :

```
POST /api/v1/payments/initiate
{
    "amount": 5000,
    "currency": "XOF",
    "country_code": "SN",
    "operator": "orange",
    "customer_phone": "+221770000001",
    "otp_code": "12345678",
    "order_id": "CMD-2026-00123"
}
```

La réponse devient `nextAction: "USSD_PUSH"` ou directement `status: "Completed"` selon l'opérateur.

## Pays & méthodes de paiement supportés

La liste des pays, devises et méthodes de paiement (avec leur éventuel code USSD) est **dynamique** et peut évoluer. Plutôt que de la coder en dur, interrogez cet endpoint public :

`GET /api/v1/countries`

*Public — aucune clé requise.*

#### Réponse (extrait)

```
{
    "success": true,
    "count": 14,
    "countries": [
        {
            "code": "SN",
            "name": "Sénégal",
            "phonePrefix": "+221",
            "currencies": [
                {
                    "currency": "XOF",
                    "operators": [
                        { "code": "wave",   "name": "Wave",         "requiresUssd": false, "ussdCode": null,        "available": true },
                        { "code": "orange", "name": "Orange Money", "requiresUssd": true,  "ussdCode": "#144#391#", "available": true }
                    ]
                }
            ]
        }
    ]
}
```

> **Comment savoir si une méthode requiert un USSD ?** Regardez son champ `ussdCode` : **s'il est non vide, la méthode nécessite une étape USSD** (le champ `requiresUssd` reflète déjà cette règle). Le `ussdCode` est le code que le client compose sur son téléphone (ex. Orange Money SN : `#144#391#`). Ne supposez jamais qu'une méthode précise « est » ou « n'est pas » USSD : fiez-vous au `ussdCode` renvoyé par cet endpoint.

Les codes `operator` et `code` pays s'utilisent indifféremment en minuscules ou majuscules dans vos requêtes (`sn` = `SN`, `wave` = `WAVE`).

## 4. Vérifier le statut d'un paiement

`GET /api/v1/payments/{token}/status`

*`{token}` = valeur du champ `token` retournée par `/payments/initiate`.*

#### Headers requis

```
X-Api-Key: votre_api_key
X-Api-Secret: votre_api_secret
```

#### Exemple

```
curl -X GET https://api.sene-pay.com/api/v1/afp_tx_abc123def456/status \
  -H "X-Api-Key: pk_live_..." \
  -H "X-Api-Secret: sk_live_..."
```

#### Réponse (200 OK)

```
{
    "statut": true,
    "token": "afp_tx_abc123def456",
    "orderId": "CMD-2026-00123",
    "amount": 5000,
    "status": "Completed",
    "currency": "XOF",
    "totalFee": 180,
    "creditedAmount": 4820,
    "customer": {
        "name": "Moussa Diallo",
        "phone": "+221770000001"
    },
    "createdAt": "2026-05-23T14:30:00Z"
}
```

*`totalFee` agrège les frais provider et la commission Sene-Pay.*

#### Statuts possibles

| Statut | Description |
| --- | --- |
| Pending | Paiement initié — en attente de confirmation client (USSD/Wave). |
| Completed | ✅ Paiement réussi — le wallet marchand a été crédité de `creditedAmount`. |
| Failed | ❌ Paiement refusé ou échoué côté PSP/opérateur. |
| Cancelled | Annulé par le client. |

> **Polling vs Webhook** — Polling recommandé : 1 requête toutes les 3–5 secondes, avec un timeout côté UI à 90 s pour les opérateurs USSD. Pour éviter le polling, fournissez plutôt `webhookUrl` au moment de l'`initiate` — le format de webhook est identique à celui décrit dans la section [Webhooks Checkout](#webhooks).

#### Erreurs

| Code HTTP | Code d'erreur | Quand |
| --- | --- | --- |
| 400 | `MISSING_TOKEN` / `INVALID_TOKEN_FORMAT` | Token vide ou trop court (< 10 caractères). |
| 401 | `API_KEY_REQUIRED` | En-têtes `X-Api-Key`/`X-Api-Secret` manquants. |
| 403 | `ACCESS_DENIED` | Le token n'appartient pas au marchand authentifié. |
| 404 | `PAYMENT_NOT_FOUND` | Aucun paiement pour ce token. |

## 5. Recherche & liste

### 5.1 Recherche par `orderId` (multi-tentatives)

Si un client a réessayé plusieurs fois pour la même commande, listez toutes les tentatives :

`GET /api/v1/payments/search/by-order?orderId={votreOrderId}`

```
{
    "statut": true,
    "total": 2,
    "data": [
        { "token": "afp_tx_2", "internalId": "SENEPAY_PAYIN_...", "amount": 5000, "status": "Completed", "createdAt": "..." },
        { "token": "afp_tx_1", "internalId": "SENEPAY_PAYIN_...", "amount": 5000, "status": "Failed", "createdAt": "..." }
    ]
}
```

### 5.2 Recherche par token

`GET /api/v1/payments/search/by-token?token={votreToken}`

Retourne un objet `data` avec les champs essentiels du paiement et la réponse brute du provider.

### 5.3 Liste paginée

`GET /api/v1/payments/list?page=1&pageSize=20`

```
{
    "statut": true,
    "total": 142,
    "page": 1,
    "pageSize": 20,
    "data": [ { "token": "...", "internalId": "...", "amount": 5000, "status": "Completed", "createdAt": "..." } ]
}
```

*`pageSize` maximum : 100.*

## 6. Diagrammes de flux d'intégration

### 🌊 Cas 1 — MTN / Moov / Free / Expresso / Airtel / T-Money (push USSD)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Client choisit son opérateur dans VOTRE interface           │
│  2. Backend marchand → POST /api/v1/payments/initiate           │
│     (countryCode, operator, customerPhone, amount)              │
│  3. Réponse : status=Pending, nextAction=USSD_PUSH              │
│  4. Afficher "Confirmez sur votre téléphone" + spinner          │
│  5. Le client confirme la transaction sur son téléphone         │
│  6. Webhook reçu OU poll GET /api/v1/payments/{token}/status             │
│  7. status=Completed → confirmer la commande                    │
└─────────────────────────────────────────────────────────────────┘
```

### 🌊 Cas 2 — Wave (redirection)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Client choisit Wave dans VOTRE interface                    │
│  2. Backend → POST /api/v1/payments/initiate (operator: wave)   │
│  3. Réponse : nextAction=REDIRECT_TO_PROVIDER_LINK + redirectUrl│
│  4. window.location.href = redirectUrl  (ou afficher QR code)   │
│  5. Le client paie via Wave                                     │
│  6. Redirection vers votre returnUrl                            │
│  7. GET /api/v1/payments/{token}/status pour confirmer                   │
└─────────────────────────────────────────────────────────────────┘
```

### 🌊 Cas 3 — Orange Money (SN, CI, BF, GN — OTP requis)

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Client choisit Orange dans VOTRE interface                  │
│  2. Backend → POST /api/v1/payments/initiate (sans otpCode)     │
│  3. Réponse : nextAction=OTP_REQUIRED, otpRequired=true         │
│  4. Afficher "Composez #144#391# pour recevoir votre OTP"       │
│  5. Le client saisit l'OTP reçu par SMS                         │
│  6. Backend → POST /api/v1/payments/initiate (avec otpCode)     │
│  7. Réponse : nextAction=USSD_PUSH (ou Completed direct)        │
│  8. Suite identique au Cas 1                                    │
└─────────────────────────────────────────────────────────────────┘
```

> **Mode Sandbox** — Les numéros de test, codes OTP de test et comportement simulé sont identiques à ceux du Checkout hébergé. Voir la [section Environnement de test](#test) ci-dessus.

# Wallet marchand — Consulter son solde

Consultez le solde de votre portefeuille Sene-Pay en temps réel. Endpoint utilisable depuis un backend (clés API) ou depuis votre dashboard (JWT) — au choix.

`GET /api/v1/merchant/wallet/balance`

### Authentification (au choix)

Cet endpoint accepte deux modes d'authentification :

- **Clés API** (recommandé pour usage serveur-à-serveur) : en-têtes `X-Api-Key` et `X-Api-Secret`.
- **JWT Bearer** (utilisé par le dashboard marchand) : en-tête `Authorization: Bearer <token>`.

Si aucun des deux n'est fourni, l'endpoint renvoie `401 Unauthorized`.

### Exemple — Clés API

```
curl -X GET https://api.sene-pay.com/api/v1/merchant/wallet/balance \
  -H "X-Api-Key: pk_live_..." \
  -H "X-Api-Secret: sk_live_..."
```

### Exemple — JWT

```
curl -X GET https://api.sene-pay.com/api/v1/merchant/wallet/balance \
  -H "Authorization: Bearer eyJhbGciOi..."
```

### Réponse (200 OK)

```
{
    "message": "Solde récupéré avec succès.",
    "data": {
        "balance": 125430,
        "currency": "XOF",
        "updatedAt": "2026-05-23T22:14:08Z"
    }
}
```

### Champs de la réponse

| Champ | Type | Description |
| --- | --- | --- |
| `data.balance` | number | Solde courant du wallet marchand, en unités de la devise (entier ou décimal). |
| `data.currency` | string | Devise du wallet. Actuellement `XOF` pour tous les marchands. |
| `data.updatedAt` | string (ISO 8601) | Date du dernier mouvement de wallet (crédit ou débit). `null` si aucun mouvement n'a eu lieu. |

### Erreurs

| Code HTTP | Code d'erreur | Quand |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | Aucune méthode d'authentification valide fournie. |
| 500 | `WALLET_NOT_FOUND` | Aucun wallet associé au marchand (cas exceptionnel — contacter le support). |
| 500 | `INTERNAL_ERROR` | Erreur interne lors de la récupération du solde. |

> **Cas d'usage typique** — Synchroniser votre comptabilité, déclencher une alerte interne quand le solde dépasse un seuil, afficher le solde sur votre back-office, vérifier la fonctionnalité avant un payout important.

# API Payout - Envoi d'argent

Envoyez de l'argent vers des comptes mobile money (Wave, Orange Money, MTN, Moov, Free Money, etc.) pour vos besoins de paiement de fournisseurs, remboursements clients, commissions d'affiliés, ou tout autre cas d'usage de décaissement.

**URL de base https://api.sene-pay.com/api/v1/payouts**

### Cas d'usage

- **Marketplaces** - Payer les vendeurs automatiquement
- **Remboursements** - Rembourser les clients vers leur mobile money
- **Salaires** - Payer les employés ou freelances
- **Commissions** - Distribuer les commissions d'affiliés
- **Cashback** - Envoyer des récompenses aux clients

## 1. Authentification Payout

L'API Payout utilise la même authentification par clés API que l'API Payin (`X-Api-Key` + `X-Api-Secret`). **Le JWT n'est PAS supporté** sur les endpoints publics payout — utilisez exclusivement la paire de clés API.

### Headers requis

| Header | Description |
| --- | --- |
| `X-Api-Key` | Votre clé API publique |
| `X-Api-Secret` | Votre clé API secrète |
| `Content-Type` | `application/json` |

> **Important:** Gardez vos clés API secrètes. Utilisez les clés **Sandbox** pour les tests et les clés **Production** pour les paiements réels.

## 2. Envoi simple

Envoyez de l'argent vers un seul bénéficiaire.

`POST /api/v1/payouts`

> **Convention :** l'API Payout utilise des paramètres en `snake_case` (`external_id`, `phone`, `recipient_name`, `callback_url`) et des codes opérateurs en **minuscules sans underscore** (`wave`, `orange`, `mtn`, `moov`, `free`, `tmoney`, `expresso`, `airtel`, `mpesa`). Tout autre format (camelCase, MAJUSCULES, underscore) renvoie HTTP 400.

### Corps de la requête

| Champ | Type | Requis | Description |
| --- | --- | --- | --- |
| `external_id` | string | Recommandé | Identifiant unique côté marchand. Si fourni, garantit l'idempotence : un second appel avec le même `external_id` **retourne l'état du décaissement existant (HTTP 200), sans ré-exécuter**. Vous pouvez donc relancer la même requête en toute sécurité après un timeout, sans risque de double décaissement. |
| `amount` | decimal | Oui | Montant à envoyer. Minimum 200 FCFA, maximum 5 000 000 FCFA (configurable). |
| `phone` | string | Oui | Numéro du bénéficiaire avec indicatif international (ex: `"221771234567"`). |
| `recipient_name` | string | Non | Nom du bénéficiaire (traçabilité, KYB). |
| `country` | string | Oui | Code pays ISO 2 lettres : `SN, CI, ML, BF, BJ, TG, GN, CM, NE, GA, CG, CF, TD, CD`. |
| `operator` | string | Oui | Code opérateur en minuscules (liste complète au [§ 5](#payout-operators)) : `wave`, `orange`, `mtn`, `moov`, `free`, `emoney`, `tmoney`, `airtel`, `mpesa`, `wligdicash`, `celtiis`, `coris`, `afrimoney`, `vodacom`, `amanata`, `nita`, `zamani`. |
| `type` | string | Non | Type de payout : `refund`, `seller_payment`, `salary`, `commission`, etc. |
| `description` | string | Non | Description visible dans le tableau de bord et l'audit. |
| `callback_url` | string | Non | URL HTTPS recevant le webhook final (signé via `X-SenePay-Signature`). |
| `metadata` | object | Non | Paires clé/valeur (string→string). Renvoyées telles quelles dans le webhook. |
| `fee_mode` | string | Non | Prise en charge des frais (défaut `auto`) : `on_top` (frais en plus — le bénéficiaire reçoit le montant exact, échoue si solde insuffisant), `inclusive` (frais inclus — le bénéficiaire reçoit `montant − frais`), `auto` (on_top si le solde couvre `montant + frais`, sinon inclusive). |

> **💡 Modèle de frais (depuis 2026)** — Par défaut (`fee_mode=auto`), Sene-Pay privilégie que le bénéficiaire reçoive **exactement** le montant saisi : si votre solde couvre `montant + frais`, les frais sont prélevés **en plus** (vous êtes débité de `montant + frais`). Sinon, repli automatique sur les frais inclus (vous êtes débité du montant, le bénéficiaire reçoit `montant − frais`). La réponse renvoie toujours `amount` (montant saisi), `amount_debited` (réellement débité), `net_amount` (reçu) et `fee_mode` (mode appliqué) pour une transparence totale.

### Exemples de code

```
curl -X POST https://api.sene-pay.com/api/v1/payouts \
  -H "X-Api-Key: pk_live_xxxx" \
  -H "X-Api-Secret: sk_live_xxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "PAY-2026-001",
    "amount": 25000,
    "phone": "221771234567",
    "recipient_name": "Amadou Diallo",
    "country": "SN",
    "operator": "wave",
    "type": "seller_payment",
    "description": "Commission vendeur Mai 2026",
    "callback_url": "https://votre-site.com/webhooks/payout",
    "metadata": {
      "vendorId": "V-123",
      "orderId": "ORD-456"
    }
  }'
```

```
const axios = require('axios');

const response = await axios.post(
    'https://api.sene-pay.com/api/v1/payouts',
    {
        external_id: 'PAY-2026-001',
        amount: 25000,
        phone: '221771234567',
        recipient_name: 'Amadou Diallo',
        country: 'SN',
        operator: 'wave',
        type: 'seller_payment',
        description: 'Commission vendeur Mai 2026',
        callback_url: 'https://votre-site.com/webhooks/payout',
        metadata: { vendorId: 'V-123' }
    },
    {
        headers: {
            'X-Api-Key': 'pk_live_xxxx',
            'X-Api-Secret': 'sk_live_xxxx'
        }
    }
);

console.log(response.data.disbursement_id);
```

```
<?php
$ch = curl_init('https://api.sene-pay.com/api/v1/payouts');

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'X-Api-Key: pk_live_xxxx',
        'X-Api-Secret: sk_live_xxxx',
        'Content-Type: application/json'
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'external_id' => 'PAY-2026-001',
        'amount' => 25000,
        'phone' => '221771234567',
        'recipient_name' => 'Amadou Diallo',
        'country' => 'SN',
        'operator' => 'wave',
        'type' => 'seller_payment',
        'description' => 'Commission vendeur',
        'callback_url' => 'https://votre-site.com/webhooks/payout'
    ])
]);

$response = curl_exec($ch);
$data = json_decode($response, true);

echo $data['disbursement_id'];
```

```
import requests

response = requests.post(
    'https://api.sene-pay.com/api/v1/payouts',
    headers={
        'X-Api-Key': 'pk_live_xxxx',
        'X-Api-Secret': 'sk_live_xxxx'
    },
    json={
        'external_id': 'PAY-2026-001',
        'amount': 25000,
        'phone': '221771234567',
        'recipient_name': 'Amadou Diallo',
        'country': 'SN',
        'operator': 'wave',
        'type': 'seller_payment',
        'description': 'Commission vendeur Mai 2026',
        'callback_url': 'https://votre-site.com/webhooks/payout',
        'metadata': {'vendorId': 'V-123'}
    }
)

print(response.json()['disbursement_id'])
```

### Réponse (succès)

```
{
    "success": true,
    "disbursement_id": "DISB_A1B2C3D4E5F60718",
    "external_id": "PAY-2026-001",
    "status": "processing",
    "amount": 25000,
    "amount_debited": 25625,
    "fee_mode": "on_top",
    "currency": "XOF",
    "fees": {
        "senepay": 0,
        "provider": 625,
        "total": 625
    },
    "net_amount": 25000,
    "recipient": {
        "phone": "221771234567",
        "name": "Amadou Diallo",
        "country": "SN",
        "operator": "wave"
    },
    "created_at": "2026-05-13T10:30:00Z",
    "message": "Payout initiated successfully",
    "error_code": null
}
```

> **Frais (nouveau modèle tarifaire, mai 2026)** — sur les payouts, Sene-Pay ne prélève **aucune commission additionnelle** (`fees.senepay = 0`). Seuls les frais du provider mobile money s'appliquent (~2,5 %). Le découpage dépend de `fee_mode` : en `on_top` (défaut `auto` si le solde le permet) le marchand est débité de `amount + fees.provider` et le bénéficiaire reçoit exactement `amount` ; en `inclusive` le marchand est débité de `amount` et le bénéficiaire reçoit `amount − fees.provider`. Voir `amount_debited` et `net_amount` dans la réponse.

### Statuts possibles

Le champ `status` est toujours retourné en **minuscules** :

| Statut | Description |
| --- | --- |
| `pending` | Décaissement enregistré, en attente de traitement. |
| `pending_approval` | En attente d'approbation manuelle (cas particuliers — KYC, montants élevés). |
| `processing` | Wallet débité, envoi au provider en cours. |
| `submitted` | Accepté par le provider mobile money, en attente de confirmation finale. |
| `pending_verification` | **Issue indéterminée** (timeout ou incident réseau avec le provider) : ni réussi, ni échoué. **Ne pas traiter comme un échec.** Le wallet n'est *pas* remboursé tant que l'issue n'est pas confirmée. Sene-Pay réconcilie automatiquement vers `completed` ou `failed` ; interrogez `GET /api/v1/payouts/{id}` ou attendez le webhook final. |
| `completed` | Le bénéficiaire a reçu les fonds. Statut final. |
| `failed` | Échec. Le wallet a été automatiquement re-crédité. Statut final. |
| `cancelled` | Annulé par le marchand (`POST /api/v1/payouts/{id}/cancel`) avant traitement. Wallet re-crédité. |

## 3. Envoi en lot (Batch)

Envoyez de l'argent à plusieurs bénéficiaires en une seule requête (max 100 par lot).

`POST /api/v1/payouts/batch`

### Corps de la requête

| Champ | Type | Description |
| --- | --- | --- |
| `external_id` | string | Identifiant unique du lot côté marchand. |
| `callback_url` | string | URL HTTPS recevant les webhooks finaux (un webhook par item). |
| `disbursements` | array | Liste des payouts (max 100). Chaque item suit le même schéma que [§ 2](#payout-single) (`external_id`, `amount`, `phone`, `recipient_name`, `country`, `operator`, …). |

### Exemple

```
curl -X POST https://api.sene-pay.com/api/v1/payouts/batch \
  -H "X-Api-Key: pk_live_xxxx" \
  -H "X-Api-Secret: sk_live_xxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "BATCH-2026-001",
    "callback_url": "https://votre-site.com/webhooks/payout",
    "disbursements": [
      {
        "external_id": "PAY-001",
        "amount": 15000,
        "phone": "221771111111",
        "recipient_name": "Mamadou Sow",
        "country": "SN",
        "operator": "wave"
      },
      {
        "external_id": "PAY-002",
        "amount": 25000,
        "phone": "221772222222",
        "recipient_name": "Fatou Diop",
        "country": "SN",
        "operator": "orange"
      },
      {
        "external_id": "PAY-003",
        "amount": 10000,
        "phone": "22507123456",
        "recipient_name": "Kouassi Jean",
        "country": "CI",
        "operator": "mtn"
      }
    ]
  }'
```

### Réponse

```
{
    "success": true,
    "batch_id": "BATCH_A1B2C3D4E5F6",
    "external_id": "BATCH-2026-001",
    "status": "processing",
    "total_count": 3,
    "total_amount": 50000,
    "total_fees": 1250,
    "disbursements": [
        {
            "disbursement_id": "DISB_...",
            "external_id": "PAY-001",
            "status": "processing",
            "amount": 15000,
            "net_amount": 14625
        }
        // ... autres disbursements
    ],
    "created_at": "2026-05-13T10:30:00Z",
    "message": "Batch initiated successfully"
}
```

### Consulter le statut d'un lot

`GET /api/v1/payouts/batch/{batch_id}`

Retourne le batch complet avec l'array `disbursements` à jour (statuts individuels), `success_count`, `failed_count`, `pending_count`.

## 4. Consulter le statut

### Par ID interne ou external_id

`GET /api/v1/payouts/{id}`

Le paramètre `{id}` accepte **soit** le `disbursement_id` (préfixé `DISB_`), **soit** votre `external_id` propriétaire. Pratique pour interroger le statut sans avoir à stocker l'ID interne.

### Réponse

```
{
    "success": true,
    "disbursement_id": "DISB_A1B2C3D4E5F60718",
    "external_id": "PAY-2026-001",
    "batch_id": null,
    "status": "completed",
    "type": "seller_payment",
    "amount": 25000,
    "currency": "XOF",
    "fees": {
        "senepay": 0,
        "provider": 625,
        "total": 625
    },
    "net_amount": 24375,
    "recipient": {
        "phone": "221771234567",
        "name": "Amadou Diallo",
        "country": "SN",
        "operator": "wave"
    },
    "description": "Commission vendeur Mai 2026",
    "provider_transaction_id": "TXN123456789",
    "error_code": null,
    "error_message": null,
    "is_sandbox": false,
    "created_at": "2026-05-13T10:30:00Z",
    "processed_at": "2026-05-13T10:30:12Z",
    "completed_at": "2026-05-13T10:30:45Z",
    "metadata": {
        "vendorId": "V-123"
    }
}
```

### Lister les payouts

`GET /api/v1/payouts`

#### Paramètres de requête (optionnels)

| Paramètre | Description |
| --- | --- |
| `status` | Filtrer par statut (`pending`, `processing`, `submitted`, `pending_verification`, `completed`, `failed`, `cancelled`). |
| `dateFrom` | Date de début (ISO 8601). |
| `dateTo` | Date de fin (ISO 8601). |
| `externalId` | Filtrer par `external_id` exact. |
| `page` | Numéro de page (défaut : 1). |
| `pageSize` | Taille de page (défaut : 20, max : 100). |

#### Format de la réponse

```
{
    "success": true,
    "data": [
        {
            "disbursement_id": "DISB_...",
            "external_id": "PAY-2026-001",
            "status": "completed",
            "amount": 25000,
            "net_amount": 24375,
            "recipient_phone": "221771234567",
            "operator": "wave",
            "country": "SN",
            "created_at": "2026-05-13T10:30:00Z",
            "completed_at": "2026-05-13T10:30:45Z"
        }
    ],
    "pagination": {
        "page": 1,
        "pageSize": 20,
        "totalCount": 137,
        "totalPages": 7
    }
}
```

### Estimer les frais

`POST /api/v1/payouts/estimate`

```
// Requête
{
    "amount": 25000,
    "country": "SN",
    "operator": "wave"
}

// Réponse
{
    "success": true,
    "estimate": {
        "amount": 25000,
        "country": "SN",
        "operator": "wave",
        "fees": {
            "senepay": 0,
            "provider": 625,
            "total": 625
        },
        "net_amount": 24375,
        "total_debit": 25000
    }
}
```

*`total_debit` = montant débité du wallet marchand = `amount` (les frais provider ne sont PAS ajoutés au débit ; ils sont prélevés sur le net reçu par le bénéficiaire).*

## 5. Opérateurs disponibles

`GET /api/v1/payouts/operators`

Les codes opérateurs sont à envoyer en **minuscules sans underscore** (ex. `wave`, `orange`, `mtn`, `moov`, `free`, `emoney`, `tmoney`, `airtel`, `mpesa`, `wligdicash`, `celtiis`, `coris`, `afrimoney`, `vodacom`, `amanata`, `nita`, `zamani`). 16 pays sont supportés pour les payouts (liste à jour : [`GET /api/v1/countries`](#api-pays-methodes)) :

### Opérateurs par pays

| Pays | Code ISO | Devise | Opérateurs |
| --- | --- | --- | --- |
| Bénin | `BJ` | XOF | `moov`, `mtn`, `celtiis`, `coris` |
| Burkina Faso | `BF` | XOF | `orange`, `moov`, `wligdicash` |
| Cameroun | `CM` | XAF | `mtn`, `orange` |
| Centrafrique | `CF` | XAF | `orange` |
| Congo (Brazzaville) | `CG` | XAF | `airtel`, `mtn` |
| Côte d'Ivoire | `CI` | XOF | `wave`, `orange`, `mtn`, `moov` |
| Gabon | `GA` | XAF | `airtel`, `moov` |
| Gambie | `GM` | GMD | `afrimoney` |
| Guinée | `GN` | GNF | `orange`, `mtn` |
| Guinée-Bissau | `GW` | XOF | `orange` |
| Mali | `ML` | XOF | `moov`, `orange` |
| Niger | `NE` | XOF | `airtel`, `moov`, `amanata`, `nita`, `zamani`, `wligdicash` |
| R.D. Congo | `CD` | CDF | `airtel`, `mpesa`, `orange`, `afrimoney`, `vodacom` |
| Sénégal | `SN` | XOF | `wave`, `orange`, `free`, `emoney` |
| Tchad | `TD` | XAF | `airtel`, `moov` |
| Togo | `TG` | XOF | `moov`, `tmoney` |

## 6. Webhooks Payout

Recevez des notifications en temps réel sur le statut de vos payouts. Le payload est **signé HMAC-SHA256** via le header `X-SenePay-Signature`. En cas d'échec HTTP (non-2xx, timeout), Sene-Pay réessaie automatiquement pendant ~3 jours (jusqu'à 14 tentatives à intervalles croissants), et les échecs définitifs restent rejouables.

### Événements

| Événement | Status associé | Description |
| --- | --- | --- |
| `disbursement.completed` | `completed` | Le bénéficiaire a reçu les fonds. |
| `disbursement.failed` | `failed` | Le payout a échoué. Le wallet a été automatiquement re-crédité. |

> **⚠️ Bonne pratique anti double-dépense** — Considérez le **webhook final** (`disbursement.completed` / `disbursement.failed`) ou `GET /api/v1/payouts/{id}` comme votre **seule source de vérité**. Ne déclenchez jamais une logique d'échec (remboursement, ré-essai métier) sur un simple **timeout HTTP** ou un statut `pending_verification` / `submitted` : le décaissement peut très bien avoir été exécuté. Attendez le statut `failed` *confirmé*.

### Headers HTTP envoyés

| Header | Valeur |
| --- | --- |
| `X-SenePay-Signature` | HMAC-SHA256(corps brut, `webhookSigningSecret`) en hexadécimal minuscules. |
| `X-SenePay-Event` | `disbursement.completed` ou `disbursement.failed`. |
| `Content-Type` | `application/json` |

### Payload du webhook

```
{
    "event": "disbursement.completed",
    "disbursement_id": "DISB_A1B2C3D4E5F60718",
    "external_id": "PAY-2026-001",
    "batch_id": null,
    "status": "completed",
    "amount": 25000,
    "net_amount": 24375,
    "fees": {
        "senepay": 0,
        "provider": 625,
        "total": 625
    },
    "recipient": {
        "phone": "221771234567",
        "name": "Amadou Diallo",
        "country": "SN",
        "operator": "wave"
    },
    "error_code": null,
    "error_message": null,
    "metadata": {
        "vendorId": "V-123"
    },
    "completed_at": "2026-05-13T10:30:45Z",
    "timestamp": "2026-05-13T10:30:46Z"
}
```

*Le payload est **plat** (pas d'enveloppe `data`) et tous les champs sont en `snake_case`. En cas d'échec, `error_code` et `error_message` sont remplis (ex: `"PROVIDER_REJECTED"`, `"INSUFFICIENT_BALANCE"`, …).*

### Vérifier la signature

La signature est calculée avec votre **`webhookSigningSecret`** (préfixé `whsec_`), retourné une seule fois à la création de la clé API ou via l'endpoint de rotation (`POST /api/v1/merchant/api-credentials/{id}/rotate-webhook-secret`). N'utilisez **pas** votre `X-Api-Secret` pour signer.

```
// Node.js — vérification de la signature payout
const crypto = require('crypto');

app.post('/webhooks/payout', express.raw({ type: 'application/json' }), (req, res) => {
    const signature = req.headers['x-senepay-signature'];
    const rawBody = req.body.toString('utf8');

    const expected = crypto
        .createHmac('sha256', process.env.SENEPAY_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

    if (signature !== expected) {
        return res.status(401).send('Invalid signature');
    }

    const payload = JSON.parse(rawBody);
    // Traiter le webhook (idempotent : utilisez disbursement_id ou external_id)
    res.status(200).json({ received: true });
});
```

> **Réponse attendue :** retournez HTTP `200` dès réception (idéalement avant le traitement complet — utilisez une queue interne). En cas d'erreur ou de timeout, le webhook est réessayé automatiquement 2 fois supplémentaires.

## 7. Limites et quotas

`GET /api/v1/payouts/limits`

### Limites par défaut

| Limite | Valeur |
| --- | --- |
| Montant minimum | 200 XOF |
| Montant maximum par payout | 5 000 000 XOF |
| Payouts par jour (compte marchand) | 100 |
| Volume quotidien max | 50 000 000 XOF |
| Items par batch | 100 |

### Réponse de l'endpoint `/limits`

```
{
    "success": true,
    "limits": {
        "min_amount": 200,
        "max_amount": 5000000,
        "max_daily_count": 100,
        "max_daily_amount": 50000000
    },
    "usage_today": {
        "count": 12,
        "amount": 347500
    },
    "stats_all_time": {
        "total_count": 2547,
        "success_count": 2498,
        "failed_count": 35,
        "pending_count": 14,
        "total_amount": 85420000,
        "success_amount": 82150000,
        "total_fees": 2053500
    }
}
```

> **Augmenter les limites :** contactez [support@sene-pay.com](mailto:support@sene-pay.com) pour demander une augmentation de vos limites (KYB renforcé requis).

## 8. Environnement Sandbox

Testez vos intégrations sans effectuer de vrais paiements. Utilisez vos clés API **Sandbox**.

### Appels API

Vous appelez **les mêmes endpoints** qu'en production. Le système détecte automatiquement l'environnement à partir du préfixe de vos clés :

- Clés **Sandbox** : `pk_test_*` / `sk_test_*` → environnement de test isolé.
- Clés **Production** : `pk_live_*` / `sk_live_*` → flux de paiement réels.

### Différences sandbox vs production

| Comportement | Production | Sandbox |
| --- | --- | --- |
| Validations métier (montant, pays, opérateur, KYC, idempotence) | Actives | Actives (à l'identique) |
| Débit du wallet | Effectif | Ignoré (pas besoin de solde) |
| Appel au provider mobile money | Réel | Simulé (succès direct) |
| Statut final | `completed` après confirmation provider | `completed` immédiatement |
| Webhook envoyé au `callback_url` | Oui, signé, réessais ~3 j | Oui (~3 s après création), **même format, même signature, mêmes réessais** |

### Codes d'erreur (référence complète)

Chaque erreur expose un code métier stable dans le champ `code` (ou `error_code`) et un statut HTTP approprié.

| HTTP | Code | Cause / Description |
| --- | --- | --- |
| `401` | `MISSING_API_KEY` | Header `X-Api-Key` absent. |
| `401` | `MISSING_API_SECRET` | Header `X-Api-Secret` absent. |
| `401` | `INVALID_API_KEY_FORMAT` | Format de la clé publique invalide. |
| `401` | `INVALID_API_SECRET_FORMAT` | Format du secret invalide. |
| `401` | `INVALID_CREDENTIALS` | Clé+secret ne correspondent pas. |
| `401` | `API_KEY_NOT_FOUND` | Clé publique inconnue. |
| `401` | `API_KEY_REVOKED` | Clé révoquée. |
| `403` | `NO_KYC_PROFILE` | Aucun profil KYC démarré. |
| `403` | `KYC_NOT_VERIFIED` | KYC en cours ou rejeté. |
| `403` | `ACCOUNT_NOT_ACTIVE` | Compte marchand suspendu/inactif. |
| `403` | `IP_NOT_WHITELISTED` | IP appelante non autorisée pour cette clé API. |
| `400` | `INVALID_PARAMETER` | Paramètre manquant ou invalide (le message détaille quel champ). |
| `400` | `DUPLICATE_EXTERNAL_ID` | `external_id` déjà utilisé pour ce marchand. |
| `400` | `INVALID_AMOUNT` | Montant hors plage [200 ; 5 000 000]. |
| `400` | `UNSUPPORTED_COUNTRY` | Code pays non pris en charge. |
| `400` | `UNSUPPORTED_OPERATOR` | Opérateur non disponible pour ce pays (vérifiez l'orthographe — lowercase sans underscore). |
| `400` | `PAYMENT_METHOD_UNAVAILABLE` | Méthode temporairement désactivée (maintenance, incident provider). |
| `404` | `MERCHANT_PROFILE_NOT_FOUND` | Profil marchand introuvable. |
| `400` | `INSUFFICIENT_BALANCE` | Solde wallet insuffisant (prod uniquement — ignoré en sandbox). |
| `400` | `WALLET_DEBIT_FAILED` | Échec technique du débit (concurrence, lock). |
| `400` | `NET_AMOUNT_TOO_LOW` | Montant net (après frais provider) inférieur au minimum requis. |
| `429` | `LIMIT_REACHED` | Limite quotidienne atteinte (nombre ou volume). |
| `409` | `PROVIDER_ERROR` | Le provider a refusé l'opération (ex. float opérateur insuffisant) — aucun fonds sorti, wallet remboursé. Ne pas rejouer automatiquement. |
| `409` | `PROVIDER_EXCEPTION` | Réponse provider incertaine — opération en cours de vérification (statut final par webhook/réconciliation). Ne pas rejouer. |
| `504` | `PROVIDER_TIMEOUT` | Timeout en attente de réponse provider — le wallet a été remboursé. |
| `404` | `NOT_FOUND` | Ressource (payout, batch) introuvable. |
| `400` | `CANNOT_CANCEL` | Annulation impossible (déjà soumis au provider). |
| `500` | `BATCH_ERROR` / `BATCH_ITEM_ERROR` | Erreur de traitement d'un batch ou d'un item. |
| `500` | `INTERNAL_ERROR` | Erreur serveur — contacter le support en mentionnant le timestamp. |