function enter_select_mode (file_name, istable=false) {
    CURRENT_SELECTED = file_name;

    enter_select_image_view(CURRENT_SELECTED);
    enter_select_chart_view(CURRENT_SELECTED);
    select_row_in_table(CURRENT_SELECTED, istable);
}


function update_select_mode (file_name) {
}


function exit_select_mode () {

	CURRENT_SELECTED = "";

	exit_select_image_view();
	exit_select_chart_view();
	TABLE.rows('.selected').deselect();
}


function update_views () {
	update_chart_view(CURRENT_VIS_TYPE, CURRENT_MULTI_SELECTED);
	update_image_view(CURRENT_CASE_LIST);
}



