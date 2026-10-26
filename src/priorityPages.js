// Pinned pages. A pinned page is always checked, and it replaces what the app would otherwise
// find on its own for that school and category.
//
// Categories: provost, statements, communications, community, it, releases
// Each value can be one address or a list of addresses on that school's official domain.
//
// STATUS OF THESE ADDRESSES
//  - Addresses were collected by hand from each school's website. They have NOT been
//    load-tested by the app. Open each one in a browser once. If it loads but is the wrong
//    page, replace it, because the app cannot tell the difference.
//  - If a school has no page for a category, set it to null (for example: community: null) and the
//    app will stop listing it as not found.
 
export const PINNED = {
  brown: {
    communications: "https://provost.brown.edu/communications",
    community: null,
    it: "https://it.brown.edu/",
    provost: "https://provost.brown.edu/",
    releases: null,
    statements: "https://www.brown.edu/news",
  },
  columbia: {
    communications: "https://news.columbia.edu",
    community: "https://news.columbia.edu/content/campus-community",
    it: "https://www.cuit.columbia.edu/",
    provost: "https://provost.columbia.edu/",
    releases: null,
    statements: "https://communications.news.columbia.edu/statements",
  },
  cornell: {
    communications: "https://news.cornell.edu/",
    community: null,
    it: "https://it.cornell.edu/",
    provost: "https://provost.cornell.edu/",
    releases: null,
    statements: "https://statements.cornell.edu/",
  },
  dartmouth: {
    communications: "https://home.dartmouth.edu/news",
    community: null,
    it: "https://itc.dartmouth.edu/",
    provost: "https://provost.dartmouth.edu/",
    releases: null,
    statements: "https://president.dartmouth.edu/",
  },
  duke: {
    communications: "https://today.duke.edu/",
    community: null,
    it: "https://oit.duke.edu/",
    provost: "https://provost.duke.edu/",
    releases: null,
    statements: "https://today.duke.edu/topic/university-statements",
  },
  harvard: {
    communications: "https://news.harvard.edu/gazette/",
    community: null,
    it: "https://www.huit.harvard.edu/",
    provost: "https://provost.harvard.edu/",
    releases: "https://www.harvard.edu/media-relations/category/press-releases/",
    statements: "https://www.harvard.edu/media-relations/category/press-releases/",
  },
  mit: {
    communications: "https://news.mit.edu/",
    community: null,
    it: "https://ist.mit.edu/",
    provost: "https://provost.mit.edu/",
    releases: null,
    statements: "https://president.mit.edu/writing-speeches",
  },
  penn: {
    communications: "https://penntoday.upenn.edu/",
    community: null,
    it: "https://isc.upenn.edu/",
    provost: "https://provost.upenn.edu/",
    releases: null,
    statements: "https://penntoday.upenn.edu/announcements",
  },
  princeton: {
    communications: "https://www.princeton.edu/news",
    community: null,
    it: "https://oit.princeton.edu/",
    provost: "https://provost.princeton.edu/",
    releases: null,
    statements: "https://president.princeton.edu/post-category/statements",
  },
  stanford: {
    communications: "https://news.stanford.edu/",
    community: "https://news.stanford.edu/announcement",
    it: "https://uit.stanford.edu/",
    provost: "https://provost.stanford.edu/",
    releases: "https://news.stanford.edu/university-news/topic/university-statement",
    statements: "https://news.stanford.edu/university-updates",
  },
  uchicago: {
    communications: "https://news.uchicago.edu/lateststories",
    community: "https://president.uchicago.edu/from-the-president/messages",
    it: "https://intranet.uchicago.edu/tools-and-resources/it-services/",
    provost: "https://provost.uchicago.edu/",
    releases: "https://news.uchicago.edu/media-resources/press-releases-statements",
    statements: "https://president.uchicago.edu/from-the-president/announcements",
  },
  yale: {
    communications: "https://news.yale.edu/",
    community: "https://statusboard.apps.yale.edu/",
    it: "https://yale.service-now.com/it",
    provost: "https://provost.yale.edu/",
    releases: null,
    statements: "https://president.yale.edu/from-president-mcinnis/statements",
  },
};
 
// RSS and Atom feeds per school (news feeds, emergency alert feeds, social feeds).
// Add more addresses to any list as you find them.
export const FEEDS = {
  "brown": [
    "https://www.getrave.com/rss/brown/channel2"
  ],
  "cornell": [
    "https://news.cornell.edu/taxonomy/term/81/feed"
  ],
  "harvard": [
    "https://news.harvard.edu/gazette/feed/"
  ],
  "yale": [
    "https://news.yale.edu/news-rss"
  ],
  "duke": [
    "https://today.duke.edu/topics/campus-&-community/rss"
  ],
  "mit": [
    "https://news.mit.edu/rss/feed"
  ]
};
 
// Homepage, emergency alert pages, and IT status pages per school.
// Dartmouth is included for comparison. Pause it in the app if you only want peers.
export const ALERTS = {
  "brown": {
    "homepage": "https://www.brown.edu/",
    "emergency": [
      "https://www.brown.edu/emergency"
    ],
    "status": "https://status.brown.edu/history"
  },
  "columbia": {
    "homepage": "https://www.columbia.edu/",
    "emergency": [
      "https://preparedness.columbia.edu/recent-news"
    ]
  },
  "cornell": {
    "homepage": "https://www.cornell.edu/",
    "emergency": [
      "https://cuinfo.cornell.edu/alerts/"
    ],
    "status": "https://itservicealerts.hosting.cornell.edu/allalerts"
  },
  "dartmouth": {
    "homepage": "https://home.dartmouth.edu/",
    "emergency": [
      "https://www.dartmouth.edu/security/"
    ],
    "status": "https://status.dartmouth.edu/history"
  },
  "harvard": {
    "homepage": "https://www.harvard.edu/",
    "emergency": [
      "https://www.harvard.edu/emergency/"
    ],
    "status": "https://status.huit.harvard.edu/"
  },
  "princeton": {
    "homepage": "https://www.princeton.edu/",
    "emergency": [
      "https://emergency.princeton.edu/"
    ],
    "status": "https://princeton.service-now.com/service?id=outages"
  },
  "penn": {
    "homepage": "https://www.upenn.edu/",
    "emergency": [
      "https://www.publicsafety.upenn.edu/upa/"
    ],
    "status": "https://status.isc.upenn.edu/"
  },
  "yale": {
    "homepage": "https://www.yale.edu/",
    "emergency": [
      "https://emergency.yale.edu/"
    ],
    "status": "https://yale.service-now.com/it?id=it_system_status"
  },
  "duke": {
    "homepage": "https://www.duke.edu/",
    "emergency": [
      "https://emergency.duke.edu"
    ],
    "status": "https://status.oit.duke.edu/"
  },
  "mit": {
    "homepage": "https://www.mit.edu/",
    "emergency": [
      "https://emergency.mit.net/"
    ],
    "status": "https://atlas-status.mit.edu/history"
  },
  "stanford": {
    "homepage": "https://www.stanford.edu/",
    "emergency": [
      "https://emergency.stanford.edu/"
    ]
  },
  "uchicago": {
    "homepage": "https://www.uchicago.edu/",
    "emergency": [
      "https://safety-security.uchicago.edu/about/emergency-management"
    ],
    "status": "https://it-status.uchicago.edu/"
  }
};
 
