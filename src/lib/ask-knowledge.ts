// What Ask Courtside knows about OVA beyond the live event data: every public link from the case study, with what it is for.
// Event staff can add or change links in the app (info links); these are the fallbacks so the assistant always has them.
// Not included on purpose: the sample roster sheet (private minor data) and the Catalyst judging app (not for fans).
export type KnownLink = { id: string; title: string; url: string; category: string; useFor: string };

export const KNOWN_LINKS: KnownLink[] = [
  { id: "aes", title: "Schedules and results on AES", category: "results", url: "https://results.advancedeventsystems.com/event/MjAyNl9PbnRhcmlvX0NoYW1waW9uc2hpcHNfX19FdmVudF8yX182djZHX19UTFNHX18xNVVCXw2/home", useFor: "Official pools, brackets and standings for the indoor Ontario Championships (15U event)." },
  { id: "timu", title: "Indoor regular season results on TIMU", category: "results", url: "https://www.timu.ca/scoreboards/results.php?tid=3960", useFor: "Regular season indoor results. TIMU gives round times, not exact start times." },
  { id: "myteam", title: "Beach schedule on MyTeam.click", category: "results", url: "https://myteam.click/schedule/69a9c99aa3c28f5a62ef1235", useFor: "Beach volleyball schedule and scores." },
  { id: "champs", title: "Ontario Championships event page", category: "event", url: "https://www.ontariovolleyball.org/ontario-championships", useFor: "Event information, policies and where OVA posts venues and schedules." },
  { id: "fall", title: "Fall Classic event page", category: "venue", url: "https://www.ontariovolleyball.org/fall-classic", useFor: "A different OVA event (Fall Classic). Example of venue information, floor plan, parking and Stay to Play hotel details." },
  { id: "sponsor", title: "OVA sponsor and media page", category: "sponsor", url: "https://www.ontariovolleyball.org/ocs-sponsorship", useFor: "How to become a sponsor or a media partner." },
  { id: "hotel", title: "OVA accommodations (sign in required)", category: "hotel", url: "https://www.ontariovolleyball.org/accommodations", useFor: "Stay to Play hotel booking. Requires an OVA sign in." },
  { id: "conduct", title: "OVA code of conduct", category: "rules", url: "https://www.ontariovolleyball.org/code-of-conduct", useFor: "Behaviour rules for athletes, parents and spectators." },
  { id: "insta", title: "OVA on Instagram", category: "social", url: "https://www.instagram.com/ova_updates/", useFor: "Event photos, live updates and activations." },
  { id: "raffle", title: "OVA 50/50 raffle", category: "raffle", url: "https://ova5050.org", useFor: "Buy 50/50 raffle tickets. Proceeds develop coaches, referees and clubs. These are raffle tickets, not game admission." },
  { id: "merch", title: "Event merchandise (Canuck Stuff)", category: "merch", url: "https://www.canuckstuff.com/store/volleyball/1", useFor: "Official volleyball merchandise and team orders." },
  { id: "register", title: "OVA registration", category: "registration", url: "https://www.ontariovolleyball.org/", useFor: "Register for an OVA event or membership." },
];

// From the public OVA sponsor and media page. It lists contacts but no emails and no price packages.
export const SPONSOR_FACTS = [
  "Sponsorship contact: Kerish Maharaj, Manager of Grassroots and Community Outreach, who discusses reaching OVA's audience of more than 55,000 athletes, coaches and spectators.",
  "Media partners contact: George Huffman, Communications Coordinator.",
  "Media must register with OVA before attending any event, and check in at OVA Headquarters, room 105, to pick up an accreditation badge. Unregistered outlets are removed.",
  "The page does not list sponsorship packages, prices or email addresses, so do not invent any. Point to the page for the latest details.",
];
