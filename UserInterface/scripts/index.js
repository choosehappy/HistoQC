$(document).ready(function () {
	console.log("[LOG] Document ready.")

	// app entrance. func `load_raw_data` at data_load.js.
	$("#upload-input").change(load_raw_data);
	// app exit. back to the uploading page, reset to the init structure.
	$("#reset-button").click(function () {window.location.reload();});
	$(".view-mngmt-btn").click(function(){
		if ($(this).hasClass("view-enabled")) {
			hide_view($(this).attr("value"));
		} else {
			show_view($(this).attr("value"));
		}
	})
	$("#cf-input").change(load_cohort_finder);

	// listener for re-size of certain views
	$(window).resize(function () { 
		update_image_view_height();
		if (INITIALIZED_VIEWS.indexOf("chart") >= 0) {
			update_chart_view("all", CURRENT_MULTI_SELECTED);
		}
	});

	// detail view zoomability setup
	// TODO: change place
    $(".zoom").on("mousemove", function (e) {
		var zoomer = e.currentTarget;
		e.offsetX ? offsetX = e.offsetX : offsetX = e.touches[0].pageX;
		e.offsetY ? offsetY = e.offsetY : offsetX = e.touches[0].pageX;
		x = offsetX / zoomer.offsetWidth * 100;
		y = offsetY / zoomer.offsetHeight * 100;
		zoomer.style.backgroundPosition = x + '% ' + y + '%';
    });
});


function reset_views_size () {
	// TODO: HARD CODE size assignment
	var total_height = $(window).height() - 
		$("header").outerHeight(includeMargin=true)

	if (CURRENT_DISPLAY_VIEWS.indexOf("table") >= 0) {
		if (CURRENT_DISPLAY_VIEWS.indexOf("chart") >= 0) {
			if (CURRENT_DISPLAY_VIEWS.indexOf("image") >= 0) {
				// all three
				$("#table-view").outerHeight(230);
				$("#chart-view").outerHeight(330);
			} else {
				// table + chart
				$("#table-view").outerHeight(230);
				$("#chart-view").outerHeight(
					total_height - 
					$("#table-view").outerHeight(includeMargin=true)
				);
			}
		} else {
			if (CURRENT_DISPLAY_VIEWS.indexOf("image") >= 0) {
				// table + image
				$("#table-view").outerHeight(230);
				$("#chart-view").outerHeight(0);
			} else {
				// table
				$("#table-view").outerHeight(total_height);
				$("#chart-view").outerHeight(0);
			}
		}
	} else {
		if (CURRENT_DISPLAY_VIEWS.indexOf("chart") >= 0) {
			if (CURRENT_DISPLAY_VIEWS.indexOf("image") >= 0) {
				// chart + image
				$("#table-view").outerHeight(0);
				$("#chart-view").outerHeight(total_height * 0.4);
			} else {
				// chart
				$("#table-view").outerHeight(0);
				$("#chart-view").outerHeight(total_height);
			}
		} else {
			if (CURRENT_DISPLAY_VIEWS.indexOf("image") >= 0) {
				// image
				$("#table-view").outerHeight(0);
				$("#chart-view").outerHeight(0);
			} else {
				// no view
				$("#table-view").outerHeight(230);
				$("#chart-view").outerHeight(330);				
			}
		}
	}

	update_image_view_height();
}


