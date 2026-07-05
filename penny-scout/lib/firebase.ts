/**
 * Firebase SDK initialization
 *
 * Initializes both Realtime Database (for paper trades)
 * and Firestore (for scan reports and stock data).
 * Singleton pattern prevents duplicate app instances.
 */

import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: "https://socle-journal-default-rtdb.firebaseio.com",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Realtime Database for paper trading data (low-latency updates)
export const rtdb = getDatabase(app);

// Firestore for scan reports and historical data (better querying)
export const firestore = getFirestore(app);

/**
 * Firestore collections used:
 * - scanReports: hourly and daily scan summaries with top stocks
 * - stocks: cached stock fundamentals and metrics
 * - paperTrades: user portfolio tracking (paper trading)
 * - analyticsEvents: user interaction events for product insights
 */
