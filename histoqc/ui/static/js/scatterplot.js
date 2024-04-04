function renderScatterPlot(data) {
    SCATTER_PLOT["state"] = {}
    const state = SCATTER_PLOT.state;

    const scatterParent = d3.select("#scatter-parent").html("");

    renderBatchEffectInfoButton("#scatter-card-header");
    appendButtonGroupToScatterCardHeader();
    $('#scatter-mode-selector input[type=radio]').change(function () {
        updateRadio("toggle");
        handleModeChange();
    });



    // constants
    var subsetSize = 1000;
    var zoomEndDelay = 0;

    // timeout function
    var zoomEndTimeout;

    // define all size variables
    var fullWidth = parseFloat(d3.select("#scatter-card").style("width"));
    var fullHeight = parseFloat(d3.select("#scatter-card").style("height"));
    var margin = { top: 0, right: 50, bottom: 80, left: 20 };
    var width = fullWidth - margin.left - margin.right;
    var height = fullHeight - margin.top - margin.bottom;

    // produce array of N false values
    var numberPoints = data.length;

    var polygon = [];
    var scaled_polygon1 = [];
    var selected_indices = [];

    // create a quadtree for fast hit detection
    // var quadTree = d3.quadtree(data);

    // d3 only added randomInt in v6. However, we are using v5 https://stackoverflow.com/questions/61017839/d3-randomint-is-not-a-function
    d3.randomInt = d3.randomInt || (function sourceRandomInt(source) {
        function randomInt(min, max) {
            if (arguments.length < 2) max = min, min = 0;
            min = Math.floor(min);
            max = Math.floor(max) - min;
            return function () {
                return Math.floor(source() * max + min);
            };
        }

        randomInt.source = sourceRandomInt;

        return randomInt;
    })(Math.random);

    // selected subsetsize random numbers -- this is the subset of points
    // drawn during 'zoom' events
    var randomIndex = [];
    for (var i = 0; i < subsetSize; i++) {
        randomIndex.push(d3.randomInt(0, numberPoints)());
    }

    // ----------------- DEFINE DOM ELEMENTS -----------------
    var lassoCanvas = scatterParent.append("canvas")
        .html("")
        .attr("id", "lasso-canvas")
        .attr("class", "plot")
        .attr("width", width - 1)
        .attr("height", height - 1)
        .style("transform", "translate(" + (margin.left + 1) +
            "px" + "," + (margin.top + 1) + "px" + ")");

    var svg = scatterParent.append("svg")
        .html("")
        .attr("id", "axis-svg")
        .attr("class", "plot")
        .attr("width", fullWidth)
        .attr("height", fullHeight)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," +
            margin.top + ")");

    var canvas = scatterParent.append("canvas")
        .html("")
        .attr("id", "plot-canvas")
        .attr("class", "plot")
        .attr("width", width - 1)
        .attr("height", height - 1)
        .style("transform", "translate(" + (margin.left + 1) +
            "px" + "," + (margin.top + 1) + "px" + ")");

    var highlightedCanvas = scatterParent.append("canvas")
        .html("")
        .attr("id", "highlighted-canvas")
        .attr("class", "plot")
        .attr("width", width - 1)
        .attr("height", height - 1)
        .style("transform", "translate(" + (margin.left + 1) +
            "px" + "," + (margin.top + 1) + "px" + ")");


    // ----------------- DEFINE SCALES -----------------
    var xRange = d3.extent(data, function (d) { return d.x });
    var yRange = d3.extent(data, function (d) { return d.y });

    SCATTER_PLOT.state["xScale"] = d3.scaleLinear()
        .domain([xRange[0] - 5, xRange[1] + 5])
        .range([0, width]);

    SCATTER_PLOT.state["yScale"] = d3.scaleLinear()
        .domain([yRange[0] - 5, yRange[1] + 5])
        .range([height, 0]);

    SCATTER_PLOT.state["newX"] = d3.scaleLinear()
        .domain([xRange[0] - 5, xRange[1] + 5])
        .range([0, width]);

    SCATTER_PLOT.state["newY"] = d3.scaleLinear()
        .domain([yRange[0] - 5, yRange[1] + 5])
        .range([height, 0]);


    var xAxis = d3.axisBottom(state.xScale).scale(state.xScale)
    var yAxis = d3.axisLeft(state.yScale).scale(state.yScale)


    // create zoom behaviour
    var zoomBehaviour = d3.zoom()
        .scaleExtent([1, 1000])
        .on("start", onZoomStart)
        .on("zoom", onZoom)
        .on("end", onZoomEnd);

    // append x-axis, y-axis
    var xAxisSvg = svg.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0,' + height + ')')
        .call(xAxis);

    var yAxisSvg = svg.append('g')
        .attr('class', 'y axis')
        .call(yAxis);

    // ----------------- DEFINE CONTEXTS -----------------
    var lassoContext = lassoCanvas.node().getContext('2d'), path = d3.geoPath().context(lassoContext);
    var highlightedContext = highlightedCanvas.node().getContext('2d');


    draw(data, null, state.xScale, state.yScale, [], canvas);

    function onZoomStart() {
        // clear highlighted points
        clearHighlightedPoints(highlightedCanvas);
    }


    function onZoom() {
        clearTimeout(zoomEndTimeout);
        console.log("polygon: " + polygon[0])
        scaled_polygon1 = polygon.map(p => [state.xScale.invert(p[0]), state.yScale.invert(p[1])]); // scale polygon to data space
        console.log("scaled_polygon1 before rescale: " + scaled_polygon1[0])
        SCATTER_PLOT.state.newX = d3.event.transform.rescaleX(SCATTER_PLOT.state.xScale);
        SCATTER_PLOT.state.newY = d3.event.transform.rescaleY(SCATTER_PLOT.state.yScale);
        scaled_polygon1 = scaled_polygon1.map(p => [state.newX(p[0]), state.newY(p[1])]);   // scale polygon to canvas space
        console.log("scaled_polygon1 after rescale: " + scaled_polygon1[0])

        xAxisSvg.call(xAxis.scale(SCATTER_PLOT.state.newX));
        yAxisSvg.call(yAxis.scale(SCATTER_PLOT.state.newY));

        const selectedIndices = draw(data, randomIndex, SCATTER_PLOT.state.newX, SCATTER_PLOT.state.newY, [], canvas);


    }

    function onZoomEnd() {
        // when zooming is stopped, create a delay before
        // redrawing the full plot
        SCATTER_PLOT.state.newX = d3.event.transform.rescaleX(state.xScale);
        SCATTER_PLOT.state.newY = d3.event.transform.rescaleY(state.yScale);

        zoomEndTimeout = setTimeout(function () {
            const selectedIndices = draw(data, null, SCATTER_PLOT.state.newX, SCATTER_PLOT.state.newY, [], canvas);
            if (BRUSHED_IDS && BRUSHED_IDS.length < data.length) {
                drawHighlightedPoints(data, BRUSHED_IDS, SCATTER_PLOT.state.newX, SCATTER_PLOT.state.newY, highlightedCanvas);
            }
        }, zoomEndDelay);
    }

    lassoCanvas.call(lasso().on("start lasso end", drawLasso))
    canvas.call(zoomBehaviour);
    highlightedCanvas.call(zoomBehaviour);


    // the draw function draws the full dataset if no index
    // parameter supplied, otherwise it draws a subset according
    // to the indices in the index parameter
    function draw(pointArr, index, xScale, yScale, polygon, canvas) {
        /**
         * @param {Array} pointArr - array of points to draw
         * @param {Array} index - array of indices to draw
         * @param {Object} xScale - d3 x scale
         * @param {Object} yScale - d3 y scale
         * @param {Array} polygon - array of points that define the lasso
         * @param {Object} canvas - canvas
         */
        var pointRadius = 2;
        var scaled_polygon;

        if (polygon.length > 0) {
            scaled_polygon = polygon.map(p => [xScale.invert(p[0]), yScale.invert(p[1])]);
        } else {
            scaled_polygon = polygon;
        }

        const context = canvas.node().getContext('2d');
        context.clearRect(0, 0, fullWidth, fullHeight);
        context.fillStyle = 'steelblue';
        context.lineWidth = 1;
        context.strokeStyle = 'white';

        // if an index parameter is supplied, we only want to draw points
        // with indices in that array
        if (index) {    // if zooming/panning
            index.forEach(function (i) {
                var point = pointArr[i];
                drawPoint(point, pointRadius, xScale, yScale, context);
            });
        }
        // draw the full dataset otherwise
        else {
            selected_indices = [];
            pointArr.forEach(function (point) {
                if (scaled_polygon.length > 0 && d3.polygonContains(scaled_polygon, [point.x, point.y])) {     // if the point is within the lasso
                    selected_indices.push(point.i);
                }
                drawPoint(point, pointRadius, xScale, yScale, context);
            });
            //TODO update dataview with selected indices
            // Filter the dataView items by the selected indices
        }

        return selected_indices;
    }






    function trackMouse(e, { start, move, out, end }) {
        const tracker = {},
            target = e.target;
        tracker.point = d3.mouse(target); // Use d3.mouse with the target element

        // Listen for mouse events on the target
        d3.select(target)
            .on(`mouseup`, function () { // Use function() to access this
                tracker.sourceEvent = d3.event; // Use d3.event to access the event
                tracker.point = d3.mouse(this); // Use this to refer to the target element
                d3.select(this).on(`mousemove mouseout`, null); // Remove event listeners
                end && end(tracker);
            })
            .on(`mousemove`, function () { // Use function() to access this
                tracker.sourceEvent = d3.event; // Use d3.event to access the event
                tracker.prev = tracker.point;
                tracker.point = d3.mouse(this); // Use this to refer to the target element
                move && move(tracker);
            })
            .on(`mouseout`, function () { // Use function() to access this
                tracker.sourceEvent = d3.event; // Use d3.event to access the event
                tracker.point = null;
                out && out(tracker);
            });

        start && start(tracker);
    }


    function lasso() {
        const dispatch = d3.dispatch("start", "lasso", "end");
        const lasso = function (selection) {
            const node = selection.node();

            selection
                // .on("touchmove", e => e.preventDefault()) // prevent scrolling
                .on("mousedown", function () {

                    trackMouse(d3.event, {
                        start: p => {
                            polygon.length = 0;
                            dispatch.call("start", node, polygon);
                            selected_indices = [];
                        },
                        move: p => {
                            polygon.push(p.point);
                            dispatch.call("lasso", node, polygon);
                        },
                        end: p => {
                            dispatch.call("end", node, polygon);
                            // draw plot with selected points
                            const selectedIndices = draw(data, null, state.newX, state.newY, polygon, canvas);

                            // update parcoords and dataview with filtered items
                            const filteredItems = ORIGINAL_DATASET.filter(item => selectedIndices.includes(item.id))

                            if (filteredItems.length > 0) {
                                canvas.style("opacity", 0.2)
                                drawHighlightedPoints(data, selectedIndices, state.newX, state.newY, highlightedCanvas);

                                updateBrushedParcoords(filteredItems)
                                gridUpdate(filteredItems)
                            } else {
                                canvas.style("opacity", 1)
                                clearHighlightedPoints(highlightedCanvas);
                                clearBrushedParcoords();
                                gridUpdate(ORIGINAL_DATASET);
                            }

                        }
                    });
                });
        };
        lasso.on = function (type, _) {
            return _ ? (dispatch.on(...arguments), lasso) : dispatch.on(...arguments);
        };

        return lasso;
    }

    function drawLasso(polygon) {
        console.log("drawLasso")
        lassoContext.clearRect(0, 0, width, height);
        lassoContext.beginPath();
        path({
            type: "LineString",
            coordinates: polygon
        });
        lassoContext.fillStyle = "rgba(0,0,0,.1)";
        lassoContext.fill("evenodd");
        lassoContext.lineWidth = 1.5;
        lassoContext.stroke();

        lassoContext.canvas.value = { polygon, }; //selected };
        lassoContext.canvas.dispatchEvent(new CustomEvent('input'));
    }

    function appendButtonGroupToScatterCardHeader() {
        // Select the element with the ID 'scatter-card-header'
        const cardHeader = d3.select('#scatter-card-header');

        // Display the 'scatter-card-header' since it's hidden by default
        cardHeader.style('display', null);

        // Create the button group container within the 'scatter-card-header'
        const buttonGroup = cardHeader.append('span')
            .attr('class', 'btn-group')
            .attr('id', 'scatter-mode-selector')
            .attr('role', 'group')
            .attr('aria-label', 'Basic radio toggle button group');

        // Append the first radio button (Lasso)
        buttonGroup.append('label')
            .text('Mode:')

        const span1 = buttonGroup.append('span')
        const span2 = buttonGroup.append('span')


        span1.append('input')
            .attr('type', 'radio')
            .attr('class', 'btn-check')
            .attr('name', 'btnradio')
            .attr('id', 'btnradio1')
            .attr('autocomplete', 'off')
            .attr('value', 'lasso')
            .property('checked', true);

        span1.append('label')
            .attr('class', 'btn-check-primary')
            .attr('for', 'btnradio1')
            .text('Lasso');

        // Append the second radio button (Zoom/Pan)
        span2.append('input')
            .attr('type', 'radio')
            .attr('class', 'btn-check')
            .attr('name', 'btnradio')
            .attr('id', 'btnradio2')
            .attr('autocomplete', 'off')
            .attr('value', 'zoomPan')

        span2.append('label')
            .attr('class', 'btn-check-primary')
            .attr('for', 'btnradio2')
            .text('Zoom/Pan');
    }

    function renderBatchEffectInfoButton(parentid) {
        const cardHeader = d3.select(parentid);
        const infoButton = cardHeader.append('span')
            .append('button')
            .attr('id', 'be-scores-info')
            .attr('class', 'btn btn-primary')
            .attr('data-toggle', 'popover')
            .text('BE Info')
    }


    function handleModeChange() {
        var mode = $('#scatter-mode-selector input[type=radio]:checked').val();
        const lassoCanvas = d3.select("#lasso-canvas");
        const highlightedCanvas = d3.select("#highlighted-canvas");
        if (mode === "lasso") {
            drawLasso(scaled_polygon1);
            lassoCanvas.style("display", "block");
            highlightedCanvas.style("display", "block");

        } else {
            lassoCanvas.style("display", "none");
            // highlightedCanvas.style("display", "none");
            // clearHighlightedPoints(highlightedCanvas);
            // clearBrushedParcoords();
            // gridUpdate(ORIGINAL_DATASET);
            polygon = [];
        }
    }



}

