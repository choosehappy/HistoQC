var initialize_image_view = function(case_list){
    $("#overview-gallery > *").remove();
    var $div = $("#overview-gallery");
    for (dir = 0; dir < case_list.length; dir++) {
        $div.append(generate_img_block("overview-image-block", generate_img_src(case_list[dir], CURRENT_IMAGE_TYPE), case_list[dir]));
    }
 
    $div.children("div").children("img").click(function(){
        src_list = this.src.split('/');
        enter_select_mode(src_list[src_list.length-2]);
    });
}


var update_image_view = function(case_list){
    $("#overview-gallery > *").remove();
    initialize_image_view(case_list);
}


var enter_select_image_view = function(dir){
    $("#overview-gallery").css("display", "none");
    $("#img-select-button").css("display", "none");
    $("#exit-image-select-view-btn").css("display", "block");

    $("#select-candidate-container > *").remove();
    $("#select-image-container > *").remove();
    $("#select-image-view").css("display", "flex");

    var $div = $("#select-image-container");
    $div.append("<img id='exibit-img' src=" + generate_img_src(dir, CURRENT_IMAGE_TYPE) + " />");
    $div.append("<div><span>" + dir + "</span></div>");

    $div = $("#select-candidate-container");
    for (i = 0; i < DEFAULT_IMAGE_EXTENSIONS.length; i++) {
        $div.append(generate_img_block("candidate-image-block", generate_img_src(dir, i), DEFAULT_IMAGE_EXTENSIONS[i]));
    }

	$("#select-candidate-container > div > img").click(function(){
		$("#exibit-img").attr("src", this.src);
	});

    $("#exibit-img").click(function(){
        enter_detail_image_view(this.src);
    });
}


var exit_select_image_view = function(){
    $("#select-candidate-container > *").remove();
    $("#select-image-container > *").remove();
    $("#select-image-view").css("display", "none");
    $("#exit-image-select-view-btn").css("display", "none");

	$("#overview-gallery").css("display", "flex");
    $("#img-select-button").css("display", "block");
}


var calculate_height = function ($div) {
	var num_thumbs = DEFAULT_IMAGE_EXTENSIONS.length;
	var max_width = Math.floor($div.width() / Math.ceil(num_thumbs / 2)) - 5;
	var cor_height = Math.floor(max_width / $("#exibit-img").width() * $("#exibit-img").height());
	var max_height = Math.floor($div.height() / 2) - 20;

	return Math.min(max_height, cor_height);
}


var generate_img_block = function(blk_class, file_path, file_name) {
    return  " \
            <div class='" + blk_class + "'> \
                <img src=" + file_path + " /> \
                <div><span>" + file_name + "</span></div> \
            </div> \
            ";
}


var generate_img_src = function(file_name, img_type_index) {
	return "'" + DATA_PATH + file_name + "/" + file_name + DEFAULT_IMAGE_EXTENSIONS[img_type_index] + "'"
}


var enter_detail_image_view = function(src) {
    src_list = src.split('/');
    $("#detail-image-name > span").text(src_list[src_list.length-2]);
    $("#overlay-image > img").attr("src", src);
    $("#overlay-container").css("pointer-events", "all")
        .css("opacity", 1);

}
