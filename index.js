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
  .text("Pearson Correlation of Temperature and Activity for Male vs Female Mice")
  .style("font-size", "16px");

// add axes labels
svg.append("text")
  .attr("x", -height / 2)
  .attr("y", -margin.left + 12)
  .style("text-anchor", "middle")
  .text("Pearson Correlation")
  .style("transform", "rotate(-90deg)");

svg.append("text")
  .attr("x", width - margin.right - 400)
  .attr("y", height / 2 + 215)
  .style("text-anchor", "middle")
  .text("Day");

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

function calculateHourlyAveragesFemale(data) {
  const hourlyAverages = [];
  const hourlyData = {};

  // group data by hour
  data.forEach((d, index) => {
    const hour = Math.floor(d.minute / 60);

    if (!hourlyData[hour]) {
      hourlyData[hour] = { values: [], count: 0 };
    }

    // iterate over the temperature readings
    for (const key in d) {
      if (key.startsWith('f') && !isNaN(d[key])) {
        hourlyData[hour].values.push(d[key]);
        hourlyData[hour].count += 1;
      }
    }
  });

  // calculate the average for each hour
  Object.keys(hourlyData).forEach(hour => {
    const dataForHour = hourlyData[hour];
    const avg = dataForHour.count > 0 ? d3.mean(dataForHour.values) : 0;
    hourlyAverages.push({ hour: parseInt(hour), value: avg });
  });

  // sort by hour
  hourlyAverages.sort((a, b) => a.hour - b.hour);
  return hourlyAverages;
}

function calculateHourlyAveragesMale(data) {
  const hourlyAverages = [];
  const hourlyData = {};

  // group data by hour
  data.forEach((d, index) => {
    const hour = Math.floor(d.minute / 60);

    if (!hourlyData[hour]) {
      hourlyData[hour] = { values: [], count: 0 };
    }

    // iterate over the temperature readings
    for (const key in d) {
      if (key.startsWith('m') && !isNaN(d[key])) {
        hourlyData[hour].values.push(d[key]);
        hourlyData[hour].count += 1;
      }
    }
  });

  // calculate the average for each hour
  Object.keys(hourlyData).forEach(hour => {
    const dataForHour = hourlyData[hour];
    const avg = dataForHour.count > 0 ? d3.mean(dataForHour.values) : 0;
    hourlyAverages.push({ hour: parseInt(hour), value: avg });
  });

  // sort by hour
  hourlyAverages.sort((a, b) => a.hour - b.hour);
  return hourlyAverages;
}

let femalePlotCreated = false;

async function createFemalePlots() {
  // check if the female plot has already been created
  if (femalePlotCreated) {
    return; // skip creation if the plot is already created
  }

  // load data
  const tempFiles = ["Mouse_Data_Student_Copy.xlsx - Fem Temp.csv"];
  const actFiles = ["Mouse_Data_Student_Copy.xlsx - Fem Act.csv"];
  const labels = ["f"];
  let temperatureData = await loadTemperatureData(tempFiles, labels);
  console.log(temperatureData);
  let activityData = await loadActivityData(actFiles, labels);
  console.log(activityData);

  // process the temperature and activity data
  const processedTempData = calculateHourlyAveragesFemale(temperatureData);
  const processedActData = calculateHourlyAveragesFemale(activityData);

  console.log(processedTempData, processedActData);

  // apply 3-hour moving average to smooth data
  const smoothedTempData = smoothData(processedTempData.map(d => d.value), 3);
  const smoothedActData = smoothData(processedActData.map(d => d.value), 3);

  console.log(smoothedTempData, smoothedActData);

  // create container for axes (side by side)
  const axesContainer = d3.select("#female-plot");

  // create svg for the first axis (left side)
  const margin = { top: 50, right: 50, bottom: 100, left: 50 };
  const width = 500 - margin.left - margin.right;  // adjust width for side-by-side
  const height = 500 - margin.top - margin.bottom;

  const svg1 = axesContainer.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("display", "inline-block") // to position them side by side
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // set up scales for the first axis
  const xScale1 = d3.scaleLinear()
    .domain([0, d3.max(processedTempData, d => d.hour)])
    .range([0, width]);

  const yScale1 = d3.scaleLinear()
    .domain([d3.min(smoothedTempData), d3.max(smoothedTempData)])
    .range([height, 0]);

  // add x and y axes for the first axis
  svg1.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale1));

  svg1.append("g")
    .call(d3.axisLeft(yScale1));

  svg1.append("path")
  .data([smoothedTempData])
  .attr("fill", "none")
  .attr("stroke", "pink")
  .attr("stroke-width", 2)
  .attr("d", d3.line()
    .x((d, i) => xScale1(processedTempData[i].hour))
    .y(d => yScale1(d))
  );

  // create svg for the second axis (right side)
  const svg2 = axesContainer.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("display", "inline-block") // to position them side by side
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // set up scales for the second axis
  const xScale2 = d3.scaleLinear()
    .domain([0, d3.max(processedActData, d => d.hour)])
    .range([0, width]);

  const yScale2 = d3.scaleLinear()
    .domain([d3.min(smoothedActData), d3.max(smoothedActData)])
    .range([height, 0]);

  // add x and y axes for the second axis
  svg2.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale2));

  svg2.append("g")
    .call(d3.axisLeft(yScale2));

  // plot data
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

  femalePlotCreated = true; // mark the female plot as created
}

