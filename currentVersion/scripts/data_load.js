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

	// show the current loaded dataset name
	$("#dataset-tag").css("display", "inline")
					 .text("Current dataset: " + cur_file.name);
	// hide the "Upload Dataset" button
	$("#upload-button").css("display", "none");

	// read dataset from the file
	console.log("Read in file: " + cur_file.name);
	var fileReader = new FileReader();
	fileReader.readAsText(cur_file);
	fileReader.onload = function () {

		console.log("App initializing...");

		// load dataset as list.
		CURRENT_DATASET = d3.tsv.parse(fileReader.result, function (d) {
			if (d.hasOwnProperty("")) delete d[""];
			for (var key in d) {
				if ($.isNumeric(d[key])) {
					d[key] = +d[key];
				}
			}
			return d;
		});

		// build case list.		
		CURRENT_CASE_LIST = CURRENT_DATASET.map(function(d){return d["filename"];});

		// build case dict with casename as key. 
		for (var i = 0; i < CURRENT_DATASET.length; i ++) {
			CURRENT_CASE_DICT[CURRENT_DATASET[i]["filename"]] = {};
			for (var index in FEATURES_TO_MAP) {
				CURRENT_CASE_DICT[CURRENT_DATASET[i]["filename"]][FEATURES_TO_MAP[index]] = CURRENT_DATASET[i][FEATURES_TO_MAP[index]];
			}
		}

		init_image_format_list();

		var image_check_interval = setInterval (function () {
			var check_sum = 0;
			for (var ck_index = 0; ck_index < CHECK_IMAGE_EXTENSIONS.length; ck_index ++) {
				check_sum += CHECK_IMAGE_EXTENSIONS[ck_index];
			}
			if (check_sum == CHECK_IMAGE_EXTENSIONS.length) {
				clearInterval (image_check_interval);

				// initialize data table
				$("#table-view").css("display", "block");
				initialize_data_table(CURRENT_DATASET, DATA_TABLE_CONFIG);

				// initialize chart view
				$("#chart-view").css("display", "block");
				initialize_chart_view(CURRENT_DATASET, "bar_chart", [DEFAULT_CHART_ATTRIBUTE]);

				// initialize image view
				initialize_image_view(CURRENT_CASE_LIST);

				console.log("App initialized.");
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

	CURRENT_DATASET.sort(compare);
}


function init_image_format_list () {

	var test_file = CURRENT_DATASET[0]["filename"];
	var test_out_dir = CURRENT_DATASET[0]["outdir"];

	for (var img_type_index = 0; img_type_index < DEFAULT_IMAGE_EXTENSIONS.length; img_type_index ++) {
		var src = DATA_PATH + test_out_dir + "/" + test_file + DEFAULT_IMAGE_EXTENSIONS[img_type_index];
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


