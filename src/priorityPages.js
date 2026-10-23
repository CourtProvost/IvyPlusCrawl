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
	communications: "https://provost.brown.edu/communications",						
	community: null,						
	it: "https://it.brown.edu/",						
	provost: "https://provost.brown.edu/",						
	releases: null,						
	statements: "https://www.brown.edu/news",						
},							
columbia: {							
	communications: "https://news.columbia.edu/",						
	community: null,						
	it: "https://www.cuit.columbia.edu/",						
	provost: "https://provost.columbia.edu/",						
	releases: null,						
	statements: "https://provost.columbia.edu/content/news-and-announcements#!#views-display-10040",						
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
harvard: {							
	communications: "https://news.harvard.edu/gazette/", 						
	community: null,						
	it: "https://www.huit.harvard.edu/",						
	provost: "https://provost.harvard.edu/",						
	releases: "https://www.harvard.edu/media-relations/category/press-releases/",						
	statements: "https://provost.harvard.edu/pages/reports",						
},							
mit: {							
	communications: "https://news.mit.edu/",						
	community: null,						
	it: "https://ist.mit.edu/",						
	provost: "https://provost.mit.edu/",						
	releases: null,						
	statements: "https://news.mit.edu/press",						
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
	community: null,						
	it: "https://uit.stanford.edu/",						
	provost: "https://provost.stanford.edu/",						
	releases: "https://news.stanford.edu/university-news/topic/university-statement",						
	statements: "https://news.stanford.edu/university-news/topic/university-statement",						
},							
uchicago: {							
	communications: "https://news.uchicago.edu/lateststories",						
	community: null,						
	it: "https://it.uchicago.edu/",						
	provost: "https://provost.uchicago.edu/",						
	releases: null,						
	statements: "https://news.uchicago.edu/media-resources/press-releases-statements",						
},							
yale: {							
	communications: "https://news.yale.edu/",						
	community: null,						
	it: "https://yale.service-now.com/it?id=it_system_status#main",						
	provost: "https://provost.yale.edu/",						
	releases: null,						
	statements: "https://president.yale.edu/from-president-mcinnis/statements",						
},							
};							
export const FEEDS = {};

