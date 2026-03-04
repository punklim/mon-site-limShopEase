const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  createStripePaymentIntent,
  stripeWebhook,
  createPayPalOrder,
  capturePayPalOrder,
  cashOnDelivery,
  bankTransfer,
} = require('../controllers/paymentController');

// Stripe
router.post('/stripe/create-intent', protect, createStripePaymentIntent);
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// PayPal
router.post('/paypal/create-order', protect, createPayPalOrder);
router.post('/paypal/capture/:paypalOrderId', protect, capturePayPalOrder);

// Cash on delivery
router.post('/cash-on-delivery', protect, cashOnDelivery);

// Virement bancaire
router.post('/bank-transfer', protect, bankTransfer);

module.exports = router;