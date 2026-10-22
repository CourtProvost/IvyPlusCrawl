// Single source of truth for the schools. The serverless function only ever
// searches the domains listed here, and rejects any result outside them.

export const IVY = [
  { id: "brown", name: "Brown University", domain: "brown.edu", url: "https://www.brown.edu/" },
  { id: "columbia", name: "Columbia University", domain: "columbia.edu", url: "https://www.columbia.edu/" },
  { id: "cornell", name: "Cornell University", domain: "cornell.edu", url: "https://www.cornell.edu/" },
  { id: "dartmouth", name: "Dartmouth College", domain: "dartmouth.edu", url: "https://home.dartmouth.edu/" },
  { id: "harvard", name: "Harvard University", domain: "harvard.edu", url: "https://www.harvard.edu/" },
  { id: "princeton", name: "Princeton University", domain: "princeton.edu", url: "https://www.princeton.edu/" },
  { id: "penn", name: "University of Pennsylvania", domain: "upenn.edu", url: "https://www.upenn.edu/" },
  { id: "yale", name: "Yale University", domain: "yale.edu", url: "https://www.yale.edu/" },
];

export const PLUS = [
  { id: "duke", name: "Duke University", domain: "duke.edu", url: "https://www.duke.edu/" },
  { id: "mit", name: "Massachusetts Institute of Technology", domain: "mit.edu", url: "https://www.mit.edu/" },
  { id: "stanford", name: "Stanford University", domain: "stanford.edu", url: "https://www.stanford.edu/" },
  { id: "uchicago", name: "University of Chicago", domain: "uchicago.edu", url: "https://www.uchicago.edu/" },
];

export const ALL_SCHOOLS = [...IVY, ...PLUS];
export const SCHOOL_BY_ID = Object.fromEntries(ALL_SCHOOLS.map((s) => [s.id, s]));
