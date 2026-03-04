const express = require('express');
const router = express.Router();
const { authenticateJWT } = require('../middleware/authMiddleware');
const {
  createStripePaymentIntent,
  confirmStripeOrder,
  stripeWebhook,
  createPayPalOrder,
  capturePayPalOrder,
  cashOnDelivery,
  bankTransfer,
} = require('../controllers/paymentController');

// Stripe
router.post('/stripe/create-intent',  authenticateJWT, createStripePaymentIntent);
router.post('/stripe/confirm-order',  authenticateJWT, confirmStripeOrder);
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

// PayPal
router.post('/paypal/create-order',            authenticateJWT, createPayPalOrder);
router.post('/paypal/capture/:paypalOrderId',  authenticateJWT, capturePayPalOrder);

// Cash on delivery
router.post('/cash-on-delivery', authenticateJWT, cashOnDelivery);

// Virement bancaire
router.post('/bank-transfer', authenticateJWT, bankTransfer);

module.exports = router;