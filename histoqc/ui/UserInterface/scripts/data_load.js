function load_raw_data () {

	var $this = $(this);
	var cur_file = null;

	// escape the case when the user cancel the file selection pop-up
	if ($this.val() == "") {
		return;
	} else {
		cur_file = $this.get(0).files[0];
	}

	// hide the "Upload Dataset" button
	$("#upload-button").css("display", "none");

	// read dataset from the file ----------------------------------------------
	console.log("[LOG] Read in file: " + cur_file.name.split(".")[0]);

	var fileReader = new FileReader();
	fileReader.readAsText(cur_file);
	fileReader.onload = function () {

		console.log("[LOG] App initializing...");
		var file_text = fileReader.result;
		load_result(cur_file.name, file_text);
	}
}

function load_result(file_name, file_text) {
	// parse the file into header and dataset ------------------------------
	// parse necessary information from the header 
	var absdirRe = /#outdir:?\s*([^\n]*)\n/;
	var abs_outdir = absdirRe.exec(file_text)[1];
	var reldirRe = /([^\\\/]*)$/;
	var rel_outdir = reldirRe.exec(abs_outdir)[1];
	DATA_PATH = DATA_PATH + "/";
	// the header will be needed when saving result using the table view
	FILE_HEADER = file_text.split(/#dataset:\s?/)[0] + "#dataset: ";

	// load dataset as list
	dataset_text = file_text.split(/#dataset:\s?/)[1];
	ORIGINAL_DATASET = d3.tsv.parse(dataset_text, function (d) {
		if (d.hasOwnProperty("")) delete d[""];
		for (var key in d) {
			if ($.isNumeric(d[key])) {
				d[key] = +d[key];
			}
		}
		// add placeholder for cohortfinder results
		if (!d.hasOwnProperty("embed_x")) d["embed_x"] = null;
		if (!d.hasOwnProperty("embed_y")) d["embed_y"] = null;
		// non-negative integers in cohortfinder results
		if (!d.hasOwnProperty("groupid")) d["groupid"] = -1;
		// 0 or 1 in cohortfinder results
		if (!d.hasOwnProperty("testind")) d["testind"] = 2;
		if (!d.hasOwnProperty("sitecol")) d["sitecol"] = "None";
		if (!d.hasOwnProperty("labelcol")) d["labelcol"] = "None";
		return d;
	});

	// show the current loaded dataset name
	$("#dataset-tag")
		.css("display", "inline")
		.text("Current dataset: " + file_name + " | Size: " + 
			ORIGINAL_DATASET.length + " slides");

	if (ORIGINAL_DATASET.length >= 500) {
		CALC_UMAP = false;
	} else {
		CALC_UMAP = true;
	}

	// update all necessary global variables -------------------------------
	// build case list
	ORIGINAL_CASE_LIST = ORIGINAL_DATASET.map(function (d) {
		return d["filename"];
	});
	// build the lookup table (filename -> dom_id)
	for (var i = 0; i < ORIGINAL_DATASET.length; i ++) {
		var cur_file_name = ORIGINAL_DATASET[i]["filename"];
		ORIGINAL_CASE_DICT[cur_file_name] = {
			"dom_id": cur_file_name.replace(/\W/g, "-")
		};
	}
	// build feature list
	ORIGINAL_FEATURE_LIST = Object.keys(ORIGINAL_DATASET[0]);
	// update current selection
	PARA_COOR_SELECTED = ORIGINAL_CASE_LIST;
	CURRENT_PARALLEL_ATTRIBUTES = ORIGINAL_FEATURE_LIST.filter(function(d) {
		// in DEFAULT_PARAC_ATTRIBUTES and is numeric
		if (typeof(ORIGINAL_DATASET[0][d]) == "number" && 
			DEFAULT_PARAC_ATTRIBUTES.indexOf(d) != -1) {
			return true;
		}
		return false;
	});

	// initiate the UI -----------------------------------------------------
	CURRENT_MULTI_SELECTED = ORIGINAL_DATASET;
	CURRENT_CASE_LIST = ORIGINAL_CASE_LIST;
	init_views();
}

function sort_data (keyword, desc=false) {
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
	ORIGINAL_CASE_LIST = ORIGINAL_DATASET.map(function (d) {
		return d["filename"];
	});
	CURRENT_MULTI_SELECTED.sort(compare);
	CURRENT_CASE_LIST = CURRENT_MULTI_SELECTED.map(function (d) {
		return d["filename"];
	});
}


function load_cohort_finder () {

	var $this = $(this);
	var cur_file = null;

	// escape the case when the user cancel the file selection pop-up
	if ($this.val() == "") {
		return;
	} else {
		cur_file = $this.get(0).files[0];
	}

	// read dataset from the file ----------------------------------------------
	var file_reader = new FileReader();
	file_reader.readAsText(cur_file);
	file_reader.onload = function () {

		var file_text = file_reader.result;

		// parse the file into header and dataset ------------------------------
		// parse necessary information from the header 
		var site_col_re = /#sitecol:?\s*([^\n]*)\n/;
		var site_col = site_col_re.exec(file_text)[1];
		var label_col_re = /#labelcol:?\s*([^\n]*)\n/;
		var label_col = label_col_re.exec(file_text)[1];
		var color_list_re = /#colorlist:?\s*([^\n]*)\n/;
		COLOR_PLATE = color_list_re.exec(file_text)[1].split(",");

		// load dataset as list
		dataset_text = file_text.split(/#dataset:\s?/)[1];
		var cf_dataset = d3.tsv.parse(dataset_text, function (d) {
			var subset = {
				"filename": d["filename"],
				"embed_x": +d["embed_x"],
				"embed_y": +d["embed_y"],
				"groupid": +d["groupid"],
				"testind": +d["testind"]
			};

			if (site_col.trim().toLowerCase() === "none") {
				subset["sitecol"] = "None";
			} else {
				subset["sitecol"] = d[site_col.trim()];
			}

			if (label_col.trim().toLowerCase() === "none") {
				subset["labelcol"] = "None";
			} else {
				subset["labelcol"] = d[label_col.trim()];
			}

			return subset;
		});

		// update all necessary global variables -------------------------------
		for (var i = 0; i < cf_dataset.length; i++) {
			var cohort = cf_dataset[i];
			ORIGINAL_CASE_DICT[cohort["filename"]]["cohort"] = cohort;
		}

		for (var i = 0; i < ORIGINAL_DATASET.length; i ++) {
			var cur_fname = ORIGINAL_DATASET[i]["filename"];
			var cohort = ORIGINAL_CASE_DICT[cur_fname]["cohort"];
			ORIGINAL_DATASET[i]["embed_x"] = cohort["embed_x"];
			ORIGINAL_DATASET[i]["embed_y"] = cohort["embed_y"];
			ORIGINAL_DATASET[i]["groupid"] = cohort["groupid"];
			ORIGINAL_DATASET[i]["testind"] = cohort["testind"];
			ORIGINAL_DATASET[i]["sitecol"] = cohort["sitecol"];
			ORIGINAL_DATASET[i]["labelcol"] = cohort["labelcol"];
		}

		for (var i = 0; i < CURRENT_MULTI_SELECTED.length; i ++) {
			var cur_fname = CURRENT_MULTI_SELECTED[i]["filename"];
			var cohort = ORIGINAL_CASE_DICT[cur_fname]["cohort"];
			CURRENT_MULTI_SELECTED[i]["embed_x"] = cohort["embed_x"];
			CURRENT_MULTI_SELECTED[i]["embed_y"] = cohort["embed_y"];
			CURRENT_MULTI_SELECTED[i]["groupid"] = cohort["groupid"];
			CURRENT_MULTI_SELECTED[i]["testind"] = cohort["testind"];
			CURRENT_MULTI_SELECTED[i]["sitecol"] = cohort["sitecol"];
			CURRENT_MULTI_SELECTED[i]["labelcol"] = cohort["labelcol"];
		}

		COHORT_LOADED = true;
		
		// update the UI -------------------------------------------------------
		update_chart_view("all", CURRENT_MULTI_SELECTED);
		update_multi_selected_table_view();

		// disable all dropdowns for scatter plot (the x and y is now given)
		d3.select("#drplt-control-group")
			.selectAll("button").classed("disabled", true);
	}
}
