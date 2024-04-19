function initializeImageView(dataView) {
	var $div = $("#overview-gallery");
	$div.empty();
	var zoomSlider = d3.select("#zoom-range");
	zoomSlider.property('value', 0.5);

	zoomSlider.on("input", function () {
		const zoomValue = d3.select(this).property('value');
		d3.selectAll(".overview-image-block").style("zoom", zoomValue);
	});

	const div = d3.select("#overview-gallery");
	const zoomValue = d3.select("#zoom-range").property('value');

	CURRENT_IMAGE_TYPE = DEFAULT_IMAGE_EXTENSIONS.indexOf(DEFAULT_IMAGE_EXTENSION);

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

function enterSelectImageView(dir, img_type) {
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
		.attr('href', imgSrc) // This is more compatible with the latest SVG specifications
		.attr('file_name', dir) 
		.attr('img_type', img_type) 
		.attr('width', '100%')
		.attr('height', '100%');


	enableZoomInSelectImageView(svg);

	const div = d3.select("#select-candidate-container");
	for (i = 0; i < DEFAULT_IMAGE_EXTENSIONS.length; i++) {
		const extension = DEFAULT_IMAGE_EXTENSIONS[i];

		// Exclude the focused image and the thumbnail image from the candidate list.
		if (extension == DEFAULT_IMAGE_EXTENSIONS[img_type] || extension == DEFAULT_IMAGE_EXTENSION) {
			continue;
		}
		
		generateImgBlock(div, 
						extension.split(".")[0],
			"candidate-image-block", dir,
			i, -1, extension, 1.0, null
		);
	}

	$("#select-candidate-container > div > img").click(function () {
		$("#exhibit-img").attr("src", this.src)
			.attr("img_type", $(this).attr("img_type"));
	});

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
	if (use_small) {
		return `${window.location.origin}/image/${file_name}/${image_extension}/${SMALL_HEIGHT}`;
	}
	return `${window.location.origin}/image/${file_name}/${image_extension}`;
}

function fetchImage(source, dom_id, firstlast, abortSignal) {
	fetch(source, { signal: abortSignal })
	.then(response => response.blob())
	.then(blob => {
		const objectURL = URL.createObjectURL(blob);
		
		$(`#${dom_id} img:${firstlast}`).attr('src', objectURL);
	})
	.catch(error => console.error('Error fetching image:', error));
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

function toggleImageDownsample() {
	console.log("checked")
	const checkbox = $("#downsample-checkbox");
	USE_SMALL = checkbox.is(":checked");
}