/* Initiation model.
 * read in dataset, initialize data dict, initialize selectors, initialize each views.
 * last modified: 03/11/2018 23:22:00
 * update log: init header and comments.
 */ 


function data_loading () {

	var $this = $(this);
	var cur_file = null;

	// escape the cancelation case
	if ($this.val() == "") {
		return;
	} else {
		cur_file = $this.get(0).files[0];
	}

	// hide the "Upload Dataset" button
	$("#upload-button").css("display", "none");

	// read dataset from the file
	FILE_NAME = cur_file.name.split(".")[0];
	console.log("[LOG] Read in file: " + FILE_NAME);
	var fileReader = new FileReader();
	fileReader.readAsText(cur_file);
	fileReader.onload = function () {

		console.log("[LOG] App initializing...");
		var file_text = fileReader.result;

		var absdirRe = /#outdir:?\s*([^\n]*)\n/;
		var abs_outdir = absdirRe.exec(file_text)[1];
		var reldirRe = /([^\\\/]*)$/;
		var rel_outdir = reldirRe.exec(abs_outdir)[1];
		DATA_PATH = DATA_PATH + rel_outdir + "/";
		FILE_HEADER = file_text.split(/#dataset:\s?/)[0] + "#dataset: ";
		dataset_text = file_text.split(/#dataset:\s?/)[1];

		// load dataset as list.
		ORIGINAL_DATASET = d3.tsv.parse(dataset_text, function (d) {
			if (d.hasOwnProperty("")) delete d[""];
			for (var key in d) {
				if ($.isNumeric(d[key])) {
					d[key] = +d[key];
				}
			}
			return d;
		});

		// show the current loaded dataset name
		$("#dataset-tag").css("display", "inline")
						 .text("Current dataset: " + cur_file.name + " | Size: " + ORIGINAL_DATASET.length + " slides");

		// build case list.		
		ORIGINAL_CASE_LIST = ORIGINAL_DATASET.map(function(d){return d["filename"];});

		// build case dict with casename as key. 
		for (var i = 0; i < ORIGINAL_DATASET.length; i ++) {
			var cur_file_name = ORIGINAL_DATASET[i]["filename"];
			ORIGINAL_CASE_DICT[cur_file_name] = {};
			for (var index in FEATURES_TO_MAP) {
				ORIGINAL_CASE_DICT[cur_file_name][FEATURES_TO_MAP[index]] = ORIGINAL_DATASET[i][FEATURES_TO_MAP[index]];
			}
			ORIGINAL_CASE_DICT[cur_file_name]["dom_id"] = cur_file_name.replace(/\W/g, "-");
		}

		// build feature list
		ORIGINAL_FEATURE_LIST = Object.keys(ORIGINAL_DATASET[0]);

		CURRENT_MULTI_SELECTED = ORIGINAL_DATASET;
		PARA_COOR_SELECTED = ORIGINAL_CASE_LIST;
		// UMAP_PROJ_SELECTED = ORIGINAL_CASE_LIST;

		CURRENT_PARALLEL_ATTRIBUTES = ORIGINAL_FEATURE_LIST.filter(function (d) {
			if (typeof(ORIGINAL_DATASET[0][d]) == "number" && DEFAULT_PARAC_ATTRIBUTES.indexOf(d) != -1) {
				return true;
			}
			return false;
		});

		init_image_format_list();

		var image_check_interval = setInterval (function () {
			var check_sum = 0;
			for (var ck_index = 0; ck_index < CHECK_IMAGE_EXTENSIONS.length; ck_index ++) {
				check_sum += CHECK_IMAGE_EXTENSIONS[ck_index];
			}
			if (check_sum == CHECK_IMAGE_EXTENSIONS.length) {
				clearInterval (image_check_interval);

				// initialize table view
				initialize_data_table(ORIGINAL_DATASET);
				if (!OPEN_WITH_TABLE) {
					hide_view("table");
				}
				d3.select("#table-btn")
					.classed("view-mngmt-btn-hidden", false)
					.classed("view-enabled", OPEN_WITH_TABLE)
					.classed("view-disabled", !OPEN_WITH_TABLE);

				// initialize chart view
				initialize_chart_view(ORIGINAL_DATASET, CURRENT_VIS_TYPE);
				if (!OPEN_WITH_CHART) {
					hide_view("chart");
				}
				d3.select("#chart-btn")
					.classed("view-mngmt-btn-hidden", false)
					.classed("view-enabled", OPEN_WITH_CHART)
					.classed("view-disabled", !OPEN_WITH_CHART);

				// initialize image view
				initialize_image_view(ORIGINAL_CASE_LIST);
				if (!OPEN_WITH_IMAGE) {
					hide_view("image");
				}
				d3.select("#image-btn")
					.classed("view-mngmt-btn-hidden", false)
					.classed("view-enabled", OPEN_WITH_IMAGE)
					.classed("view-disabled", !OPEN_WITH_IMAGE);

				$("#view-mngmt-btn-group").css("display", "block");
				d3.select("#page-title")
					.classed("mr-md-auto", false)
					.classed("mr-md-3", true);

				console.log("[LOG] App initialized.");
				APP_INITIALIZED = true;
			} else {
				console.log("waiting for image type checking ...");
			}
		}, 500);
	}
}

function data_sorting (keyword, desc=false) {
	var compare = function (a, b) {
		if (a[keyword] < b[keyword]) {
			if (desc) {
				return 1;
			} else {
				return -1;
			}
		} else if (a[keyword] > b[keyword]) {
			if (desc) {
				return -1;
			} else {
				return 1;
			}
		} else {
			return 0;
		}
	}

	CURRENT_SORT_ATTRIBUTE = keyword;
	ORIGINAL_DATASET.sort(compare);
	ORIGINAL_CASE_LIST = ORIGINAL_DATASET.map(function (d) {return d["filename"];});
	CURRENT_MULTI_SELECTED.sort(compare);
	CURRENT_CASE_LIST = CURRENT_MULTI_SELECTED.map(function (d) {return d["filename"];});
}


function init_image_format_list () {

	var test_file = ORIGINAL_DATASET[0]["filename"];
	var test_out_dir = ORIGINAL_DATASET[0]["outdir"];

	for (var img_type_index = 0; img_type_index < DEFAULT_IMAGE_EXTENSIONS.length; img_type_index ++) {
		var src = DATA_PATH + test_file + "/" + test_file + DEFAULT_IMAGE_EXTENSIONS[img_type_index];
		var img = new Image();
		img.typeidx = img_type_index;
		img.onload = (function () {
			CHECK_IMAGE_EXTENSIONS[this.typeidx] = true;
		});
		img.onerror = (function () {
			SKIP_IMAGE_EXTENSIONS.push(this.typeidx);
			CHECK_IMAGE_EXTENSIONS[this.typeidx] = true;
		});
		img.src = src;
	}
}
