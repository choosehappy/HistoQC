function init_scatter_canvas () {
	$DRPLT.empty();
	DRPLT_MARGIN = {top: 10, right: 10, bottom: 10, left: 10};
	DRPLT_SVG = d3.select("#drplt-svg-container").append("svg")
		.attr("id", "drplt-svg")
		.attr("width", $DRPLT.width())
		.attr("height", $DRPLT.height())
		.append("g")
		.attr("transform", "translate(" + DRPLT_MARGIN.left + "," + DRPLT_MARGIN.top + ")");
}


function init_scatter_plot (dataset) {

	$DRPLT.css("display", "block");

	var svg = DRPLT_SVG;
	var drplt_width = $DRPLT.width() - DRPLT_MARGIN.left - DRPLT_MARGIN.right;
	var drplt_height = $DRPLT.height() - DRPLT_MARGIN.top - DRPLT_MARGIN.bottom;
	svg.selectAll("*").remove();
	var dot_background = svg.append("g").attr("class", "background-dot-group");
	var dot_foreground = svg.append("g").attr("class", "foreground-dot-group");

	var pre_matrix = ORIGINAL_DATASET.map(function (d) {
		case_value = [];
		for (var i = 0; i < CURRENT_UMAP_ATTRIBUTES.length; i++) {
			case_value.push(d[CURRENT_UMAP_ATTRIBUTES[i]]);
		}
		return case_value;
	});

	if ($("#dist-select").val() === "euclidean") {
		var umap = new UMAP({
			nComponents: 2,
			distanceFn: UMAP.euclidean, 
			nNeighbors: Math.min(ORIGINAL_DATASET.length - 1, UMAP_MAX_N_NEIGHBORS), 
			minDist: UMAP_MIN_DIST, 
			spread: UMAP_SPREAD
		});
	} else {
		var umap = new UMAP({
			nComponents: 2,
			distanceFn: UMAP.cosine, 
			nNeighbors: Math.min(ORIGINAL_DATASET.length - 1, UMAP_MAX_N_NEIGHBORS), 
			minDist: UMAP_MIN_DIST, 
			spread: UMAP_SPREAD
		});
	}
	var embedding = umap.fit(pre_matrix);
	var data = ORIGINAL_DATASET.map(function (d, i) {
		return {
			case_name: d["filename"],
			x_pos: embedding[i][0],
			y_pos: embedding[i][1]
		};
	});
	var selected_cases = dataset.map(function (d) {return d["filename"];});

	var x_scale = d3.scale.linear()
		.range([0, drplt_width])
		.domain(d3.extent(data, function(d) { return d.x_pos; })).nice();

	var y_scale = d3.scale.linear()
		.range([drplt_height, 0])
		.domain(d3.extent(data, function(d) { return d.y_pos; })).nice();

	// var x_axis = d3.svg.axis()
	// 	.scale(x_scale)
	// 	.orient("bottom");

	// var y_axis = d3.svg.axis()
	// 	.scale(y_scale)
	// 	.orient("left");

	// Lasso functions to execute while lassoing
	var lasso_start = function() {
		lasso.items()
			.style("display", "none"); // clear all of the foreground dots
	};

	var lasso_draw = function() {
		// Style the possible dots
		lasso.items().filter(function(d) {return d.possible===true})
			.style("display", null);

		// Style the not possible dot
		lasso.items().filter(function(d) {return d.possible===false})
			.style("display", "none");
	};

	var lasso_end = function() {
		var pre_update_umap_selected = UMAP_PROJ_SELECTED.length;

		UMAP_PROJ_SELECTED = lasso.items()
			.filter(function(d) {return d.selected===true})
			.data()
			.map(function (d) {return d.case_name;});

		if (UMAP_PROJ_SELECTED.length == 0) {
			UMAP_PROJ_SELECTED = ORIGINAL_CASE_LIST;
			if (pre_update_umap_selected != ORIGINAL_CASE_LIST.length) {
				update_multi_selected();
			} else {
				lasso.items()
					.style("display", null); // restore all of the foreground dots

			}
		} else {
			update_multi_selected();
		}

		// // Reset the color of all dots
		// lasso.items()
		// 	 .style("fill", function(d) { return color(d.species); });

		// // Style the selected dots
		// lasso.items().filter(function(d) {return d.selected===true})
		// 	.classed({"not_possible": false, "possible": false})
		// 	.attr("r", 7);

		// // Reset the style of the not selected dots
		// lasso.items().filter(function(d) {return d.selected===false})
		// 	.classed({"not_possible": false, "possible": false})
		// 	.attr("r", 3.5);
	};

	// Create the area where the lasso event can be triggered
	var lasso_area = dot_foreground.append("rect")
		.attr("width", drplt_width)
		.attr("height", drplt_height)
		.style("opacity", 0);

	// Define the lasso
	var lasso = d3.lasso()
		.closePathDistance(75) // max distance for the lasso loop to be closed
		.closePathSelect(true) // can items be selected by closing the path?
		.hoverSelect(true) // can items by selected by hovering over them?
		.area(lasso_area) // area where the lasso can be started
		.on("start", lasso_start) // lasso start function
		.on("draw", lasso_draw) // lasso draw function
		.on("end", lasso_end); // lasso end function

	// Init the lasso on the svg:g that contains the dots
	dot_foreground.call(lasso);

	// svg.append("g")
	// 	.attr("class", "x axis")
	// 	.attr("transform", "translate(0," + drplt_height + ")")
	// 	.call(x_axis);

	// svg.append("g")
	// 	.attr("class", "y axis")
	// 	.call(y_axis);

	dot_background.selectAll("circle")
		.data(data)
		.enter().append("circle")
		.attr("class", "background-dot")
		.attr("r", 3.5)
		.attr("cx", function(d) { return x_scale(d.x_pos); })
		.attr("cy", function(d) { return y_scale(d.y_pos); });

	dot_foreground.selectAll("circle")
		.data(data)
		.enter().append("circle")
		.attr("id", function(d, i) {return "dot_" + i;}) // added
		.attr("class", function (d) {
			if (d.case_name === CURRENT_SELECTED) {
				return "selected-dot";
			} else {
				return "foreground-dot";
			}
		})
		.style("display", function (d) {
			if (selected_cases.length == 0 || selected_cases.indexOf(d.case_name) != -1) {
				return null;
			} else {
				return "none";
			}
		})
		.attr("r", 3.5)
		.attr("cx", function(d) { return x_scale(d.x_pos); })
		.attr("cy", function(d) { return y_scale(d.y_pos); });

	lasso.items(dot_foreground.selectAll("circle"));
}