let malePlotCreated = false;

async function createMalePlots() {
  // check if the female plot has already been created
  if (malePlotCreated) {
    return; // skip creation if the plot is already created
  }

  // load data
  const tempFiles = ["Mouse_Data_Student_Copy.xlsx - Male Temp.csv"];
  const actFiles = ["Mouse_Data_Student_Copy.xlsx - Male Act.csv"];
  const labels = ["m"];
  let temperatureData = await loadTemperatureData(tempFiles, labels);
  console.log(temperatureData);
  let activityData = await loadActivityData(actFiles, labels);
  console.log(activityData);

  // process the temperature and activity data
  const processedTempData = calculateHourlyAveragesMale(temperatureData);
  const processedActData = calculateHourlyAveragesMale(activityData);

  console.log(processedTempData, processedActData);

  // apply 3-hour moving average to smooth data
  const smoothedTempData = smoothData(processedTempData.map(d => d.value), 3);
  const smoothedActData = smoothData(processedActData.map(d => d.value), 3);

  console.log(smoothedTempData, smoothedActData);

  // create container for axes (side by side)
  const axesContainer = d3.select("#male-plot");

  // create svg for the first axis (left side)
  const margin = { top: 50, right: 50, bottom: 100, left: 50 };
  const width = 500 - margin.left - margin.right;  // adjust width for side-by-side
  const height = 500 - margin.top - margin.bottom;

  const svg1 = axesContainer.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("display", "inline-block") // to position them side by side
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // set up scales for the first axis
  const xScale1 = d3.scaleLinear()
    .domain([0, d3.max(processedTempData, d => d.hour)])
    .range([0, width]);

  const yScale1 = d3.scaleLinear()
    .domain([d3.min(smoothedTempData), d3.max(smoothedTempData)])
    .range([height, 0]);

  // add x and y axes for the first axis
  svg1.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale1));

  svg1.append("g")
    .call(d3.axisLeft(yScale1));

  svg1.append("path")
  .data([smoothedTempData])
  .attr("fill", "none")
  .attr("stroke", "lightblue")
  .attr("stroke-width", 2)
  .attr("d", d3.line()
    .x((d, i) => xScale1(processedTempData[i].hour))
    .y(d => yScale1(d))
  );

  // create svg for the second axis (right side)
  const svg2 = axesContainer.append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .style("display", "inline-block") // to position them side by side
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // set up scales for the second axis
  const xScale2 = d3.scaleLinear()
    .domain([0, d3.max(processedActData, d => d.hour)])
    .range([0, width]);

  const yScale2 = d3.scaleLinear()
    .domain([d3.min(smoothedActData), d3.max(smoothedActData)])
    .range([height, 0]);

  // add x and y axes for the second axis
  svg2.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(xScale2));

  svg2.append("g")
    .call(d3.axisLeft(yScale2));

  // plot data
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

  malePlotCreated = true; // mark the female plot as created
}

document.addEventListener("DOMContentLoaded", async () => {
  tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "#fff")
      .style("padding", "5px")
      .style("border-radius", "3px")
      .style("opacity", 0);

  await createCorrelationPlot(); 

  document.getElementById("toggleFemale").checked = false;
  document.getElementById("toggleMale").checked = false;
  updateVisibility();

  document.getElementById("toggleFemale")?.addEventListener("change", updateVisibility);
  document.getElementById("toggleFemale")?.addEventListener("change", createFemalePlots);
  document.getElementById("toggleMale")?.addEventListener("change", updateVisibility);
  document.getElementById("toggleMale")?.addEventListener("change", createMalePlots);
}); 