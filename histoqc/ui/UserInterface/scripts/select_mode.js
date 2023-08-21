function enter_select_mode (file_name, istable=false) {
    CURRENT_SELECTED = file_name;

	if (INITIALIZED_VIEWS.indexOf("image") >= 0) {
	    enter_select_image_view(CURRENT_SELECTED);
	}
	if (INITIALIZED_VIEWS.indexOf("chart") >= 0) {
	    enter_select_chart_view(CURRENT_SELECTED);
	}
	if (INITIALIZED_VIEWS.indexOf("table") >= 0) {
	    select_row_in_table(CURRENT_SELECTED, istable);
	}
}


function update_select_mode (file_name) {
}


function exit_select_mode () {

	CURRENT_SELECTED = "";

	if (INITIALIZED_VIEWS.indexOf("image") >= 0) {
		exit_select_image_view();
	}
	if (INITIALIZED_VIEWS.indexOf("chart") >= 0) {
		exit_select_chart_view();
	}
	if (INITIALIZED_VIEWS.indexOf("table") >= 0) {
		TABLE.rows('.selected').deselect();
	}
}

