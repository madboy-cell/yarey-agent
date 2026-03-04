import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";

/**
 * Recalculates the public vibe stats based on today's active bookings.
 * Should be called by Admin whenever bookings are modified.
 */
export const updateVibeStats = async () => {
    try {
        // Get Today's Date in YYYY-MM-DD (Canada format matches commonly used format in this app)
        // Adjust for timezone if necessary, but app seems to use en-CA consistently
        const now = new Date();
        const todayStr = now.toLocaleDateString("en-CA");

        const bookingsRef = collection(db, "bookings");
        // Query ALL bookings for today (Active & Cancelled, filter in code to be safe or query strict)
        const q = query(bookingsRef, where("date", "==", todayStr));

        const snapshot = await getDocs(q);
        let guestCount = 0;

        snapshot.forEach(doc => {
            const b = doc.data();
            // Count active guests
            if (b.status !== "Cancelled") {
                guestCount += (Number(b.guests) || 1);
            }
        });

        // Determine Calculated Vibe
        let vibe = "Quiet";
        if (guestCount > 8) vibe = "Lively";
        else if (guestCount > 3) vibe = "Moderate";

        // Write to Public Stats Doc
        // We Use 'settings/vibe_stats' separately from 'settings/vibe' (which holds manual override)
        await setDoc(doc(db, "settings", "vibe_stats"), {
            guestCount,
            calculatedVibe: vibe,
            updatedAt: new Date().toISOString()
        }, { merge: true });


    } catch (error) {
        console.error("Failed to update Vibe Stats:", error);
    }
};
