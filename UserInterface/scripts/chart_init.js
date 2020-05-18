function update_chart_width () {
	console.log($("#dimension-reduction-view").outerHeight());
	$("#dimension-reduction-view").outerWidth($("#dimension-reduction-view").outerHeight());
	console.log($("#chart-view").width());
	console.log($("#dimension-reduction-view").outerWidth());
	$("#original-feature-view").outerWidth($("#chart-view").width() - $("#dimension-reduction-view").outerWidth() - 10);
}


function initialize_chart_view (dataset, vis_type="bar_chart") {

	show_view("chart");
	update_chart_width();

	$CHART.empty();
	$PARAC.empty();
	$DRPLT.empty();

	// init global SVG and MARGIN
	CHART_MARGIN = {top: 10, right: 60, bottom: 40, left: 0};
	if (dataset.length > 50) {
		CHART_MARGIN.bottom = 10;
	}
	PARAC_MARGIN = {top: 60, right: 10, bottom: 10, left: 10};
	DRPLT_MARGIN = {top: 10, right: 10, bottom: 30, left: 30};

	CHART_SVG = d3.select("#chart-svg-container").append("svg")
		.attr("id", "chart-svg")
		.attr("width", $CHART.width())
		.attr("height", $CHART.height())
		.append("g")
		.attr("transform", "translate(" + CHART_MARGIN.left + "," + CHART_MARGIN.top + ")");
	PARAC_SVG = d3.select("#parac-svg-container").append("svg")
		.attr("id", "parac-svg")
		.attr("width", $PARAC.width())
		.attr("height", $PARAC.height())
		.append("g")
		.attr("transform", "translate(" + PARAC_MARGIN.left + "," + PARAC_MARGIN.top + ")");
	DRPLT_SVG = d3.select("#drplt-svg-container").append("svg")
		.attr("id", "drplt-svg")
		.attr("width", $DRPLT.width())
		.attr("height", $DRPLT.height())
		.append("g")
		.attr("transform", "translate(" + DRPLT_MARGIN.left + "," + DRPLT_MARGIN.top + ")");

	CURRENT_CHART_ATTRIBUTE = DEFAULT_CHART_ATTRIBUTE;

	init_bar_chart(dataset);
	init_parallel_coordinate(dataset);
	init_scatter_plot(dataset);
	init_chart_selector(vis_type);

	show_chosen_vis(vis_type);
}


function update_chart_view (vis_type, dataset) {

	update_chart_width();

	// can be optimized by differentiate update type (just switch from chart to parallel coordiate?)
	show_chosen_vis(vis_type);

	if (vis_type == "bar_chart") {
		update_bar_chart(dataset);
	} else if (vis_type == "parallel_coordinate") {
		update_parallel_coordinate(dataset);
	} else if (vis_type == "scatter_plot") {
		update_scatter_plot(dataset);
	} else if (vis_type == "both") {
		update_bar_chart(dataset);
		update_parallel_coordinate(dataset);
	}
}


function enter_select_chart_view (case_name) {
	exit_select_chart_view();

	d3.selectAll(".bar")
		.classed("selected-bar", function (d) {
			if (d.case_name == case_name) {
				return true;
			} else {
				return false;
			}
		})
		.classed("bar", function (d) {
			if (d.case_name == case_name) {
				return false;
			} else {
				return true;
			}
		});

	d3.selectAll(".foreground-path")
		.classed("selected-foreground-path", function (d) {
			if (d.case_name == case_name) {
				return true;
			} else {
				return false;
			}
		})
		.classed("foreground-path", function (d) {
			if (d.case_name == case_name) {
				return false;
			} else {
				return true;
			}
		});
}


function exit_select_chart_view () {
	d3.selectAll(".selected-bar")
		.classed("bar", true)
		.classed("selected-bar", false);

	d3.selectAll(".selected-foreground-path")
		.classed("foreground-path", true)
		.classed("selected-foreground-path", false);
}



