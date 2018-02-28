$(document).ready(function () {
	console.log("document ready.")
	$("#file-input").change(data_loading);

	$(window).resize(function () {
		$("#image-view").outerHeight($(window).height() - $("header").outerHeight(includeMargin=true) - $("#table-view").outerHeight(includeMargin=true) - $("#chart-view").outerHeight(includeMargin=true));
		update_chart_view(CURRENT_DATASET, "bar_chart", [CURRENT_ATTRIBUTE])
	});

    $(".zoom").on("mousemove", function (e) {
		var zoomer = e.currentTarget;
		e.offsetX ? offsetX = e.offsetX : offsetX = e.touches[0].pageX
		e.offsetY ? offsetY = e.offsetY : offsetX = e.touches[0].pageX
		x = offsetX/zoomer.offsetWidth*100
		y = offsetY/zoomer.offsetHeight*100
		zoomer.style.backgroundPosition = x + '% ' + y + '%';
    });
});