function update_scatter_plot (dataset) {
	// update svg size
	$DRPLT.css("display", "block");

	d3.select("#drplt-svg")
		.attr("width", $DRPLT.width())
		.attr("height", $DRPLT.height());

	// update currently selected numeric attributes
	init_scatter_plot (dataset);
}


function init_scatter_vars_selector() {
	var $scatter_selector = $("#scatter-select");
	$scatter_selector.empty();

	var sample_case = ORIGINAL_DATASET[0];

	for (var index in Object.keys(sample_case)) {
		var key = Object.keys(sample_case)[index];
		if (typeof(sample_case[key]) == "number") {
			if (CURRENT_UMAP_ATTRIBUTES.indexOf(key) != -1) {
				$scatter_selector.append(generate_option_html(key, key, true));
			} else {
				$scatter_selector.append(generate_option_html(key, key));
			}
		}
	}
	$scatter_selector.selectpicker('refresh');
	$scatter_selector.selectpicker('render');

	$scatter_selector.change(function () {
		CURRENT_UMAP_ATTRIBUTES = $(this).val();
		update_chart_view("scatter_plot", CURRENT_MULTI_SELECTED);
	});

	$("#dist-select").change(function () {
		update_chart_view("scatter_plot", CURRENT_MULTI_SELECTED);
	});

	$("#umap-rerun-btn").on("click", function () {
		update_chart_view("scatter_plot", CURRENT_MULTI_SELECTED);
	});

	function generate_option_html (key, value, selected = false) {
		if (selected) {
			return "<option value='" + value + "' selected>" + key + "</option>";
		} else {
			return "<option value='" + value + "'>" + key + "</option>";
		}
	}
}



