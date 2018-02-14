var data_loading = function () {

	var $this = $(this);

	// escape the cancelation case
	if ($this.val() == "") {
		return;
	}

	console.log("File loaded.");
 	// show the current loaded dataset name
 	$("#dataset-tag").css("display", "inline")
					 .text("Current dataset: " + $this.get(0).files[0].name);
	// hide the "Upload Dataset" button
	$("#upload-button").css("display", "none");

	// read dataset from the file
	var fileReader = new FileReader();
	fileReader.readAsText($this.get(0).files[0]);
	fileReader.onload = function () {

		// load dataset
		CURRENT_DATASET = d3.tsv.parse(fileReader.result, function (d) {
			if (d.hasOwnProperty("")) delete d[""];
			for (var key in d) {
				if ($.isNumeric(d[key])) {
					d[key] = +d[key];
				}
			}
			return d;
		});
		CURRENT_CASE_LIST = CURRENT_DATASET.map(function(d){return d["filename"];});

		console.log("Data loaded.");

		// initialize data table
		$("#table-view").css("display", "block");
		initialize_data_table(CURRENT_DATASET, DATA_TABLE_CONFIG);

		// initialize chart view
		$("#chart-view").css("display", "block");
		initialize_chart_view(CURRENT_DATASET, "bar_chart", [CURRENT_ATTRIBUTE]);

		// initialize image view
	    $("#image-view").css("display", "block")
	    	.outerHeight($(window).height() - $("header").outerHeight(includeMargin=true) - $("#table-view").outerHeight(includeMargin=true) - $("#chart-view").outerHeight(includeMargin=true));
		initialize_image_view(CURRENT_CASE_LIST);

		// initialize selectors
		initialize_selector(CURRENT_DATASET);
	}
}