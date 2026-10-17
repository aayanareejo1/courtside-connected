// Mock TIMU payload shaped like timu.ca/scoreboards/results.php?tid=3960 (pools, match no, court, time, scores).
// Edit a score or status here and the next sync updates the app.
import type { TimuGame } from "@/lib/source-mapping";

const g = (match_no: string, division: string, pool: string, time: string, court: string, home: string, away: string, sets: [number, number][], status = "Final"): TimuGame =>
  ({ match_no, division, pool, date: "2026-04-19", time, court: `Court ${court}`, home, away, status, sets });

export const timuDay1: { games: TimuGame[] } = {
  games: [
    g("T-1001", "15U Girls", "Pool B", "10:00", "5", "Toronto Skyline 15U Blue", "Ottawa Peaks 15U Red", [[25, 18], [25, 20]]),
    g("T-1002", "13U Girls", "Pool A", "11:30", "20", "Lakeshore Storm 13U", "Kingston Tide 13U", [[25, 23], [19, 25], [12, 15]]),
    g("T-1003", "15U Girls", "Pool B", "12:00", "9", "Hamilton Harbour 15U", "London Lightning 15U Gold", [[25, 21], [25, 19]]),
    g("T-1004", "15U Girls", "Pool B", "13:00", "13", "Toronto Skyline 15U Blue", "Hamilton Harbour 15U", [[22, 25], [25, 17], [15, 11]]),
    g("T-1005", "13U Girls", "Pool A", "14:00", "23", "Toronto Skyline 13U White", "Ottawa Peaks 13U Blue", [[25, 16], [25, 22]]),
    g("T-1006", "13U Girls", "Pool A", "15:00", "17", "Lakeshore Storm 13U", "Toronto Skyline 13U White", [[20, 25], [25, 23], [15, 9]]),
    g("T-1007", "13U Girls", "Pool A", "16:00", "20", "Kingston Tide 13U", "Ottawa Peaks 13U Blue", [[25, 21], [25, 17]]),
    g("T-1008", "13U Girls", "Pool A", "17:00", "23", "Toronto Skyline 13U White", "Kingston Tide 13U", [[25, 22], [20, 25], [11, 15]]),
    g("T-1009", "13U Girls", "Pool A", "17:00", "17", "Lakeshore Storm 13U", "Ottawa Peaks 13U Blue", [[23, 25], [25, 19], [15, 13]]),
    g("T-1010", "15U Girls", "Pool B", "16:00", "5", "London Lightning 15U Gold", "Ottawa Peaks 15U Red", [[18, 25], [22, 25]]),
    g("T-1011", "15U Girls", "Pool B", "17:00", "9", "London Lightning 15U Gold", "Toronto Skyline 15U Blue", [[25, 20], [21, 25], [13, 15]]),
    g("T-1012", "15U Girls", "Pool B", "17:00", "13", "Hamilton Harbour 15U", "Ottawa Peaks 15U Red", [[25, 23], [26, 24]]),
  ],
};
