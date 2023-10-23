$(document).ready(function () {
	console.log("[LOG] Document ready.")
	// console.log($("#brushing").attr("fn"))


	$("#upload-input").change(readFile);

});

// read the file object, a tsv file, and return the data
function readFile() {
	const fileObject = $(this).get(0).files[0]
	const reader = new FileReader();

	reader.onload = function (event) {
		const fileContents = event.target.result.split(/#dataset:\s?/)[1];
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

		var DEFAULT_PARAC_ATTRIBUTES = [
			"levels",
			"height",
			"width",
			"mpp_x",
			"mpp_y",
			"Magnification",
			"pen_markings",
			"coverslip_edge",
			"bubble",
			"nonwhite",
			"dark",
			"percent_small_tissue_removed",
			"percent_small_tissue_filled",
			"percent_blurry",
			"spur_pixels",
			"template1_MSE_hist",
			"template2_MSE_hist",
			"template3_MSE_hist",
			"template4_MSE_hist",
			"michelson_contrast",
			"rms_contrast",
			"grayscale_brightness",
			"chan1_brightness",
			"chan2_brightness",
			"chan3_brightness",
			"deconv_c0_mean",
			"deconv_c1_mean",
			"deconv_c2_mean",
			"chuv1_brightness_YUV",
			"chuv2_brightness_YUV",
			"chuv3_brightness_YUV",
			"chan1_brightness_YUV",
			"chan2_brightness_YUV",
			"chan3_brightness_YUV",
			"pixels_to_use"
		];

		current_parallel_attributes = original_features.filter(function (d) {
			// in DEFAULT_PARAC_ATTRIBUTES and is numeric
			if (typeof (lines[0][d]) == "number" && DEFAULT_PARAC_ATTRIBUTES.indexOf(d) != -1) {
				return true;
			}
			return false;
		});

		console.log(current_parallel_attributes)

		var newLines = lines.map(function (d) {
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

		renderLines(newLines); // call renderLines whenever the underlying dataset changes. e.g, if the user changes the selected features
	}

	reader.readAsText(fileObject)
}



function renderLines(lines) {
	///////////////////////////// PARCOORDS SETUP /////////////////////////////
	const margin = visualViewport.height * 0.05;
	const parcoords_card_height = visualViewport.height * 0.3 - margin;
	// $("#parcoords-parent").height(parcoords_card_height)
	var parcoords = ParCoords()("#example")
		.alpha(0.4)
		.mode("queue") // progressive rendering
		.height(parcoords_card_height)

	const data = lines;
	// slickgrid needs each data element to have an id
	data.forEach(function (d, i) { d.id = d.id || i; });
	console.log(data)
	parcoords
		.data(data)
		.hideAxis(["case_name", "gid"])
		.render()
		.reorderable()
		.brushMode("1D-axes");
	


	///////////////////////////// SLICK GRID SETUP /////////////////////////////
	var column_keys = d3.keys(data[0]);
	var columns = column_keys.map(function (key, i) {
		return {
			id: key,
			name: key,
			field: key,
			sortable: true
		}
	});

	var options = {
		enableCellNavigation: true,
		enableColumnReorder: false,
		multiColumnSort: false
	};

	var dataView = new Slick.Data.DataView();
	var grid = new Slick.Grid("#grid", dataView, columns, options);
	var pager = new Slick.Controls.Pager(dataView, grid, $("#pager"));

	// dataView subscriptions drive the grid
	dataView.onRowCountChanged.subscribe(function (e, args) {
		grid.updateRowCount();
		grid.render();
	});

	dataView.onRowsChanged.subscribe(function (e, args) {
		grid.invalidateRows(args.rows);
		grid.render();
	});

	// column sorting
	var sortcol = column_keys[0];
	var sortdir = 1;

	function comparer(a, b) {
		var x = a[sortcol], y = b[sortcol];
		return (x == y ? 0 : (x > y ? 1 : -1));
	}

	// click header to sort grid column
	grid.onSort.subscribe(function (e, args) {
		sortdir = args.sortAsc ? 1 : -1;
		sortcol = args.sortCol.field;

		if ($.browser.msie && $.browser.version <= 8) {
			dataView.fastSort(sortcol, args.sortAsc);
		} else {
			dataView.sort(comparer, args.sortAsc);
		}
	});

	// highlight row in chart
	grid.onMouseEnter.subscribe(function (e, args) {
		// Get row number from grid
		var grid_row = grid.getCellFromEvent(e).row;

		// Get the id of the item referenced in grid_row
		var item_id = grid.getDataItem(grid_row).id;
		var d = parcoords.brushed() || data;

		// Get the element position of the id in the data object
		elementPos = d.map(function (x) { return x.id; }).indexOf(item_id);

		// Highlight that element in the parallel coordinates graph
		parcoords.highlight([d[elementPos]]);
	});

	grid.onMouseLeave.subscribe(function (e, args) {
		parcoords.unhighlight();
	});

	// fill grid with data
	gridUpdate(data);

	// update grid on brush
	parcoords.on("brush", function (d) {
		gridUpdate(d);
		
		// TODO image gallary update

	});
	

	function gridUpdate(data) {
		dataView.beginUpdate();
		dataView.setItems(data);
		dataView.endUpdate();
	};

	///////////////////////////// IMAGE GALLERY SETUP /////////////////////////////
	initialize_image_view(data);


}