var initialize_image_view = function(case_list){
    var $div = $("#gallery");
    for (dir = 0; dir < case_list.length; dir++) {
        $div.append("<img height='200' src=" + generate_img_src(case_list[dir], CURRENT_IMAGE_TYPE) + " />");
    }
 
    $div.children("img").click(function(){
        src_list = this.src.split('/');
        enter_detail_mode(src_list[src_list.length-2]);
    });
}


var update_image_view = function(case_list){
    $("#gallery > *").remove();
    initialize_image_view(case_list);
}


var enter_detail_image_view = function(dir){
    $("#gallery").css("display", "none");
    $("#img-select-button").css("display", "none");
    $("#detail-gallery > *").remove();
    $("#detail-gallery").css("display", "block");

    var $div = $("#detail-gallery");
    $div.append("<img id='exibit-img' src=" + generate_img_src(dir, CURRENT_IMAGE_TYPE) + " />");
    $("#exibit-img").height($("#image-view").height() - 30);
    $div.append("<div id='detail-list'></div>");

    $div = $("#detail-list");
    $div.width($("#detail-gallery").width() - $("#exibit-img").outerWidth() - 10)
    	.height($("#exibit-img").height());

    for (i = 0; i < DEFAULT_IMAGE_EXTENSIONS.length; i++) {
        $div.append("<img src=" + generate_img_src(dir, i) + " />");
    }
    $("#detail-list > img").height(calculate_height($div));

	$("#detail-list > img").click(function(){
		$("#exibit-img").attr("src", this.src);
	});

    $("#exibit-img").click(function(){
        src_list = this.src.split('/');
    	exit_detail_mode(src_list[src_list.length-2]);
    });
}


var exit_detail_image_view = function(){
	$("#detail-gallery > *").remove().css("display", "none");
	$("#gallery").css("display", "block");
    $("#img-select-button").css("display", "block");
}


var calculate_height = function ($div) {
	var num_thumbs = DEFAULT_IMAGE_EXTENSIONS.length;
	var max_width = Math.floor($div.width() / Math.ceil(num_thumbs / 2)) - 5;
	var cor_height = Math.floor(max_width / $("#exibit-img").width() * $("#exibit-img").height());
	var max_height = Math.floor($div.height() / 2) - 20;

	return Math.min(max_height, cor_height);
}


var generate_img_src = function(file_name, img_type_index) {
	return "'" + DATA_PATH + file_name + "/" + file_name + DEFAULT_IMAGE_EXTENSIONS[img_type_index] + "'"
}


