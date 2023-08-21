function init_parallel_canvas () {
	$PARAC.empty();
	PARAC_MARGIN = {top: 80, right: 40, bottom: 10, left: 10};
	PARAC_SVG = d3.select("#parac-svg-container").append("svg")
		.attr("id", "parac-svg")
		.attr("width", $PARAC.width())
		.attr("height", $PARAC.height())
		.append("g")
		.attr("transform", 
			  "translate(" + PARAC_MARGIN.left + "," + PARAC_MARGIN.top + ")"
		);
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
		axis = d3.svg.axis().ticks(5).orient("right");

	var background,
		foreground;

	var data = ORIGINAL_DATASET.map(function (d) {
		attr_value_dict = {
			case_name: d["filename"],
			gid: d["groupid"]
		};
		for (var i = 0; i < CURRENT_PARALLEL_ATTRIBUTES.length; i++) {
			attr_value_dict[CURRENT_PARALLEL_ATTRIBUTES[i]] = 
				d[CURRENT_PARALLEL_ATTRIBUTES[i]];
		}
		return attr_value_dict;
	});
	var selected_cases = dataset.map(function (d) {return d["filename"];});

	xScale.domain(dimensions = d3.keys(data[0]).filter(function (d) {
		return d != "case_name" && d != "gid" && (
			yScale[d] = d3.scale.linear()
				.domain(d3.extent(data, function (p) { return p[d]; }))
				.range([parac_height, 0])
		);
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
			if (CURRENT_SELECTED === d.case_name) {
				return "selected-foreground-path";
			} else {
				return "foreground-path";
			}
		})
		.style("display", function (d) {
			if (selected_cases.indexOf(d.case_name) != -1) {
				return null;
			} else {
				return "none";
			}
		})
		.style("stroke", function (d) {
			if (CURRENT_SELECTED === d.case_name) {
				return "orangered";
			} else {
				if (d["gid"] === -1) {
					return FOREGROUND_COLOR;
				} else {
					return COLOR_PLATE[d["gid"]];
				}
			}
		})
		.attr("d", path);

	// Add a group element for each dimension.
	var g = svg.selectAll(".dimension")
		.data(dimensions)
		.enter().append("g")
		.attr("class", "dimension")
		.attr("transform", function (d) {
			return "translate(" + xScale(d) + ")";
		})
		.call(
			d3.behavior.drag()
				.origin(function (d) { return {x: xScale(d)}; })
				.on("dragstart", function (d) {
					dragging[d] = xScale(d);
					background.attr("visibility", "hidden");
					// foreground.attr("visibility", "hidden");
				})
				.on("drag", function (d) {
					dragging[d] = Math.min(parac_width, Math.max(0,d3.event.x));
					foreground.attr("d", path);
					dimensions.sort(function (a, b) {
						return position(a) - position(b);
					});
					xScale.domain(dimensions);
					g.attr("transform", function (d) {
						return "translate(" + position(d) + ")";
					});
				})
				.on("dragend", function (d) {
					delete dragging[d];
					transition(d3.select(this))
						.attr("transform", "translate(" + xScale(d) + ")");
					transition(foreground)
						.attr("d", path);
					background
						.attr("d", path)
						.transition()
						.delay(500)
						.duration(0)
						.attr("visibility", null);
				})
		);

	// Add an axis and title.
	g.append("g")
		.attr("class", "axis")
		.each(function (d) { d3.select(this).call(axis.scale(yScale[d])); })
		.append("text")
		.attr("y", -10)
		.attr("x", -5)
		.attr("dy", ".35em")
		.attr("transform", "rotate(-20)")
		.style("text-anchor", "start")
		.style("font-size", "12px")
		.text(function (d) { return d; });

	// Add and store a brush for each axis.
	g.append("g")
		.attr("class", "brush")
		.each(function (d) {
			d3.select(this).call(
				yScale[d].brush = d3.svg.brush().y(yScale[d])
					.on("brushstart", brushstart)
					.on("brush", brush)
					.on("brushend", brushend));
		})
		.selectAll("rect")
		.attr("x", -8)
		.attr("width", 16);

	// functions for parallel coordinate, 
	// ref: https://bl.ocks.org/jasondavies/1341281
	function position(d) {
		var v = dragging[d];
		return v == null ? xScale(d) : v;
	}
	
	function transition(g) {
		return g.transition().duration(500);
	}
	
	// Returns the path for a given data point.
	function path(d) {
		return line(dimensions.map(function (p) {
			return [position(p), yScale[p](d[p])];
		}));
	}

	function brushstart() {
		d3.event.sourceEvent.stopPropagation();
	}

	// Handles a brush event, toggling the display of foreground lines.
	function brush() {
		var actives = dimensions.filter(function (p) {
			return !yScale[p].brush.empty();
		});
		var extents = actives.map(function (p) {
			return yScale[p].brush.extent();
		});
		foreground.style("display", function (d) {
			return actives.every(function (p, i) {
				return extents[i][0] <= d[p] && d[p] <= extents[i][1];
			}) ? null : "none";
		});
	}

	function brushend() {
		var actives = dimensions.filter(function (p) {
			return !yScale[p].brush.empty();
		});
		var extents = actives.map(function (p) {
			return yScale[p].brush.extent();
		});

		PARA_COOR_SELECTED = [];
		ORIGINAL_DATASET.forEach(function (d) {
			if (actives.every(function (p, i) {
				return extents[i][0] <= d[p] && d[p] <= extents[i][1];
			})) {
				PARA_COOR_SELECTED.push(d["filename"]);
			}
		});

		if (PARA_COOR_SELECTED.length == 0 && actives.length == 1) {
			PARA_COOR_SELECTED = ORIGINAL_CASE_LIST;
		}

		update_multi_selected();
	}
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
	init_parallel_coordinate(dataset);
}


function init_parallel_vars_selector() {
	var $parallel_selector = $("#parallel-select");
	$parallel_selector.empty();

	var sample_case = ORIGINAL_DATASET[0];

	for (var index in Object.keys(sample_case)) {
		var key = Object.keys(sample_case)[index];
		if (typeof(sample_case[key]) == "number") {
			if (CURRENT_PARALLEL_ATTRIBUTES.indexOf(key) != -1) {
				$parallel_selector.append(generate_option_html(key, key, true));
			} else {
				$parallel_selector.append(generate_option_html(key, key));
			}
		}
	}
	$parallel_selector.selectpicker('refresh');
	$parallel_selector.selectpicker('render');

	$parallel_selector.change(function () {
		CURRENT_PARALLEL_ATTRIBUTES = $(this).val();
		update_chart_view("parallel_coordinate", CURRENT_MULTI_SELECTED);
	});

	function generate_option_html (key, value, selected = false) {
		if (selected) {
			return "<option value='" + value + "' selected>" + key +"</option>";
		} else {
			return "<option value='" + value + "'>" + key + "</option>";
		}
	}
}

