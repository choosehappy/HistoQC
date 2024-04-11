/* Image View model.
 * initialize/update the image view, enter/exit selected stage & detailed stage for image view.
 * last modified: 03/17/2018 14:24:00
 * update log: Add id to image blocks. Add multi-select. Re-define the generate_img_block function.
 */

function initializeImageView(dataView) {
	var $div = $("#overview-gallery");
	$div.empty();
	var zoomSlider = d3.select("#zoom-range");
	zoomSlider.property('value', 0.5);

	zoomSlider.on("input", function () {
		const zoomValue = d3.select(this).property('value');
		zoomImages(zoomValue);
	});

	const div = d3.select("#overview-gallery");
	const zoomValue = d3.select("#zoom-range").property('value');

	CURRENT_IMAGE_TYPE = DEFAULT_IMAGE_EXTENSIONS.indexOf(DEFAULT_IMAGE_EXTENSION);
	SKIP_IMAGE_EXTENSIONS.push(CURRENT_IMAGE_TYPE);

	const case_ids = getCaseidsFromDataView(dataView);
	case_ids.forEach(function (case_id) {
		generateImgBlock(div, case_id,
			"overview-image-block", ORIGINAL_CASE_LIST[case_id],
			CURRENT_IMAGE_TYPE, CURRENT_COMPARE_TYPE, ORIGINAL_CASE_LIST[case_id], zoomValue
		);
	});

	setPageSize(dataView, 25);
	initImageSelector(dataView);

}


function updateImageView(dataView) {
	// get signal from abort controller
	abortFetch();
	const signal = ABORT_CONTROLLER.signal;

	updateImageViewHeight();

	var $div = $("#overview-gallery");
	$div.empty();

	div = d3.select("#overview-gallery");
	const zoomValue = d3.select("#zoom-range").property('value');
	const case_ids = getCaseidsFromDataView(dataView);

	case_ids.forEach(function (case_id) {
		const imgBlock = generateImgBlock(div, 
			case_id,
			"overview-image-block", 
			ORIGINAL_CASE_LIST[case_id],
			CURRENT_IMAGE_TYPE, 
			CURRENT_COMPARE_TYPE, 
			ORIGINAL_CASE_LIST[case_id], 
			zoomValue,
			signal
		);

		imgBlock.on("mouseover", function () {

			PARCOORDS.highlight([ORIGINAL_DATASET[ORIGINAL_DATASET.map(function (x) { return x.id; }).indexOf(case_id)]]);
		});

		imgBlock.on("mouseout", function () {
			PARCOORDS.unhighlight([ORIGINAL_DATASET[ORIGINAL_DATASET.map(function (x) { return x.id; }).indexOf(case_id)]]);
		});
	});
}


function updateImageViewHeight() {
	$("#image-view").outerHeight(
		$(window).height() -
		$("header").outerHeight(includeMargin = true) -
		$("#table-view").outerHeight(includeMargin = true) -
		$("#chart-view").outerHeight(includeMargin = true)
	);
}


