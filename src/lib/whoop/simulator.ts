
/**
 * WHOOP Data Simulator
 * Provides "Deterministic" simulation of biometric data.
 * 
 * Instead of pure random noise, this uses a seeded generator based on the current date
 * and user ID. This ensures that if the API is down, the user sees CONSISTENT data
 * for the entire day, rather than numbers that jump around on every refresh.
 */

interface SimulatedMetrics {
    hrv: number;
    rhr: number;
    deepSleep: number; // minutes
    respRate: number;
    sleepMidpoint: number;
}

// Simple seeded pseudo-random generator (Linear Congruential Generator)
class SeededRNG {
    private seed: number;

    constructor(seedString: string) {
        // Convert string to numeric hash
        let hash = 0;
        for (let i = 0; i < seedString.length; i++) {
            const char = seedString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        this.seed = Math.abs(hash);
    }

    // Returns float between 0 and 1
    next(): number {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }

    // Returns float between min and max
    range(min: number, max: number): number {
        return min + (this.next() * (max - min));
    }
}

export function generateSimulatedMetrics(date: Date = new Date(), userId: string = 'guest'): SimulatedMetrics {
    // Create a unique seed for this specific day and user
    // Format: YYYY-MM-DD-USERID
    const dateStr = date.toISOString().split('T')[0];
    const seedString = `${dateStr}-${userId}`;
    const rng = new SeededRNG(seedString);

    // Generate consistent metrics for this day
    return {
        // HRV: 35-85 ms (High variability is personalized, but this is a safe range)
        hrv: Math.round(rng.range(38, 72) * 10) / 10,

        // RHR: 48-65 bpm (Lower is generally better)
        rhr: Math.round(rng.range(52, 64) * 10) / 10,

        // Deep Sleep: 45-100 minutes
        deepSleep: Math.round(rng.range(50, 95)),

        // Respiratory Rate: 13-17 rpm
        respRate: Math.round(rng.range(14.2, 16.5) * 10) / 10,

        // Sleep Midpoint: minutes from midnight (approx 3AM +/- 45 mins)
        sleepMidpoint: Math.round(rng.range(140, 220))
    };
}