function drawPoint(point, r, xScale, yScale, context) {
    var cx = xScale(point.x);
    var cy = yScale(point.y);

    context.fillStyle = point.color;

    // NOTE; each point needs to be drawn as its own path
    // as every point needs its own stroke. you can get an insane
    // speed up if the path is closed after all the points have been drawn
    // and don't mind points not having a stroke
    context.beginPath();
    context.arc(cx, cy, r, 0, 2 * Math.PI);
    context.closePath();
    context.fill();
    context.stroke();
}


function drawHighlightedPoints(pointArr, indices, xScale, yScale, canvas) {
    const context = canvas.node().getContext('2d');
    context.clearRect(0, 0, canvas.attr("width"), canvas.attr("height"));
    context.fillStyle = 'steelblue';
    context.lineWidth = 1;
    context.strokeStyle = 'white';
    var pointRadius = 2;

    indices.forEach(function (i) {
        var point = pointArr[i];
        drawPoint(point, pointRadius, xScale, yScale, context);
    });
}

function clearHighlightedPoints(canvas) {
    const context = canvas.node().getContext('2d');
    context.clearRect(0, 0, canvas.attr("width"), canvas.attr("height"));
}

function initScatterPlotMessage(message) {
    d3.select("#scatter-card-header").html("")
    const messageDiv = d3.select("#scatter-parent").html("")

    messageDiv
        .append("div")
        .attr("id", "message-div")

    if (message) {
        appendScatterPlotMessage(message);
    }
}

function updateRadio(operation) {
    const $selector = $('#scatter-mode-selector input[type=radio]');
    if (operation == "toggle") {
        const value = $selector.val()
        if (value == "lasso") {
            $selector.val("zoomPan");
        } else {
            $selector.val("lasso");
        }
    } else if (operation == "lasso" || operation == "zoomPan") {
        $selector.val(operation).prop('checked', true).trigger("change");
    }
}

function appendScatterPlotMessage(message) {
    const messageDiv = d3.select("#message-div")
    const text = messageDiv.html();
    messageDiv.html(text + message + "<br>");
}