function show_view (view_name, skip_reset=false) {
	$("#" + view_name + "-view").css("display", "block");
	$("#" + view_name + "-btn")
		.addClass("view-enabled")
		.removeClass("view-disabled");

	if (CURRENT_DISPLAY_VIEWS.indexOf(view_name) < 0) {
		CURRENT_DISPLAY_VIEWS.push(view_name);
	}

	if (!skip_reset) {
		reset_views_size();
		if (INITIALIZED_VIEWS.indexOf("chart") >= 0) {
			update_chart_view("all", CURRENT_MULTI_SELECTED);
		}
	}

	// if a view is displayed for the first time
	if (INITIALIZED_VIEWS.indexOf(view_name) < 0) {
		if (view_name === "table") {
			initialize_data_table(CURRENT_MULTI_SELECTED);
		} else if (view_name === "chart") {
			initialize_chart_view(CURRENT_MULTI_SELECTED, CURRENT_VIS_TYPE);
		} else if (view_name === "image") {
			initialize_image_view(ORIGINAL_CASE_LIST);
			update_multi_selected_image_view(CURRENT_CASE_LIST);
		} else {
			console.log("[ERROR] Unknown view name for initialization.")
		}
		
		$("#" + view_name + "-btn").removeClass("view-mngmt-btn-hidden");

		INITIALIZED_VIEWS.push(view_name);
	} else {
	}

}


function hide_view (view_name) {
	$("#" + view_name + "-view").css("display", "none");
	$("#" + view_name + "-btn")
		.addClass("view-disabled")
		.removeClass("view-enabled");

	var index = CURRENT_DISPLAY_VIEWS.indexOf(view_name);
	if (index > -1) {
		CURRENT_DISPLAY_VIEWS.splice(index, 1);
	}

	reset_views_size();
	if (INITIALIZED_VIEWS.indexOf("chart") >= 0) {
		update_chart_view("all", CURRENT_MULTI_SELECTED);
	}
}


function init_views () {

	function init_image_format_list () {
		var test_file = ORIGINAL_DATASET[0]["filename"];
		var test_out_dir = ORIGINAL_DATASET[0]["outdir"];

		for (var idx = 0; idx < DEFAULT_IMAGE_EXTENSIONS.length; idx ++) {
			var img = new Image();
			img.typeidx = idx;
			img.onload = function () {
				CHECK_IMAGE_EXTENSIONS[this.typeidx] = true;
			};
			img.onerror = function () {
				SKIP_IMAGE_EXTENSIONS.push(this.typeidx);
				CHECK_IMAGE_EXTENSIONS[this.typeidx] = true;
			};

			var cur_ext = DEFAULT_IMAGE_EXTENSIONS[idx];
			img.src = DATA_PATH + test_file + "/" + test_file + cur_ext;
		}
	}

	// we need to firstly check which variants of the images are presented
	init_image_format_list();

	// since the above check relies on trying to load each image format, which
	// will not pause the thread, we will need to manually set a pause here and
	// only continue to initiate the views after the check loops through all the
	// expected formats
	var image_check_interval = setInterval (function () {
		var check_sum = 0;
		for (var idx = 0; idx < CHECK_IMAGE_EXTENSIONS.length; idx++) {
			check_sum += CHECK_IMAGE_EXTENSIONS[idx];
		}
		if (check_sum == CHECK_IMAGE_EXTENSIONS.length) {
			clearInterval (image_check_interval);

			reset_views_size();
			for (var idx = 0; idx < CURRENT_DISPLAY_VIEWS.length; idx++) {
				show_view(CURRENT_DISPLAY_VIEWS[idx], true);
			}

			// display the view management button group
			$("#view-mngmt-btn-group").css("display", "block");
			d3.select("#page-title")
				.classed("mr-md-auto", false)
				.classed("mr-md-3", true);

			// enable the cohort finder upload button
			$("#cf-upload-button").removeClass("disabled");
			$("#cf-input").prop("disabled", false);

			console.log("[LOG] App initialized.");
			APP_INITIALIZED = true;
		} else {
			console.log("waiting for image type checking ...");
		}
	}, 500);
}


function update_views () {
	if (INITIALIZED_VIEWS.indexOf("chart") >= 0) {
		update_chart_view(CURRENT_VIS_TYPE, CURRENT_MULTI_SELECTED);
	}
	if (INITIALIZED_VIEWS.indexOf("image") >= 0) {
		update_image_view(CURRENT_CASE_LIST);
	}
}

