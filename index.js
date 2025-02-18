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
  const femaleTempData = [];
  const maleTempData = [];
  const femaleActData = [];
  const maleActData = [];

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
 
  const yScale = d3.scaleLinear()
    .domain([-1, 1])
    .range([height, 0]);

  // tooltip
  const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("background", "lightgray")
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
  
  // Show tooltip with correlation data
  tooltip.transition().duration(200).style("opacity", 1);
  tooltip.html(`Female Correlation: ${d}`)
    .style("left", `${mouseX + 5}px`)
    .style("top", `${mouseY + 5}px`);
})
.on("mouseout", function() {
  tooltip.transition().duration(200).style("opacity", 0);
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

  // Show tooltip with correlation data
  tooltip.transition().duration(200).style("opacity", 1);
  tooltip.html(`Male Correlation: ${d}`)
    .style("left", `${mouseX + 5}px`)
    .style("top", `${mouseY + 5}px`);
})
.on("mouseout", function() {
  tooltip.transition().duration(200).style("opacity", 0);
});

// Function to toggle opacity on legend click
function toggleLegend(legend) {
const isFemale = legend === "female";

svg.selectAll(".femaleCorrelation")
  .transition()
  .style("opacity", isFemale ? 1 : 0.6);  // Make female points opaque or transparent

svg.selectAll(".maleCorrelation")
  .transition()
  .style("opacity", isFemale ? 0.6 : 1);  // Make male points opaque or transparent
}

// Create Legend
const legendGroup = svg.append("g").attr("class", "legend");

legendGroup.append("circle")
.attr("cx", 780)
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
.attr("cx", 780)
.attr("cy", 320)
.attr("r", 6)
.style("fill", "lightblue")
.on("click", () => toggleLegend("male"));

legendGroup.append("text")
.attr("x", 800)
.attr("y", 325)
.text("Male")
.style("cursor", "pointer");
 
  // // plot female daily correlations
  // svg.selectAll(".femaleCorrelation")
  //   .data(femaleDailyCorrelations)
  //   .enter().append("circle")
  //   .attr("class", "femaleCorrelation")
  //   .attr("cx", (d, i) => xScale(i + 1))
  //   .attr("cy", (d) => yScale(d))
  //   .attr("r", 6);
 
  // // plot male daily correlations
  // svg.selectAll(".maleCorrelation")
  //   .data(maleDailyCorrelations)
  //   .enter().append("circle")
  //   .attr("class", "maleCorrelation")
  //   .attr("cx", (d, i) => xScale(i + 1))
  //   .attr("cy", (d) => yScale(d))
  //   .attr("r", 6); 

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
          .transition().duration(200)
          .style("opacity", 1);
  
        svg.selectAll(".maleCorrelation")
          .transition().duration(200)
          .style("opacity", 0);
      } else if (text === "Male") {
        svg.selectAll(".maleCorrelation")
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
  
}

document.addEventListener('DOMContentLoaded', async () => {
    await createCorrelationPlot();
  });