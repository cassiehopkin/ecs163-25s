// made while using chatGPT for reference

// Data cleaning //////////////////////////////////////////////////////////////
d3.csv("student_mental_health.csv").then(rawData =>{
    console.log("rawData", rawData);

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

    console.log(newData);


// plot 1: Donut chart for breakdown of student responses /////////////////////////////////////
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

    // dimensions and placement of chart
    const width = 200;
    const height = 250;
    const radius = Math.min(width, height) / 2;
    const arcWidth = 16;
    const padding = 20;


    const g1 = d3.select("svg")
        .append("g")
        .attr("transform", `translate(${(width + padding) / 2}, ${(height + padding) / 2})`);

// title for chart
    g1.append("text")
        .attr("x", width / 2)
        .attr("y", -120)
        .attr("text-anchor", "middle")
        .style("font-size", "18px")
        .style("font-family", "Times New Roman")
        .style("fill", "black") 
        .style("font-weight", "bold")
        .text("Overview of Student Responses");

    // create pie chart
    categoryCounts.forEach((layer, i) => {
    const pie = d3.pie()(layer.values);

    // make it a donut using innerRadius
    const arc = d3.arc()
        .innerRadius(radius - (i + 1) * (arcWidth))
        .outerRadius(radius - i * (arcWidth + 2));

    // make each layer
    g1.selectAll(`.arc-${i}`)
        .data(pie)
        .enter()
        .append("path")
        .attr("class", `arc-${i}`)
        .attr("d", arc)
        .attr("fill", (d, j) => color(layer.labels[j]));

    // Create a legend group outside the chart
    const legendGroup = g1.append("g")
    .attr("transform", `translate(${width / 2 + 50}, -150)`);

    const itemsPerColumn = Math.ceil(allLabels.length / 2);

    allLabels.forEach((category, j) => {
        const col = Math.floor(j / itemsPerColumn); // 0 for left column, 1 for right column
        const row = j % itemsPerColumn;

        const xOffset = col * 150 - 20;
        const yOffset = row * 25 + 50;

        legendGroup.append("rect")
            .attr("x", xOffset)
            .attr("y", yOffset)
            .attr("width", 20)
            .attr("height", 20)
            .attr("fill", color(category));

        legendGroup.append("text")
            .attr("x", xOffset + 25)
            .attr("y", yOffset + 15)
            .text(category)
            .style("font-size", "12px")
            .style("alignment-baseline", "middle");
        });
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
    console.log(customStackedData)

    // dimensions stuff
    const widthBar = 400
    const heightBar = 275
    const marginLeft = -40
    const marginTop = 140

    const g2 = g1.append("g")
                .attr("width", 600)
                .attr("height", 200)
                .attr("transform", `translate(${marginLeft}, ${marginTop})`);

    // title for graph
    g2.append("text")
    .attr("x", widthBar / 2)
    .attr("y", -20)
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
    g2.append("g").call(yAxisCall2);

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
            .attr("y", i * 25 + 12)
            .text(label === "withIllness" ? "Reported Mental Health Issues" : "No Reported Mental Health Issues")
            .style("font-size", "12px");
        });


// plot 3: parallel coordinates //////////////////////////////////////////////////////////
// expanded from https://d3-graph-gallery.com/graph/parallel_basic.html //////////////////

    const widthPC = 750
    const heightPC = 300

    const g3 = g1.append("g")
                 .attr("width", 800)
                 .attr("height", 200)
                 .attr("transform", `translate(370, 130)`);

    g3.append("text")
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
    console.log(dimensions)

    var y = {};
    dimensions.forEach(dim => {
        const uniqueValues = [...new Set(newData.map(d => d[dim]))];

        // If it's a binary yes/no field, force order
        if (uniqueValues.includes("Yes") && uniqueValues.includes("No")) {
            y[dim] = d3.scalePoint()
            .domain(["No", "Yes"])  // forced consistent order
            .range([heightPC, 0]);
        } else {
            y[dim] = d3.scalePoint()
            .domain(uniqueValues.sort())  // default: alphabetical
            .range([heightPC, 0]);
        }
    });

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

    // Build the X scale -> find the best position for each Y axis
    x = d3.scalePoint()
          .range([0, widthPC])
          .padding(1)
          .domain(dimensions);


    // The path function take a row of the csv as input, and return x and y coordinates of the line to draw for this raw.
        function path(d) {
        return d3.line()(dimensions.map(p => [x(p), y[p](d[p])]));
        }

    // Draw the lines
    g3.selectAll("path")
      .data(newData)
      .enter().append("path")
      .attr("d", path)
      .attr("stroke", "steelblue")
      .attr("stroke-width", 1)
      .attr("opacity", 0.3)
      .attr("fill", "none");

    // Draw the axis:
    g3.selectAll("myAxis")
        // For each dimension of the dataset I add a 'g' element:
        .data(dimensions).enter()
        .append("g")
        // I translate this element to its right position on the x axis
        .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
        // And I build the axis with the call function
        .each(function(d) { d3.select(this).call(d3.axisLeft().scale(y[d])); })
        // Add axis title
        .append("text")
        .style("text-anchor", "middle")
        .attr("y", -15)
        .text(d => labelMap[d] || d)
        .style("fill", "black")
        .style("font-size", "12px")
        .style("font-family", "Times New Roman")
        .style("font-weight", "semibold")


// some text explaining rationale
    const widthText = 750
    const heightText = 300

    const g4 = g1.append("g")
                 .attr("width", 800)
                 .attr("height", 200)
                 .attr("transform", `translate(500, -50)`);
    const paragraph = "These visualizations explore the relationships between various factors of a student's identity, such as gender, age, marital status, and mental health disorders. The bar chart also explores correlations between GPA and mental health.";
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