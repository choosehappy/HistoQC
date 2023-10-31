$(document).ready(function () {
    console.log("[LOG] Document ready.")
    // console.log($("#brushing").attr("fn"))


    $("#upload-input").change(renderScatterPlot);

});

function renderScatterPlot() {
    // constants
    var numberPoints = 200000;

    // will want to apply a more nuanced function here. When numberPoints is small, subsetSize should be 100%.
    // when numberPoints is large, subsetSize should approach 0%
    var subsetSize = 1000; 
    var pointRadius = 2;
    var zoomEndDelay = 0;

    // timeout function
    var zoomEndTimeout;

    // save the index of the currently selected point
    var selectedPoint;

    // define all size variables
    var fullWidth = 500;
    var fullHeight = 500;
    var margin = { top: 10, right: 10, bottom: 30, left: 30 };
    var width = fullWidth - margin.left - margin.right;
    var height = fullHeight - margin.top - margin.bottom;

    // generate random dataset
    var randomX = d3.randomNormal(0, 30);
    var randomY = d3.randomNormal(0, 30);

    var data = d3.range(numberPoints).map(function (d, i) {
        return {
            x: randomX(),
            y: randomY(),
            i: i, // save the index of the point as a property, this is useful
            selected: false
        };
    });

    // create a quadtree for fast hit detection
    var quadTree = d3.quadtree(data);

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

    // selected 250 random numbers -- this is the subset of points
    // drawn during 'zoom' events
    // var randomIndex = _.sampleSize(_.range(numberPoints), subsetSize);
    //call randomInt n times
    var randomIndex = [];
    for (var i = 0; i < subsetSize; i++) {
        randomIndex.push(d3.randomInt(0, numberPoints)());
    }

    // the canvas is shifted by 1px to prevent any artefacts
    // when the svg axis and the canvas overlap
    var canvas = d3.select("#plot-canvas")
        .attr("width", width - 1)
        .attr("height", height - 1)
        .style("transform", "translate(" + (margin.left + 1) +
            "px" + "," + (margin.top + 1) + "px" + ")");


    var svg = d3.select("#axis-svg")
        .attr("width", fullWidth)
        .attr("height", fullHeight)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," +
            margin.top + ")");

    // ranges, scales, axis, objects
    var xRange = d3.extent(data, function (d) { return d.x });
    var yRange = d3.extent(data, function (d) { return d.y });

    var xScale = d3.scaleLinear()
        .domain([xRange[0] - 5, xRange[1] + 5])
        .range([0, width]);

    var yScale = d3.scaleLinear()
        .domain([yRange[0] - 5, yRange[1] + 5])
        .range([height, 0]);

    var xAxis = d3.axisBottom(xScale).scale(xScale)
    var yAxis = d3.axisLeft(yScale).scale(yScale)


    // create zoom behaviour
    var zoomBehaviour = d3.zoom()
        .scaleExtent([1, 1000])
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

    // on onclick handler
    canvas.on("click", onClick);


    canvas.call(zoomBehaviour);
    // get the canvas drawing context
    var context = canvas.node().getContext('2d');

    draw(null, xScale, yScale);

    function onClick() {
        var mouse = d3.mouse(this);

        // map the clicked point to the data space
        var xClicked = xScale.invert(mouse[0]);
        var yClicked = yScale.invert(mouse[1]);

        // find the closest point in the dataset to the clicked point
        var closest = quadTree.find(xClicked, yClicked);

        // map the co-ordinates of the closest point to the canvas space
        var dX = xScale(closest.x);
        var dY = yScale(closest.y);

        // register the click if the clicked point is in the radius of the point
        var distance = euclideanDistance(mouse[0], mouse[1], dX, dY);

        if (distance < pointRadius) {
            if (selectedPoint) {
                data[selectedPoint].selected = false;
            }
            closest.selected = true;
            selectedPoint = closest.i;

            // redraw the points
            draw();
        }
    }

    function onZoom() {
        clearTimeout(zoomEndTimeout);

        var newX = d3.event.transform.rescaleX(xScale);
        var newY = d3.event.transform.rescaleY(yScale);

        xAxisSvg.call(xAxis.scale(newX));
        yAxisSvg.call(yAxis.scale(newY));
        draw(randomIndex, newX, newY);
    }

    function onZoomEnd() {
        // when zooming is stopped, create a delay before
        // redrawing the full plot
        var newX = d3.event.transform.rescaleX(xScale);
        var newY = d3.event.transform.rescaleY(yScale);

        zoomEndTimeout = setTimeout(function () {
            draw(null, newX, newY);
        }, zoomEndDelay);
    }

    // the draw function draws the full dataset if no index
    // parameter supplied, otherwise it draws a subset according
    // to the indices in the index parameter
    function draw(index, xScale, yScale) {
        var active;

        context.clearRect(0, 0, fullWidth, fullHeight);
        context.fillStyle = 'steelblue';
        context.lineWidth = 1;
        context.strokeStyle = 'white';

        // if an index parameter is supplied, we only want to draw points
        // with indices in that array
        if (index) {
            index.forEach(function (i) {
                var point = data[i];
                if (!point.selected) {
                    drawPoint(point, pointRadius, xScale, yScale);
                }
                else {
                    active = point;
                }
            });
        }
        // draw the full dataset otherwise
        else {
            data.forEach(function (point) {
                if (!point.selected) {
                    drawPoint(point, pointRadius, xScale, yScale);
                }
                else {
                    active = point;
                }
            });
        }

        // ensure that the actively selected point is drawn last
        // so it appears at the top of the draw order
        if (active) {
            context.fillStyle = 'red';
            drawPoint(active, pointRadius, xScale, yScale);
            context.fillStyle = 'steelblue';
        }
    }

    function drawPoint(point, r, xScale, yScale) {
        var cx = xScale(point.x);
        var cy = yScale(point.y);

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

    function euclideanDistance(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    }
}