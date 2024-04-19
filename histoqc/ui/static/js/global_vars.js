/**********************************************
 ****** RUN-TIME VARIABLES [DO NOT EDIT] ******
 ****** initialized before document ready *****
 **********************************************/

/******************** DATASET *****************/
var ORIGINAL_DATASET = [],
	ORIGINAL_CASE_LIST = [],
	ORIGINAL_TSV_LINES;	// used for exporting the tsv.

var FILE_HEADER = "";

/****************** IMAGE VIEW ****************/
var IMAGE_EXTENSIONS = [];
var CURRENT_IMAGE_TYPE = 0,
	CURRENT_COMPARE_TYPE = -1;

/****************** SLICK GRID ****************/
var DATA_VIEW;

/****************** COHORT FINDER ****************/
var COHORT_FINDER_RESULTS;

/****************** PARCOORDS ****************/
var PARCOORDS;
var BRUSHED_IDS;

var SCATTER_PLOT = {};


// Each element key should be the id of the popover element, and the value should be another object with the keys 'title' and 'content'
var POPOVERS = {
};

var ABORT_CONTROLLER = new AbortController();

function abortFetch() {
	ABORT_CONTROLLER.abort()
	ABORT_CONTROLLER = new AbortController();
	console.log("Fetch aborted")
}

var USE_SMALL = true;
const SMALL_HEIGHT = 100;