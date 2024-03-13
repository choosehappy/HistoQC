/**********************************************
 ****** RUN-TIME VARIABLES [DO NOT EDIT] ******
 ****** initialized before document ready *****
 **********************************************/

/******************** DATASET *****************/
var ORIGINAL_DATASET = [],
	CURRENT_MULTI_SELECTED = [],
	ORIGINAL_CASE_LIST = [],
	CURRENT_CASE_LIST = [],
	ORIGINAL_CASE_DICT = {},
	ORIGINAL_FEATURE_LIST = [];
var CURRENT_SELECTED = "";
// decide which attributes to keep in ORIGINAL_CASE_DICT
var FEATURES_TO_MAP = ["outdir"];
// current sorting attribute
// var CURRENT_SORT_ATTRIBUTE;
// // current showing views
// var CURRENT_DISPLAY_VIEWS = [];
// if (OPEN_WITH_TABLE) {CURRENT_DISPLAY_VIEWS.push("table");};
// if (OPEN_WITH_CHART) {CURRENT_DISPLAY_VIEWS.push("chart");};
// if (OPEN_WITH_IMAGE) {CURRENT_DISPLAY_VIEWS.push("image");};
// var INITIALIZED_VIEWS = [];

var FILE_NAME = "";
var FILE_HEADER = "";

var COHORT_LOADED = false;

/****************** IMAGE VIEW ****************/
var IMAGE_EXTENSIONS = [];
var CURRENT_IMAGE_TYPE = 0,
	CURRENT_COMPARE_TYPE = -1;
var DETAIL_MODE_FLAG = false;

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