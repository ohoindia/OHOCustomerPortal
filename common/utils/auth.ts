export function remainingSeconds(futureTime?: string) {
    const seconds = Math.floor((Date.parse(futureTime ?? "") - Date.now()) / 1000);
    return Number.isFinite(seconds) ? Math.max(0, seconds) : 60;
}
