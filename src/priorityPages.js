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
	news: "https://www.brown.edu/news",
	communications: "https://provost.brown.edu/communications",
},
columbia: {
	provost: "https://provost.columbia.edu/",
	news: "https://news.columbia.edu/",
	it: "https://www.cuit.columbia.edu/",
	statements: "https://news.columbia.edu/content/university-news",
},
cornell: {
	it: "https://uit.stanford.edu/news/service-spotlights",
	news: "https://news.cornell.edu/", 
	statements: "https://statements.cornell.edu/",
	provost: "https://provost.cornell.edu/",
},
dartmouth: {
	provost: "https://provost.dartmouth.edu/",
	statements: "https://president.dartmouth.edu/",
	it: "https://itc.dartmouth.edu/",
	news: "https://home.dartmouth.edu/news",
},
harvard: {
	it: "https://status.huit.harvard.edu/",
	news: "https://news.harvard.edu/gazette/", 
	statements: "https://provost.harvard.edu/pages/reports",
	releases: "https://www.harvard.edu/media-relations/category/press-releases/",
},
mit: {
	provost: "https://provost.mit.edu/",
	it: "https://ist.mit.edu/",
	news: "https://news.mit.edu/",
	statements: "https://news.mit.edu/press",
},
penn: {
	it: "https://isc.upenn.edu/",
	provost: "https://provost.upenn.edu/",
	news: "https://penntoday.upenn.edu/", 
	statements: "https://penntoday.upenn.edu/announcements",
},
princeton: {
	provost: "https://provost.princeton.edu/",
	news: "https://www.princeton.edu/news",
	it: "https://oit.princeton.edu/",
	statements: "https://president.princeton.edu/post-category/statements",
},
stanford: {
	provost: "https://provost.stanford.edu/",
	it: "https://uit.stanford.edu/",
	news: "https://news.stanford.edu/",
	releases: "https://news.stanford.edu/university-news/topic/university-statement",
	statements: "https://news.stanford.edu/university-news/topic/university-statement",
},
uchicago: {
	it: "https://it.uchicago.edu/",
	news: "https://news.uchicago.edu/lateststories",
	statements: "https://news.uchicago.edu/media-resources/press-releases-statements",
	provost: "https://provost.uchicago.edu/",
	
},
yale: {
	provost: "https://provost.yale.edu/",
	it: "https://yale.service-now.com/it?id=it_system_status#main",
	news: "https://news.yale.edu/",
	statements: "https://president.yale.edu/from-president-mcinnis/statements",
},
};
export const FEEDS = {};

