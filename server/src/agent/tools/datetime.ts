import { dynamicTool } from "ai"
import { z } from "zod"

export const datetimeTool = () =>
  dynamicTool({
    title: "Datum & Uhrzeit",
    description:
      "Returns the current date, time, weekday and time zone. Use it " +
      "whenever the answer depends on today's date or the current time.",
    inputSchema: z.object({}),
    execute: async () => currentDateTime(),
  })

// The server's clock and time zone, which is the user's as long as Dante
// runs on their own machine.
function currentDateTime() {
  const now = new Date()
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const part = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(now)
  return {
    // "sv-SE" formats as "2026-11-03 21:30:00".
    localDateTime: now.toLocaleString("sv-SE", { timeZone }),
    weekday: part({ weekday: "long" }),
    timeZone,
    utcOffset: part({ timeZoneName: "longOffset" }).split(" ").at(-1),
  }
}
