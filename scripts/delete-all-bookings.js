// Script to delete all bookings from Firebase
// Run with: node scripts/delete-all-bookings.js

const admin = require('firebase-admin');

// Initialize Firebase Admin with your credentials
const serviceAccount = {
    projectId: "yarey-biomarker",
    // Add your service account credentials here if needed
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: "yarey-biomarker"
    });
}

const db = admin.firestore();

async function deleteAllBookings() {
    console.log('🗑️  Starting to delete all bookings...');

    const bookingsRef = db.collection('bookings');
    const snapshot = await bookingsRef.get();

    console.log(`📊 Found ${snapshot.size} bookings to delete`);

    if (snapshot.size === 0) {
        console.log('✅ No bookings to delete');
        return;
    }

    // Batch delete (max 500 per batch)
    const batches = [];
    let batch = db.batch();
    let count = 0;

    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;

        if (count % 500 === 0) {
            batches.push(batch);
            batch = db.batch();
        }
    });

    // Push remaining batch
    if (count % 500 !== 0) {
        batches.push(batch);
    }

    // Commit all batches
    for (let i = 0; i < batches.length; i++) {
        await batches[i].commit();
        console.log(`✓ Deleted batch ${i + 1}/${batches.length}`);
    }

    console.log(`✅ Successfully deleted ${snapshot.size} bookings!`);
    process.exit(0);
}

// Run the deletion
deleteAllBookings().catch((error) => {
    console.error('❌ Error deleting bookings:', error);
    process.exit(1);
});
