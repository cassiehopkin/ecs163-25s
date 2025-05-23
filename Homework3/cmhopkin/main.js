// made while using chatGPT for reference

// Data cleaning //////////////////////////////////////////////////////////////
d3.csv("student_mental_health.csv").then(rawData =>{

    // some data processing, change column names to be easier to reference
    const renameMapping = {
        "Choose your gender": "gender",
        "What is your course?": "major",
        "Your current year of Study": "year",
        "What is your CGPA?": "gpa",
        "Marital status": "married",
        "Do you have Depression?": "depression",
        "Do you have Anxiety?": "anxiety",
        "Do you have Panic attack?": "panic",
        "Did you seek any specialist for a treatment?": "specialist"
    };

    // update columns using mapping
    newData = rawData.map(item => {
    let renamedItem = {};
    for (let key in item) {
        if (renameMapping[key]) {
        renamedItem[renameMapping[key]] = item[key];
        } else {
        renamedItem[key] = item[key];
        }
    }
    return renamedItem;
    });

    // change the years to have consistent names (all upper case)
    newData.forEach(d => {
        if (d.year) {
            d.year = d.year.trim().toLowerCase();
            d.year = d.year.replace(/^year /, "Year ");
        }
    });
    // get rid of rows with null values
    newData = newData.filter(d => {
        return Object.values(d).every(val => val !== undefined && val !== null && val.trim() !== "")
    });
    // trim entries that end with spaces
    newData = newData.map(d => {
    let cleanedRow = {};
    for (let key in d) {
      cleanedRow[key] = typeof d[key] === 'string' ? d[key].trim() : d[key];
    }
    return cleanedRow;
  });



// plot 1: parallel coordinates //////////////////////////////////////////////////////////
// expanded from https://d3-graph-gallery.com/graph/parallel_basic.html //////////////////

    // dimensions and placement of chart
    const widthPC = 750
    const heightPC = 300


    // create svg and make g1 the group for the parallel coordinates plot
    const g1 = d3.select("svg")
        .append("g")
        .attr("transform", `translate(-20, 100)`);

    // add title
    g1.append("text")
      .attr("x", widthPC / 2)
      .attr("y", -40)
      .attr("text-anchor", "middle")
      .style("font-size", "18px")
      .style("font-family", "Times New Roman")
      .style("fill", "black") 
      .style("font-weight", "bold")
      .text("Connections Between Factors");

    // for each dimension, build a linear scale, store all in a y object
    dimensions = Object.keys(newData[0]).filter(function(key) { return key !== "Timestamp" && key !== "major";})
    // order and scale the dimensions to put on each y-axis
    var y = {};
    dimensions.forEach(dim => {
        const uniqueValues = [...new Set(newData.map(d => d[dim]))];

        // for yes no dimensions, make it so no is always at the bottom and yes is at the top
        if (uniqueValues.includes("Yes") && uniqueValues.includes("No")) {
            y[dim] = d3.scalePoint()
            .domain(["No", "Yes"])
            .range([heightPC, 0]);
        } else {
            // otherwise just make it alphabetical
            y[dim] = d3.scalePoint()
            .domain(uniqueValues.sort())
            .range([heightPC, 0]);
        }
    });

    // label map to make the label for each y-axis look nice
    const labelMap = {
        "gender": "Gender",
        "Age": "Age",
        "year": "Academic Year",
        "gpa": "GPA",
        "depression": "Depression",
        "anxiety": "Anxiety",
        "panic": "Panic Attacks",
        "specialist": "Treatment",
        "married": "Marital Status"
    };

    // build the x scale, find the best position for each y axis
    x = d3.scalePoint()
          .range([0, widthPC])
          .padding(1)
          .domain(dimensions);


    // The path function takes a row of the csv as input, and returns x and y coordinates of the line to draw for this row.
        function path(d) {
        return d3.line()(dimensions.map(p => [x(p), y[p](d[p])]));
        }

    // Draw the lines
    g1.selectAll("path")
      .data(newData)
      .enter().append("path")
      .attr("d", path)
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1)
      .attr("opacity", 0.3)
      .attr("fill", "none");

    const activeFilters = {};

    // Draw the axis:
    g1.selectAll("myAxis")
        // For each dimension of the dataset I add a 'g' element:
        .data(dimensions).enter()
        .append("g")
        // I translate this element to its right position on the x axis
        .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
        // And I build the axis with the call function
        .each(function(d) {
        const axisGroup = d3.select(this);
        axisGroup.call(d3.axisLeft().scale(y[d]));

        // Add axis label
        axisGroup.append("text")
            .style("text-anchor", "middle")
            .attr("y", -15)
            .text(labelMap[d] || d)
            .style("fill", "black")
            .style("font-size", "12px")
            .style("font-family", "Times New Roman")
            .style("font-weight", "semibold");

        // create circle sliders on the axis to filter data
        const values = y[d].domain();
        const handle = axisGroup.append("circle")
            .attr("r", 6)
            .attr("fill", "orange")
            .attr("cx", 0)
            // start a little bit above the bottom so the user knows that when none are selected, shows all the data
            .attr("cy", y[d](values[0]) - 20)
            .attr("class", "slider-handle");

        // use drag function to specify how to drag the circles
        const drag = d3.drag()
            .on("drag", function(event) {
                let yPos = event.y;

                // want to keep the circle within the axis bounds
                yPos = Math.max(y[d].range()[1], Math.min(y[d].range()[0], yPos));
                handle.attr("cy", yPos);

                // find closest tick mark
                let closest = null;
                let closestDist = Infinity;

                values.forEach(val => {
                    const pos = y[d](val);
                    const dist = Math.abs(yPos - pos);
                    if (dist < closestDist) {
                        closest = val;
                        closestDist = dist;
                    }
                });

                // if we are close enough to a tick mark, then filter by that category
                if (closestDist < 6) {
                    activeFilters[d] = closest;
                } else {
                    activeFilters[d] = null;
                }

                // also update the bar chart
                updateBarChart(getFilteredData(newData, activeFilters));

                // filter the data shown on the parallel coordinates plot
                g1.selectAll("path")
                    .style("display", function(data) {
                        // if data is null then don't filter
                        if (!data) return null;
                        return Object.entries(activeFilters).every(([key, val]) => {
                            return val === null || data[key] === val;
                        }) ? null : "none";
                    });
                });

        handle.call(drag);
    });


//plot 2: Bar Chart for mental illness effect on GPA /////////////////////////////////////////

    // aggregate data into two categories, withIllness or withoutIllness to display within each bar
    const aggregatedData = d3.rollups(
        newData,
        v => ({
            withIllness: v.filter(d => d.depression === "Yes" || d.anxiety === "Yes" || d.panic === "Yes").length,
            withoutIllness: v.filter(d => d.depression === "No" && d.anxiety === "No" && d.panic === "No").length
        }),
        // also count the number of students within each gpa bin
        d => d.gpa
        ).map(([gpa, counts]) => ({
        gpa,
        ...counts
        }));

    // sort the data so the lower gpa's appear first
    aggregatedData.sort((a, b) => {
        const lowerA = parseFloat(a.gpa.split(' - ')[0]);
        const lowerB = parseFloat(b.gpa.split(' - ')[0]);
        return lowerA - lowerB;
    });
        
    const customStackedData = [];
    // make pairs to match data points to with/without illness
    aggregatedData.forEach(d => {
    const pairs = [
        { key: "withIllness", value: d.withIllness },
        { key: "withoutIllness", value: d.withoutIllness }
    ];

    // sort in descending order so the larger value appears at the bottom of the bar
    pairs.sort((a, b) => b.value - a.value);

    let y0 = 0;
    // add data to new array with stack information
    pairs.forEach(pair => {
        customStackedData.push({
        gpa: d.gpa,
        key: pair.key,
        y0: y0,
        y1: y0 + pair.value,
        value: pair.value
        });
        y0 += pair.value;
    });
    });
    // console.log(customStackedData)

    // dimensions stuff
    const widthBar = 400
    const heightBar = 275
    const marginLeft = 750
    const marginTop = 200

    const g2 = g1.append("g")
                .attr("width", 600)
                .attr("height", 200)
                .attr("transform", `translate(${marginLeft}, ${marginTop})`);

    // title for graph
    g2.append("text")
    .attr("x", widthBar / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-family", "Times New Roman")
    .style("fill", "black") 
    .style("font-weight", "bold")
    .text("GPA and Mental Health");

    // X label
    g2.append("text")
        .attr("x", widthBar / 2)
        .attr("y", heightBar + 40)
        .attr("font-size", "12px")
        .attr("text-anchor", "middle")
        .text("GPA Range");


    // Y label
    g2.append("text")
        .attr("x", -(heightBar / 2))
        .attr("y", -40)
        .attr("font-size", "14px")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .text("Number of students");

    // X ticks
    const x2 = d3.scaleBand()
        .domain(aggregatedData.map(d => d.gpa))
        .range([0, widthBar])
        .paddingInner(0.3)
        .paddingOuter(0.2);

    const xAxisCall2 = d3.axisBottom(x2);
    g2.append("g")
    .attr("transform", `translate(0, ${heightBar})`)
    .call(xAxisCall2)
    .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "middle")

    // Y ticks
    const y2 = d3.scaleLinear()
        .domain([
            0,
            d3.max(aggregatedData, d => d.withIllness + d.withoutIllness)
        ])
        .range([heightBar, 0])
        .nice();
    const yAxisCall2 = d3.axisLeft(y2)
                            .ticks(6);
    g2.append("g")
        .attr("class", "y-axis")
        .call(yAxisCall2);

    const barColor = d3.scaleOrdinal()
        .domain(["withoutIllness", "withIllness"])
        .range(["#93bcdb", "#4b83b8"]);


    // draw bar graph
    g2.selectAll("rect")
    .data(customStackedData)
    .join("rect")
    .attr("x", d => x2(d.gpa))
    .attr("y", d => y2(d.y1))
    .attr("height", d => y2(d.y0) - y2(d.y1))
    .attr("width", x2.bandwidth())
    .attr("fill", d => barColor(d.key));

    // legend
    const legend = g2.append("g")
                    .attr("transform", `translate(${widthBar - 370}, 0)`);

    ["withIllness", "withoutIllness"].forEach((label, i) => {
        legend.append("rect")
            .attr("x", 0)
            .attr("y", i * 25)
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", barColor(label));

        legend.append("text")
            .attr("x", 20)
            .attr("y", i * 25 - 28)
            .text(label === "withIllness" ? "Reported Mental Health Issues" : "No Reported Mental Health Issues")
            .style("font-size", "12px");
        });

    // function to filter the data based on filters from parallel coordinates plot brushing
    function getFilteredData(data, filters) {
        return data.filter(d =>
            Object.entries(filters).every(([key, val]) =>
                val === null || d[key] === val
            )
        );
    }

    // function to update the Bar chart based on the filters chosen by the user on the parallel coordinates plot
    function updateBarChart(filteredData) {
        // re-aggregate the data
        const aggregatedData = d3.rollups(
            filteredData,
            v => ({
                withIllness: v.filter(d => d.depression === "Yes" || d.anxiety === "Yes" || d.panic === "Yes").length,
                withoutIllness: v.filter(d => d.depression === "No" && d.anxiety === "No" && d.panic === "No").length
            }),
            d => d.gpa
        ).map(([gpa, counts]) => ({
            gpa,
            ...counts
        }));

        aggregatedData.sort((a, b) => {
            const lowerA = parseFloat(a.gpa.split(' - ')[0]);
            const lowerB = parseFloat(b.gpa.split(' - ')[0]);
            return lowerA - lowerB;
        });

        // make pairs to match data points to with/without illness
        const customStackedData = [];
        aggregatedData.forEach(d => {
            // add data to new array with stack information
            const pairs = [
                { key: "withIllness", value: d.withIllness },
                { key: "withoutIllness", value: d.withoutIllness }
            ];

            pairs.sort((a, b) => b.value - a.value);  // Sort by descending value

            let y0 = 0;
            pairs.forEach(pair => {
                customStackedData.push({
                    gpa: d.gpa,
                    key: pair.key,
                    y0: y0,
                    y1: y0 + pair.value,
                    value: pair.value
                });
                y0 += pair.value;
            });
        });

        // Update Y scale
        y2.domain([0, d3.max(aggregatedData, d => d.withIllness + d.withoutIllness)]);

        g2.select(".y-axis").call(d3.axisLeft(y2).ticks(5));

        // select and join new bars
        const bars = g2.selectAll("rect")
            .data(customStackedData, d => d ? d.gpa + d.key : null);

        // enter, add new bars
        bars.enter().append("rect")
            .attr("x", d => x2(d.gpa))
            .attr("y", d => y2(d.y1))
            .attr("height", d => y2(d.y0) - y2(d.y1))
            .attr("width", x2.bandwidth())
            .attr("fill", d => barColor(d.key));

        // update bars that are already there
        bars.transition().duration(300)
            .attr("x", d => x2(d.gpa))
            .attr("y", d => y2(d.y1))
            .attr("height", d => y2(d.y0) - y2(d.y1))
            .attr("width", x2.bandwidth())
            .attr("fill", d => barColor(d.key));

        // remove bars we don't need
        bars.exit().remove();


        // legend
        const legend = g2.append("g")
                        .attr("transform", `translate(${widthBar - 370}, 0)`);

        // make the squares part of the legend, need to redo this so they don't disappear when I update
        ["withIllness", "withoutIllness"].forEach((label, i) => {
            legend.append("rect")
                .attr("x", 0)
                .attr("y", i * 25 - 40)
                .attr("width", 15)
                .attr("height", 15)
                .attr("fill", barColor(label));
            });
    }

updateBarChart(newData);


// plot 3: Donut chart for breakdown of student responses /////////////////////////////////////
// count how many of each category to display in chart
    const countMale = newData.filter(entry => entry.gender === "Male").length;
    const countFemale = newData.filter(entry => entry.gender === "Female").length;
    const countDepressed = newData.filter(entry => entry.depression === "Yes").length;
    const countAnxiety = newData.filter(entry => entry.anxiety === "Yes").length;
    const countPanic = newData.filter(entry => entry.panic === "Yes").length;
    const countMarried = newData.filter(entry => entry.married === "Yes").length;
    const countYear1 = newData.filter(entry => entry.year.toLowerCase() === "year 1").length;
    const countYear2 = newData.filter(entry => entry.year.toLowerCase() === "year 2").length;
    const countYear3 = newData.filter(entry => entry.year.toLowerCase() === "year 3").length;
    const countYear4 = newData.filter(entry => entry.year.toLowerCase() === "year 4").length;
    console.log("countMale", countMale)
    console.log("countFemale", countFemale)

    // then make array of objects with information for each layer ///////////////////////////////
    const categoryCounts = [
    {
        category: "Gender",
        labels: ["Male", "Female"],
        values: [countMale, countFemale]
    },
    {
        category: "Depression",
        labels: ["Depressed", "Not Depressed"],
        values: [countDepressed, 101 - countDepressed]
    },
    {
        category: "Anxiety",
        labels: ["Anxious", "Not Anxious"],
        values: [countAnxiety, 101 - countAnxiety]
    },
    {
        category: "Panic",
        labels: ["Panic Attacks", "No Panic Attacks"],
        values: [countPanic, 101 - countPanic]
    },
    {
        category: "Married",
        labels: ["Married", "Not Married"],
        values: [countMarried, 101 - countMarried]
    },
    {
        category: "Year",
        labels: ["Year 1", "Year 2", "Year 3", "Year 4"],
        values: [countYear1, countYear2, countYear3, countYear4]
    }
    ];

    // make array of labels to display on graph
    const allLabels = categoryCounts.flatMap(d => d.labels);

    // make colors for each layer in pairs, so that they visually match
    const numPairs = Math.ceil(allLabels.length / 2);
    const colorPairs = [];

    for (let i = 0; i < numPairs; i++) {
        const baseHue = (i * 360 / numPairs) % 360;
        const hueShift = 30; // small hue variation in degrees

        // Create two colors with slightly different hues
        colorPairs.push(d3.hsl(baseHue, 0.7, 0.5).toString());
        colorPairs.push(d3.hsl((baseHue + hueShift) % 360, 0.6, 0.5).toString());
        }

        const color = d3.scaleOrdinal()
        .domain(allLabels)
        .range(colorPairs);

    // tooltip so user can hover over sections
    const tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "white")
        .style("padding", "8px")
        .style("font-size", "12px")
        .style("font-family", "Times New Roman, sans-serif")
        .style("display", "none");

    // dimensions and placement of chart
    const width = 200;
    const height = 250;
    const radius = Math.min(width, height) / 2;
    const arcWidth = 16;


    const g3 = d3.select("svg")
        .append("g")
        .attr("transform", `translate(${(width + 1500) / 2}, ${(height - 30) / 2})`);

