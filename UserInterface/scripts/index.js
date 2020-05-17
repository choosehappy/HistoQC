/* Index model.
 * Link buttons with actions. Setup the response to the change of window size. 
 * last modified: 03/11/2018 23:22:00
 * update log: init header and comments.
 */ 

$(document).ready(function () {
	console.log("[LOG] Document ready.")

	$("#upload-input").change(data_loading); // app entrance. func `data_loading` at data_load.js.
	$("#reset-button").click(function(){window.location.reload(); console.log("App reset.")}); // app exit. back to the uploading page, reset to the init structure.
	$(".view-mngmt-btn").click(function(){
		if ($(this).hasClass("view-enabled")) {
			hide_view($(this).attr("value"));
		} else {
			show_view($(this).attr("value"));
		}
	})

	$(window).resize(function () { // additional listener for size-responsiblility of certain views
		update_image_view_height();
		update_chart_view("both", CURRENT_MULTI_SELECTED);
	});

	cols = 50;
	rows = 100;
	front = new Array(cols)// .fill(new Array(rows));
	// Loop through Initial array to randomly place cells
	for(var x = 0; x < cols; x++){
		front[x] = [];  // ***** Added this line *****
		for(var y = 0; y < rows; y++){
			front[x][y] = Math.floor(Math.random()*5);
		}
	}
	console.table(front) ;
	var umap = new UMAP();
	var embedding = umap.fit(front);
	console.log(embedding);

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
	if (!APP_INITIALIZED) {
		return;
	}

	console.log(CURRENT_DISPLAY_VIEWS);
	// reset background color
	index = -1;
	for (var i = 0; i < ORIGINAL_VIEWS.length; i++) {
		var view_name = ORIGINAL_VIEWS[i];
		if (CURRENT_DISPLAY_VIEWS.indexOf(view_name) >= 0) {
			index++;
			if (index % 2 == 0) {
				$("#" + view_name + "-view").addClass("bg-light");
			} else {
				$("#" + view_name + "-view").removeClass("bg-light");
			}
		}
	}
	// TODO: re-write this!!!!!!
	// HARD CODE size assignment
	var total_height = $(window).height() - $("header").outerHeight(includeMargin=true)

	if (CURRENT_DISPLAY_VIEWS.indexOf("table") >= 0) {
		if (CURRENT_DISPLAY_VIEWS.indexOf("chart") >= 0) {
			if (CURRENT_DISPLAY_VIEWS.indexOf("image") >= 0) {
				// all three
				$("#table-view").outerHeight(230);
				$("#chart-view").outerHeight(330);
			} else {
				// table + chart
				$("#table-view").outerHeight(230);
				$("#chart-view").outerHeight(total_height - $("#table-view").outerHeight(includeMargin=true));
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
			}
		}
	}

	update_chart_view("both", CURRENT_MULTI_SELECTED);
	update_image_view_height();
}


function show_view (view_name) {
	$("#" + view_name + "-view").css("display", "block");
	$("#" + view_name + "-btn")
		.addClass("view-enabled")
		.removeClass("view-disabled");
	var index = CURRENT_DISPLAY_VIEWS.indexOf(view_name);
	if (index < 0) {
		CURRENT_DISPLAY_VIEWS.push(view_name);
	}
	reset_views_size();
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
}