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
    // processTemperatureData(data);
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
    // processActivityData(data);
}

document.addEventListener('DOMContentLoaded', async () => {
    const tempFiles = ["Mouse_Data_Student_Copy.xlsx - Fem Temp.csv", "Mouse_Data_Student_Copy.xlsx - Male Temp.csv"];
    const actFiles = ["Mouse_Data_Student_Copy.xlsx - Fem Act.csv", "Mouse_Data_Student_Copy.xlsx - Male Act.csv"];
    const labels = ["f", "m"];
    await loadTemperatureData(tempFiles, labels);
    console.log("Temperature data loaded!");
    await loadActivityData(actFiles, labels);
    console.log("Activity data loaded!");
  });