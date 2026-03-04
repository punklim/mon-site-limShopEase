const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Order = require('../models/Order');

// ─── STRIPE : créer le PaymentIntent ─────────────────────────────────────────
exports.createStripePaymentIntent = async (req, res) => {
  try {
    const { amount, currency = 'eur' } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: { userId: String(req.user._id || req.user.id) },
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ message: 'Erreur Stripe', error: err.message });
  }
};

// ─── STRIPE : confirmer et sauvegarder la commande ───────────────────────────
exports.confirmStripeOrder = async (req, res) => {
  try {
    const { products, delivery, total, paymentIntentId } = req.body;
    const order = await Order.create({
      user:           req.user._id || req.user.id,
      products,
      delivery,
      total,
      totalAmount:    total,
      paymentMethod:  'card',
      paymentId:      paymentIntentId || '',
      status:         'paid',
      deliveryStatus: 'confirmée',
    });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: 'Erreur création commande', error: err.message });
  }
};

// ─── STRIPE WEBHOOK ───────────────────────────────────────────────────────────
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  if (event.type === 'payment_intent.succeeded') {
    console.log('✅ Stripe webhook – paiement confirmé');
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
    const { amount, currency = 'EUR' } = req.body;
    const accessToken = await getPayPalAccessToken();
    
    console.log('PayPal accessToken:', accessToken ? 'OK' : 'MANQUANT');
    console.log('PayPal amount:', amount);
    
    const response = await fetch(`${process.env.PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ amount: { currency_code: currency, value: String(amount) } }],
      }),
    });
    
    const order = await response.json();
    console.log('PayPal order response:', JSON.stringify(order));
    
    if (!order.id) {
      return res.status(400).json({ 
        message: 'PayPal error', 
        details: order 
      });
    }
    
    res.json({ paypalOrderId: order.id });
  } catch (err) {
    console.error('PayPal error:', err);
    res.status(500).json({ message: 'Erreur PayPal', error: err.message });
  }
};

exports.capturePayPalOrder = async (req, res) => {
  try {
    const { paypalOrderId } = req.params;
    const { products, delivery, total } = req.body;
    const accessToken = await getPayPalAccessToken();
    const response = await fetch(
      `${process.env.PAYPAL_BASE_URL}/v2/checkout/orders/${paypalOrderId}/capture`,
      { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` } }
    );
    const captureData = await response.json();
    if (captureData.status === 'COMPLETED') {
      const order = await Order.create({
        user:           req.user._id || req.user.id,
        products,
        delivery,
        total,
        totalAmount:    total,
        paymentMethod:  'paypal',
        paymentId:      captureData.id,
        status:         'paid',
        deliveryStatus: 'confirmée',
      });
      res.json({ success: true, order });
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
    const { products, delivery, total } = req.body;
    const order = await Order.create({
      user:           req.user._id || req.user.id,
      products,
      delivery,
      total,
      totalAmount:    total,
      paymentMethod:  'cash',
      status:         'pending',
      deliveryStatus: 'confirmée',
    });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ message: 'Erreur', error: err.message });
  }
};

// ─── VIREMENT BANCAIRE ────────────────────────────────────────────────────────
exports.bankTransfer = async (req, res) => {
  try {
    const { products, delivery, total } = req.body;
    const order = await Order.create({
      user:           req.user._id || req.user.id,
      products,
      delivery,
      total,
      totalAmount:    total,
      paymentMethod:  'bank_transfer',
      status:         'pending',
      deliveryStatus: 'en attente',
    });
    const bankDetails = {
      iban:         process.env.BANK_IBAN,
      bic:          process.env.BANK_BIC,
      beneficiaire: process.env.BANK_NAME,
      reference:    `CMD-${order._id}`,
    };
    res.json({ success: true, order, bankDetails });
  } catch (err) {
    res.status(500).json({ message: 'Erreur', error: err.message });
  }
};