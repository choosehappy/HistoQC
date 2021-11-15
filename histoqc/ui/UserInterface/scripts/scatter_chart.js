'use strict';

// WIP: this script is in the process of being wrapped into an object oriented 
// class 

/* Global variables used in this view:
 * - DEFAULT_UMAP_ATTRIBUTES
 * - UMAP_MIN_DIST
 * - UMAP_SPREAD
 * - UMAP_MAX_N_NEIGHBORS
 * - CURRENT_SELECTED
 * - CURRENT_MULTI_SELECTED
*/

// class attributes
var canvas_id;
var drplt_svg, margin, drplt_width, drplt_height;
var current_umap_attrs;
var umap_selected;
var lasso;

// constructor
function scatter_plot_constructor (all_cases, canvas="#drplt-svg-container") {
	canvas_id = canvas;
	margin = {top: 10, right: 10, bottom: 10, left: 10};

	current_umap_attrs = DEFAULT_UMAP_ATTRIBUTES.filter(function (d) {
		if (typeof(all_cases[0][d]) == "number") {
			return true;
		}
		return false;
	});

	umap_selected = all_cases.map(function (d) {return d["filename"];});
}

// public functions
function init_scatter_plot (selected_cases, all_cases) {
	console.log("scatter init func called.");

	// temporarily call constructor in init function
	scatter_plot_constructor(all_cases);

	var base_dom = $(canvas_id);
	base_dom.empty();
	drplt_svg = d3.select(canvas_id).append("svg")
		.attr("id", "drplt-svg")
		.attr("width", base_dom.width())
		.attr("height", base_dom.height())
		.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
	drplt_width = base_dom.width() - margin.left - margin.right;
	drplt_height = base_dom.height() - margin.top - margin.bottom;

	base_dom.css("display", "block");
	drplt_svg.selectAll("*").remove();

	var dot_background = drplt_svg.append("g")
		.attr("class", "background-dot-group");
	var dot_foreground = drplt_svg.append("g")
		.attr("class", "foreground-dot-group");

	// Create the area where the lasso event can be triggered
	var lasso_area = dot_foreground.append("rect")
		.attr("id", "lasso-area")
		.attr("width", drplt_width)
		.attr("height", drplt_height)
		.style("opacity", 0);

	// Define the lasso
	lasso = d3.lasso()
		.closePathDistance(75) // max distance for the lasso loop to be closed
		.closePathSelect(true) // can items be selected by closing the path?
		.hoverSelect(true) // can items by selected by hovering over them?
		.area(lasso_area) // area where the lasso can be started
		.on("start", lasso_start) // lasso start function
		.on("draw", lasso_draw) // lasso draw function
		.on("end", lasso_end); // lasso end function

	// Init the lasso on the drplt_svg:g that contains the dots
	dot_foreground.call(lasso);

	var data = calc_umap_embedding(all_cases);
	console.log(data);

	var x_scale = d3.scale.linear()
		.range([0, drplt_width])
		.domain(d3.extent(data, function(d) { return d.x_pos; })).nice();

	var y_scale = d3.scale.linear()
		.range([drplt_height, 0])
		.domain(d3.extent(data, function(d) { return d.y_pos; })).nice();

	dot_background.selectAll("circle")
		.data(data)
		.enter().append("circle")
		.attr("class", "background-dot")
		.attr("r", 3.5)
		.attr("cx", function(d) { return x_scale(d.x_pos); })
		.attr("cy", function(d) { return y_scale(d.y_pos); });

	dot_foreground.selectAll("circle.foreground-dot-general")
		.data(data)
		.enter().append("circle")
		.attr("id", function(d, i) {return "dot_" + i;}) // added
		.attr("class", get_foreground_dot_class)
		.attr("r", 3.5)
		.attr("cx", function(d) { return x_scale(d.x_pos); })
		.attr("cy", function(d) { return y_scale(d.y_pos); });

	// WIP: attempts to change marker for different testind value
	// var marker = d3.svg.symbol().type(function(d) { 
	// 	if (d.testind === 1) {
	// 		return "cross";
	// 	} else {
	// 		return "circle";
	// 	}
	// }).size(30);
	// 
	// dot_background.selectAll("path.background-dot")
	// 	.data(data)
	// 	.enter().append("path")
	// 	.attr("class", "background-dot")
	// 	.attr("transform", function(d) { 
	// 		return "translate(" + x_scale(d.x_pos) +","+ y_scale(d.y_pos) + ")"; 
	// 	})
	// 	.attr("d", marker);
	// 
	// dot_foreground.selectAll("path.foreground-dot-general")
	// 	.data(data)
	// 	.enter().append("path")
	// 	.attr("id", function(d, i) {return "dot_" + i;}) // added
	// 	.attr("class", get_foreground_dot_class)
	// 	.attr("transform", function(d) { 
	// 		return "translate(" + x_scale(d.x_pos) +","+ y_scale(d.y_pos) + ")"; 
	// 	})
	// 	.attr("d", marker)
	// 	.style("fill", function (d) {
	// 		if (CURRENT_SELECTED === d.case_name) {
	// 			return "orangered";
	// 		} else {
	// 			if (d["groupid"] === -1) {
	// 				return FOREGROUND_COLOR;
	// 			} else {
	// 				return COLOR_PLATE[d["groupid"]];
	// 			}
	// 		}
	// 	});

	enter_multi_select_scatter_plot(
		selected_cases.map(function (d) {return d["filename"];})
	);
	lasso.items(dot_foreground.selectAll("circle"));
	init_scatter_vars_selector(all_cases, "#scatter-select");
}

