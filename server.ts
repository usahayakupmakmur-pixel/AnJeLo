import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import admin from "firebase-admin";
import { ethers } from "ethers";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import Stripe from "stripe";
import * as firebaseConfig from "./src/firebase-applet-config.json";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  // @ts-ignore
  apiVersion: "2025-02-24-preview",
});

// Initialize Firebase Admin
// Note: In a real production app, you'd use a service account key.
// For this environment, we'll try to initialize with the project ID.
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();
const messaging = admin.messaging();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe webhook needs raw body
  app.post("/api/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig as string,
        process.env.STRIPE_WEBHOOK_SECRET || ""
      );
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (orderId) {
        await db.collection("orders").doc(orderId).update({
          status: "paid",
          stripeSessionId: session.id,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Order ${orderId} marked as paid.`);
      }
    }

    res.json({ received: true });
  });

  app.use(express.json());

  // API Route to create a Stripe Checkout Session
  app.post("/api/create-checkout-session", async (req, res) => {
    const { orderId, amount, serviceType } = req.body;

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "idr",
              product_data: {
                name: `${serviceType} Service`,
              },
              unit_amount: amount, // Amount in cents/smallest unit (IDR doesn't have cents, but Stripe expects it)
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${process.env.APP_URL}/orders?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.APP_URL}/`,
        metadata: {
          orderId,
        },
      });

      res.json({ id: session.id, url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      res.status(500).json({ error: "Failed to create checkout session" });
    }
  });

  // API Route to trigger notifications for new orders
  app.post("/api/notify-drivers", async (req, res) => {
    const { orderId, serviceType, pickup } = req.body;

    try {
      // 1. Find all available drivers with FCM tokens
      const driversSnapshot = await db.collection("users")
        .where("role", "==", "driver")
        .where("isAvailable", "==", true)
        .get();

      const tokens: string[] = [];
      driversSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.fcmToken) {
          tokens.push(data.fcmToken);
        }
      });

      if (tokens.length === 0) {
        return res.json({ success: true, message: "No drivers with tokens found." });
      }

      // 2. Send FCM message
      const message = {
        notification: {
          title: "New Order Available!",
          body: `New ${serviceType} order from ${pickup}.`,
        },
        data: {
          orderId: orderId,
          type: "NEW_ORDER"
        },
        tokens: tokens,
      };

      const response = await messaging.sendEachForMulticast(message);
      console.log(`${response.successCount} messages were sent successfully`);

      res.json({ 
        success: true, 
        sentCount: response.successCount,
        failureCount: response.failureCount 
      });
    } catch (error) {
      console.error("Error sending notifications:", error);
      res.status(500).json({ error: "Failed to send notifications" });
    }
  });

  // API Route to notify a user when their order is accepted
  app.post("/api/notify-user", async (req, res) => {
    const { userId, orderId, serviceType } = req.body;

    try {
      // 1. Find user's FCM token
      const userDoc = await db.collection("users").doc(userId).get();
      const userData = userDoc.data();

      if (!userData || !userData.fcmToken) {
        return res.json({ success: true, message: "User has no FCM token." });
      }

      // 2. Send FCM message
      const message = {
        notification: {
          title: "Order Accepted!",
          body: `Your ${serviceType} order has been accepted by a driver.`,
        },
        data: {
          orderId: orderId,
          type: "ORDER_ACCEPTED"
        },
        token: userData.fcmToken,
      };

      const response = await messaging.send(message);
      console.log(`Successfully sent message: ${response}`);

      res.json({ success: true });
    } catch (error) {
      console.error("Error sending user notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
    }
  });

  // --- SSI & pST-N MODULE INTEGRATION ---

  /**
   * Mock DID Registry (pST-N Protocol)
   */
  app.post("/api/ssi/did/register", async (req, res) => {
    const { did, publicKey, userId } = req.body;
    try {
      await db.collection("did_registry").doc(did).set({
        did,
        publicKey,
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        status: "active"
      });
      res.json({ success: true, message: "DID registered successfully" });
    } catch (error) {
      console.error("DID Registration Error:", error);
      res.status(500).json({ error: "Failed to register DID" });
    }
  });

  /**
   * Mock BSSN/BSrE E-Signature API (v2.2.2)
   */
  app.post("/api/esign/sign", async (req, res) => {
    const { pdfBase64, signerName, did, passphrase } = req.body;
    
    // In a real BSSN integration, we would call https://api-bsre.bssn.go.id/api/v2/sign/pdf
    // Here we simulate the process using pdf-lib
    try {
      if (!passphrase || passphrase !== "123456") {
        return res.status(401).json({ error: "Invalid Passphrase" });
      }

      const pdfBytes = Buffer.from(pdfBase64, 'base64');
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      
      // Add visual signature (BSSN style)
      firstPage.drawRectangle({
        x: 50,
        y: 50,
        width: 200,
        height: 100,
        borderColor: rgb(0, 0, 0.5),
        borderWidth: 2,
      });

      firstPage.drawText(`SIGNED BY: ${signerName}`, {
        x: 60,
        y: 120,
        size: 12,
        font,
        color: rgb(0, 0, 0.5),
      });

      firstPage.drawText(`DID: ${did}`, {
        x: 60,
        y: 100,
        size: 8,
        font,
        color: rgb(0, 0, 0.5),
      });

      firstPage.drawText(`PROTOCOL: pST-N v2.0`, {
        x: 60,
        y: 85,
        size: 8,
        font,
        color: rgb(0, 0, 0.5),
      });

      firstPage.drawText(`VERIFIED BY BSSN/BSrE`, {
        x: 60,
        y: 70,
        size: 10,
        font,
        color: rgb(0.5, 0, 0),
      });

      const signedPdfBase64 = await pdfDoc.saveAsBase64();
      res.json({ success: true, pdfBase64: signedPdfBase64 });
    } catch (error) {
      console.error("E-Signature Error:", error);
      res.status(500).json({ error: "Failed to sign document" });
    }
  });

  /**
   * Mock ZKP Verification (GENES Protocol)
   */
  app.post("/api/ssi/zkp/verify", async (req, res) => {
    const { proof, publicSignals } = req.body;
    // In a real implementation, we would use snarkjs.groth16.verify
    const isValid = publicSignals[0] === "1";
    res.json({ success: true, isValid });
  });

  // --- END SSI & pST-N MODULE INTEGRATION ---

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
