// server.js
const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

app.use(express.json());

// CORS for your Base44 app
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'YOUR_BASE44_APP_URL');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Create subscription endpoint
app.post('/api/create-subscription', async (req, res) => {
  try {
    const { playerId, trainerId, monthlyRate } = req.body;
    
    const customer = await stripe.customers.create({
      metadata: { player_id: playerId }
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Training with Trainer ${trainerId}` },
          unit_amount: Math.round(monthlyRate * 100),
          recurring: { interval: 'month' },
        },
      }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: { player_id: playerId, trainer_id: trainerId }
    });

    res.json({
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice.payment_intent.client_secret
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription
app.post('/api/cancel-subscription', async (req, res) => {
  try {
    const subscription = await stripe.subscriptions.update(
      req.body.subscriptionId,
      { cancel_at_period_end: true }
    );
    res.json({ success: true, subscription });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(process.env.PORT || 3001, () => console.log('Server running'));