function update_scatter_plot (all_cases, selected_cases) {
	console.log("scatter update func called.");

	var base_dom = $(canvas_id);
	drplt_width = base_dom.width() - margin.left - margin.right;
	drplt_height = base_dom.height() - margin.top - margin.bottom;

	// update svg size
	base_dom.css("display", "block");

	d3.select("#drplt-svg")
		.attr("width", base_dom.width())
		.attr("height", base_dom.height());

	var dot_background = drplt_svg.select("g.background-dot-group");
	var dot_foreground = drplt_svg.select("g.foreground-dot-group");

	dot_foreground.select("rect#lasso-area")
		.attr("width", drplt_width)
		.attr("height", drplt_height);

	var data = calc_umap_embedding(all_cases);
	var selected_casenames = selected_cases.map(function (d) {
		return d["filename"];
	});

	var x_scale = d3.scale.linear()
		.range([0, drplt_width])
		.domain(d3.extent(data, function(d) { return d.x_pos; })).nice();

	var y_scale = d3.scale.linear()
		.range([drplt_height, 0])
		.domain(d3.extent(data, function(d) { return d.y_pos; })).nice();

	var background_circles = dot_background.selectAll("circle").data(data);
	background_circles.exit().remove();
	background_circles.enter().append("circle");
	background_circles
		.attr("class", "background-dot")
		.attr("r", 3.5)
		.attr("cx", function(d) { return x_scale(d.x_pos); })
		.attr("cy", function(d) { return y_scale(d.y_pos); });

	var foreground_circles = dot_foreground
		.selectAll("circle.foreground-dot-general").data(data);
	foreground_circles.exit().remove();
	foreground_circles.enter().append("circle");
	foreground_circles
		.attr("id", function(d, i) {return "dot_" + i;})
		.attr("class", get_foreground_dot_class)
		.attr("r", 3.5)
		.attr("cx", function(d) { return x_scale(d.x_pos); })
		.attr("cy", function(d) { return y_scale(d.y_pos); })
		.style("fill", function (d) {
			if (d.testind != 1) {
				return "none";
			}

			if (CURRENT_SELECTED === d.case_name) {
				return "orangered";
			} else {
				if (d["groupid"] === -1) {
					return FOREGROUND_COLOR;
				} else {
					return COLOR_PLATE[d["groupid"]];
				}
			}
		})
		.style("stroke", function (d) {
			if (d.testind === 1) {
				return "#aaa";
			}

			if (CURRENT_SELECTED === d.case_name) {
				return "orangered";
			} else {
				if (d["groupid"] === -1) {
					return FOREGROUND_COLOR;
				} else {
					return COLOR_PLATE[d["groupid"]];
				}
			}
		})
		.style("stroke-width", function (d) {
			if (d.testind != 1) {
				return 1;
			} else {
				return 0.4;
			}
		});

	enter_multi_select_scatter_plot(
		selected_cases.map(function (d) {return d["filename"];})
	);
	lasso.items(dot_foreground.selectAll("circle.foreground-dot-general"));
}

function enter_select_scatter_plot (case_name) {
	drplt_svg.select("g.foreground-dot-group")
		.selectAll("circle.foreground-dot-general")
		.filter(function (d) {return d.case_name==case_name;})
		.classed({
			"selected-dot": true, 
			"foreground-dot": false, 
			"foreground-dot-general": true
		});
}

function exit_select_scatter_plot () {
	drplt_svg.select("g.foreground-dot-group")
		.selectAll(".selected-dot")
		.classed({
			"selected-dot": false, 
			"foreground-dot": true, 
			"foreground-dot-general": true
		});
}