function init_bar_chart (dataset) {
	var svg = CHART_SVG;
	var chart_width = $CHART.width() - CHART_MARGIN.left - CHART_MARGIN.right;
	var chart_height = $CHART.height() - CHART_MARGIN.top - CHART_MARGIN.bottom;

	var data = dataset.map(function (d) {
		return {
			case_name: d["filename"],
			attr_value: d[CURRENT_CHART_ATTRIBUTE]
		};
	});

	var xScale = d3.scale.ordinal()
		.rangeRoundBands([0, chart_width], .1)
		.domain(data.map(function (d) { return d.case_name; }));

	var yScale = d3.scale.linear()
		.range([chart_height, 0])
		.domain([0, d3.max(data, function (d) { return d.attr_value; })]);

	var xAxis = d3.svg.axis()
		.scale(xScale)
		.orient("bottom");

	var yAxis = d3.svg.axis()
		.scale(yScale)
		.ticks(4)
		.orient("right")
		.innerTickSize(-chart_width)
		.outerTickSize(0)
		.tickPadding(10);
	
	TIP = d3.tip()
		.attr('class', 'd3-tip')
		.offset([-10, 0])
		.html(function (d) {
			return "<span style='color:#f94; font-size:10px'>" + d.case_name + "</span>" +
					 "</br>" +
					 "<span style='font-weight:100; font-size:10px'>" + d.attr_value.toFixed(5) + "</span>";
		});

	svg.call(TIP);

	if (data.length < 50) {
		svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + chart_height + ")")
			.call(xAxis)
			.selectAll("text")
			.attr("y", 12)
			.attr("x", 3)
			.attr("dy", ".35em")
			.attr("transform", "rotate(20)")
			.style("text-anchor", "start");
	} else {
		svg.append("g")
			.attr("class", "x axis")
			.attr("transform", "translate(0," + chart_height + ")")
			.call(xAxis)
			.selectAll("text")
			.remove();
	}

	svg.append("g")
		.attr("class", "y axis")
		.attr("transform", "translate(" + chart_width + ", 0)")
		.call(yAxis);

	svg.selectAll(".bar")
		.data(data)
		.enter().append("rect")
		.attr("class", function (d) {
			if (CURRENT_SELECTED == d.case_name) {
				return "selected-bar";
			} else {
				return "bar";
			}
		})
		.attr("x", function (d) { return xScale(d.case_name); })
		.attr("width", Math.max(xScale.rangeBand() - 1, 1))
		.attr("y", function (d) { return yScale(d.attr_value); })
		.attr("height", function (d) { return chart_height - yScale(d.attr_value); })
		.on('mouseover', TIP.show)
		.on('mouseout', TIP.hide)
		.on('click', function (d) {
			if (CURRENT_SELECTED == d.case_name) {
				exit_select_mode();
			} else {
				enter_select_mode(d.case_name);
			}
		});
}

