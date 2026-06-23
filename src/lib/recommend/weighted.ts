/**
 * Weighted random pick: an item's probability of being chosen is proportional
 * to its weight. Weights <= 0 are skipped.
 */
export function weightedPick<T>(items: T[], weightOf: (item: T) => number): T | null {
    if (items.length === 0) return null;

    const weights = items.map((it) => Math.max(0, weightOf(it)));
    const total = weights.reduce((a, b) => a + b, 0);

    if (total <= 0) {
        // no meaningful weights — pick uniformly
        return items[Math.floor(Math.random() * items.length)];
    }

    let r = Math.random() * total;
    for (let i = 0; i < items.length; i++) {
        r -= weights[i];
        if (r < 0) return items[i];
    }
    return items[items.length - 1];
}
