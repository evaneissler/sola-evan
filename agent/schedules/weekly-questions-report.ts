import { defineSchedule } from "eve/schedules";

import slack from "../channels/slack";

// Tuesdays at 09:00 EST. Vercel evaluates cron in UTC, so 09:00 EST = 14:00 UTC.
// Note: cron does not follow daylight saving, so during EDT this fires at 10:00
// local time. Change to "0 13 * * 2" if you want 09:00 during EDT instead.
export default defineSchedule({
  cron: "0 14 * * 2",
  async run({ receive, waitUntil, appAuth }) {
    waitUntil(
      receive(slack, {
        message:
          "Run the weekly questions report for the YC channel (C08F34JHQJG) covering the past 7 days. Produce the full report (theme of the week, questions & answers, and what this means for startups) as your reply so it can be posted to the team.",
        target: { channelId: "C0BFPPD9222" },
        auth: appAuth,
      }),
    );
  },
});
