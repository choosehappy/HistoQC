/**********************************************
 ********* PRE-DEFINED CONFIGURATIONS *********
 **********************************************/

/***************** SYSTEM CONFIG **************/
var DATA_PATH = "./Data/";

/****************** TABLE VIEW ****************/
var DEFAULT_HIDDEN_COLUMNS = [
	"outdir",
	"comment"
];

/****************** CHART VIEW ****************/
// Initialize the bar chart on this attribute.
var DEFAULT_CHART_ATTRIBUTE = "height"; 

/****************** IMAGE VIEW ****************/
// full set of image format identifiers. 
var DEFAULT_IMAGE_EXTENSIONS = [
	"_thumb.png",
	"_bubble.png",
	"_areathresh.png",
	"_blurry.png",
	"_edge.png",
	"_nonwhite.png",
	"_pen_markings.png",
	"_small_fill.png",
	"_small_remove.png",
	"_spur.png",
	"_dark.png",
	"_hist.png",
	"_fuse.png",
	"_mask_use.png",
	"_deconv_c2.png",
	"_deconv_c1.png",
	"_deconv_c0.png"
];
var DEFAULT_IMAGE_EXTENSION = "_thumb.png";


/**********************************************
 ****** RUN-TIME VARIABLES [DO NOT EDIT] ******
 ****** initialized before document ready *****
 **********************************************/

/******************** DATASET *****************/
var CURRENT_DATASET = [],
	CURRENT_CASE_LIST = [],
	CURRENT_CASE_DICT = {};
var CURRENT_SELECTED = "";
// decide which attributes to keep in CURRENT_CASE_DICT
var FEATURES_TO_MAP = ["outdir"]; 

/****************** TABLE VIEW ****************/
var TABLE;
var DATA_TABLE_CONFIG = {
	paging: true,
	// pageLength: 2,
	scrollY: "191px",
	scrollX: true,
	scroller: true,
	scrollCollapse: true,
	colReorder: true,
	select: true,
	dom: '<"table-content col-11"t><"table-control col-1"B>', //Blfrip
	keys: true,
	columnDefs: [
		{
			targets: "init_hidden",
			visible: false
		}
	],
	buttons: [
		{
			extend: 'copy',
			text: 'Copy',
			exportOptions: {
				columns: ':visible'
			}
		},
		{
			extend: 'csv',
			text: 'Save',
			fieldSeparator: "\t",
			fieldBoundary: "",
			filename: "results_revised",
			extension: ".tsv"
		},
		{
			text: 'Delete',
			action: function(e, dt, node, config) {
				var indices = TABLE.rows('.selected').indexes();
				TABLE.rows('.selected').remove().draw(false);

				for (var i = 0; i < indices.length; i ++) {
					CURRENT_DATASET.splice(indices[i], 1);
				}
				exit_select_mode();
				update_views();
			}
		},
		{
			text: 'Deselect',
			action: function(e, dt, node, config) {
				exit_select_mode();
			}
		},
		'colvis'
	]
};

/****************** CHART VIEW ****************/
var CURRENT_CHART_ATTRIBUTE = DEFAULT_CHART_ATTRIBUTE;

/****************** IMAGE VIEW ****************/
var SKIP_IMAGE_EXTENSIONS = [];
var CHECK_IMAGE_EXTENSIONS = DEFAULT_IMAGE_EXTENSIONS.map(function () {return false;});
var CURRENT_IMAGE_TYPE = 0,
	CURRENT_COMPARE_TYPE = -1;
var DETAIL_MODE_FLAG = false;
