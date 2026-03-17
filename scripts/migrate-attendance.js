#!/usr/bin/env node

/**
 * One‑time migration:
 * 1) Backfill checkInAt / effectiveEndAt on legacy attendance docs.
 * 2) (Optional) migrate facility_presence docs into attendance as legacyFacility.
 *
 * Usage (against PROD): npm run migrate-attendance
 *
 * IMPORTANT: This script uses the same .env as init-manager, which should
 * point at your production Firebase project when you run it.
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  where,
  Timestamp,
  addDoc,
} from 'firebase/firestore';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env file (same pattern as init-manager)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env');

try {
  const envContent = readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim().replace(/"/g, '');
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    }
  });
} catch {
  console.log('[migrate-attendance] Note: .env file not found. Make sure env vars are set.');
}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const log = (...args) => console.log('[migrate-attendance]', ...args);

async function backfillAttendanceTiming() {
  log('Step 1: Backfilling timing fields on legacy attendance docs…');

  const attendanceCol = collection(db, 'attendance');
  const snap = await getDocs(attendanceCol);
  let updated = 0;

  for (const d of snap.docs) {
    const data = d.data();
    const updates = {};

    // Only consider rows that represent actual presence
    if (data.status !== 'present' && data.status !== 'late') continue;

    // Fill checkInAt from visitStartedAt or confirmedAt
    if (!data.checkInAt) {
      const startTs = data.visitStartedAt || data.confirmedAt;
      if (startTs) {
        updates.checkInAt = startTs;
      }
    }

    // Fill effectiveEndAt from visitEndedAt
    if (!data.effectiveEndAt && data.visitEndedAt) {
      updates.effectiveEndAt = data.visitEndedAt;
    }

    // Mark obvious legacy walk-ins
    if (!data.appointmentId && !data.source) {
      updates.source = 'legacyFacility';
    }

    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, 'attendance', d.id), updates);
      updated += 1;
    }
  }

  log(`Step 1 complete. Updated ${updated} attendance docs.`);
}

// Optional: migrate facility_presence → attendance for historical facility-only visits
async function migrateFacilityPresence() {
  log('Step 2: Migrating facility_presence → attendance…');

  const presenceCol = collection(db, 'facility_presence');
  const snap = await getDocs(presenceCol);
  if (snap.empty) {
    log('No facility_presence docs found, skipping.');
    return;
  }

  const attendanceCol = collection(db, 'attendance');
  let created = 0;

  for (const d of snap.docs) {
    const data = d.data();
    const volunteerId = data.volunteerDocId;
    if (!volunteerId) continue;

    const startedAt = data.startedAt || data.createdAt || null;
    const endedAt = data.endedAt || null;

    // Skip if we've already migrated this presence record
    const existing = await getDocs(
      query(attendanceCol, where('presenceId', '==', d.id))
    );
    if (!existing.empty) continue;

    const payload = {
      presenceId: d.id,
      volunteerId: { id: volunteerId, type: 'volunteer' },
      appointmentId: null,
      source: 'legacyFacility',
      status: 'present',
      confirmedBy: 'manager',
      confirmedAt: startedAt || Timestamp.now(),
      checkInAt: startedAt || null,
      checkOutAt: endedAt || null,
      effectiveEndAt: endedAt || null,
      attendanceType: 'facility',
      visitStartedAt: startedAt || null,
      visitEndedAt: endedAt || null,
      notes: 'Migrated from facility_presence',
    };

    await addDoc(attendanceCol, payload);
    created += 1;
  }

  log(`Step 2 complete. Created ${created} attendance docs from facility_presence.`);
}

async function main() {
  try {
    await backfillAttendanceTiming();

    // Uncomment the next line if/when you want to migrate facility_presence as well:
    // await migrateFacilityPresence();

    log('Migration finished successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[migrate-attendance] ERROR', err);
    process.exit(1);
  }
}

main();

