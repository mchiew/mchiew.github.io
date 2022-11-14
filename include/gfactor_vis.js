    // 2D Visualisation of Noise Amplfication in Linear Systems
    // Applied to SENSE Parallel Imaging
    // Written with d3.js
    // Mark Chiew (mark.chiew@ndcn.ox.ac.uk)
    // v1.0 - 22/11/2019

    // Helper Functions
    function sos(x){
        return x[0]*x[0] + x[1]*x[1];
    }
    function inner(x,y){
        return x[0]*y[0] + x[1]*y[1];
    }
    function getProj(x,y){
        return [x[0]*inner(x,y), 
                x[1]*inner(x,y)];
    }
    function normalise(x){
        return [x[0]/Math.sqrt(sos(x)),x[1]/Math.sqrt(sos(x))];
    }
    function margin_data(u,v,s) {
        var x = normalise(coils.data()[0]),
            y = normalise(coils.data()[1]);
        var n_u = coils.data()[0].map(x => 2.5*s*x),
            n_v = coils.data()[1].map(x => 2.5*s*x);
        return [[[-2*x[1]+u[0]-n_u[0],2*x[1]+u[0]-n_u[0],2*x[0]+u[1]-n_u[1],-2*x[0]+u[1]-n_u[1]],
                 [-2*x[1]+u[0]+n_u[0],2*x[1]+u[0]+n_u[0],2*x[0]+u[1]+n_u[1],-2*x[0]+u[1]+n_u[1]]],
                [[-2*y[1]+v[0]-n_v[0],2*y[1]+v[0]-n_v[0],2*y[0]+v[1]-n_v[1],-2*y[0]+v[1]-n_v[1]],
                 [-2*y[1]+v[0]+n_v[0],2*y[1]+v[0]+n_v[0],2*y[0]+v[1]+n_v[1],-2*y[0]+v[1]+n_v[1]]]];
    }
    function randn(N) { 
        var x = [];
        var a,b;
        while (x.length < N){
            a = Math.random();
            b = Math.random();
            x.push([Math.sqrt(-2*Math.log(a))*Math.cos(2*Math.PI*b),
                    Math.sqrt(-2*Math.log(a))*Math.sin(2*Math.PI*b)]);
        }
        return x;
    }
    function inv(q) {
        var d = 1/(q[0][0]*q[1][1] - q[0][1]*q[1][0]);
        return [[q[1][1]*d, -1*q[0][1]*d],[-1*q[1][0]*d, q[0][0]*d]];
    }
    function mean(x){
        return x.reduce((a,b) => a+b)/x.length;
    }
    function variance(x) {
        var m = mean(x);
        return x.map(x => (x-m)*(x-m)).reduce((a,b) => a+b)/(x.length-1);
    }
    function mtimes(A,x) {
        return x.map(x => [A[0][0]*x[0]+A[0][1]*x[1], A[1][0]*x[0]+A[1][1]*x[1]]);
    }
    function minmax(x,r) { // Return value within range r
        return d3.max([r[0],d3.min([r[1],x])]);
    }
    function chol(A) { // Return cholesky decomposition of A
        return [[Math.sqrt(A[0][0]), 0], 
                [A[0][1]/Math.sqrt(A[0][0]), Math.sqrt(1-A[0][1]*A[0][1]/A[0][0])]];
    }
    function covariance() {
        var s = 100*Math.pow(d3.select('#noise-var').property('value'),2),
            c = d3.select('#noise-cov').property('value')*s;
        var A = inv(coils.data());
            //z = (A[0][0]*A[1][0]+A[0][1]*A[1][1])*s + (A[0][1]*A[1][0] + A[0][0]*A[1][1])*c;
        //return [[sos(A[0])*s + 2*A[0][0]*A[0][1]*c,z],
        //        [z,sos(A[1])*s + 2*A[1][0]*A[1][1]*c]];
        return mtimes(A, mtimes([[s,c],[c,s]],A));
    }

    // Setup params
    const size      = 800;
    const margin    = 50;
    const width     = size - 2 * margin;
    const height    = size - 2 * margin;
    const colors    = ["steelblue", "orange"];

    d3.select('#container')
      .attr("viewBox", "0 0 " + 2*size + " " + size)
      .attr("preserveAspectRatio", "xMidYMid meet")

    d3.select('#container').append('svg')
      .attr("id", "chart")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", size)
      .attr("height", size)

    d3.select('#container').append('svg')
      .attr("id", "FOV")
      .attr("x", size)
      .attr("y", 0)
      .attr("width", size)
      .attr("height", size)


    // Setup main chart
    const chart = d3.select('#chart')
                    .append('g')
                    .attr('transform', `translate(${margin}, ${margin})`);

    // Setup x-axis
    const xScale = d3.scaleLinear()
                     .range([0, width])
                     .domain([-1, 1]);

    chart.append('g')
         .attr('transform', `translate(0, ${height})`)
         .call(d3.axisBottom(xScale));

    chart.append("text")
         .attr("y", height + margin )
         .attr("x", width / 2)
         .style("text-anchor", "middle")
         .text("Voxel A"); 

    // Setup y-axis
    const yScale = d3.scaleLinear()
                     .range([height, 0])
                     .domain([-1, 1]);

    chart.append('g')
         .call(d3.axisLeft(yScale));

    chart.append("text")
         .attr("transform", "rotate(-90)")
         .attr("y", 0 - margin)
         .attr("x",0 - (height / 2))
         .attr("dy", "1em")
         .style("text-anchor", "middle")
         .text("Voxel B"); 

    // Setup clip box
    chart.append("clipPath")
         .attr("id", "axis-clip")
         .append("rect")
         .attr("x", xScale(-1))
         .attr("y", yScale(1))
         .attr("height", yScale(-1))
         .attr("width", xScale(1))

    chart.append('circle')
         .attr('cx', xScale(0))
         .attr('cy', yScale(0))
         .attr('r', 4)
         .attr('fill', 'black')

    // Setup grid
    chart.selectAll()
         .data(yScale.ticks(10))
         .enter()
         .append("line")
         .style("stroke-dasharray", ("1, 3"))
         .style("opacity", 0.5)
         .attr("x1" , xScale(-1))
         .attr("x2" , xScale(1))
         .attr("y1" , d => yScale(d))
         .attr("y2" , d => yScale(d))
         .attr("fill" , "none")
         .attr("shape-rendering" , "crispEdges")
         .attr("stroke" , "grey")
         .attr("stroke-width" , "1px")

    chart.selectAll()
         .data(xScale.ticks(10))
         .enter()
         .append("line")
         .style("stroke-dasharray", ("1, 3"))
         .style("opacity", 0.5)
         .attr("x1" , d => xScale(d))
         .attr("x2" , d => xScale(d))
         .attr("y1" , yScale(-1))
         .attr("y2" , yScale(1))
         .attr("fill" , "none")
         .attr("shape-rendering" , "crispEdges")
         .attr("stroke" , "grey")
         .attr("stroke-width" , "1px")


    //Set target point (x)
    var trg = chart.selectAll()
                   .data([[0.5,0.5]])
                   .enter()
                   .append('circle')
                   .attr('cx', d => xScale(d[0]))
                   .attr('cy', d => yScale(d[1]))
                   .attr('r', 8)
                   .attr('fill', 'black')

    // Draw target guides
    var trg_x = chart.append("line")
                     .style("stroke-dasharray", ("3, 3"))
                     .style("opacity", 0.5)
                     .attr("x1" , trg.attr("cx"))
                     .attr("x2" , trg.attr("cx"))
                     .attr("y1" , trg.attr("cy"))
                     .attr("y2" , yScale(-1))
                     .attr("fill" , "none")
                     .attr("stroke" , 'black')
                     .attr("stroke-width" , "1px")
                     .attr("shape-rendering" , "geometricPrecision")
                     .lower()
    var trg_y = chart.append("line")
                     .style("stroke-dasharray", ("3, 3"))
                     .style("opacity", 0.5)
                     .attr("y1" , trg.attr("cy"))
                     .attr("y2" , trg.attr("cy"))
                     .attr("x1" , trg.attr("cx"))
                     .attr("x2" , xScale(-1))
                     .attr("fill" , "none")
                     .attr("stroke" , 'black')
                     .attr("stroke-width" , "1px")
                     .attr("shape-rendering" , "geometricPrecision")
                     .lower()

    //Plot coils
    var coils = chart.selectAll()
                     .data([normalise([Math.random(),Math.random()]),
                            normalise([Math.random(),Math.random()])])
                     .enter()
                     .append("line")
                     .attr("x1" , d => xScale(-2*d[0]))
                     .attr("x2" , d => xScale(2*d[0]))
                     .attr("y1" , d => yScale(-2*d[1]))
                     .attr("y2" , d => yScale(2*d[1]))
                     .attr("fill" , "none")
                     .attr("shape-rendering" , "geometricPrecision")
                     .attr("stroke" , (d,i) => colors[i])
                     .attr("stroke-width" , "3px")
                     .attr("clip-path", "url(#axis-clip)")

    // Plot projection of target onto coils
    var u   = getProj(coils.data()[0], trg.data()[0]);
    var v   = getProj(coils.data()[1], trg.data()[0]);
    var proj = chart.selectAll()
                    .data([u,v])
                    .enter()
                    .append('circle')
                    .attr('cx', d => xScale(d[0]))
                    .attr('cy', d => yScale(d[1]))
                    .attr('r', 8)
                    .attr('fill', (d,i) => colors[i])

    // Compute and draw normals
    var norm = chart.selectAll()
                    .data([u,v])
                    .enter()
                    .append("line")
                    .style("stroke-dasharray", ("3, 3"))
                    .style("opacity", 0.5)
                    .attr("x1" , (d,i) => xScale(-2*coils.data()[i][1]+d[0]))
                    .attr("x2" , (d,i) => xScale(2*coils.data()[i][1]+d[0]))
                    .attr("y1" , (d,i) => yScale(2*coils.data()[i][0]+d[1]))
                    .attr("y2" , (d,i) => yScale(-2*coils.data()[i][0]+d[1]))
                    .attr("fill" , "none")
                    .attr("stroke" , (d,i) => colors[i])
                    .attr("stroke-width" , "1px")
                    .attr("shape-rendering" , "geometricPrecision")
                    .attr("clip-path", "url(#axis-clip)")
                    .lower()

    // Draw Noise Margins
    var area = d3.area()
                 .x0(d => xScale(d[0]))
                 .x1(d => xScale(d[1]))
                 .y0(d => yScale(d[2]))
                 .y1(d => yScale(d[3]))

    var margins = chart.selectAll()
                       .data(margin_data(u,v,0.025))
                       .enter()
                       .append("path")
                       .attr("class", "area")
                       .attr("clip-path", "url(#axis-clip)")
                       .attr("fill" , (d,i) => colors[i])
                       .attr("opacity" , 0.25)
                       .attr("d", area)
                       .lower()

    // Set up Gaussian noise
    var N = randn(1000).map(x => [0.025*x[0],0.025*x[1]]);
    var noise = chart.selectAll('#noise')
                     .data(mtimes(inv(coils.data()),N))
                     .enter()
                     .append('circle')
                     .attr('id', 'noise')
                     .attr('cx', d => xScale(minmax(d[0] + trg.data()[0][0],[-2,2])))
                     .attr('cy', d => yScale(minmax(d[1] + trg.data()[0][1],[-2,2])))
                     .attr('r', 2)
                     .attr('fill', 'grey')
                     .attr('opacity', 0.5)
                     .attr("clip-path", "url(#axis-clip)")
                     .lower();

    // Set up histograms
    var bins = [-1.000,-0.975,-0.950,-0.925,-0.900,-0.875,-0.850,-0.825,
                -0.800,-0.775,-0.750,-0.725,-0.700,-0.675,-0.650,-0.625,
                -0.600,-0.575,-0.550,-0.525,-0.500,-0.475,-0.450,-0.425,
                -0.400,-0.375,-0.350,-0.325,-0.300,-0.275,-0.250,-0.225,
                -0.200,-0.175,-0.150,-0.125,-0.100,-0.075,-0.050,-0.025,
                0.000,0.025,0.050,0.075,0.100,0.125,0.150,0.175,0.200,
                0.225,0.250,0.275,0.300,0.325,0.350,0.375,0.400,0.425,
                0.450,0.475,0.500,0.525,0.550,0.575,0.600,0.625,0.650,
                0.675,0.700,0.725,0.750,0.775,0.800,0.825,0.850,0.875,
                0.900,0.925,0.950,0.975];
    xHist = chart.selectAll()
                 .data(bins)
                 .enter()
                 .append('rect')
                 .attr('x', d => xScale(d))
                 .attr('width', xScale(0.025-1))
                 .attr('y', d => yScale(noise.data().map(x => x[0]+trg.data()[0][0]).filter(x => x>d && x <d+0.025).length/1000-1))
                 .attr('height', d => height - yScale(noise.data().map(x => x[0]+trg.data()[0][0]).filter(x => x>d && x <d+0.025).length/1000-1))
                 .attr('fill', 'black')
                 .attr('opacity', 0.75)
                 .lower();

    yHist = chart.selectAll()
                 .data(bins)
                 .enter()
                 .append('rect')
                 .attr('y', d => yScale(d+0.025))
                 .attr('height', height - yScale(0.025-1))
                 .attr('x', d => xScale(-1))
                 .attr('width', d => xScale(noise.data().map(x => x[1]+trg.data()[0][1]).filter(x => x>d && x <d+0.025).length/1000-1))
                 .attr('fill', 'black')
                 .attr('opacity', 0.75)
                 .lower();


    // Re-draw elements
    function updateTrg() {
        trg.attr('cx', d =>xScale(d[0]))
           .attr('cy', d =>yScale(d[1]))
        trg_x.attr("x1" , trg.attr("cx"))
             .attr("x2" , trg.attr("cx"))
             .attr("y1" , trg.attr("cy"))
        trg_y.attr("y1" , trg.attr("cy"))
             .attr("y2" , trg.attr("cy"))
             .attr("x1" , trg.attr("cx"))
    }
    function updateCoils() {
        coils.attr("x1" , d => xScale(-2*d[0]))
             .attr("x2" , d => xScale(2*d[0]))
             .attr("y1" , d => yScale(-2*d[1]))
             .attr("y2" , d => yScale(2*d[1]))
        updateTxt();
    }
    function updatePlot() {
        u   = getProj(coils.data()[0], trg.data()[0]);
        v   = getProj(coils.data()[1], trg.data()[0]);
        proj.data([u,v])
            .attr('cx', d => xScale(d[0]))
            .attr('cy', d => yScale(d[1]))
        norm.data([u,v])
            .attr("x1" , (d,i) => xScale(-2*coils.data()[i][1]+d[0]))
            .attr("x2" , (d,i) => xScale(2*coils.data()[i][1]+d[0]))
            .attr("y1" , (d,i) => yScale(2*coils.data()[i][0]+d[1]))
            .attr("y2" , (d,i) => yScale(-2*coils.data()[i][0]+d[1]))
        margins.data(margin_data(u,v,d3.select('#noise-var').property('value')))
               .attr("d", area)
        if (d3.select("#noise-checkbox").property("checked")) {
            noise.data(mtimes(inv(coils.data()),N))
                 .attr('cx', d => xScale(d[0] + trg.data()[0][0]))
                 .attr('cy', d => yScale(d[1] + trg.data()[0][1]))
        }

    }
    function updateNoise(data) {
        noise.remove();
        N = randn(d3.select('#noise-pts').property('value')).map(x => x.map(x => d3.select('#noise-var').property('value')*x));
        N = mtimes(chol([[1,d3.select('#noise-cov').property('value')],[d3.select('#noise-cov').property('value'),1]]), N);
        noise = chart.selectAll('#noise')
                     .data(mtimes(inv(coils.data()),N))
                     .enter()
                     .append('circle')
                     .attr('id', 'noise')
                     .attr('cx', d => xScale(minmax(d[0] + trg.data()[0][0],[-2,2])))
                     .attr('cy', d => yScale(minmax(d[1] + trg.data()[0][1],[-2,2])))
                     .attr('r', 2)
                     .attr('fill', 'grey')
                     .attr('opacity', 0.5)
                     .attr("clip-path", "url(#axis-clip)")
                     .lower();
        noise.exit().remove();
        updateHist();
    }
    function updateHist() {
        xHist.attr('y', d => yScale(noise.data().map(x => x[0]+trg.data()[0][0]).filter(x => x>d && x <d+0.025).length/1000-1))
             .attr('height', d => height - yScale(noise.data().map(x => x[0]+trg.data()[0][0]).filter(x => x>d && x <d+0.025).length/1000-1))
        yHist.attr('width', d => xScale(noise.data().map(x => x[1]+trg.data()[0][1]).filter(x => x>d && x <d+0.025).length/1000-1))
        updateTxt();
    }

    // Target point drag interface
    trg.call(d3.drag().on('drag', function (d) {
        d3.select(this)
          .datum([minmax(xScale.invert(d3.event.x),[-1,1]),
                      minmax(yScale.invert(d3.event.y),[-1,1])])
        updateTrg();
        updatePlot();
        updateHist();
        updateFOV();
    }));

    // Coils drag interface
    coils.call(d3.drag().on('drag', function (d) {
        var x = minmax(xScale.invert(d3.event.x),[-1,1]),
            y = minmax(yScale.invert(d3.event.y),[-1,1]);
        d3.select(this)
          .datum(normalise([x,y]))
        C.data(coils.data().map(x => 360*Math.atan(x[1]/x[0])/Math.PI));
        sens.data(C.data())
        updateCoils();
        updatePlot();
        updateHist();
        updateFOV();
    }));

    // Number of Noise Points Slider
    d3.select("#noise-pts")
      .property('value', 1000)
      .on("input", function() {
        if (d3.select('#noise-checkbox').property('checked')) {
            updateNoise();
            updatePlot();
        }
    });

    // Noise variance slider
    d3.select("#noise-var")
      .property('value', 0.025)
      .on("input", function() {
        if (d3.select('#noise-checkbox').property('checked')) {
            updateNoise();
            updatePlot();
        } else {
            updateTxt();
        }
    });

    // Noise covariance slider
    d3.select("#noise-cov")
      .property('value', 0)
      .on("input", function() {
        if (d3.select('#noise-checkbox').property('checked')) {
            updateNoise();
            updatePlot();
        } else {
            updateTxt();
        }
    });
    
    // Noise checkbox
    d3.select("#noise-checkbox")
      .property("checked", true)
      .on("change", function() {
        if (this.checked) {
            updateNoise();
        }
        else {
            noise.remove();
        }
        xHist.attr("opacity", 0.75*this.checked);
        yHist.attr("opacity", 0.75*this.checked);
    });

    // Noise margins checkbox
    d3.select("#margins-checkbox")
      .property("checked", true)
      .on("change", function() {
            updatePlot();
            margins.attr("opacity", 0.25*this.checked);
    });

    // ========================================================================================
    // Setup FOV for coil vis
    // ========================================================================================

    const fov = d3.select('#FOV')
                  .append('g')
                  .attr('transform', `translate(${margin}, ${margin})`);
                     
    fov.append('circle')
       .attr('cx', xScale(0))
       .attr('cy', yScale(0))
       .attr('r', 256)
       .attr('stroke', 'black')
       .attr('fill', 'none')

    var colour = d3.scaleLinear()
                   .domain([0,1])
                   .range(["white", "black"]);

    voxels = fov.selectAll()
                .data([0.525,-0.475])
                .enter()
                .append('rect')
                .attr('x', xScale(-0.025))
                .attr('y', d => yScale(d))
                .attr('width', xScale(0.05-1))
                .attr('height', yScale(1-0.05))
                .attr('stroke', 'black')
                .attr('fill', (d,i) => colour(trg.data()[0][i]))

    fov.selectAll()
       .data([[0.5, "A"],[-0.5,"B"]])
       .enter()
       .append("text")
       .attr("y", d => yScale(d[0]))
       .attr("x", xScale(-0.1))
       .text( d=> d[1]); 


    C = fov.selectAll()
           .data(coils.data().map(x => 360*Math.atan(x[1]/x[0])/Math.PI))
           .enter()
           .append('rect')
           .attr('x', yScale(0.2))
           .attr('y', xScale(-0.8))
           .attr('width', yScale(1-0.4))
           .attr('height', xScale(0.025-1))
           .attr('stroke', (d,i) => colors[i])
           .attr('fill', (d,i) => colors[i])
           .attr('transform', d => 'rotate(' + d + ',' + xScale(0) + ',' + yScale(0) + ')');

    var gradient0 = fov.append("svg:defs")
                      .append("svg:linearGradient")
                      .attr("id", "gradient0")
                      .attr("x1", "0%")
                      .attr("x2", "0%")
                      .attr("y1", "0%")
                      .attr("y2", "100%")

    gradient0.append("svg:stop")
            .attr("offset", "0%")
            .attr("stop-color", colors[0])
            .attr("stop-opacity", 0.8);

    gradient0.append("svg:stop")
            .attr("offset", "70%")
            .attr("stop-color", colors[0])
            .attr("stop-opacity", 0);

    var gradient1 = fov.append("svg:defs")
                      .append("svg:linearGradient")
                      .attr("id", "gradient1")
                      .attr("x1", "0%")
                      .attr("x2", "0%")
                      .attr("y1", "0%")
                      .attr("y2", "100%")

    gradient1.append("svg:stop")
            .attr("offset", "0%")
            .attr("stop-color", colors[1])
            .attr("stop-opacity", 0.8);

    gradient1.append("svg:stop")
            .attr("offset", "70%")
            .attr("stop-color", colors[1])
            .attr("stop-opacity", 0);

    fov.append("clipPath")
       .attr("id", "fov-clip")
       .append("circle")
       .attr("cx", xScale(0))
       .attr("cy", yScale(0))
       .attr("r", 256)

    sens = fov.selectAll()
              .data(C.data())
              .enter()
              .append('rect')
              .attr('x', xScale(-1))
              .attr('y', yScale(0.9))
              .attr('width', xScale(1))
              .attr('height', yScale(-0.5))
              .attr('fill', (d,i) => 'url(#gradient'+i+')')
              .attr('transform', d => 'rotate(' +d + ',' + xScale(0) + ',' + yScale(0) + ')')
              .attr("clip-path", "url(#fov-clip)")

    C.call(d3.drag().on('drag', function () {
        var x = xScale.invert(d3.event.x),
            y = yScale.invert(d3.event.y);
        var a;
        if (x > 0 && y > 0) { // Quadrant 1
            a = Math.atan(y/x);
        }
        else if (x < 0 && y > 0) { // Quadrant 2
            a = Math.atan(y/x)+Math.PI;
        }
        else if (x < 0 && y < 0) { // Quadrant 3
            a = Math.atan(y/x)+Math.PI;
        }
        else { // Quadrant 4
            a = Math.atan(y/x);
        }
        d3.select(this)
          .datum(-180*(a-Math.PI/2)/Math.PI)
        coils.data(C.data().map(x => Math.PI*x/360).map(x => [Math.cos(x), Math.sin(x)]));
        sens.data(C.data())
        updatePlot();
        updateCoils();
        updateHist();
        updateFOV();
    }));

    function updateFOV() {
        voxels.attr('fill', (d,i) => colour(trg.data()[0][i]))
        C.attr('transform', d => 'rotate(' + d + ',' + xScale(0) + ',' + yScale(0) + ')');
        sens.attr('transform', d => 'rotate(' + d + ',' + xScale(0) + ',' + yScale(0) + ')');
    }

    // ========================================================================================
    // Text Displays
    // ========================================================================================

    fov.append('text')
       .attr('x', xScale(-1.14))
       .attr('y', yScale(1.04))
       .attr('text-anchor', 'start')
       .attr('font-family', 'monospace')
       .attr('font-weight', 'bold')
       .text('Sensitivity Encoding Matrix');

    fov.append('text')
       .attr('x', xScale(-1.14))
       .attr('y', yScale(0.90))
       .attr('text-anchor', 'start')
       .attr('font-family', 'monospace')
       .attr('fill', colors[0])
       .text('Coil 1');

    fov.append('text')
       .attr('x', xScale(-1.14))
       .attr('y', yScale(0.84))
       .attr('text-anchor', 'start')
       .attr('font-family', 'monospace')
       .attr('fill', colors[1])
       .text('Coil 2');

    fov.append('text')
       .attr('x', xScale(-0.82))
       .attr('y', yScale(0.96))
       .attr('text-anchor', 'end')
       .attr('font-family', 'monospace')
       .text('Voxel A');

    fov.append('text')
       .attr('x', xScale(-0.62))
       .attr('y', yScale(0.96))
       .attr('text-anchor', 'end')
       .attr('font-family', 'monospace')
       .text('Voxel B');

    mtx_txt = fov.selectAll()
                 .data([[-0.82,0.90,colors[0],coils.data()[0][0]],
                        [-0.62,0.90,colors[0],coils.data()[0][1]],
                        [-0.82,0.84,colors[1],coils.data()[1][0]],
                        [-0.62,0.84,colors[1],coils.data()[1][1]]])
                 .enter()
                 .append("text")
                 .attr('x', d => xScale(d[0]))
                 .attr('y', d => yScale(d[1]))
                 .attr('fill', d => d[2])
                 .text( d => Math.round(1000*d[3])/1000)
                 .attr('text-anchor', 'end')
                 .attr('font-family', 'monospace');

    fov.append('text')
       .attr('x', xScale(-0.40))
       .attr('y', yScale(1.04))
       .attr('text-anchor', 'start')
       .attr('font-family', 'monospace')
       .attr('font-weight', 'bold')
       .text('Input Coil Noise Covariance');

    fov.append('text')
       .attr('x', xScale(-0.40))
       .attr('y', yScale(0.90))
       .attr('text-anchor', 'start')
       .attr('font-family', 'monospace')
       .attr('fill', colors[0])
       .text('Coil 1');

    fov.append('text')
       .attr('x', xScale(-0.40))
       .attr('y', yScale(0.84))
       .attr('text-anchor', 'start')
       .attr('font-family', 'monospace')
       .attr('fill', colors[1])
       .text('Coil 2');

    fov.append('text')
       .attr('x', xScale(-0.08))
       .attr('y', yScale(0.96))
       .attr('text-anchor', 'end')
       .attr('font-family', 'monospace')
       .attr('fill', colors[0])
       .text('Coil 1');

    fov.append('text')
       .attr('x', xScale(0.12))
       .attr('y', yScale(0.96))
       .attr('text-anchor', 'end')
       .attr('font-family', 'monospace')
       .attr('fill', colors[1])
       .text('Coil 2');

    cov_txt = fov.selectAll()
                 .data([[-0.08,0.90,colors[0],100*Math.pow(d3.select('#noise-var').property('value'),2)],
                        [0.12,0.90,'black',100*d3.select('#noise-cov').property('value')*Math.pow(d3.select('#noise-var').property('value'),2)],
                        [-0.08,0.84,'black',100*d3.select('#noise-cov').property('value')*Math.pow(d3.select('#noise-var').property('value'),2)],
                        [0.12,0.84,colors[1],100*Math.pow(d3.select('#noise-var').property('value'),2)]])
                 .enter()
                 .append("text")
                 .attr('x', d => xScale(d[0]))
                 .attr('y', d => yScale(d[1]))
                 .attr('fill', d => d[2])
                 .text( d => Math.round(1000*d[3])/1000)
                 .attr('text-anchor', 'end')
                 .attr('font-family', 'monospace');

    fov.append('text')
       .attr('x', xScale(0.34))
       .attr('y', yScale(1.04))
       .attr('text-anchor', 'start')
       .attr('font-family', 'monospace')
       .attr('font-weight', 'bold')
       .text('Output Voxel Noise Covariance');

    fov.append('text')
       .attr('x', xScale(0.34))
       .attr('y', yScale(0.90))
       .attr('text-anchor', 'start')
       .attr('font-family', 'monospace')
       .text('Voxel A');

    fov.append('text')
       .attr('x', xScale(0.34))
       .attr('y', yScale(0.84))
       .attr('text-anchor', 'start')
       .attr('font-family', 'monospace')
       .text('Voxel B');

    fov.append('text')
       .attr('x', xScale(0.70))
       .attr('y', yScale(0.96))
       .attr('text-anchor', 'end')
       .attr('font-family', 'monospace')
       .text('Voxel A');

    fov.append('text')
       .attr('x', xScale(0.90))
       .attr('y', yScale(0.96))
       .attr('text-anchor', 'end')
       .attr('font-family', 'monospace')
       .text('Voxel B');

    var_txt = fov.selectAll()
                 .data([[0.70,0.90,covariance()[0][0]],
                        [0.90,0.90,covariance()[0][1]],
                        [0.70,0.84,covariance()[1][0]],
                        [0.90,0.84,covariance()[1][1]]])
                 .enter()
                 .append("text")
                 .attr('x', d => xScale(d[0]))
                 .attr('y', d => yScale(d[1]))
                 .attr('text-anchor', 'end')
                 .attr('font-family', 'monospace')
                 .text( function(d) {
                      var x = Math.round(1000*d[2])/1000;
                      if (Math.abs(x) > 1000){
                          return minmax(x,[-1000,1000]) + '+';
                      } else if (Math.abs(x) > 100){
                          return Math.round(10*x)/10; 
                      } else if (Math.abs(x) > 10) {
                          return Math.round(100*x)/100; 
                      } else {
                          return x;
                      }
                 });

    function updateTxt() {
        mtx_txt.data([[-0.96,0.96,colors[0],coils.data()[0][0]],
                      [-0.82,0.96,colors[0],coils.data()[0][1]],
                      [-0.96,0.90,colors[1],coils.data()[1][0]],
                      [-0.82,0.90,colors[1],coils.data()[1][1]]])
               .text( d => Math.round(1000*d[3])/1000)

        var v = 100*Math.pow(d3.select('#noise-var').property('value'),2),
            c = v*d3.select('#noise-cov').property('value');
        cov_txt.data([[-0.56,0.96,colors[0],v],
                      [-0.42,0.96,'black',c],
                      [-0.56,0.90,'black',c],
                      [-0.42,0.90,colors[1],v]])
               .text( d => Math.round(1000*d[3])/1000)
        var_txt.data([[-0.16,0.96,covariance()[0][0]],
                      [-0.02,0.96,covariance()[0][1]],
                      [-0.16,0.90,covariance()[1][0]],
                      [-0.02,0.90,covariance()[1][1]]])
               .text( function(d) {
                    var x = Math.round(1000*d[2])/1000;
                    if (Math.abs(x) > 1000){
                        return minmax(x,[-1000,1000]) + '+';
                    } else if (Math.abs(x) > 100){
                        return Math.round(10*x)/10; 
                    } else if (Math.abs(x) > 10) {
                        return Math.round(100*x)/100; 
                    } else {
                        return x;
                    }
               });

    }