function init_parallel_coordinate (dataset) {

	$PARAC.css("display", "block");

	var svg = PARAC_SVG;
	var parac_width = $PARAC.width() - PARAC_MARGIN.left - PARAC_MARGIN.right;
	var parac_height = $PARAC.height() - PARAC_MARGIN.top - PARAC_MARGIN.bottom;
	svg.selectAll("*").remove();
	
	if (CURRENT_VIS_TYPE != "parallel_coordinate") {
		$PARAC.css("display", "none");
	}

	var xScale = d3.scale.ordinal().rangePoints([0, parac_width], 1),
		yScale = {},
		dragging = {};

	var line = d3.svg.line().interpolate('linear'),
		axis = d3.svg.axis().ticks(5).orient("left");

	var background,
		foreground;

	current_parac_attributes = get_cur_display_numeric_attrs();
	var data = dataset.map(function (d) {
		attr_value_dict = {case_name: d["filename"]};
		for (var i = 0; i < current_parac_attributes.length; i++) {
			attr_value_dict[current_parac_attributes[i]] = d[current_parac_attributes[i]];
		}
		return attr_value_dict;
	});

	xScale.domain(dimensions = d3.keys(data[0]).filter(function (d) {
		return d != "case_name" && (yScale[d] = d3.scale.linear()
			.domain(d3.extent(data, function (p) { return p[d]; }))
			.range([parac_height, 0]));
	}));

	// Add grey background lines for context.
	background = svg.append("g")
		.attr("class", "background")
		.selectAll("path")
		.data(data)
		.enter().append("path")
		.attr("class", "background-path")
		.attr("d", path);

	// Add blue foreground lines for focus.
	foreground = svg.append("g")
		.attr("class", "foreground")
		.selectAll("path")
		.data(data)
		.enter().append("path")
		.attr("class", function (d) {
			if (CURRENT_SELECTED == d.case_name) {
				return "selected-foreground-path";
			} else {
				return "foreground-path";
			}
		})
		.attr("d", path);

	// Add a group element for each dimension.
	var g = svg.selectAll(".dimension")
		.data(dimensions)
		.enter().append("g")
		.attr("class", "dimension")
		.attr("transform", function (d) { return "translate(" + xScale(d) + ")"; })
		.call(d3.behavior.drag()
			.origin(function (d) { return {x: xScale(d)}; })
			.on("dragstart", function (d) {
				dragging[d] = xScale(d);
				background.attr("visibility", "hidden");
			})
			.on("drag", function (d) {
				dragging[d] = Math.min(parac_width, Math.max(0, d3.event.x));
				foreground.attr("d", path);
				dimensions.sort(function (a, b) { return position(a) - position(b); });
				xScale.domain(dimensions);
				g.attr("transform", function (d) { return "translate(" + position(d) + ")"; })
			})
			.on("dragend", function (d) {
				delete dragging[d];
				transition(d3.select(this)).attr("transform", "translate(" + xScale(d) + ")");
				transition(foreground).attr("d", path);
				background
					.attr("d", path)
					.transition()
					.delay(500)
					.duration(0)
					.attr("visibility", null);
			}));

	// Add an axis and title.
	g.append("g")
		.attr("class", "axis")
		.each(function (d) { d3.select(this).call(axis.scale(yScale[d])); })
		.append("text")
		.attr("y", -10)
		.attr("x", -5)
		.attr("dy", ".35em")
		.attr("transform", "rotate(-10)")
		.style("text-anchor", "start")
		.text(function (d) { return d; });

	// Add and store a brush for each axis.
	g.append("g")
		.attr("class", "brush")
		.each(function (d) {
			d3.select(this).call(yScale[d].brush = d3.svg.brush().y(yScale[d])
													 .on("brushstart", brushstart)
													 .on("brush", brush)
													 .on("brushend", brushend));
		})
		.selectAll("rect")
		.attr("x", -8)
		.attr("width", 16);

	// functions for parallel coordinate, ref: https://bl.ocks.org/jasondavies/1341281
	function position(d) {
		var v = dragging[d];
		return v == null ? xScale(d) : v;
	}
	
	function transition(g) {
		return g.transition().duration(500);
	}
	
	// Returns the path for a given data point.
	function path(d) {
		return line(dimensions.map(function (p) { return [position(p), yScale[p](d[p])]; }));
	}

	function brushstart() {
		d3.event.sourceEvent.stopPropagation();
	}

	// Handles a brush event, toggling the display of foreground lines.
	function brush() {
		var actives = dimensions.filter(function (p) { return !yScale[p].brush.empty(); }),
			extents = actives.map(function (p) { return yScale[p].brush.extent(); });
		foreground.style("display", function (d) {
			return actives.every(function (p, i) {
				return extents[i][0] <= d[p] && d[p] <= extents[i][1];
			}) ? null : "none";
		});
	}

	function brushend() {
		var actives = dimensions.filter(function (p) { return !yScale[p].brush.empty(); }),
			extents = actives.map(function (p) { return yScale[p].brush.extent(); });

		selected_files = [];
		ORIGINAL_DATASET.forEach(function (d) {
			if (actives.every(function (p, i) {
				return extents[i][0] <= d[p] && d[p] <= extents[i][1];
			})) {
				selected_files.push(d["filename"]);
			}
		});

		if (selected_files.length == 0 && actives.length == 1) {
			selected_files = ORIGINAL_CASE_LIST;
		}

		update_multi_selected(selected_files);
	}
}

