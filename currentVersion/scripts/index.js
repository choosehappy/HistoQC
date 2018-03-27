/* Index model.
 * Link buttons with actions. Setup the response to the change of window size. 
 * last modified: 03/11/2018 23:22:00
 * update log: init header and comments.
 */ 

$(document).ready(function () {
	console.log("Document ready.")

	$("#upload-input").change(data_loading); // app entrance. func `data_loading` at data_load.js.
	$("#reset-button").click(function(){window.location.reload(); console.log("App reset.")}); // app exit. back to the uploading page, reset to the init structure.

	$(window).resize(function () { // additional listener for size-responsiblility of certain views
		// image view
		$("#image-view").outerHeight(
			$(window).height() - 
			$("header").outerHeight(includeMargin=true) - 
			$("#table-view").outerHeight(includeMargin=true) - 
			$("#chart-view").outerHeight(includeMargin=true)
		);
		// chart view
		update_chart_view(CURRENT_VIS_TYPE, CURRENT_MULTI_SELECTED, [CURRENT_CHART_ATTRIBUTE]);
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
