var DATA_PATH = "./Data/";

var CURRENT_SELECTED = "";
var CURRENT_IMAGE_TYPE = 0;
var CURRENT_COMPARE_TYPE = -1;

var CURRENT_DATASET = [],
	CURRENT_CASE_LIST = [],
	CASE_DICT = {},
	FEATURES_TO_MAP = ["outdir"];

var TABLE;

var DETAIL_MODE_FLAG = false;

var DEFAULT_IMAGE_EXTENSIONS = [
	"_thumb.png",
	"_mask_use.png",
	"_nonwhite.png",
	"_small_fill.png",
	"_small_remove.png",
	"_blurry.png",
	"_dark.png",
	"_hist.png",
	"_pen_markings.png"
];

var DEFAULT_HIDDEN_COLUMNS = [
	"outdir",
	"comment"
];

var CURRENT_ATTRIBUTE = "percent_dark_tissue";

var DATA_TABLE_CONFIG = {
	paging: true,
	// pageLength: 2,
	scrollY: "200px",
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
	// fixedColumns: {
	// 	leftColumns: 1
	// },
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
