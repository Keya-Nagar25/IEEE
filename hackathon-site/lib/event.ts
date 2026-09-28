/**
 * Everything the public site says lives in this file.
 *
 * Values marked TODO are placeholders until the team confirms them (plan §12).
 * The event start, submission deadline and the theme can also be changed from
 * /admin without a redeploy; the dates here are only the defaults used until
 * an admin sets them. Keep the real theme OUT of this file (the repo may be
 * public) — enter it in /admin and flip "Reveal theme" when it's time.
 */

export const event = {
  name: "IEEE Hackathon", // TODO: final hackathon name
  wordmark: { main: "IEEE", suffix: " Hackathon" }, // logo text; suffix renders at weight 400
  shortTagline: "24-Hour Build Sprint", // TODO
  description:
    "A 24-hour IEEE student hackathon. Form a team, pick a problem, ship a working product, and pitch it to the judges.", // TODO
  venue: "Venue to be announced", // TODO
  timezone: "Asia/Kolkata",
  defaults: {
    eventStart: "2026-10-24T09:00:00+05:30", // TODO — real start (also editable in /admin)
    submissionDeadline: "2026-10-25T09:00:00+05:30", // TODO — real deadline (also editable in /admin)
  },
  registerUrl: "https://unstop.com/", // TODO: your Unstop event page
  whatsappUrl: "https://chat.whatsapp.com/", // TODO: your WhatsApp group invite link

  hero: {
    // Shown in the badge before JavaScript loads; the live countdown replaces it.
    badgeFallback: "24-hour student hackathon",
    line1: { before: "Build ", em: "real products", after: " in" },
    line2: "twenty-four hours.",
    lede: "One weekend, one problem statement, one working product. Register your team, build from scratch, and pitch it to the judges.",
    primaryCta: "Register on Unstop",
    secondaryCta: "Join the WhatsApp group",
  },

  // The three stats in the landing footer (icons: workflow pills, download tile, avatars).
  stats: ["24-hour build window", "₹1,00,000 prize pool", "Up to 60 teams competing"], // TODO: prize

  nav: [
    { label: "About", href: "/about" },
    { label: "Rules", href: "/rules" },
    { label: "Schedule", href: "/schedule" },
    { label: "Leaderboard", href: "/leaderboard" },
  ],

  about: {
    intro:
      "A 24-hour build sprint for student teams. You get the problem theme at kick-off, a fixed build window, and a panel of judges at the end. Everything you ship must be built during the event.",
    format: [
      "Teams of 2–4 register on Unstop before the deadline.",
      "The theme is revealed at kick-off; you pick a problem inside it.",
      "Build from scratch in a GitHub repo for 24 hours. Add the organizer reviewer as a collaborator.",
      "Submit your repo link from the team dashboard before the deadline.",
      "Top teams demo to the judges; the leaderboard goes live after judging.",
    ],
    eligibility: [
      "Open to currently enrolled undergraduate and postgraduate students.", // TODO
      "Cross-college teams are allowed.",
      "Each participant can be on only one team.",
      "Bring a laptop, charger and a valid college ID for check-in.",
    ],
    prizes: [
      { place: "Winner", reward: "₹50,000" }, // TODO
      { place: "Runner-up", reward: "₹30,000" }, // TODO
      { place: "Second runner-up", reward: "₹20,000" }, // TODO
    ],
  },

  rules: [
    "All code must be written during the event. Your repo's first commit must come after kick-off.",
    "Open-source libraries, frameworks, public APIs and AI coding tools are allowed; pre-built projects are not.",
    "Keep the repo private during the build and add the organizer reviewer as a collaborator. Make it public at evaluation time.",
    "Commit early and often. A handful of giant commits will be reviewed manually.",
    "Only the team leader submits, from the team dashboard. Submissions after the deadline are not accepted.",
    "Judges' decisions are final. Any team found breaking the rules may be disqualified.",
  ],

  // Day-of timeline (times in the event timezone).
  schedule: [
    { day: "Day 1", time: "08:00", title: "Check-in opens", detail: "Collect your team login chit and find your table." }, // TODO
    { day: "Day 1", time: "09:00", title: "Kick-off & theme reveal", detail: "Opening talk, rules walkthrough, theme announced. The build window starts." },
    { day: "Day 1", time: "13:00", title: "Lunch", detail: "Keep building — mentors walk the floor." },
    { day: "Day 1", time: "18:00", title: "Mentor check-in", detail: "Quick progress review with a mentor." },
    { day: "Day 1", time: "21:00", title: "Dinner", detail: "" },
    { day: "Day 2", time: "02:00", title: "Midnight snacks", detail: "" },
    { day: "Day 2", time: "09:00", title: "Submission deadline", detail: "Submit your repo from the dashboard. Late submissions are not accepted." },
    { day: "Day 2", time: "10:00", title: "Judging", detail: "Top teams demo to the judges." },
    { day: "Day 2", time: "13:00", title: "Results & closing", detail: "Leaderboard goes live, prizes announced." },
  ],

  reviewerGithub: "your-reviewer-account", // TODO: GitHub username teams add as a collaborator (plan §6)
  codePrefix: "HK", // login codes look like HK-X7P2M9
  teamNumberStart: 101, // first auto-assigned team number when the CSV has none
};

export type EventConfig = typeof event;
