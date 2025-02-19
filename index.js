let femaleTempData = [];
let maleTempData = [];
let femaleActData = [];
let maleActData = [];
let femaleDailyCorrelations = [];
let maleDailyCorrelations = [];

let currentGenderSelection = "all";
let currentDataSelection = "all"; // Default: show all data
var brushSelection;

async function loadTemperatureData(filenames, labels) {
  let data = [];

  for (let fileIndex = 0; fileIndex < filenames.length; fileIndex++) {
    const filename = filenames[fileIndex];
    const subjectPrefix = labels[fileIndex];

    const fileData = await d3.csv(`data/${filename}`);

    fileData.forEach((row, i) => {
      if (!data[i]) {
        data[i] = { minute: i + 1 };
      }

      for (let j = 1; j <= 13; j++) {
        data[i][`${subjectPrefix}${j}`] = Number(row[`${subjectPrefix}${j}`]) || NaN;
      }
    });
  }
  return data;
}

async function loadActivityData(filenames, labels) {
  let data = [];

  for (let fileIndex = 0; fileIndex < filenames.length; fileIndex++) {
    const filename = filenames[fileIndex];
    const subjectPrefix = labels[fileIndex];

    const fileData = await d3.csv(`data/${filename}`);

    fileData.forEach((row, i) => {
      if (!data[i]) {
        data[i] = { minute: i + 1 };
      }

      for (let j = 1; j <= 13; j++) {
        data[i][`${subjectPrefix}${j}`] = Number(row[`${subjectPrefix}${j}`]) || NaN;
      }
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

  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return ((n * sumXY) - (sumX * sumY)) / denominator;
}

function calculateDailyCorrelations(correlations, totalDays, minutesPerPeriod) {
  const dailyCorrelations = new Array(totalDays).fill(null); // Ensure 14 values

  for (let day = 0; day < totalDays; day++) {
    const startIdx = day * minutesPerPeriod;
    const endIdx = Math.min(startIdx + minutesPerPeriod, correlations.length);

    const dailyCorrs = correlations.slice(startIdx, endIdx).filter(d => !isNaN(d));

    if (dailyCorrs.length > 0) {
      dailyCorrelations[day] = d3.mean(dailyCorrs)  // Compute avg for that period
    } else {
      dailyCorrelations[day] = null;  // Mark missing data
    }

    console.log(`Day ${day + 1}: Daily Avg = ${dailyCorrelations[day] || "No Data"}`);
  }

  // Fill `null` values with 0 to ensure 14 values
  return dailyCorrelations.map(d => d !== null ? Math.max(-1, Math.min(1, d)) : 0);
}


function getDayData(data) {
  let dayData = [];
  for (let day = 0; day < 14; day++) {
    const startIdx = day * 1440 + 720;  // Start at minute 720 (12 PM)
    const endIdx = startIdx + 720;     // End at minute 1440 (12 AM)
    dayData = dayData.concat(data.slice(startIdx, endIdx));
  }
  return dayData;
}

function getNightData(data) {
  let nightData = [];
  for (let day = 0; day < 14; day++) {
    const startIdx = day * 1440;  // Start at minute 0 (12 AM)
    const endIdx = startIdx + 720;  // End at minute 720 (12 PM)
    nightData = nightData.concat(data.slice(startIdx, endIdx));
  }
  return nightData;
}

function calculateCorrelations() {
  let femaleTemp = [];
  let femaleAct = [];
  let maleTemp = [];
  let maleAct = [];
  let minutesPerPeriod = 1440; // Default full day
  let totalDays = 14; // Default 14 full days

  if (currentDataSelection === "day") {
    femaleTemp = getDayData(femaleTempData);
    femaleAct = getDayData(femaleActData);
    maleTemp = getDayData(maleTempData);
    maleAct = getDayData(maleActData);
    minutesPerPeriod = 720;  // Only half of each day

  } else if (currentDataSelection === "night") {
    femaleTemp = getNightData(femaleTempData);
    femaleAct = getNightData(femaleActData);
    maleTemp = getNightData(maleTempData);
    maleAct = getNightData(maleActData);
    minutesPerPeriod = 720;  // Only half of each day

  } else {
    femaleTemp = femaleTempData;
    femaleAct = femaleActData;
    maleTemp = maleTempData;
    maleAct = maleActData;
  }

  // Ensure all data sets have the same length
  const minLength = Math.min(femaleTemp.length, femaleAct.length, maleTemp.length, maleAct.length);
  femaleTemp = femaleTemp.slice(0, minLength);
  femaleAct = femaleAct.slice(0, minLength);
  maleTemp = maleTemp.slice(0, minLength);
  maleAct = maleAct.slice(0, minLength);

  if (!femaleTemp.length || !femaleAct.length || !maleTemp.length || !maleAct.length) {
    console.error("No valid data for selected range.");
    return;
  }

  // Compute Pearson correlations
  let femaleCorrelations = [];
  let maleCorrelations = [];

  for (let i = 0; i < minLength; i++) {
    const femaleCorrelation = pearsonCorrelation(femaleTemp[i], femaleAct[i]);
    const maleCorrelation = pearsonCorrelation(maleTemp[i], maleAct[i]);

    if (!isNaN(femaleCorrelation)) femaleCorrelations.push(femaleCorrelation);
    if (!isNaN(maleCorrelation)) maleCorrelations.push(maleCorrelation);
  }

  // Compute daily correlations based on selection
  let femaleDailyCorrelations = calculateDailyCorrelations(femaleCorrelations, totalDays, minutesPerPeriod);
  let maleDailyCorrelations = calculateDailyCorrelations(maleCorrelations, totalDays, minutesPerPeriod);

  updatePlot(femaleDailyCorrelations, maleDailyCorrelations);
}

function updatePlot(femaleDailyCorrelations, maleDailyCorrelations) {
  // tooltip
  const tooltip = d3.select("#chart").append("div")
    .attr("class", "tooltip")
    .style("position", "absolute")
    .style("background", "white")
    .style("border", "1px solid black")
    .style("padding", "5px")
    .style("border-radius", "5px")
    .style("visibility", "hidden")
    .style("pointer-events", "none");

  const svg = d3.select("#chart svg");


  const yScale = d3.scaleLinear().domain([-1, 1]).range([height, 0]);

  // Update female circles
  const femaleCircles = svg.selectAll(".femaleCorrelation")
    .data(femaleDailyCorrelations);

  femaleCircles.join(
    enter => enter.append("circle")
      .attr("class", "femaleCorrelation")
      .attr("cx", (d, i) => xScale(i + 1))
      .attr("cy", d => yScale(d))
      .attr("r", 5)
      .style("fill", "pink")
      .style("opacity", 0.6)
      .style("opacity", currentGenderSelection === "female" ? 1 : 0.6)
      .on("mouseover", function (event, d) {
        tooltip.style("visibility", "visible")
          .text(`${d.toFixed(3)}`);
      })
      .on("mousemove", function (event) {
        tooltip.style("top", (event.pageY - 10) + "px")
          .style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", function () {
        tooltip.style("visibility", "hidden");
      }),
    update => update.transition().duration(500)
      .attr("cx", (d, i) => xScale(i + 1))
      .attr("cy", d => yScale(d))
      .style("opacity", currentGenderSelection === "female" ? 1 : 0.6),
    exit => exit.remove()
  );


  // Update male circles
  const maleCircles = svg.selectAll(".maleCorrelation")
    .data(maleDailyCorrelations);

  maleCircles.join(
    enter => enter.append("circle")
      .attr("class", "maleCorrelation")
      .attr("cx", (d, i) => xScale(i + 1))
      .attr("cy", d => yScale(d))
      .attr("r", 5)
      .style("fill", "lightblue")
      .style("opacity", 0.6)
      .style("opacity", currentGenderSelection === "male" ? 1 : 0.6)
      .on("mouseover", function (event, d) {
        tooltip.style("visibility", "visible")
          .text(`${d.toFixed(3)}`);
      })
      .on("mousemove", function (event) {
        tooltip.style("top", (event.pageY - 10) + "px")
          .style("left", (event.pageX + 10) + "px");
      })
      .on("mouseout", function () {
        tooltip.style("visibility", "hidden");
      }),
    update => update.transition().duration(500)
      .attr("cx", (d, i) => xScale(i + 1))
      .attr("cy", d => yScale(d))
      .style("opacity", currentGenderSelection === "male" ? 1 : 0.6),
    exit => exit.remove()
  );
  // Create legend
const legendGroup = svg.append("g").attr("class", "legend");

// Female legend
legendGroup.append("circle")
  .attr("cx", 786)
  .attr("cy", 295)
  .attr("r", 6)
  .style("fill", "pink")
  .on("mouseover", function() {
    svg.selectAll(".femaleCorrelation")
      .transition().duration(200)
      .style("opacity", 1);
    svg.selectAll(".maleCorrelation")
      .transition().duration(200)
      .style("opacity", 0);
  })
  .on("mouseout", function() {
    svg.selectAll(".femaleCorrelation, .maleCorrelation")
      .transition().duration(200)
      .style("opacity", 0.6);
  });

legendGroup.append("text")
  .attr("x", 800)
  .attr("y", 300)
  .text("Female")
  .style("cursor", "pointer")
  .style("fill", "black")
  .on("mouseover", function() {
    svg.selectAll(".femaleCorrelation")
      .transition().duration(200)
      .style("opacity", 1);
    svg.selectAll(".maleCorrelation")
      .transition().duration(200)
      .style("opacity", 0);
  })
  .on("mouseout", function() {
    svg.selectAll(".femaleCorrelation, .maleCorrelation")
      .transition().duration(200)
      .style("opacity", 0.6);
  });

// Male legend
legendGroup.append("circle")
  .attr("cx", 786)
  .attr("cy", 320)
  .attr("r", 6)
  .style("fill", "lightblue")
  .on("mouseover", function() {
    svg.selectAll(".maleCorrelation")
      .transition().duration(200)
      .style("opacity", 1);
    svg.selectAll(".femaleCorrelation")
      .transition().duration(200)
      .style("opacity", 0);
  })
  .on("mouseout", function() {
    svg.selectAll(".femaleCorrelation, .maleCorrelation")
      .transition().duration(200)
      .style("opacity", 0.6);
  });

legendGroup.append("text")
  .attr("x", 800)
  .attr("y", 325)
  .text("Male")
  .style("cursor", "pointer")
  .style("fill", "black")
  .on("mouseover", function() {
    svg.selectAll(".maleCorrelation")
      .transition().duration(200)
      .style("opacity", 1);
    svg.selectAll(".femaleCorrelation")
      .transition().duration(200)
      .style("opacity", 0);
  })
  .on("mouseout", function() {
    svg.selectAll(".femaleCorrelation, .maleCorrelation")
      .transition().duration(200)
      .style("opacity", 0.6);
  });

}


// create svg
const margin = { top: 50, right: 50, bottom: 100, left: 50 };
const width = 1000 - margin.left - margin.right;
const height = 500 - margin.top - margin.bottom;

const svg = d3.select("#chart").append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .attr("viewBox", "-50 -50 1000 500")
  .attr("class", "correlationPlot");

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

svg.append("g")
  .attr("transform", `translate(0,${height})`)
  .call(d3.axisBottom(xScale).ticks(14));

svg.append("g")
  .call(d3.axisLeft(yScale));


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

// Add toggle switch
document.getElementById("dataToggle").addEventListener("change", function () {
  currentDataSelection = this.value;
  console.log("Data selection changed to:", currentDataSelection);
  calculateCorrelations();
});

// Load data and initialize plot
document.addEventListener("DOMContentLoaded", async () => {
  const tempFiles = [
    "Mouse_Data_Student_Copy.xlsx - Fem Temp.csv",
    "Mouse_Data_Student_Copy.xlsx - Male Temp.csv"
  ];
  const actFiles = [
    "Mouse_Data_Student_Copy.xlsx - Fem Act.csv",
    "Mouse_Data_Student_Copy.xlsx - Male Act.csv"
  ];
  const labels = ["f", "m"];

  const temperatureData = await loadTemperatureData(tempFiles, labels);
  const activityData = await loadActivityData(actFiles, labels);

  femaleTempData = [];
  femaleActData = [];
  maleTempData = [];
  maleActData = [];

  for (let min = 0; min < temperatureData.length; min++) {
    let minuteTemps = temperatureData[min];
    let minuteActs = activityData[min];

    if (minuteTemps) {
      femaleTempData.push(Object.values(minuteTemps).slice(1, 14));
      maleTempData.push(Object.values(minuteTemps).slice(14, 26));
    }

    if (minuteActs) {
      femaleActData.push(Object.values(minuteActs).slice(1, 14));
      maleActData.push(Object.values(minuteActs).slice(14, 26));
    }
  }

  document.getElementById("toggleFemale").checked = false;
  document.getElementById("toggleMale").checked = false;
  updateVisibility();

  document.getElementById("toggleFemale")?.addEventListener("change", updateVisibility);
  document.getElementById("toggleFemale")?.addEventListener("change", createFemalePlots);
  document.getElementById("toggleMale")?.addEventListener("change", updateVisibility);
  document.getElementById("toggleMale")?.addEventListener("change", createMalePlots);

  calculateCorrelations();
});

//   // toggle opacity
// function toggleLegend(legend) {
//   const isFemale = (legend === "female");

//   svg.selectAll(".femaleCorrelation")
//     .transition()
//     .style("opacity", isFemale ? 1 : 0.6);

//   svg.selectAll(".maleCorrelation")
//     .transition()
//     .style("opacity", isFemale ? 0.6 : 1);
//   }

// //   // create legend
// const legendGroup = svg.append("g").attr("class", "legend");

//   legendGroup.append("circle")
//       .attr("cx", 786)
//       .attr("cy", 295)
//       .attr("r", 6)
//       .style("fill", "pink")
//       .on("click", () => toggleLegend("female"));

//     legendGroup.append("text")
//     .attr("x", 800)
//     .attr("y", 300)
//     .text("Female")
//     .style("cursor", "pointer");

//     legendGroup.append("circle")
//     .attr("cx", 786)
//     .attr("cy", 320)
//     .attr("r", 6)
//     .style("fill", "lightblue")
//     .on("click", () => toggleLegend("male"));

//     legendGroup.append("text")
//     .attr("x", 800)
//     .attr("y", 325)
//     .text("Male")
//     .style("cursor", "pointer");

//   // add title
//   svg.append("text")
//     .attr("x", width / 2)
//     .attr("y", -20)
//     .style("text-anchor", "middle")
//     .text("Pearson Correlation of Temperature and Activity")
//     .style("font-weight", "bold")
//     .style("font-size", "16px");

//   // add axes labels
//   svg.append("text")
//     .attr("x", -height / 2)
//     .attr("y", -margin.left + 12)
//     .style("text-anchor", "middle")
//     .text("Correlation Coefficient (r)")
//     .style("transform", "rotate(-90deg)");

//   svg.append("text")
//     .attr("x", width - margin.right - 400)
//     .attr("y", height / 2 + 215)
//     .style("text-anchor", "middle")
//     .text("Day");

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

//   // add x and y axes
//   svg.append("g")
//     .attr("transform", `translate(0,${height})`)
//     .call(d3.axisBottom(xScale).ticks(14));


  // svg.append("g")
  //   .call(d3.axisLeft(yScale));
  //   legendGroup.selectAll("text, circle")
  //   .on("mouseover", function(event, d) {
  //     const text = d3.select(this).text();
  //     if (text === "Female") {
  //       svg.selectAll(".femaleCorrelation")
  //         .each(function() { d3.select(this).raise(); }) // bring to front
  //         .transition().duration(200)
  //         .style("opacity", 1);

  //       svg.selectAll(".maleCorrelation")
  //         .transition().duration(200)
  //         .style("opacity", 0);

  //     } else if (text === "Male") {
  //       svg.selectAll(".maleCorrelation")
  //         .each(function() { d3.select(this).raise(); }) // bring to front
  //         .transition().duration(200)
  //         .style("opacity", 1);

  //       svg.selectAll(".femaleCorrelation")
  //         .transition().duration(200)
  //         .style("opacity", 0);
  //     }
  //   })
  //   .on("mouseout", function() {
  //     svg.selectAll(".femaleCorrelation, .maleCorrelation")
  //       .transition().duration(200)
  //       .style("opacity", 0.6);
  //   });

// //curve
// const femaleTrendLine = d3.line()
//   .x((d, i) => xScale(i + 1))
//   .y(d => yScale(d))
//   .curve(d3.curveBasis); // Smooth the curve

// const maleTrendLine = d3.line()
//   .x((d, i) => xScale(i + 1))
//   .y(d => yScale(d))
//   .curve(d3.curveBasis);

// // Draw a trend line for female mice
// svg.append("path")
//   .datum(femaleDailyCorrelations)
//   .attr("class", "femaleTrendLine") 
//   .attr("fill", "none")
//   .attr("stroke", "pink")
//   .attr("stroke-width", 2)
//   .attr("d", femaleTrendLine)
//   .style("opacity", 0.7);

// svg.append("path")
//   .datum(maleDailyCorrelations)
//   .attr("class", "maleTrendLine") 
//   .attr("fill", "none")
//   .attr("stroke", "lightblue")
//   .attr("stroke-width", 2)
//   .attr("d", maleTrendLine)
//   .style("opacity", 0.7);

brushSelector();


function brushSelector() {
  const svg = document.querySelector('.correlationPlot');
  console.log(svg)
  d3.select(svg).call(d3.brush().on("start brush end", brushed));
  d3.select(svg).selectAll(".maleCorrelation, .femaleCorrelation").raise();
  d3.select(svg).selectAll("text")
    .style("fill", "black")
    .style("opacity", 1)      
    .raise();
  d3.select(svg).selectAll(".legend").raise();
}

function brushed(event) {
  brushSelection = event.selection;
  updateSelection();
  updateSelectionCount();
  updateSelectionMean();
}

function isSelected(correlation, idx) {
  if (!brushSelection) {
    return false;
  }
  const min = { x: brushSelection[0][0], y: brushSelection[0][1] }; 
  const max = { x: brushSelection[1][0], y: brushSelection[1][1] }; 
  const x = xScale(idx+1); 
  const y = yScale(correlation); 
  return x >= min.x && x <= max.x && y >= min.y && y <= max.y;
}

function updateSelection() {
  d3.selectAll('.maleCorrelation').classed('selected', (d, idx) => isSelected(d, idx));
  d3.selectAll('.femaleCorrelation').classed('selected', (d, idx) => isSelected(d, idx));
}

function updateSelectionCount(){
  const countElement = document.getElementById('selectionCount');
  countElement.textContent = `${
    d3.selectAll("circle.selected").size() || 'No'
  }  selected`;
}
function mean(arr) {
  if (arr.length === 0) return NaN; 
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

function updateSelectionMean() {
  const meanElement = document.getElementById('selectionMean');

  const femaleSelectedCommits = brushSelection
    ? femaleDailyCorrelations.filter((d,idx) => isSelected(idx, d))
    : [];
  const maleSelectedCommits = brushSelection
    ? maleDailyCorrelations.filter((d,idx) => isSelected(idx, d))
    : [];
  if ((femaleSelectedCommits.length === 0) && (maleDailyCorrelations.length === 0)){
    meanElement.innerHTML = ``;
  }
  meanElement.innerHTML = `Female Correlation Mean: ${mean(femaleSelectedCommits)}<br>
  Male Correlation Mean: ${mean(maleSelectedCommits)} <br>
  Total Mean: ${mean(femaleSelectedCommits.concat(maleSelectedCommits))}`;

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
    svg.selectAll(".femaleCorrelation").each(function () {
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
    svg.selectAll(".maleCorrelation").each(function () {
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

// // document.addEventListener("DOMContentLoaded", async () => {
// //   tooltip = d3.select("body").append("div")
// //       .attr("class", "tooltip")
// //       .style("position", "absolute")
// //       .style("background", "gray")
// //       .style("color", "#fff")
// //       .style("padding", "5px")
// //       .style("border-radius", "3px")
// //       .style("opacity", 0);

// //   await createCorrelationPlot(); 

// document.getElementById("toggleFemale").checked = false;
// document.getElementById("toggleMale").checked = false;
// document.getElementById("showLightsOn").checked = true;
// document.getElementById("showLightsOff").checked = true;
// updateVisibility();

// document.getElementById("toggleFemale")?.addEventListener("change", updateVisibility);
// document.getElementById("toggleFemale")?.addEventListener("change", createFemalePlots);
// document.getElementById("toggleMale")?.addEventListener("change", updateVisibility);
// document.getElementById("toggleMale")?.addEventListener("change", createMalePlots);
// // }); 