function init_scatter_plot (dataset) {

	$DRPLT.css("display", "block");

	var svg = DRPLT_SVG;
	var drplt_width = $DRPLT.width() - DRPLT_MARGIN.left - DRPLT_MARGIN.right;
	var drplt_height = $DRPLT.height() - DRPLT_MARGIN.top - DRPLT_MARGIN.bottom;
	svg.selectAll("*").remove();

	cur_numeric_attributes = get_cur_display_numeric_attrs();
	var pre_matrix = dataset.map(function (d) {
		case_value = [];
		for (var i = 0; i < cur_numeric_attributes.length; i++) {
			case_value.push(d[cur_numeric_attributes[i]]);
		}
		return case_value;
	});
	console.table(pre_matrix) ;
	var umap = new UMAP();
	var embedding = umap.fit(pre_matrix);
	console.log(embedding);
	var data = dataset.map(function (d, i) {
		return {
			case_name: d["filename"],
			x_pos: embedding[i][0],
			y_pos: embedding[i][1]
		};
	});
	console.log(data);

	var x_scale = d3.scale.linear()
		.range([0, drplt_width])
		.domain(d3.extent(data, function(d) { return d.x_pos; })).nice();

	var y_scale = d3.scale.linear()
		.range([drplt_height, 0])
		.domain(d3.extent(data, function(d) { return d.y_pos; })).nice();

  	var color = d3.scale.category10();

	var x_axis = d3.svg.axis()
		.scale(x_scale)
		.orient("bottom");

	var y_axis = d3.svg.axis()
		.scale(y_scale)
		.orient("left");

	// Lasso functions to execute while lassoing
	var lasso_start = function() {
		lasso.items()
			.attr("r", 3.5) // reset size
			.style("fill", null) // clear all of the fills
			.classed({"not_possible": true, "selected": false}); // style as not possible
	};

	var lasso_draw = function() {
		// Style the possible dots
		lasso.items().filter(function(d) {return d.possible===true})
			.classed({"not_possible": false, "possible": true});

		// Style the not possible dot
		lasso.items().filter(function(d) {return d.possible===false})
			.classed({"not_possible": true, "possible": false});
	};

	var lasso_end = function() {
		// Reset the color of all dots
		lasso.items()
			 .style("fill", function(d) { return color(d.species); });

		// Style the selected dots
		lasso.items().filter(function(d) {return d.selected===true})
			.classed({"not_possible": false, "possible": false})
			.attr("r", 7);

		// Reset the style of the not selected dots
		lasso.items().filter(function(d) {return d.selected===false})
			.classed({"not_possible": false, "possible": false})
			.attr("r", 3.5);
	};

	// Create the area where the lasso event can be triggered
	var lasso_area = svg.append("rect")
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
	svg.call(lasso);

	svg.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + drplt_height + ")")
		.call(x_axis);

	svg.append("g")
		.attr("class", "y axis")
		.call(y_axis);

	svg.selectAll(".dot")
		.data(data)
		.enter().append("circle")
		.attr("id",function(d, i) {return "dot_" + i;}) // added
		.attr("class", "dot")
		.attr("r", 3.5)
		.attr("cx", function(d) { return x_scale(d.x_pos); })
		.attr("cy", function(d) { return y_scale(d.y_pos); })
		.style("fill", "darkblue")
		.style("opacity", 0.3);

	lasso.items(d3.selectAll(".dot"));
}

function update_bar_chart (dataset) {

	$CHART.css("display", "block");

	d3.select("#chart-svg")
		.attr("width", $CHART.width())
		.attr("height", $CHART.height());

	var svg = CHART_SVG;
	var chart_width = $CHART.width() - CHART_MARGIN.left - CHART_MARGIN.right;
	var chart_height = $CHART.height() - CHART_MARGIN.top - CHART_MARGIN.bottom;

	if (CURRENT_VIS_TYPE != "bar_chart") {
		$CHART.css("display", "none");
	}

	var data = dataset.map(function (d) {
		return {
			case_name: d["filename"],
			attr_value: d[CURRENT_CHART_ATTRIBUTE]
		};
	});

	var xScale = d3.scale.ordinal()
		.rangeRoundBands([0, chart_width], .1)
		.domain(data.map(function (d) { return d.case_name; }));

	var yScale = d3.scale.linear()
		.range([chart_height, 0])
		.domain([0, d3.max(data, function (d) { return d.attr_value; })]);

	// update axis
	var xAxis = d3.svg.axis()
		.scale(xScale)
		.orient("bottom");

	var yAxis = d3.svg.axis()
		.scale(yScale)
		.ticks(4)
		.orient("right")
		.innerTickSize(-chart_width)
		.outerTickSize(0)
		.tickPadding(10);
	
	if (data.length < 50) {
		CHART_SVG.selectAll("g.x.axis")
			.transition()
			.duration(500)
			.attr("transform", "translate(0," + chart_height + ")")
			.call(xAxis)
			.selectAll("text")
			.attr("y", 12)
			.attr("x", 3)
			.attr("dy", ".35em")
			.attr("transform", "rotate(20)")
			.style("text-anchor", "start");
		} else {
		CHART_SVG.selectAll("g.x.axis")
			.transition()
			.duration(500)
			.attr("transform", "translate(0," + chart_height + ")")
			.call(xAxis)
			.selectAll("text")
			.remove();
		}

	CHART_SVG.selectAll("g.y.axis")
		.transition()
		.duration(500)
		.attr("transform", "translate(" + chart_width + ", 0)")
		.call(yAxis);

	// update bars
	var bars = CHART_SVG.selectAll("rect").data(data);

	bars.exit().remove();
	bars.enter().append("rect")
		.on('mouseover', TIP.show)
		.on('mouseout', TIP.hide)
		.on('click', function (d) {
			if (CURRENT_SELECTED == d.case_name) {
				exit_select_mode();
			} else {
				enter_select_mode(d.case_name);
			}
		});     
	bars.transition()
		.duration(500)
		.attr("class", function (d) {
			if (CURRENT_SELECTED == d.case_name) {
				return "selected-bar";
			} else {
				return "bar";
			}
		})
		.attr("x", function (d) { return xScale(d.case_name); })
		.attr("width", Math.max(xScale.rangeBand() - 1, 1))
		.attr("y", function (d) { return yScale(d.attr_value); })
		.attr("height", function (d) { return chart_height - yScale(d.attr_value); });
}

