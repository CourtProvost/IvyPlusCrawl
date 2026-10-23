// Optional: pin exact pages for any school. A pinned page is always checked, and it replaces
// what the app would otherwise find on its own for that category.
//
// Categories: provost, statements, communications, community, it
// Each value can be one address or a list of addresses on that school's official domain.
//
// Example (remove the slashes to use):
//   dartmouth: {
//     provost: "https://provost.dartmouth.edu/",
//     it: ["https://services.dartmouth.edu/TDClient/1806/Portal/Home/"],
//   },
//
// School ids: brown, columbia, cornell, dartmouth, harvard, princeton, penn, yale,
//             duke, mit, stanford, uchicago
 
export const PINNED = {
brown: {
	provost: "https://provost.brown.edu/",
	it: "https://it.brown.edu/",
	news: "https://www.brown.edu/news",
	statements: "https://provost.brown.edu/communications",
},
columbia: {
	provost: "https://provost.columbia.edu/",
	news: "https://news.columbia.edu/",
	it: "https://www.cuit.columbia.edu/",
	statements: "https://provost.columbia.edu/content/news-and-announcements#!#views-display-10040",
},
cornell: {
	it: "https://it.cornell.edu/",
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
	provost: "https://provost.harvard.edu/",
	it: "https://www.huit.harvard.edu/",
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
	communications: "https://www.princeton.edu/news",
	it: "https://oit.princeton.edu/",
	statements: "https://president.princeton.edu/post-category/statements",
},
stanford: {
	provost: "https://provost.stanford.edu/",
	it: "https://uit.stanford.edu/",
	news: "https://news.stanford.edu/",
	statements: "https://news.stanford.edu/university-news/topic/university-statement",
	community: "https://news.stanford.edu/university-news/topic/university-statement",
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
 
