var enter_detail_mode = function (file_name, istable=false) {

    CURRENT_SELECTED = file_name;

    enter_detail_image_view(CURRENT_SELECTED);
    enter_detail_chart_view(CURRENT_SELECTED);
    select_row_in_table(CURRENT_SELECTED, istable);
}

var update_detail_mode = function (file_name) {

}

var exit_detail_mode = function () {

	CURRENT_SELECTED = "";

	exit_detail_image_view();
	exit_detail_chart_view();
	// select_row_in_table("NO SELECTED");
	TABLE.$(".selected").removeClass("selected");

}