function update_parallel_coordinate (dataset) {
	// update svg size
	$PARAC.css("display", "block");

	d3.select("#parac-svg")
		.attr("width", $PARAC.width())
		.attr("height", $PARAC.height());

	if (CURRENT_VIS_TYPE != "parallel_coordinate") {
		$PARAC.css("display", "none");
	}

	// update currently selected numeric attributes
	init_parallel_coordinate (dataset);
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

function update_multi_selected_chart_view () {
	update_bar_chart(CURRENT_MULTI_SELECTED);
}


function init_chart_selector (vis_type) {

	// TODO: clean up useless code

	$chart_selector = $("#chart-select");
	$chart_selector.empty();

	var sample_case = ORIGINAL_DATASET[0];

	for (var index in Object.keys(sample_case)) {
		var key = Object.keys(sample_case)[index];
		if (typeof(sample_case[key]) == "number") {
			if (key == CURRENT_CHART_ATTRIBUTE) {
				$chart_selector.append(generate_option_html(key, key, true));
			} else {
				$chart_selector.append(generate_option_html(key, key));
			}
		}
	}
	$('.selectpicker').selectpicker('render');
	$('.selectpicker').selectpicker('refresh');

	$chart_selector.change(function () {
		CURRENT_CHART_ATTRIBUTE = $(this).val();
		update_chart_view("bar_chart", CURRENT_MULTI_SELECTED);
	});

	$("#vis-switch-btn").click(function () {
		if ($PARAC.css("display") == "none") {
			show_chosen_vis("parallel_coordinate");
		} else {
			show_chosen_vis("bar_chart");
		} 
	})

	$("#chart-sort-btn").click(function () {
		var sort_attribute = CURRENT_CHART_ATTRIBUTE;
		var sort_attribute_index = ORIGINAL_FEATURE_LIST.indexOf(sort_attribute);
		TABLE.order([sort_attribute_index, 'desc']).draw();
		data_sorting(sort_attribute, true);
		update_views();
	})

	function generate_option_html (key, value, selected = false) {
		if (selected) {
			return "<option value='" + value + "' selected>" + key + "</option>";
		} else {
			return "<option value='" + value + "'>" + key + "</option>";
		}
	}
}

function show_chosen_vis (vis_type) {
	if (vis_type == "bar_chart") {
		CURRENT_VIS_TYPE = "bar_chart";
		$PARAC.css("display", "none");
		$CHART.css("display", "block");
		$("#chart-select-group").css("display", "flex");
		$("#vis-switch-btn").text("Parallel Coordinate");
	} else if (vis_type == "parallel_coordinate") {
		CURRENT_VIS_TYPE = "parallel_coordinate";
		$CHART.css("display", "none");
		$("#chart-select-group").css("display", "none");
		$PARAC.css("display", "block");
		$("#vis-switch-btn").text("Bar Chart");
	} 
}


function get_cur_display_numeric_attrs () {
	return ORIGINAL_FEATURE_LIST.filter(function (d) {
		if (typeof(ORIGINAL_DATASET[0][d]) == "number" && CURRENT_HIDDEN_COLUMNS.indexOf(d) == -1) {
			return true;
		}
		return false;
	});
}
