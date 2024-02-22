$(document).ready(function () {
	console.log("[LOG] Document ready.")
	// console.log($("#brushing").attr("fn"))
    // Check if the user has specified resultsfilepath
    $.ajax({
		url: "/hqc_results",
		type: "GET",
		async: true,
		success: loadResultsTsv
	});

});

function loadResultsTsv(data) {
	console.log("loaded data")
	console.log(data);

	const fileContents = data.split(/#dataset:\s?/)[1];
	const lines = d3.tsvParse(fileContents, function (d) {  // taken from original HistoQC ui code
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

	original_features = Object.keys(lines[0])

	current_parallel_attributes = original_features.filter(function (d) {
		// in DEFAULT_PARAC_ATTRIBUTES and is numeric
		if (typeof (lines[0][d]) == "number" && DEFAULT_PARAC_ATTRIBUTES.indexOf(d) != -1) {
			return true;
		}
		return false;
	});

	console.log(current_parallel_attributes)

	ORIGINAL_DATASET = lines.map(function (d) {
		attr_value_dict = {
			case_name: d["filename"],
			gid: d["groupid"]
		};
		for (var i = 0; i < current_parallel_attributes.length; i++) {
			attr_value_dict[current_parallel_attributes[i]] =
				d[current_parallel_attributes[i]];
		}
		return attr_value_dict;
	});
	
	ORIGINAL_CASE_LIST = ORIGINAL_DATASET.map(function (d) {
		return d["case_name"];
	});

	renderComponents();
}

function renderComponents() {
	$.ajax({
		url: `/image_extensions/${ORIGINAL_CASE_LIST[0]}`,
		type: "GET",
		async: true,
		success: function (data) {
			DEFAULT_IMAGE_EXTENSIONS = data	// extensions (suffixes) should be set before rendering other components.

			var dataView = renderLines();
			initializeImageView(dataView);
			initScatterPlotMessage('<h4>Click "CohortFinder" to compute and render the 2D embedding.<h4>');
			initializeCF();
		}
	});
	
}