function enterSelectImageView(dir, img_type) {
	// $("#overview-gallery").css("display", "none");
	// $("#img-select-button").css("display", "none");
	// $("#exit-image-select-view-btn").css("display", "block");
	$('#select-image-modal').modal('show');
	$("#select-candidate-container > *").remove();
	$("#zoomable-svg > *").remove();
	$("#select-image-view").css("display", "flex");

	d3.select("#select-image-container").html("").style("height", "50vh");
	d3.select('#select-image-modal-title').text("Selected Image: " + dir)
	var imgSrc = generateImgSrc(dir, img_type, false);

	var svg = d3.select("#select-image-container").append("svg").attr('width', '100%')
		.attr('height', '100%');

	svg.append('image')
		.attr("id", "zoomable-image")
		.attr('xlink:href', imgSrc)  // Note: For modern browsers and the latest SVG spec, just 'href' might be sufficient
		// .attr('href', imgSrc) // This is more compatible with the latest SVG specifications
		.attr('file_name', dir) // Custom attributes like 'file_name' are not standard SVG attributes. Consider using data attributes or managing this data separately.
		.attr('img_type', img_type) // Similarly, this should be handled as a data attribute if necessary.
		.attr('width', '100%')
		.attr('height', '100%');


	enableZoomInSelectImageView(svg);
	// $div = $("#select-candidate-container");
	const div = d3.select("#select-candidate-container");
	for (i = 0; i < DEFAULT_IMAGE_EXTENSIONS.length; i++) {
		if (SKIP_IMAGE_EXTENSIONS.indexOf(i) >= 0) {
			continue;
		}
		const extension = DEFAULT_IMAGE_EXTENSIONS[i];
		generateImgBlock(div, 
						extension.split(".")[0],
			"candidate-image-block", dir,
			i, -1, extension, 1.0, null
		);
	}

	$("#select-candidate-container > div > img").dblclick(function () {
		enterDetailImageView($(this).attr("file_name"), $(this).attr("img_type"), this.src);
	});

	$("#select-candidate-container > div > img").click(function () {
		$("#exhibit-img").attr("src", this.src)
			.attr("img_type", $(this).attr("img_type"));
	});

	// $("#exhibit-img").click(function () {
	// 	enterDetailImageView($(this).attr("file_name"), $(this).attr("img_type"), this.src);
	// });
}

function enableZoomInSelectImageView(svg) {
	// Create the zoom behavior
	var zoom = d3.zoom()
		.scaleExtent([1, 200]) // Limit zoom scale (min, max)
		.on('zoom', zoomed);

	// Function to handle zoom event, compatible with D3 v5
	function zoomed() {
		// Apply the zoom and pan transformation to the image within the SVG
		svg.select('image').attr('transform', d3.event.transform);
	}

	// Apply the zoom behavior to the SVG container
	svg.call(zoom);

}


function exitSelectImageView() {
	$("#select-candidate-container > *").remove();
	$("#select-image-container > *").remove();
	$("#select-image-view").css("display", "none");
	$("#exit-image-select-view-btn").css("display", "none");

	$("#overview-gallery").css("display", "flex");
	$("#img-select-button").css("display", "");
}


function updateMultiSelectedImageView(file_names) {
	ORIGINAL_CASE_LIST.forEach(function (d) {
		if (file_names.indexOf(d) == -1) {
			$("#" + ORIGINAL_CASE_DICT[d]["dom_id"]).css("display", "none");
		} else {
			$("#" + ORIGINAL_CASE_DICT[d]["dom_id"]).css("display", "flex");
		}
	});
}


function calculateHeight($div) {
	var num_thumbs = DEFAULT_IMAGE_EXTENSIONS.length;
	var max_width = Math.floor($div.width() / Math.ceil(num_thumbs / 2)) - 5;
	var cor_height = Math.floor(max_width / $("#exhibit-img").width() * $("#exhibit-img").height());
	var max_height = Math.floor($div.height() / 2) - 20;

	return Math.min(max_height, cor_height);
}


function generateImgBlock(container, case_id, blk_class, file_name, img_type, compare_type, img_label, zoomValue, abortSignal) {

	const imgBlock = container.append("div")
		.attr("id", case_id)
		.attr("class", blk_class)
		.style("zoom", zoomValue);

	var imgTypeToShow = img_type;
	if (img_type == DEFAULT_IMAGE_EXTENSIONS.indexOf(DEFAULT_IMAGE_EXTENSION)) {	// No need to show the small image.
		imgTypeToShow = DEFAULT_IMAGE_EXTENSIONS.indexOf(DEFAULT_LARGE_IMAGE_EXTENSION)
	}
	imgBlock.append("img")
		.attr("file_name", file_name)
		.attr("img_type", img_type)
		.attr("onerror", "this.style.display='none'")
		.attr("onclick", "enterSelectImageView('" + file_name + "', '" + imgTypeToShow + "')");
		
	const imgSource = generateImgSrc(file_name, img_type, USE_SMALL)
	// Fetch the image
	fetchImage(imgSource, case_id, "first", abortSignal);



	if (compare_type != -1) {	// add on second image if we are in compare mode
		const compareSource = generateImgSrc(file_name, compare_type, USE_SMALL)
		const compareImg = imgBlock.append("img")
			.attr("file_name", file_name)
			.attr("img_type", compare_type)
			.attr("onerror", "this.style.display='none'");

		fetchImage(compareSource, case_id, "last", abortSignal);
	}

	imgBlock.append("div")
		.append("span")
		.text(img_label);

	return imgBlock;
}