function enter_multi_select_scatter_plot (selected_casenames) {
	drplt_svg.select("g.foreground-dot-group")
		.selectAll("circle.foreground-dot-general")
		.style("display", function (d) {
			if (selected_casenames.indexOf(d.case_name) != -1) {
				return null;
			} else {
				return "none";
			}
		});
}

// helper functions
function calc_umap_embedding (cases) {
	if (COHORT_LOADED) {
		var data = cases.map(function (d, i) {
			return {
				case_name: d["filename"],
				groupid: d["groupid"],
				testind: d["testind"],
				x_pos: d["embed_x"],
				y_pos: d["embed_y"]
			};
		});

		return data;
	} else if (!CALC_UMAP) {
		var data = cases.map(function (d, i) {
			return {
				case_name: d["filename"],
				groupid: d["groupid"],
				testind: d["testind"],
				x_pos: 0,
				y_pos: 0
			};
		});

		return data;		
	} else {
		var pre_matrix = cases.map(function (d) {
			var case_value = [];
			for (var i = 0; i < current_umap_attrs.length; i++) {
				case_value.push(d[current_umap_attrs[i]]);
			}
			return case_value;
		});

		if (cases.length > 1) {
			if ($("#dist-select").val() === "euclidean") {
				console.log("Using Euclidean distance.")
				var umap = new UMAP({
					nComponents: 2,
					distanceFn: UMAP.euclidean, 
					nNeighbors: Math.min(cases.length-1, UMAP_MAX_N_NEIGHBORS), 
					minDist: UMAP_MIN_DIST, 
					spread: UMAP_SPREAD
				});
			} else {
				console.log("Using cosine distance.")
				var umap = new UMAP({
					nComponents: 2,
					distanceFn: UMAP.cosine, 
					nNeighbors: Math.min(cases.length-1, UMAP_MAX_N_NEIGHBORS), 
					minDist: UMAP_MIN_DIST, 
					spread: UMAP_SPREAD
				});
			}
			var embedding = umap.fit(pre_matrix);
		} else {
			var embedding = [[0, 0]];
		}
		var data = cases.map(function (d, i) {
			return {
				case_name: d["filename"],
				groupid: d["groupid"],
				testind: d["testind"],
				x_pos: embedding[i][0],
				y_pos: embedding[i][1]
			};
		});

		return data;
	}
}

function init_scatter_vars_selector(
	all_cases, control_group_id="#scatter-select"
) {
	var $scatter_selector = $(control_group_id);
	$scatter_selector.empty();

	var sample_case = all_cases[0];

	for (var index in Object.keys(sample_case)) {
		var key = Object.keys(sample_case)[index];
		if (typeof(sample_case[key]) == "number") {
			if (current_umap_attrs.indexOf(key) != -1) {
				$scatter_selector.append(generate_option_html(key, key, true));
			} else {
				$scatter_selector.append(generate_option_html(key, key));
			}
		}
	}
	$scatter_selector.selectpicker('refresh');
	$scatter_selector.selectpicker('render');

	$scatter_selector.change(function () {
		current_umap_attrs = $(this).val();
		update_chart_view("scatter_plot", CURRENT_MULTI_SELECTED);
	});

	$("#dist-select").change(function () {
		update_chart_view("scatter_plot", CURRENT_MULTI_SELECTED);
	});

	$("#umap-rerun-btn").on("click", function () {
		CALC_UMAP = true;
		update_chart_view("scatter_plot", CURRENT_MULTI_SELECTED);
	});

	function generate_option_html (key, value, selected = false) {
		if (selected) {
			return "<option value='" + value + "' selected>" + 
				key + "</option>";
		} else {
			return "<option value='" + value + "'>" + key + "</option>";
		}
	}
}

function get_foreground_dot_class (d) {
	if (d.case_name === CURRENT_SELECTED) {
		return "selected-dot foreground-dot-general";
	} else {
		return "foreground-dot foreground-dot-general";
	}
}

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
	var pre_update_umap_selected = umap_selected.length;

	umap_selected = lasso.items()
		.filter(function(d) {return d.selected===true})
		.data()
		.map(function (d) {return d.case_name;});

	if (umap_selected.length == 0) {
		umap_selected = all_cases.map(function(d){return d["filename"];});
		if (pre_update_umap_selected != all_cases.length) {
			update_multi_selected();
		} else {
			// restore all of the foreground dots
			lasso.items().style("display", null); 

		}
	} else {
		update_multi_selected();
	}
};
