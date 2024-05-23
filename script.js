d3.json('data.json').then(data => {
    const timeline = d3.select("#timeline");
    const projectsContainer = d3.select("#projects");

    const parseDate = d3.timeParse("%Y-%m-%d");
    const formatDate = d3.timeFormat("%B %d, %Y");
    const formatMonthYear = d3.timeFormat("%b %Y");

    const timelineMarginTop = -60;
    const legendTimelineOffet = -40;
    const wordCloudHeight = 300;
    const wordCloudWidth = 700
    const wordCloudPad = 0;

    const timelineLeft = 0;

    const legendWidth = 300;
    let legendHeight = 30;
    const legendMarginX = 100;
    const legendMarginY = 10;
    const legendItemWidth = 30;
    const legendItemHeight = 10;
    const itemsPerRow = 2;
    legendHeight = legendItemHeight * itemsPerRow + legendMarginY * (itemsPerRow + 1);

    const rectWidth = 20;
    const rectMargin = 15;
    const rectSpacing = rectWidth + rectMargin;

    data.forEach(d => {
        d.start_date = parseDate(d.start_date);
        d.end_date = parseDate(d.end_date);
        d.total_days = (d.end_date - d.start_date) / (1000 * 60 * 60 * 24);
    });

    data.sort((a, b) => a.start_date - b.start_date);

    const categories = [...new Set(data.map(d => d.category))];
    const colorScale = d3.scaleOrdinal()
        .domain(categories)
        .range(d3.schemeCategory10);

    // Utility function to add 6 months to a date
    function addMonths(date, months) {
        const result = new Date(date);
        result.setMonth(result.getMonth() + months);
        return result;
    }

    // Utility function to add 6 months to a date
    function subtractMonths(date, months) {
        const result = new Date(date);
        result.setMonth(result.getMonth() - months);
        return result;
    }

    const startDate = subtractMonths(d3.min(data, d => d.start_date), 6);
    const endDate = addMonths(d3.max(data, d => d.end_date), 6);

    const timelineHeight = window.innerHeight - 150 - wordCloudHeight - wordCloudPad;
    const yScale = d3.scaleTime()
        .domain([startDate, endDate])
        .range([0, timelineHeight]);

    const svg = timeline.append("svg")
        .attr("width", 120)
        .attr("height", timelineHeight + legendHeight + timelineMarginTop)
        .style("overflow", "visible");

    svg.append("line")
        .attr("x1", timelineLeft)
        .attr("x2", timelineLeft)
        .attr("y1", timelineMarginTop + wordCloudHeight + wordCloudPad)
        .attr("y2", timelineHeight + timelineMarginTop + wordCloudHeight + wordCloudPad)
        .attr("stroke", "#ddd")
        .attr("stroke-width", 4);

    const axis = d3.axisLeft(yScale)
        .tickFormat(formatMonthYear)
        .ticks(d3.timeMonth.every(6));

    svg.append("g")
        .attr("transform", `translate(${timelineLeft}, ${timelineMarginTop + wordCloudHeight + wordCloudPad})`)
        .call(axis);

        const columnEndDates = []; // Store the last end date of each column

    // To store x positions and column end dates
    let columns = {};

    const rects = svg.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("x", (d, i) => {
            let xPosition = 0;
            let column = 0;
            while (columns[column] && columns[column] > new Date(d.start_date)) {
                column++;
            }
            xPosition = column * (rectWidth + rectSpacing) + 70;
            columns[column] = new Date(d.end_date);
            return xPosition;
        })
        .attr("y", d => yScale(new Date(d.start_date)) + timelineMarginTop + wordCloudHeight + wordCloudPad)
        .attr("width", rectWidth)
        .attr("height", d => yScale(new Date(d.end_date)) - yScale(new Date(d.start_date)))
        .attr("fill", d => colorScale(d.category))
        .attr("opacity", 0.7)
        .attr("class", "timeline-rect")
        .attr("id", (d, i) => `rect-${i}`);
        
    columns = {};
    // Add labels for each rectangle
    const labels = svg.selectAll(".timeline-label")
        .data(data)
        .enter()
        .append("text")
        .attr("x", (d, i) => {
            let xPosition = 0;
            let column = 0;
            while (columns[column] && columns[column] > new Date(d.start_date)) {
                column++;
            }
            xPosition = column * (rectWidth + rectSpacing) + rectWidth / 2 + 70;
            columns[column] = new Date(d.end_date);
            return xPosition;
        })
        .attr("y", d => yScale(new Date(d.start_date)) + timelineMarginTop + wordCloudHeight + wordCloudPad + (yScale(new Date(d.end_date)) - yScale(new Date(d.start_date))) / 2)
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .attr("transform", function(d, i) {
            const x = d3.select(this).attr("x");
            const y = d3.select(this).attr("y");
            console.log(x,y)
            return `rotate(-60, ${x}, ${y})`;
        })
        .text(d => d.shortTitle)
        .attr("class", "timeline-label");

    data.forEach((project, i) => {
        const color = colorScale(project.category);
        const numberOfBars = Math.ceil(project.budget / 1000000);

        const projectDiv = projectsContainer.append("div")
            .attr("class", "project")
            .style("border-left", `5px solid ${color}`)
            .attr("id", `project-${i}`)
            .html(`
                <div class="title">${project.title}</div>
                <div class="dates">${formatDate(project.start_date)} - ${formatDate(project.end_date)}</div>
                <div class="description">${project.description}</div>`);
    });

    const totalBudget = data.reduce((acc, curr) => acc + curr.budget, 0);
    const pendingBudget = data.reduce((acc, curr) => curr.tag === "pending" ? acc + curr.budget : acc, 0);
    const currentBudget = data.reduce((acc, curr) => curr.tag === "current" ? acc + curr.budget : acc, 0);
    const completedBudget = data.reduce((acc, curr) => curr.tag === "completed" ? acc + curr.budget : acc, 0);

    let currentSpend = 0;
    let completedSpend = 0;
    let pendingSpend = 0;
    let totalSpend = 0;
    let activeProjectIndex = -1;
    
    // Update subtotals
    const completedTotal = document.getElementById("completed-total");
    const currentTotal = document.getElementById("current-total");
    const pendingTotal = document.getElementById("pending-total");
    const cumulativeTotal = document.getElementById("budget-total");

    // Assuming you have assigned the values to these variables
    const completedValue = `Completed Projects: $0 / $${completedBudget.toLocaleString()}`; 
    const currentValue = `Current Projects: $0 / $${currentBudget.toLocaleString()}`;
    const pendingValue = `Pending Projects: $0 / $${pendingBudget.toLocaleString()}`; 
    const totalValue = `Total: $0 / $${totalBudget.toLocaleString()}`; 

    completedTotal.textContent = completedValue;
    currentTotal.textContent = currentValue;
    pendingTotal.textContent = pendingValue;
    cumulativeTotal.textContent = totalValue

    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(60, ${wordCloudHeight+wordCloudPad+timelineMarginTop+legendTimelineOffet})`);

    categories.forEach((category, i) => {
        const row = Math.floor(i / itemsPerRow);
        const col = i % itemsPerRow;

        const x = col * (legendItemWidth + legendMarginX);
        const y = row * (legendItemHeight + legendMarginY);

        legend.append("rect")
            .attr("x", x)
            .attr("y", y)
            .attr("width", legendItemWidth)
            .attr("height", legendItemHeight)
            .attr("fill", colorScale(category));

        legend.append("text")
            .attr("x", x + legendItemWidth + 5)
            .attr("y", y + legendItemHeight / 2)
            .attr("dy", "0.35em")
            .text(category)
            .style("font-size", "12px");
    });

    // Generate initial word cloud with all keywords
    const wordFrequencies = {};
    data.forEach(d => {
        const allKeywords = [...d.keywords];
        allKeywords.forEach(word => {
            if (wordFrequencies[word]) {
                wordFrequencies[word]++;
            } else {
                wordFrequencies[word] = 1;
            }
        });
    });
    
    // Convert word frequencies to array format for word cloud layout
    const wordCloudData = Object.keys(wordFrequencies).map(word => ({
        text: word,
        size: wordFrequencies[word] * 10 // Adjust multiplier as needed
    }));

    let keywordColors = {};
    // Assign a color to each unique keyword
    wordCloudData.forEach((keyword, i) => {
        if (!keywordColors[keyword.text]) {
            keywordColors[keyword.text] = d3.schemeSet1[i % 3];
        }
    });

    drawWordCloud(wordCloudData, keywordColors);

    // Function to draw the word cloud once
    function drawWordCloud(wordCloudData, colors) {
        const width = wordCloudWidth;
        const height = wordCloudHeight;

        const layout = d3.layout.cloud()
        .size([width, height])
        .words(wordCloudData)
        .padding(5)
        .rotate(() => ~~(Math.random() * 2) * 90)
        .font("Impact")
        .fontSize(d => d.size)
        .on("end", draw);

        // Draw word cloud
        layout.start();

        function draw(words) {
            d3.select("#word-cloud").append("svg")
                .attr("width", width)
                .attr("height", height)
                .append("g")
                .attr("transform", `translate(${width / 2},${height / 2})`)
                .selectAll("text")
                .data(words)
                .enter().append("text")
                .style("font-size", d => `${d.size}px`)
                .style("font-family", "Impact")
                .style("fill", "black") // Default fill color
                .attr("text-anchor", "middle")
                .attr("transform", d => `translate(${[d.x, d.y]})rotate(${d.rotate})`)
                .text(d => d.text)
                .attr("class", d => d.text.replace(/\s+/g, '-')) // Class for later selection
                .each(function(d) {
                    // Store the original color in a data attribute
                    d3.select(this).attr("data-color", colors[d.text]);
                });
        }
    }

    // Update word cloud highlights when project is highlighted
    function updateHighlights(highlightedKeywords) {
        d3.select("#word-cloud").selectAll("text")
            .style("fill", function(d) {
                return highlightedKeywords.includes(d.text) ? d3.select(this).attr("data-color") : "black";
            })
            .attr("class", d => highlightedKeywords.includes(d.text) ? "highlighted" : "");
    }


    let lastScrollPosition = window.scrollY;

    window.addEventListener('scroll', () => {
        const currentScrollPosition = window.scrollY;
        const scrollDirection = currentScrollPosition > lastScrollPosition ? 'down' : 'up';
        lastScrollPosition = currentScrollPosition;
        const projectDivs = document.querySelectorAll(".project");
        let isFirst = true;
        projectDivs.forEach((div, index) => {
            const rect = div.getBoundingClientRect();
            if (rect.top > window.innerHeight / 2 && isFirst) {
                isFirst = false;
                const currentProject = data[index];
                
                d3.selectAll(".timeline-rect").attr("opacity", 0.7);
                d3.select(`#rect-${index}`).attr("opacity", 1);

                d3.selectAll(".project").style("background-color", "#f9f9f9");
                d3.select(`#project-${index}`).style("background-color", "#e0f7fa");

                if (index !== activeProjectIndex && data[index]) {

                    const currentProject = scrollDirection === 'up' ? data[activeProjectIndex] : data[index];
                    totalSpend = scrollDirection === 'up' ? totalSpend - currentProject.budget : totalSpend + currentProject.budget;
                    currentSpend = scrollDirection === 'up' ? currentProject.tag === 'current' ? currentSpend - currentProject.budget : currentSpend : currentProject.tag === 'current' ? currentSpend + currentProject.budget : currentSpend;
                    pendingSpend = scrollDirection === 'up' ? currentProject.tag === 'pending' ? pendingSpend - currentProject.budget : pendingSpend : currentProject.tag === 'pending' ? pendingSpend + currentProject.budget : pendingSpend;
                    completedSpend = scrollDirection === 'up' ? currentProject.tag === 'completed' ? completedSpend - currentProject.budget : completedSpend : currentProject.tag === 'completed' ? completedSpend + currentProject.budget : completedSpend;

                    cumulativeTotal.textContent = `Total Spend: $${totalSpend.toLocaleString()} / $${totalBudget.toLocaleString()}`;
                    pendingTotal.textContent = `Pending Projects: $${pendingSpend.toLocaleString()} / $${pendingBudget.toLocaleString()}`;
                    currentTotal.textContent = `Current Projects: $${currentSpend.toLocaleString()} / $${currentBudget.toLocaleString()}`; 
                    completedTotal.textContent = `Completed Projects: $${completedSpend.toLocaleString()} / $${completedBudget.toLocaleString()}`; 
                    activeProjectIndex = index;
                }

                const currentKeywords = [...currentProject.keywords];
                updateHighlights(currentKeywords);   

            }
        });
    });

    function highlightKeywords(text, keywords) {
        const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
        return text.replace(keywordRegex, '<span class="bold">$1</span>');
    }

});
