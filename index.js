let femaleTempData = [];
let maleTempData = [];
let femaleActData = [];
let maleActData = [];
let tooltip;

async function loadTemperatureData(filenames, labels) {
  let data = [];

  for (let fileIndex = 0; fileIndex < filenames.length; fileIndex++) {
    const filename = filenames[fileIndex];
    const subjectPrefix = labels[fileIndex];
    const fileData = await d3.csv(`data/${filename}`, (row, i) => {
      if (!data[i]) {
        data[i] = { minute: i + 1 };
      }

      for (let j = 1; j <= 13; j++) {
        data[i][`${subjectPrefix}${j}`] = Number(row[`${subjectPrefix}${j}`]);
      }
      return data[i];
    });
  }
  return data;
}

async function loadActivityData(filenames, labels) {
  let data = [];

  for (let fileIndex = 0; fileIndex < filenames.length; fileIndex++) {
    const filename = filenames[fileIndex];
    const subjectPrefix = labels[fileIndex];
    const fileData = await d3.csv(`data/${filename}`, (row, i) => {
      if (!data[i]) {
        data[i] = { minute: i + 1 };
      }

      for (let j = 1; j <= 13; j++) {
        data[i][`${subjectPrefix}${j}`] = Number(row[`${subjectPrefix}${j}`]);
      }
      return data[i];
    });
  }
  return data;
}

function smoothData(data, window_size) {
let smoothedData = [];
for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - Math.floor(window_size / 2));
    const end = Math.min(data.length, i + Math.floor(window_size / 2) + 1);
    const window = data.slice(start, end);
    smoothedData.push(d3.mean(window));
}
return smoothedData;
}

function pearsonCorrelation(x, y) {
const n = x.length;
const sumX = d3.sum(x);
const sumY = d3.sum(y);
const sumXY = d3.sum(x.map((xi, i) => xi * y[i]));
const sumX2 = d3.sum(x.map(xi => xi * xi));
const sumY2 = d3.sum(y.map(yi => yi * yi));

const numerator = (n * sumXY) - (sumX * sumY);
const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

return numerator / denominator;
}

function dailyCorrelation(correlations, numDays = 1) {
const minutesPerDay = 1440;
const dailyCorrelations = [];

for (let day = 0; day < numDays; day++) {
  const startIdx = day * minutesPerDay;
  const endIdx = startIdx + minutesPerDay;
  const dailyCorrs = correlations.slice(startIdx, endIdx);

  const dailyAvg = d3.mean(dailyCorrs);
  dailyCorrelations.push(dailyAvg);
}

return dailyCorrelations;
}

let xScale;//加

