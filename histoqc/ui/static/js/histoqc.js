$(document).ready(function () {
	console.log("[LOG] Document ready.")
    $.ajax({
		url: "/hqc_results",
		type: "GET",
		async: true,
		success: loadResultsTsv
	});

});

function loadResultsTsv(data) {
	console.log("loaded data")

	FILE_HEADER = data.split(/#dataset:\s?/)[0] + "#dataset: ";
	const fileContents = data.split(/#dataset:\s?/)[1];
	ORIGINAL_TSV_LINES = d3.tsvParse(fileContents, function (d) {  // taken from original HistoQC ui code
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

	original_features = Object.keys(ORIGINAL_TSV_LINES[0])

	current_parallel_attributes = original_features.filter(function (d) {
		// in DEFAULT_PARAC_ATTRIBUTES and is numeric
		if (typeof (ORIGINAL_TSV_LINES[0][d]) == "number" && DEFAULT_PARAC_ATTRIBUTES.indexOf(d) != -1) {
			return true;
		}
		return false;
	});

	console.log(current_parallel_attributes)

	// Format data entries into a list of dictionaries.
	ORIGINAL_DATASET = ORIGINAL_TSV_LINES.map(function (d) {
		attr_value_dict = {
			case_name: d["filename"],
			gid: d["groupid"],
			comments: d["comments"]
		};
		for (var i = 0; i < current_parallel_attributes.length; i++) {
			attr_value_dict[current_parallel_attributes[i]] =
				d[current_parallel_attributes[i]];
		}
		return attr_value_dict;
	});
	
	ORIGINAL_CASE_LIST = ORIGINAL_TSV_LINES.map(function (d) {
		return d["filename"];
	});

	renderComponents();
}

function exportResultsTsv() {
	const lines_with_comments = ORIGINAL_TSV_LINES.map(function (d, i) {
		d["comments"] = DATA_VIEW.items[i]["comments"];
		return d;
	});

	const fileContent = FILE_HEADER + d3.tsvFormat(lines_with_comments)

	// Create a blob object representing the data as a file
	var blob = new Blob([fileContent], { type: 'text/plain' });

	// Create a temporary anchor element
	var a = document.createElement('a');
	a.href = window.URL.createObjectURL(blob);

	// Set the file name
	a.download = 'results_modified.tsv';

	// Trigger the download
	document.body.appendChild(a);
	a.click();

	document.body.removeChild(a);
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
			updateImageView(dataView);
			initScatterPlotMessage('<h4>Click "CohortFinder" to compute and render the 2D embedding.<h4>');
			initializeCF();
			initPopovers();
		}
	});
	
}
