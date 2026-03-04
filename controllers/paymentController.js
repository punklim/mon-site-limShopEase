const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ─── STRIPE ───────────────────────────────────────────────────────────────────
exports.createStripePaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'eur', orderId } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // en centimes
      currency,
      metadata: { orderId: String(orderId), userId: String(req.user._id) },
    });

    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (err) {
    res.status(500).json({ message: 'Erreur Stripe', error: err.message });
  }
};

exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    // TODO: mettre à jour la commande en BDD (Order.findByIdAndUpdate)
    console.log(`✅ Stripe paiement réussi – orderId: ${pi.metadata.orderId}`);
  }
  res.json({ received: true });
};

// ─── PAYPAL ───────────────────────────────────────────────────────────────────
const getPayPalAccessToken = async () => {
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_BASE_URL } = process.env;
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  });
  const data = await response.json();
  return data.access_token;
};

exports.createPayPalOrder = async (req, res) => {
  try {
    const { amount, currency = 'EUR', orderId } = req.body;
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${process.env.PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: String(orderId),
            amount: { currency_code: currency, value: String(amount) },
          },
        ],
      }),
    });

    const order = await response.json();
    res.json({ paypalOrderId: order.id });
  } catch (err) {
    res.status(500).json({ message: 'Erreur PayPal', error: err.message });
  }
};

exports.capturePayPalOrder = async (req, res) => {
  try {
    const { paypalOrderId } = req.params;
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(
      `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders/${paypalOrderId}/capture`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const captureData = await response.json();
    if (captureData.status === 'COMPLETED') {
      // TODO: mettre à jour la commande en BDD
      console.log(`✅ PayPal paiement capturé – orderId: ${captureData.purchase_units[0].reference_id}`);
      res.json({ success: true, data: captureData });
    } else {
      res.status(400).json({ success: false, data: captureData });
    }
  } catch (err) {
    res.status(500).json({ message: 'Erreur capture PayPal', error: err.message });
  }
};

// ─── PAIEMENT À LA LIVRAISON ──────────────────────────────────────────────────
exports.cashOnDelivery = async (req, res) => {
  try {
    const { orderId } = req.body;
    // TODO: Order.findByIdAndUpdate(orderId, { paymentMethod: 'cash', paymentStatus: 'pending' })
    res.json({ success: true, message: 'Commande confirmée – paiement à la livraison', orderId });
  } catch (err) {
    res.status(500).json({ message: 'Erreur', error: err.message });
  }
};

// ─── VIREMENT BANCAIRE ────────────────────────────────────────────────────────
exports.bankTransfer = async (req, res) => {
  try {
    const { orderId } = req.body;
    const bankDetails = {
      iban: process.env.BANK_IBAN || 'FR76 XXXX XXXX XXXX XXXX XXXX XXX',
      bic: process.env.BANK_BIC || 'XXXXFRPPXXX',
      beneficiaire: process.env.BANK_NAME || 'ShopEase Boutique',
      reference: `CMD-${orderId}`,
    };
    // TODO: Order.findByIdAndUpdate(orderId, { paymentMethod: 'bank_transfer', paymentStatus: 'pending' })
    res.json({ success: true, message: 'Commande en attente de virement', bankDetails, orderId });
  } catch (err) {
    res.status(500).json({ message: 'Erreur', error: err.message });
  }
};