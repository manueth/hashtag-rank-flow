// rankflow.js
// © 2020, Manuel Schneider
// simple visualisation for hashtags
// javascript variant of Bernhard Rieder's work: http://labs.polsys.net/tools/rankflow/

// container: html element or css selector
// ranking: array of objects in the following form
// { …
//  <group-name>: [ …
//   { hashtag: string, group: string|number, count: number, value?: number }
//  … ]
// }
// options: see parameters at top of function
function createRankFlow(container, ranking, options={}) {
  // creating svg element
  let viewWidth = container.clientWidth;
  let viewHeight = container.clientHeight;
  let svg = d3.select(container).append('svg')
    .attr('width', '100%')
    .attr('height', '100%')
    .attr('viewBox', '0 0 ' + viewWidth + ' ' + viewHeight);

  // use update method to create chart
  updateRankFlow(container, ranking, options);
}

function updateRankFlow(container, ranking, options={}) {
  // parameters that can be specified through 'options'
  let paddingX = options.paddingX || 20;
  let paddingY = options.paddingY || 20;
  let marginTop = options.marginTop || 10;
  let marginRight = options.marginRight || -50;
  let maxWidth = options.maxWidth || 20;
  let minHeight = options.minHeight || 4;
  let marginY = options.marginY || 8;
  let valueRange = options.valueRange || [0,0.5,1];
  let colorRange = options.colorRange || ["white", "rgb(150,200,150)", "green"];
  let fontSize = options.fontSize || 10;
  let fontMargin = options.fontMargin || 10;
  let borderColor = options.borderColor || "black";
  let borderWidth = options.borderWidth || 0.5;
  let groupLabels = options.groupLabels || true;
  let colorLegend = options.colorLegend || true;
  let showValues = options.showValues || true;
  let colorLegendWidth = options.colorLegendWidth || 40;
  let colorLegendHeight = options.colorLegendHeight || 0.8;
  let legendFontSize = options.legendFontSize || 10;
  let roundValueDigits = options.roundValueDigits || 100;
  let numTopRanks = options.numTopRanks || 10;
  let rankValueKey = options.rankValueKey || 'count';

  // get view width
  let viewWidth = container.clientWidth;
  let viewHeight = container.clientHeight;

  // select svg element and clear chart. TODO: efficient update process
  let svg = d3.select(container).select('svg');
  svg.selectAll("*").remove();

  // get max sum of counts of all groups to determine height necessary
  let maxSum = 0;
  let maxRank = 0;
  for (let group in ranking) {
    let ranks = ranking[group].sort((a,b) => a[rankValueKey] > b[rankValueKey]);
    ranks.splice(0, ranks.length - numTopRanks);
    maxRank = Math.max(maxRank, ranks.length);
    let sum = ranks.reduce((a,b) => a + b.count, 0);
    maxSum = Math.max(maxSum, sum);
  }

  // determine horizontal space between groups and height available for chart
  let gdiff = (viewWidth - colorLegend * (colorLegendWidth + 2 * paddingX) - marginRight - 2 * paddingX) / Object.keys(ranking).length;
  let rfact = (viewHeight - 2 * paddingY - (groupLabels + showValues) * (2 * marginY + legendFontSize) - (maxRank - 1) * marginY - marginTop) / maxSum;

  // determien coordinates for boxes and links
  let data = [];
  let flows = [];
  let prevs = {};
  let groups = [];
  let gindex = 0;
  for (let group in ranking) {
    groups.push({ label: group, index: gindex });
    let hashtags = ranking[group];
    let ybase = viewHeight - paddingY - groupLabels * (2 * marginY + legendFontSize);
    for (let hashtag of hashtags) {
      hashtag._w = Math.min(gdiff/2, maxWidth);
      hashtag._h = Math.max(minHeight, hashtag.count * rfact);
      hashtag._x = paddingX + gindex * gdiff;
      hashtag._y = ybase - hashtag._h;
      ybase = hashtag._y - marginY;
      if (hashtag.hashtag in prevs) {
        let prev = prevs[hashtag.hashtag];
        flows.push({
          hashtag: hashtag.hashtag,
          value0: prev.value,
          value1: hashtag.value,
          x0: prev._x + prev._w,
          y0: { t: prev._y, l: prev._y + prev._h },
          x1: hashtag._x,
          y1: { t: hashtag._y, l: hashtag._y + hashtag._h }
        });
      }
      prevs[hashtag.hashtag] = hashtag;
    }
    gindex += 1;
    data.push.apply(data, hashtags);
  }

  // draw color legend if needed
  if (colorLegend) {
    let colorGradient = svg.append("defs").append("linearGradient")
      .attr("id", "colorGradient")
      .attr("x1", 0)
      .attr("y1", 1)
      .attr("x2", 0)
      .attr("y2", 0);
    for (let i=0; i<valueRange.length; i++) {
      colorGradient.append("stop")
        .attr("offset", (valueRange[i] - valueRange[0]) / (valueRange[valueRange.length - 1] - valueRange[0]))
        .attr("stop-color", colorRange[i])
        .attr("stop-opacity", 1);
      let y = paddingY + (1 - colorLegendHeight) * (viewHeight - 2 * paddingY) / 2
              + colorLegendHeight * (viewHeight - 2 * paddingY) * (1 - (valueRange[i] - valueRange[0])
              / (valueRange[valueRange.length - 1] - valueRange[0]));
      svg.append("text")
        .attr("x", viewWidth - paddingX - colorLegendWidth / 2)
        .attr("y", y)
        .attr("dx", colorLegendWidth / 4)
        .attr("dominant-baseline", () => {
          return i == 0 ? "baseline" : i == valueRange.length - 1 ? "hanging" : "middle";
        })
        .attr("text-anchor", "middle")
        .attr("style", "font: " + legendFontSize + "px sans-serif")
        .text(Math.round(valueRange[i] * 10) / 10);
      svg.append("line")
        .attr("x1", viewWidth - paddingX - 3 * colorLegendWidth / 4)
        .attr("y1", y)
        .attr("x2", viewWidth - paddingX - colorLegendWidth / 2)
        .attr("y2", y)
        .attr("stroke", borderColor)
        .attr("stroke-width", borderWidth);
    }
    svg.append("rect")
      .attr("x", viewWidth - paddingX - colorLegendWidth)
      .attr("y", paddingY + (1 - colorLegendHeight) * (viewHeight - 2 * paddingY) / 2)
      .attr("width", colorLegendWidth / 4)
      .attr("height", colorLegendHeight * (viewHeight - 2 * paddingY))
      .attr("stroke", borderColor)
      .attr("stroke-width", borderWidth)
      .attr("fill", "url(#colorGradient)");
  }

  // draw group labels if needed
  if (groupLabels) {
    svg.selectAll().data(groups).enter().append("text")
      .attr("x", d => paddingX + d.index * gdiff)
      .attr("y", viewHeight - paddingY)
      .attr("dominant-baseline", "baseline")
      .attr("style", "font: " + legendFontSize + "px sans-serif")
      .classed("group", true)
      .text(d => d.label);
    svg.append("line")
      .attr("x1", paddingX)
      .attr("y1", viewHeight - paddingY - legendFontSize - marginY / 2)
      .attr("x2", viewWidth - paddingX)
      .attr("y2", viewHeight - paddingY - legendFontSize - marginY / 2)
      .attr("stroke", borderColor)
      .attr("stroke-width", borderWidth);
  }

  // draw info field if needed
  let info;
  if (showValues) {
    info = svg.append("text")
      .attr("x", viewWidth / 2)
      .attr("y", paddingY)
      .attr("dominant-baseline", "hanging")
      .attr("text-anchor", "middle")
      .attr("style", "font: " + legendFontSize + "px sans-serif");
  }

  // draw links between boxes
  let links = svg.selectAll(".link")
    .data(flows).enter().append("path")
    .attr("d", d => {
      let cx0 = (d.x0 + d.x1)/2;
      let cx1 = (d.x0 + d.x1)/2;
      return "M" + d.x0 + " " + d.y0.t + " "
        + "C" + cx0 + " " + d.y0.t + " " + cx1 + " " + d.y1.t + " " + d.x1 + " " + d.y1.t + " "
        + "L" + d.x1 + " " + d.y1.l + " "
        + "C" + cx0 + " " + d.y1.l + " " + cx1 + " " + d.y0.l + " " + d.x0 + " " + d.y0.l + " "
        + "Z"
    })
    .attr("fill", "rgba(200,200,200)")
    .attr("opacity", 0.4)
    .attr("data-hashtag", d => d.hashtag)
    .classed("link", true);

  // draw boxes representing hashtag count
  let colorScale = d3.scaleLinear().domain(valueRange).range(colorRange);
  let boxes = svg.selectAll(".box")
    .data(data).enter().append("rect")
    .attr("x", d => d._x)
    .attr("y", d => d._y)
    .attr("width", d => d._w)
    .attr("height", d => d._h)
    .attr("fill", d => colorScale(d.value))
    .attr("stroke", borderColor)
    .attr("stroke-width", borderWidth)
    .attr("data-hashtag", d => d.hashtag)
    .classed("box", true)
    .on("mouseover", d => {
      if (showValues) {
        info.text("count: " + d.count + ", value: " + Math.round(roundValueDigits * d.value) / roundValueDigits);
      }
      svg.selectAll(".box:not([data-hashtag='"+d.hashtag+"'])").attr("opacity", 0.4);
      svg.selectAll(".label:not([data-hashtag='"+d.hashtag+"'])").attr("opacity", 0.4);
      svg.selectAll(".link[data-hashtag='"+d.hashtag+"']").attr("opacity", 0.85);
    })
    .on("mouseout", d => {
      if (showValues) {
        info.text("")
      }
      svg.selectAll(":not(.link)").attr("opacity", 1);
      svg.selectAll(".link").attr("opacity", 0.4);
    });

  // draw hashtag text next to box
  let labels = svg.selectAll(".label")
    .data(data).enter().append("text")
    .attr("x", d => d._x + d._w)
    .attr("y", d => d._y + d._h / 2)
    .attr("dx", fontMargin)
    .attr("dominant-baseline", "middle")
    .attr("style", "font: " + fontSize + "px sans-serif")
    .attr("data-hashtag", d => d.hashtag)
    .classed("label", true)
    .text(d => d.hashtag);
}