// title for chart
    g3.append("text")
        .attr("x", width / 2 + 80)
        .attr("y", -80)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-family", "Times New Roman")
        .style("fill", "black") 
        .style("font-weight", "bold")
        .text("Breakdown of Responses");

    // create pie chart
    categoryCounts.forEach((layer, i) => {
    const pie = d3.pie()
        .sort(null)
        .value(d => d.value)(
            layer.labels.map((label, idx) => ({
            label: label,
            value: layer.values[idx]
            }))
    );

    // make it a donut using innerRadius
    const arc = d3.arc()
        .innerRadius(radius - (i + 1) * (arcWidth))
        .outerRadius(radius - i * (arcWidth + 2));

    // make each layer
    g3.selectAll(`.arc-${i}`)
    .data(pie)
    .enter()
    .append("path")
    .attr("class", `arc-${i}`)
    .attr("d", arc)
    .attr("fill", (d, j) => color(d.data.label))
    // when the user mouseovers create the tooltip with the subcategory (in bold font) and the corresponding count
    .on("mouseover", function(event, d) {
        tooltip.style("display", "block")
               .html(`<strong>${layer.labels[d.index]}:</strong> ${layer.values[d.index]}`);
        d3.select(this).attr("stroke", "#000").attr("stroke-width", 1.5);
    })
    // when the user moves their mouse the tooltip should move with the user
    .on("mousemove", function(event) {
        tooltip.style("left", (event.pageX + 10) + "px")
               .style("top", (event.pageY - 28) + "px");
    })
    // when the user moves their mouse off of a section it should disappear
    .on("mouseout", function() {
        tooltip.style("display", "none");
        d3.select(this).attr("stroke", null);
    });
});

// some text explaining rationale

    // put this in svg so it scales with the rest of the visualizations
    const g4 = g1.append("g")
                 .attr("width", 800)
                 .attr("height", 200)
                 .attr("transform", `translate(50, 350)`);
    const paragraph = "Brush the parallel coordinates plot by moving the dots to specific tick marks. Notice how the bar chart changes accordingly. Select the different parts of the donut chart to find out more about the specific breakdown of responses.";
    const words = paragraph.split(" ");
    const lineLength = 8; // words per line
    let lines = [];

    for (let i = 0; i < words.length; i += lineLength) {
        lines.push(words.slice(i, i + lineLength).join(" "));
    }

    const text = g4.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .attr("font-size", "16px")
        .attr("font-family", "Times New Roman")
        .attr("fill", "black");

    lines.forEach((line, i) => {
        text.append("tspan")
            .attr("x", 0)
            .attr("y", i * 20)
            .text(line);
    });
    
    }).catch(function(error){
        console.log(error);
});

