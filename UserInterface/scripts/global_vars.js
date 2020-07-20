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
var CURRENT_SORT_ATTRIBUTE;
// all possible views
var ORIGINAL_VIEWS = ["table", "chart", "image"];
// current showing views
var CURRENT_DISPLAY_VIEWS = [];
var APP_INITIALIZED = false;
var FILE_NAME = "";
var FILE_HEADER = "";


/****************** TABLE VIEW ****************/
var TABLE;
var DATA_TABLE_CONFIG = {
	paging: true,
	scrollY: "168px",
	scrollX: true,
	scroller: true,
	scrollCollapse: true,
	colReorder: true,
	select: true,
	dom: '<"table-content col-11"t><"table-control col-1"B>', //Blfrip
	keys: true,
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
			filename: "result_revised",
			extension: ".tsv",
			customize: function (csv) {
				console.log(csv);
				return FILE_HEADER + csv;
			}
		},
		{
			text: 'Delete',
			action: function(e, dt, node, config) {
				var indices = TABLE.rows('.selected').indexes();
				TABLE.rows('.selected').remove().draw(false);

				for (var i = 0; i < indices.length; i ++) {
					ORIGINAL_DATASET.splice(indices[i], 1);
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
		}
	]
};
var CURRENT_HIDDEN_COLUMNS = DEFAULT_HIDDEN_COLUMNS;;

/****************** CHART VIEW ****************/
var CURRENT_CHART_ATTRIBUTE = DEFAULT_CHART_ATTRIBUTE;
var $CHART = $("#chart-svg-container"); // bar chart for single attribute
var $PARAC = $("#parac-svg-container"); // parallel coordinate chart
var CURRENT_VIS_TYPE = DEFAULT_VIS_TYPE;
var CHART_SVG, PARAC_SVG, 
	CHART_MARGIN, PARAC_MARGIN, 
	TIP;
var PARA_COOR_SELECTED;
var CURRENT_PARALLEL_ATTRIBUTES;

/****************** IMAGE VIEW ****************/
var SKIP_IMAGE_EXTENSIONS = [];
var CHECK_IMAGE_EXTENSIONS = DEFAULT_IMAGE_EXTENSIONS.map(function () {return false;});
var CURRENT_IMAGE_TYPE = 0,
	CURRENT_COMPARE_TYPE = -1;
var DETAIL_MODE_FLAG = false;
