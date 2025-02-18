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
    console.log(data);
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
    console.log(data);
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

// Function to create the plot
async function createPlot() {
  // Load the data
  const tempFiles = ["Mouse_Data_Student_Copy.xlsx - Fem Temp.csv", "Mouse_Data_Student_Copy.xlsx - Male Temp.csv"];
  const actFiles = ["Mouse_Data_Student_Copy.xlsx - Fem Act.csv", "Mouse_Data_Student_Copy.xlsx - Male Act.csv"];
  const labels = ["f", "m"];
  let temperatureData = await loadTemperatureData(tempFiles, labels);
  let activityData = await loadActivityData(actFiles, labels);

  // Apply smoothing to the temperature and activity data
  const window_size = 3;
  const mouse_female_temp_daily_avg = temperatureData.slice(0, 13);  // Female temperature data
  const mouse_male_temp_daily_avg = temperatureData.slice(13, 26);   // Male temperature data
  const mouse_female_act_daily_avg = activityData.slice(0, 13);      // Female activity data
  const mouse_male_act_daily_avg = activityData.slice(13, 26);       // Male activity data

  mouse_female_temp_daily_avg.smoothed_temp = smoothData(mouse_female_temp_daily_avg.map(d => d.f1), window_size);
  mouse_male_temp_daily_avg.smoothed_temp = smoothData(mouse_male_temp_daily_avg.map(d => d.m1), window_size);
  mouse_female_act_daily_avg.smoothed_act = smoothData(mouse_female_act_daily_avg.map(d => d.f1), window_size);
  mouse_male_act_daily_avg.smoothed_act = smoothData(mouse_male_act_daily_avg.map(d => d.m1), window_size);

  // --- Create SVG for Plot ---
  const margin = { top: 50, right: 50, bottom: 100, left: 50 };
  const width = 1000 - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#chart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // --- Create X and Y Scales ---
  const xScale = d3.scaleLinear()
      .domain([0, 14])  // Days 1 to 14
      .range([0, width]);

  const yTempScale = d3.scaleLinear()
      .domain([30, 40])  // Temperature range
      .range([height / 2, 0]);

  const yActScale = d3.scaleLinear()
      .domain([0, 60])  // Activity range
      .range([height, height / 2]);

  // --- Create Line Generators ---
  const tempLineFem = d3.line()
      .x((d, i) => xScale(i / 24 + 1))  // Convert hour to day
      .y(d => yTempScale(d));

  const tempLineMale = d3.line()
      .x((d, i) => xScale(i / 24 + 1))  // Convert hour to day
      .y(d => yTempScale(d));

  const actLineFem = d3.line()
      .x((d, i) => xScale(i / 24 + 1))  // Convert hour to day
      .y(d => yActScale(d));

  const actLineMale = d3.line()
      .x((d, i) => xScale(i / 24 + 1))  // Convert hour to day
      .y(d => yActScale(d));

  // --- Add Temperature Traces (Left Panel) ---
  svg.append("path")
      .data([mouse_female_temp_daily_avg.smoothed_temp])
      .attr("class", "line")
      .attr("d", tempLineFem)
      .style("stroke", "pink")
      .style("fill", "none")
      .style("stroke-width", 2);

  svg.append("path")
      .data([mouse_male_temp_daily_avg.smoothed_temp])
      .attr("class", "line")
      .attr("d", tempLineMale)
      .style("stroke", "lightblue")
      .style("fill", "none")
      .style("stroke-width", 2);

  // --- Add Activity Traces (Right Panel) ---
  svg.append("path")
      .data([mouse_female_act_daily_avg.smoothed_act])
      .attr("class", "line")
      .attr("d", actLineFem)
      .style("stroke", "pink")
      .style("fill", "none")
      .style("stroke-width", 2);

  svg.append("path")
      .data([mouse_male_act_daily_avg.smoothed_act])
      .attr("class", "line")
      .attr("d", actLineMale)
      .style("stroke", "lightblue")
      .style("fill", "none")
      .style("stroke-width", 2);

  // --- Add Estrus Cycle Color Blocks (Left Panel) ---
  const estrusStart = 48; // Day 48 (example)
  const estrusDuration = 24; // 24-hour duration
  for (let day = estrusStart; day < 96; day += 96) {
      svg.append("rect")
          .attr("x", xScale(day / 24))
          .attr("y", yTempScale(38))
          .attr("width", xScale((day + estrusDuration) / 24) - xScale(day / 24))
          .attr("height", yTempScale(30) - yTempScale(38))
          .style("fill", "rgba(255, 182, 193, 0.3)")
          .style("stroke", "none");
  }

  // --- Add Light/Dark Cycle Color Blocks (Right Panel) ---
  for (let start = 24; start <= 96; start += 12) {
      const color = (Math.floor(start / 12) % 2 === 1) ? 'rgba(255, 255, 0, 0.1)' : 'rgba(169, 169, 169, 0.1)';
      svg.append("rect")
          .attr("x", xScale(start / 24))
          .attr("y", yActScale(60))
          .attr("width", xScale(12 / 24) - xScale(0))
          .attr("height", yActScale(0) - yActScale(60))
          .style("fill", color)
          .style("stroke", "none");
  }

  // --- Add Labels and Title ---
  svg.append("text")
      .attr("x", width / 2)
      .attr("y", -20)
      .style("text-anchor", "middle")
      .text("Temperature and Activity of Mice")
      .style("font-size", "16px");

  // --- Add Axes ---
  svg.append("g")
      .attr("transform", `translate(0,${height / 2})`)
      .call(d3.axisBottom(xScale).ticks(14));

  svg.append("g")
      .call(d3.axisLeft(yTempScale));

  svg.append("g")
      .attr("transform", `translate(0,${height / 2})`)
      .call(d3.axisBottom(xScale).ticks(14));

  svg.append("g")
      .call(d3.axisLeft(yActScale));

  // --- Add Annotations ---
  svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 20)
      .style("text-anchor", "middle")
      .text("Average hourly core body temperature and activity (smoothed over 3-hour intervals) in male versus female mice over 14 days.")
      .style("font-size", "12px");

  // --- Add Labels for Y-Axis ---
  svg.append("text")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 20)
      .style("text-anchor", "middle")
      .text("Temperature (°C)")
      .style("transform", "rotate(-90deg)");

  svg.append("text")
      .attr("x", width + margin.right - 10)
      .attr("y", height / 2 + 20)
      .style("text-anchor", "middle")
      .text("Activity");
}

document.addEventListener('DOMContentLoaded', async () => {
    await createPlot();
  });