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

var DEFAULT_TABLE_COLUMNS = [
	"filename",
	"height",
	"width"
];

var CURRENT_ATTRIBUTE = "percent_dark_tissue";

var DATA_TABLE_CONFIG = {
	paging: true,
	// pageLength: 2,
	scrollY: "135px",
	scrollX: true,
	scroller: true,
	scrollCollapse: true,
	colReorder: true,
	select: true,
	dom: '<"table-content col-10"t><"table-control col-2"B>', //Blfrip
	keys: true,
	// columnDefs: [
	// 	{
	// 		targets: DEFAULT_TABLE_COLUMNS,
	// 		visible: true
	// 	}, 
	// 	{
	// 		targets: "_all",
	// 		visible: false
	// 	}
	// ],
	// fixedColumns: {
	// 	leftColumns: 1
	// },
	buttons: [
		{
			extend: 'copy',
			text: 'Copy to Clipboard',
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
			text: 'Delete Rows',
			action: function(e, dt, node, config) {
				var indices = $('#result-table').DataTable().rows('.selected').indexes();
				$('#result-table').DataTable().rows('.selected').remove().draw(false);

				for (var i = 0; i < indices.length; i ++) {
					CURRENT_DATASET.splice(indices[i], 1);
				}
				CURRENT_CASE_LIST = CURRENT_DATASET.map(function(d){return d["filename"];});
				exit_detail_mode();

				update_chart_view(CURRENT_DATASET, "bar_chart", [CURRENT_ATTRIBUTE]);
				update_image_view(CURRENT_CASE_LIST);
			}
		},
		{
			text: 'Deselect All',
			action: function(e, dt, node, config) {
				$('#result-table').DataTable().rows('.selected').deselect();
				exit_detail_mode();
			}
		},
		'colvis'
	]
};