async function createCorrelationPlot() {
// load data
const tempFiles = ["Mouse_Data_Student_Copy.xlsx - Fem Temp.csv", "Mouse_Data_Student_Copy.xlsx - Male Temp.csv"];
const actFiles = ["Mouse_Data_Student_Copy.xlsx - Fem Act.csv", "Mouse_Data_Student_Copy.xlsx - Male Act.csv"];
const labels = ["f", "m"];
let temperatureData = await loadTemperatureData(tempFiles, labels);
console.log(temperatureData);
let activityData = await loadActivityData(actFiles, labels);
console.log(activityData);

// separate data
femaleTempData = [];
maleTempData = [];
femaleActData = [];
maleActData = [];

for (let min = 0; min < 20160; min++) {
  // data for current minute
  let minuteTemps = temperatureData.slice(min, min + 1);
  let minuteActs = activityData.slice(min, min + 1);

  if (minuteTemps[0]) {
    let femaleTempSlice = Object.values(minuteTemps[0]).slice(1, 14);
    femaleTempData.push(femaleTempSlice);
    let maleTempSlice = Object.values(minuteTemps[0]).slice(14, 26);
    maleTempData.push(maleTempSlice);

    let femaleActSlice = Object.values(minuteActs[0]).slice(1, 14);
    femaleActData.push(femaleActSlice);
    let maleActSlice = Object.values(minuteActs[0]).slice(14, 26);
    maleActData.push(maleActSlice);
  }
}

console.log(femaleTempData.length, femaleActData.length, maleTempData.length, maleActData.length);

// initialize correlation arrays
let femaleDailyCorrelations = [];
let maleDailyCorrelations = [];

// calculate daily correlations
for (let day = 0; day < 14; day++) {
  const femaleTempForDay = femaleTempData.slice(day * 1440, (day + 1) * 1440);
  const femaleActForDay = femaleActData.slice(day * 1440, (day + 1) * 1440);
  const maleTempForDay = maleTempData.slice(day * 1440, (day + 1) * 1440);
  const maleActForDay = maleActData.slice(day * 1440, (day + 1) * 1440);

  const femaleMinuteByMinuteCorrelation = femaleTempForDay.map((temp, i) => pearsonCorrelation(temp, femaleActForDay[i]));
  const maleMinuteByMinuteCorrelation = maleTempForDay.map((temp, i) => pearsonCorrelation(temp, maleActForDay[i]));

  const femaleDailyCorrelation = d3.mean(femaleMinuteByMinuteCorrelation);
  const maleDailyCorrelation = d3.mean(maleMinuteByMinuteCorrelation);

  console.log(`day ${day + 1} - female correlation: ${femaleDailyCorrelation}, male correlation: ${maleDailyCorrelation}`);

  femaleDailyCorrelations.push(femaleDailyCorrelation);
  maleDailyCorrelations.push(maleDailyCorrelation);
}

// create svg
const margin = { top: 50, right: 50, bottom: 100, left: 50 };
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#chart").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

// set up scales
const xScale = d3.scaleLinear()
  .domain([0, 14])
  .range([0, width]);

const xAxis = svg.append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0, ${height})`)
  .call(d3.axisBottom(xScale));

const yScale = d3.scaleLinear()
  .domain([-1, 1])
  .range([height, 0]);

// tooltip
const tooltip = d3.select("body").append("div")
.attr("class", "tooltip")
.style("position", "absolute")
.style("background", "system")
.style("padding", "5px")
.style("border-radius", "3px")
.style("opacity", 0);

// plot female correlations
svg.selectAll(".femaleCorrelation")
.data(femaleDailyCorrelations)
.enter().append("circle")
.attr("class", "femaleCorrelation")
.attr("cx", (d, i) => xScale(i + 1))
.attr("cy", (d) => yScale(d))
.attr("r", 5)
.style("fill", "pink")
.style("opacity", 0.6)
.on("mouseover", function(event, d) {
const mouseX = event.pageX;
const mouseY = event.pageY;

d3.select(this).style("opacity", 1);

// show tooltip with correlation data
tooltip.transition().duration(200).style("opacity", 1);
tooltip.html(`Female Correlation: ${d}`)
  .style("left", `${mouseX + 5}px`)
  .style("top", `${mouseY + 5}px`);
})
.on("mouseout", function() {
tooltip.transition().duration(200).style("opacity", 0);
d3.select(this).style("opacity", 0.6);
});

// plot male correlations
svg.selectAll(".maleCorrelation")
.data(maleDailyCorrelations)
.enter().append("circle")
.attr("class", "maleCorrelation")
.attr("cx", (d, i) => xScale(i + 1))
.attr("cy", (d) => yScale(d))
.attr("r", 5)
.style("fill", "lightblue")
.style("opacity", 0.6)
.on("mouseover", function(event, d) {
const mouseX = event.pageX;
const mouseY = event.pageY;

d3.select(this).style("opacity", 1);

// show tooltip with correlation data
tooltip.transition().duration(200).style("opacity", 1);
tooltip.html(`Male Correlation: ${d}`)
  .style("left", `${mouseX + 5}px`)
  .style("top", `${mouseY + 5}px`);
})
.on("mouseout", function() {
tooltip.transition().duration(200).style("opacity", 0);
d3.select(this).style("opacity", 0.6);
});

// toggle opacity
function toggleLegend(legend) {
const isFemale = (legend === "female");

svg.selectAll(".femaleCorrelation")
  .transition()
  .style("opacity", isFemale ? 1 : 0.6);

svg.selectAll(".maleCorrelation")
  .transition()
  .style("opacity", isFemale ? 0.6 : 1);
}

// create legend
const legendGroup = svg.append("g").attr("class", "legend");

legendGroup.append("circle")
.attr("cx", 786)
.attr("cy", 295)
.attr("r", 6)
.style("fill", "pink")
.on("click", () => toggleLegend("female"));

legendGroup.append("text")
.attr("x", 800)
.attr("y", 300)
.text("Female")
.style("cursor", "pointer");

legendGroup.append("circle")
.attr("cx", 786)
.attr("cy", 320)
.attr("r", 6)
.style("fill", "lightblue")
.on("click", () => toggleLegend("male"));

legendGroup.append("text")
.attr("x", 800)
.attr("y", 325)
.text("Male")
.style("cursor", "pointer");

// add title
svg.append("text")
  .attr("x", width / 2)
  .attr("y", -20)
  .style("text-anchor", "middle")
  .text("Pearson Correlation of Temperature and Activity")
  .style("font-weight", "bold")
  .style("font-size", "16px");

// add axes labels
svg.append("text")
  .attr("x", -height / 2)
  .attr("y", -margin.left + 12)
  .style("text-anchor", "middle")
  .text("Correlation Coefficient (r)")
  .style("transform", "rotate(-90deg)");

svg.append("text")
  .attr("x", width - margin.right - 400)
  .attr("y", height / 2 + 215)
  .style("text-anchor", "middle")
  .text("Day");

  const subtitle = [
    "Daily Pearson correlation coefficients between core body temperature and activity level in male (n = 13) and female (n = 13) mice over 14 days."
  ];
  
  const lineHeight = 16;
  const fontSize = "12px";
  
  // add plot description
  subtitle.forEach((line, index) => {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 60 + index * lineHeight)
      .attr("text-anchor", "middle")
      .style("font-size", fontSize)
      .text(line);
  });

// add x and y axes
svg.append("g")
  .attr("transform", `translate(0,${height})`)
  .call(d3.axisBottom(xScale).ticks(14));


svg.append("g")
  .call(d3.axisLeft(yScale));
  legendGroup.selectAll("text, circle")
  .on("mouseover", function(event, d) {
    const text = d3.select(this).text();

    if (text === "Female") {
      svg.selectAll(".femaleCorrelation")
        .each(function() { d3.select(this).raise(); }) // bring to front
        .transition().duration(200)
        .style("opacity", 1);

      svg.selectAll(".maleCorrelation")
        .transition().duration(200)
        .style("opacity", 0);

    } else if (text === "Male") {
      svg.selectAll(".maleCorrelation")
        .each(function() { d3.select(this).raise(); }) // bring to front
        .transition().duration(200)
        .style("opacity", 1);

      svg.selectAll(".femaleCorrelation")
        .transition().duration(200)
        .style("opacity", 0);
    }
  })

  .on("mouseout", function() {
    svg.selectAll(".femaleCorrelation, .maleCorrelation")
      .transition().duration(200)
      .style("opacity", 0.6);
  });

//curve
const femaleTrendLine = d3.line()
  .x((d, i) => xScale(i + 1))
  .y(d => yScale(d))
  .curve(d3.curveBasis); // Smooth the curve

const maleTrendLine = d3.line()
  .x((d, i) => xScale(i + 1))
  .y(d => yScale(d))
  .curve(d3.curveBasis);

// Draw a trend line for female mice
svg.append("path")
  .datum(femaleDailyCorrelations)
  .attr("class", "femaleTrendLine") 
  .attr("fill", "none")
  .attr("stroke", "pink")
  .attr("stroke-width", 2)
  .attr("d", femaleTrendLine)
  .style("opacity", 0.7);

svg.append("path")
  .datum(maleDailyCorrelations)
  .attr("class", "maleTrendLine") 
  .attr("fill", "none")
  .attr("stroke", "lightblue")
  .attr("stroke-width", 2)
  .attr("d", maleTrendLine)
  .style("opacity", 0.7);
}

function updateVisibility() {
  const showFemale = document.getElementById("toggleFemale").checked;
  const showMale = document.getElementById("toggleMale").checked;

  console.log("Show Female Trendline:", showFemale, "Show Male Trendline:", showMale);

  // show or hide the female/male plot containers based on the toggle
  const axesContainer1 = d3.select("#female-plot");
  axesContainer1.style("display", showFemale ? "inline-block" : "none");

  const axesContainer2 = d3.select("#male-plot");
  axesContainer2.style("display", showMale ? "inline-block" : "none");
  
  const svg = d3.select("#chart svg");

  // bring to front
  if (showFemale) {
    svg.selectAll(".femaleCorrelation").each(function() {
      d3.select(this).raise();
    });
  }

  // Control female data points and trend lines
  svg.selectAll(".femaleCorrelation")
    .transition().duration(200)
    .style("opacity", showFemale ? 1 : 0.6); 

  svg.selectAll(".femaleTrendLine")
    .transition().duration(200)
    .style("opacity", showFemale ? 0.7 : 0); 

    // bring to front
  if (showMale) {
    svg.selectAll(".maleCorrelation").each(function() {
      d3.select(this).raise();
    });
  }

  // Control male data points and trend lines
  svg.selectAll(".maleCorrelation")
    .transition().duration(200)
    .style("opacity", showMale ? 1 : 0.6); 

  svg.selectAll(".maleTrendLine")
    .transition().duration(200)
    .style("opacity", showMale ? 0.7 : 0); 

  console.log("Updated visibility");
}

function calculateHourlyAverages(data) {
  const hourlyAverages = {};

  // group data by hour
  data.forEach((d) => {
    const hour = Math.floor(d.minute / 60);

    if (!hourlyAverages[hour]) {
      hourlyAverages[hour] = { values: [], count: 0 };
    }

    // iterate over the readings and include only "f<number>" or "m<number>"
    Object.keys(d).forEach((key) => {
      if ((/^f\d+$/.test(key) || /^m\d+$/.test(key)) && !isNaN(d[key])) {
        hourlyAverages[hour].values.push(d[key]);
        hourlyAverages[hour].count += 1;
      }
    });
  });

  // calculate the average for each hour
    const result = Object.keys(hourlyAverages).map(hour => {
    const dataForHour = hourlyAverages[hour];
    const avg = dataForHour.count > 0 ? d3.mean(dataForHour.values) : 0;
    return { hour: parseInt(hour), value: avg };
  });

  // sort by hour
  result.sort((a, b) => a.hour - b.hour);
  return result;
}

let femalePlotCreated = false;

async function createFemalePlots() {
  if (femalePlotCreated) return;

  const tempFiles = ["Mouse_Data_Student_Copy.xlsx - Fem Temp.csv"];
  const actFiles = ["Mouse_Data_Student_Copy.xlsx - Fem Act.csv"];
  const labels = ["f"];
  let temperatureData = await loadTemperatureData(tempFiles, labels);
  let activityData = await loadActivityData(actFiles, labels);

  const processedTempData = calculateHourlyAverages(temperatureData);
  const processedActData = calculateHourlyAverages(activityData);

  const smoothedTempData = smoothData(processedTempData.map(d => d.value), 3);
  const smoothedActData = smoothData(processedActData.map(d => d.value), 3);

  const axesContainer = d3.select("#female-plot");
  const margin = { top: 50, right: 50, bottom: 100, left: 50 };
  const width = 500 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const totalHours = 24 * 14; // 14 days of data

  function addLightBars(svg, xScale) {
    let lightPeriods = [];
    
    for (let day = 0; day < 14; day++) {
      let startOn = day * 24 + 12;
      let endOn = startOn + 12;     
      lightPeriods.push({ start: startOn, end: endOn, color: "yellow" });

      let startOff = day * 24;
      let endOff = startOff + 12;  
      lightPeriods.push({ start: startOff, end: endOff, color: "lightgrey" });
    }

    svg.selectAll(".light-bar")
      .data(lightPeriods)
      .enter()
      .append("rect")
      .attr("class", "light-bar")
      .attr("x", d => xScale(d.start))
      .attr("width", d => xScale(d.end) - xScale(d.start))
      .attr("y", 0)
      .attr("height", height)
      .attr("fill", d => d.color)
      .attr("opacity", 0.2);
  }

  function addEstrusCycleBar(svg, xScale) {
    let estrusPeriods = [];
    
    for (let cycleStart = 24; cycleStart < totalHours; cycleStart += 96) {
      let cycleEnd = cycleStart + 24;
      estrusPeriods.push({ start: cycleStart, end: cycleEnd });
    }
  
    svg.selectAll(".estrus-bar")
      .data(estrusPeriods)
      .enter()
      .append("rect")
      .attr("class", "estrus-bar")
      .attr("x", d => xScale(d.start))
      .attr("width", d => xScale(d.end) - xScale(d.start))
      .attr("y", -10) // positioned at the top
      .attr("height", 10)
      .attr("fill", "pink") // pink for estrus cycle
      .attr("opacity", 0.6);
  }

  // create temperature plot
  const svg1 = axesContainer.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("display", "inline-block")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale1 = d3.scaleLinear()
    .domain([0, totalHours])
    .range([0, width]);

  const yScale1 = d3.scaleLinear()
    .domain([d3.min(smoothedTempData), d3.max(smoothedTempData)])
    .range([height, 0]);

  addLightBars(svg1, xScale1);
  addEstrusCycleBar(svg1, xScale1);

  svg1.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale1));
  svg1.append("g").call(d3.axisLeft(yScale1));

  svg1.append("path")
    .data([smoothedTempData])
    .attr("fill", "none")
    .attr("stroke", "pink")
    .attr("stroke-width", 2)
    .attr("d", d3.line()
      .x((d, i) => xScale1(processedTempData[i].hour))
      .y(d => yScale1(d))
    );

  // create activity plot
  const svg2 = axesContainer.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("display", "inline-block")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale2 = d3.scaleLinear()
    .domain([0, totalHours])
    .range([0, width]);

  const yScale2 = d3.scaleLinear()
    .domain([d3.min(smoothedActData), d3.max(smoothedActData)])
    .range([height, 0]);

  addLightBars(svg2, xScale2);
  addEstrusCycleBar(svg2, xScale2);

  svg2.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale2));
  svg2.append("g").call(d3.axisLeft(yScale2));

  svg2.append("path")
    .data([smoothedActData])
    .attr("fill", "none")
    .attr("stroke", "pink")
    .attr("stroke-width", 2)
    .attr("d", d3.line()
      .x((d, i) => xScale2(processedActData[i].hour))
      .y(d => yScale2(d))
    );

    // add axes labels for the first svg
    svg1.append("text")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 12)
    .style("text-anchor", "middle")
    .text("Temperature (ºC)")
    .style("transform", "rotate(-90deg)");

  svg1.append("text")
    .attr("x", width - margin.right - 150)
    .attr("y", height / 2 + 215)
    .style("text-anchor", "middle")
    .text("Hour");

  // add title for first svg
    svg1.append("text")
      .attr("x", width / 2)
      .attr("y", -margin.top / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .text("Average Temperature");

      const subtitle1 = [
        "Average hourly core body temperature (smoothed over 3-hour intervals)",
        "in female mice (n = 13) over 14 days. Grey and yellow color blocks represent",
        "lights off and on, respectively. Pink color blocks represent estrus cycle."
      ];
      
      const lineHeight = 16;
      const fontSize = "12px";
      
      // add plot description
      subtitle1.forEach((line, index) => {
        svg1.append("text")
          .attr("x", width / 2)
          .attr("y", height + 60 + index * lineHeight)
          .attr("text-anchor", "middle")
          .style("font-size", fontSize)
          .text(line);
      });

  // add axes labels for second svg
  svg2.append("text")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 12)
    .style("text-anchor", "middle")
    .text("Activity Level")
    .style("transform", "rotate(-90deg)");

  svg2.append("text")
    .attr("x", width - margin.right - 150)
    .attr("y", height / 2 + 215)
    .style("text-anchor", "middle")
    .text("Hour");

  // add title for second svg
  svg2.append("text")
  .attr("x", width / 2)
  .attr("y", -margin.top / 2)
  .attr("text-anchor", "middle")
  .style("font-size", "16px")
  .style("font-weight", "bold")
  .text("Average Activity");

  const subtitle2 = [
    "Average activity level (smoothed over 3-hour intervals) in female",
    "mice (n = 13) over 14 days. Grey and yellow color blocks represent",
    "lights off and on, respectively. Pink color blocks represent estrus cycle."
  ];
  
  // add plot description
  subtitle2.forEach((line, index) => {
    svg2.append("text")
      .attr("x", width / 2)
      .attr("y", height + 60 + index * lineHeight)
      .attr("text-anchor", "middle")
      .style("font-size", fontSize)
      .text(line);
  });

  femalePlotCreated = true;
}

let malePlotCreated = false;

async function createMalePlots() {
  if (malePlotCreated) return;

  const tempFiles = ["Mouse_Data_Student_Copy.xlsx - Male Temp.csv"];
  const actFiles = ["Mouse_Data_Student_Copy.xlsx - Male Act.csv"];
  const labels = ["m"];
  let temperatureData = await loadTemperatureData(tempFiles, labels);
  let activityData = await loadActivityData(actFiles, labels);

  const processedTempData = calculateHourlyAverages(temperatureData);
  const processedActData = calculateHourlyAverages(activityData);

  const smoothedTempData = smoothData(processedTempData.map(d => d.value), 3);
  const smoothedActData = smoothData(processedActData.map(d => d.value), 3);

  const axesContainer = d3.select("#male-plot");
  const margin = { top: 50, right: 50, bottom: 100, left: 50 };
  const width = 500 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const totalHours = 24 * 14;

  function addLightBars(svg, xScale) {
    let lightPeriods = [];

    for (let day = 0; day < 14; day++) {
      let startOn = day * 24 + 12;  
      let endOn = startOn + 12;     
      lightPeriods.push({ start: startOn, end: endOn, color: "yellow" });

      let startOff = day * 24;      
      let endOff = startOff + 12;   
      lightPeriods.push({ start: startOff, end: endOff, color: "lightgrey" });
    }

    svg.selectAll(".light-bar")
      .data(lightPeriods)
      .enter()
      .append("rect")
      .attr("class", "light-bar")
      .attr("x", d => xScale(d.start))
      .attr("width", d => xScale(d.end) - xScale(d.start))
      .attr("y", 0)
      .attr("height", height)
      .attr("fill", d => d.color)
      .attr("opacity", 0.2);
  }

  // create temperature plot
  const svg1 = axesContainer.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("display", "inline-block")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale1 = d3.scaleLinear().domain([0, totalHours]).range([0, width]);
  const yScale1 = d3.scaleLinear().domain([d3.min(smoothedTempData), d3.max(smoothedTempData)]).range([height, 0]);

  addLightBars(svg1, xScale1);

  svg1.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale1));
  svg1.append("g").call(d3.axisLeft(yScale1));

  svg1.append("path")
    .data([smoothedTempData])
    .attr("fill", "none")
    .attr("stroke", "lightblue")
    .attr("stroke-width", 2)
    .attr("d", d3.line()
      .x((d, i) => xScale1(processedTempData[i].hour))
      .y(d => yScale1(d))
    );

  // create activity plot
  const svg2 = axesContainer.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("display", "inline-block")
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale2 = d3.scaleLinear().domain([0, totalHours]).range([0, width]);
  const yScale2 = d3.scaleLinear().domain([d3.min(smoothedActData), d3.max(smoothedActData)]).range([height, 0]);

  addLightBars(svg2, xScale2);

  svg2.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(xScale2));
  svg2.append("g").call(d3.axisLeft(yScale2));

  svg2.append("path")
    .data([smoothedActData])
    .attr("fill", "none")
    .attr("stroke", "lightblue")
    .attr("stroke-width", 2)
    .attr("d", d3.line()
      .x((d, i) => xScale2(processedActData[i].hour))
      .y(d => yScale2(d))
    );

    // add axes labels for the first svg
    svg1.append("text")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 12)
    .style("text-anchor", "middle")
    .text("Temperature (ºC)")
    .style("transform", "rotate(-90deg)");

  svg1.append("text")
    .attr("x", width - margin.right - 150)
    .attr("y", height / 2 + 215)
    .style("text-anchor", "middle")
    .text("Hour");

  // add title for first svg
  svg1.append("text")
  .attr("x", width / 2)
  .attr("y", -margin.top / 2)
  .attr("text-anchor", "middle")
  .style("font-size", "16px")
  .style("font-weight", "bold")
  .text("Average Temperature");

  const subtitle1 = [
    "Average hourly core body temperature (smoothed over 3-hour intervals) in male mice",
    "(n = 13) over 14 days. Grey and yellow color blocks represent lights off and on, respectively."
  ];
  
  const lineHeight = 16;
  const fontSize = "12px";
  
  // add plot description
  subtitle1.forEach((line, index) => {
    svg1.append("text")
      .attr("x", width / 2)
      .attr("y", height + 60 + index * lineHeight)
      .attr("text-anchor", "middle")
      .style("font-size", fontSize)
      .text(line);
  });

  // add axes labels for second svg
  svg2.append("text")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 12)
    .style("text-anchor", "middle")
    .text("Activity Level")
    .style("transform", "rotate(-90deg)");

  svg2.append("text")
    .attr("x", width - margin.right - 150)
    .attr("y", height / 2 + 215)
    .style("text-anchor", "middle")
    .text("Hour");

  // add title for second svg
  svg2.append("text")
  .attr("x", width / 2)
  .attr("y", -margin.top / 2)
  .attr("text-anchor", "middle")
  .style("font-size", "16px")
  .style("font-weight", "bold")
  .text("Average Activity");

  const subtitle2 = [
    "Average activity level (smoothed over 3-hour intervals) in male mice (n = 13) over",
    "14 days. Grey and yellow color blocks represent lights off and on, respectively."
  ];
  
  // add plot description
  subtitle2.forEach((line, index) => {
    svg2.append("text")
      .attr("x", width / 2)
      .attr("y", height + 60 + index * lineHeight)
      .attr("text-anchor", "middle")
      .style("font-size", fontSize)
      .text(line);
  });

  malePlotCreated = true;
}

document.addEventListener("DOMContentLoaded", async () => {
  tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "gray")
      .style("color", "#fff")
      .style("padding", "5px")
      .style("border-radius", "3px")
      .style("opacity", 0);

  await createCorrelationPlot(); 

  document.getElementById("toggleFemale").checked = false;
  document.getElementById("toggleMale").checked = false;
  document.getElementById("showLightsOn").checked = false;
  document.getElementById("showLightsOff").checked = false;
  updateVisibility();

  document.getElementById("toggleFemale")?.addEventListener("change", updateVisibility);
  document.getElementById("toggleFemale")?.addEventListener("change", createFemalePlots);
  document.getElementById("toggleMale")?.addEventListener("change", updateVisibility);
  document.getElementById("toggleMale")?.addEventListener("change", createMalePlots);
}); 