function generateImgSrc(file_name, img_type_index, use_small) {
	var image_extension = DEFAULT_IMAGE_EXTENSIONS[img_type_index];
	if (use_small && image_extension != DEFAULT_IMAGE_EXTENSION) {
		return `${window.location.origin}/image/${file_name}/${image_extension}/${SMALL_HEIGHT}`;
	}
	return `${window.location.origin}/image/${file_name}/${image_extension}`;
}


function enterDetailImageView(file_name, img_type, src) {
	$("#detail-image-name > span").text(file_name);
	$("#overlay-image > figure").css("width", "auto")
		.css("background-image", "url(" + src + ")");
	$("#overlay-image > figure > img").attr("src", src);
	$("#overlay-container").css("pointer-events", "all")
		.css("opacity", 1);
	var figure_height = $("#overlay-image > figure").height(),
		figure_width = $("#overlay-image > figure").width(),
		img_height = $("#overlay-image > figure > img").height(),
		img_width = $("#overlay-image > figure > img").width();
	if (figure_height < img_height) {
		$("#overlay-image > figure").width(img_width * (figure_height / img_height));
	}
}

async function fetchImage(source, dom_id, firstlast, abortSignal) {
	fetch(source, { signal: abortSignal })
	.then(response => response.blob())
	.then(blob => {
		const objectURL = URL.createObjectURL(blob);
		
		$(`#${dom_id} img:${firstlast}`).attr('src', objectURL);
	})
	// .catch(error => console.error('Error fetching image:', error));
}


function initImageSelector(dataView) {

	$img_selector = $("#img-select");
	$cmp_selector = $("#comparison-select");

	for (var index = 0; index < DEFAULT_IMAGE_EXTENSIONS.length; index++) {
		var key = DEFAULT_IMAGE_EXTENSIONS[index];

		if (key == DEFAULT_IMAGE_EXTENSION) {
			$img_selector.append(generateOptionHtml(index, key, true));
		} else {
			$img_selector.append(generateOptionHtml(index, key));
		}
		$cmp_selector.append(generateOptionHtml(index, key));
	}
	$cmp_selector.append(generateOptionHtml("-1", "compare ...", true));


	$img_selector.change(function () {
		CURRENT_IMAGE_TYPE = $(this).val();
		updateImageView(dataView);
	});

	$cmp_selector.change(function () {
		CURRENT_COMPARE_TYPE = $(this).val();
		if (CURRENT_COMPARE_TYPE != -1) {
			$("#comparison-select > option").last().text("none");
		} else {
			$("#comparison-select > option").last().text("compare ...");
		}
		updateImageView(dataView);
	});

	$("#exit-image-select-view-btn").click(function () {
		exit_select_mode();
	});

	$("#overlay-image > figure > img").click(function () {
		$("#overlay-container").css("pointer-events", "none")
			.css("opacity", 0);
	});


	function generateOptionHtml(value, key, selected = false) {
		if (selected) {
			return "<option value='" + value + "' selected>" + key + "</option>";
		} else {
			return "<option value='" + value + "'>" + key + "</option>";
		}
	}
}

function getCaseidsFromDataView(dataView) {
	const paging_info = dataView.getPagingInfo();
	const page_end = Math.min(dataView.getLength(), paging_info.pageSize);

	var caseids = [];
	for (var i = 0; i < page_end; i++) {
		caseids.push(dataView.getItem(i)["id"]);
	}

	return caseids;
}

function setPageSize(dataView, n) {
	dataView.setRefreshHints({
		isFilterUnchanged: true
	});
	dataView.setPagingOptions({ pageSize: n });
}

function zoomImages(zoomValue) {
	d3.selectAll(".overview-image-block").style("zoom", zoomValue);
}