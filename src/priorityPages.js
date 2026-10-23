// Pinned pages. A pinned page is always checked, and it replaces what the app would otherwise
// find on its own for that school and category.
//
// Categories: provost, statements, communications, community, it
// Each value can be one address or a list of addresses on that school's official domain.
//
// STATUS OF THESE ADDRESSES
//  - Confirmed: Brown provost.
//  - Everything else is a best guess at each school's usual address and has NOT been checked.
//    Open each one in a browser once. If it is wrong, replace it. If it loads but is the wrong
//    page, replace it too, because the app cannot tell the difference.
//  - Statements and Community pages are left blank on purpose. Their addresses vary a lot from
//    school to school and I would be guessing. Add them as you find them.
//  - If a school has no page for a category, set it to null (for example: community: null) and the
//    app will stop listing it as not found.
 
export const PINNED = {
  brown: {
    provost: "https://provost.brown.edu/",
    it: "https://it.brown.edu/",
  },
  columbia: {
    provost: "https://provost.columbia.edu/",
    communications: "https://news.columbia.edu/",
    it: "https://it.columbia.edu/",
  },
  cornell: {
    it: "https://it.cornell.edu/",
  },
  dartmouth: {
    provost: "https://provost.dartmouth.edu/",
    statements: "https://president.dartmouth.edu/",
  },
  harvard: {
    provost: "https://provost.harvard.edu/",
  },
  mit: {
    provost: "https://provost.mit.edu/",
    it: "https://ist.mit.edu/",
  },
  penn: {
    it: "https://isc.upenn.edu/",
  },
  princeton: {
    provost: "https://provost.princeton.edu/",
    communications: "https://www.princeton.edu/news",
    it: "https://oit.princeton.edu/",
  },
  stanford: {
    provost: "https://provost.stanford.edu/",
    it: "https://uit.stanford.edu/",
  },
  uchicago: {
    it: "https://it.uchicago.edu/",
  },
  yale: {
    provost: "https://provost.yale.edu/",
    it: "https://its.yale.edu/",
  },
};
 
