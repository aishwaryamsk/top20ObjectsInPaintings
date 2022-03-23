const numLabels = 20;

/* Dimensions */
let width = 540, height = 540;
let radius = 0.45 * height;

/* Radii */
let strokeDonutOuterRadius = radius;
let strokeDonutInnerRadius = 0.85 * radius;

let labelDonutOuterRadius = 0.83 * radius;
let labelDonutInnerRadius = 0.45 * radius;

let dottedDonutOuterRadius = 0.43 * radius;
let dottedDonutInnerRadius = 0.4 * radius;

/* Other */
let strokeDonut, labelDonut;

let numPaintings;

let metDataMap, artLabels;

let svg;
let color;

let prevInnerCurveId = 0;
let prevStrokeClickedId = null;

//Stroke Donut
let strokeArc = d3.arc()
  .outerRadius(strokeDonutOuterRadius)
  .innerRadius(strokeDonutInnerRadius)
  .padAngle(5 * 0.04);

let strokePie = d3.pie()
  .sort(null)
  .value(1);

//Label Donut
let labelArc = d3.arc()
  .outerRadius(labelDonutOuterRadius)
  .innerRadius(labelDonutInnerRadius)

let innerPie = d3.pie()
  .sort(null)
  .value(d => d.Frequency);

// DOTTED ARC
//Indicator Donut
let dottedArc = d3.arc()
  .outerRadius(dottedDonutOuterRadius)
  .innerRadius(dottedDonutInnerRadius)
  .cornerRadius(4);

let dottedPie = d3.pie()
  .sort(null)
  .value(
    function (d, i) {
      return d.Frequency;
    }
  );

Promise.all([
  d3.csv('met_data-since19thcentury.csv'),
  d3.csv('labels_frequency.csv'),
  d3.csv('labels list.csv'),
  d3.text('labels_object_ids.txt')
]).then(function (data) {

  this.data = data;
  let metData = data[0];
  let frequencyData = data[1];

  artLabels = data[2];

  let labelObjectIdsData = [];
  let objectIdsPerLabel = data[3].replace(/\n/g, ' ').split(' ');
  objectIdsPerLabel.forEach(row => {
    if (row)
      labelObjectIdsData.push(row.split(','));
  });

  numPaintings = metData.length;

  svg = d3.select('#chart-container')
    .append('svg')
    .attr("id", "pie-chart")
    .attr('preserveAspectRatio', 'xMinYMin')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

  // Create a map for objects ids in a label from text formatted data
  metDataMap = new Map;
  metData.forEach((obj, i) => {
    let { object_id, ...rest } = obj;
    rest.index = i;
    metDataMap.set(parseInt(object_id), rest);
  });

  color = d3.scaleOrdinal()
    .domain(frequencyData.map(d => d.Label))
    .range(d3.quantize(t => d3.interpolateBlues((1 - t) * 0.7 + 0.1), frequencyData.length));

  this.updateStrokeData(labelObjectIdsData, 0);


  labelDonut = svg.selectAll('#label-donut')
    .data(innerPie(frequencyData))
    .enter().append('g');

  labelDonut.append('path')
    .attr('id', 'innerCurve')
    .attr('d', labelArc)
    .style('fill', d => color(d.data.Label))
    .attr('opacity', '0.8')

  labelDonut.append('text')
    .attr('id', 'labelText')
  labelDonut.on('click', function (d, i) {
    updateStrokeData(labelObjectIdsData, i), handleLabelClick(d, i)
  });


  svg.selectAll('#labelText').each(insertLineBreaks);
  svg.selectAll('#labelText').attr('transform', transformLabelTexts);

  let dottedDonut = svg.selectAll('#inner-curve')
    .data(dottedPie(frequencyData))
    .enter().append('g');

  dottedDonut.append('path')
    .attr('id', 'labelSelectionCurve')
    .attr('d', dottedArc)
    .style('fill', d => color(d.data.Label))
    .style('opacity', 0);

  dottedDonut.append('text')
    .attr('id', 'labelSelectionText')
    .attr('text-anchor', 'middle')
    .attr('y', -40)
    .text();

  dottedDonut.append('text')
    .attr('id', 'frequencyPercentText')
    .attr('text-anchor', 'middle')
    .attr('y', 30)
    .text();

  setDefaults();
});

/* FUNCTIONS */
function showArtDetails(d, i) {
  // Reset
  document.getElementById('art-title').innerHTML = '';
  document.getElementById('artist').innerHTML = '';
  document.getElementById('date').innerHTML = '';
  document.getElementById('period').innerHTML = '';
  document.getElementById('labels').innerHTML = '';

  /* Art Image */
  document.getElementById('art-image').setAttribute('src', metDataMap.get(parseInt(d.data)).original_image_url);

  let englishRegEx = /([a-zA-Z0-9.':()-]+(?: [a-zA-Z0-9,.':()|-]+)*)/g;

  /* Title */
  if (metDataMap.get(parseInt(d.data)).obj_title) {
    let title = metDataMap.get(parseInt(d.data)).obj_title.match(englishRegEx).join(' ');
    document.getElementById('art-title').innerHTML = title;
  }
  else if (metDataMap.get(parseInt(d.data)).img_title) {
    let title = metDataMap.get(parseInt(d.data)).img_title.match(englishRegEx).join(' ');
    document.getElementById('art-title').innerHTML = title;
  }

  /* Artist */
  if (metDataMap.get(parseInt(d.data)).artist_display_name) {
    let artist = metDataMap.get(parseInt(d.data)).artist_display_name.match(englishRegEx).join(' ');
    artist = artist.replace(/([|]*(unidentified artist)+)[|]*/gi, '');
    if (artist && Number(metDataMap.get(parseInt(d.data)).artist_begin_date) &&
      Number(metDataMap.get(parseInt(d.data)).artist_end_date))
      artist += ' (' + metDataMap.get(parseInt(d.data)).artist_begin_date + '-' +
        metDataMap.get(parseInt(d.data)).artist_end_date + ')';
    if (artist)
      document.getElementById('artist').innerHTML = 'Artist: ' + artist;
  }

  /* Object */
  let objDate = '';
  if (metDataMap.get(parseInt(d.data)).object_date !== '') {
    objDate = metDataMap.get(parseInt(d.data)).object_date.match(englishRegEx).join('-');
    objDate = objDate.replace(/(dated)+/gi, '');
  }
  if (metDataMap.get(parseInt(d.data)).object_begin_date && metDataMap.get(parseInt(d.data)).object_end_date) {
    objDate += ' (' + metDataMap.get(parseInt(d.data)).object_begin_date + '-' +
      metDataMap.get(parseInt(d.data)).object_end_date + ')';
  }
  document.getElementById('date').innerHTML = 'Dated: ' + objDate;

  /* Period */
  if (metDataMap.get(parseInt(d.data)).period) {
    let period = metDataMap.get(parseInt(d.data)).period.match(englishRegEx).join('-');
    document.getElementById('period').innerHTML = 'Period: ' + period;
  }

  /* Labels */
  document.getElementById('labels').innerHTML = 'Detected Labels: ' +
    artLabels[metDataMap.get(parseInt(d.data)).index].Labels.replace(/,/g, ', ');
}

function handleStrokeMouseOver(d, i) {
  d3.select(outerStroke[i]).style('stroke', 'black');
  showArtDetails(d, i);
}

function handleStrokeMouseOut(d, i) {
  if (prevStrokeClickedId != i) { /* prevStrokeClickedId can be null too */
    d3.select(outerStroke[i]).style('stroke', '#C0C0C0');
    if (prevStrokeClickedId !== null) {
      handleStrokeMouseOver(d3.select(outerStroke[prevStrokeClickedId]).data()[0], prevStrokeClickedId);
    }
  }
}

function handleStrokeClick(d, i) {
  /* set the previous stroke color as gray 
  Or, deselect previous click */
  if (prevStrokeClickedId != null) {
    d3.select(outerStroke[prevStrokeClickedId]).style('stroke', '#C0C0C0');
  }
  if (prevStrokeClickedId != i) {
    /* set the current clicked stroke color as black */
    d3.select(outerStroke[i]).style('stroke', 'black');
    prevStrokeClickedId = i;
  } else if (prevStrokeClickedId === i)
    prevStrokeClickedId = null;
}

/*
* Show inner curve on label selection
* Show label and percent text on label selection 
* Hide previous values
* */
function handleLabelClick(d, i) {
  d3.select(labelSelectionCurve[prevInnerCurveId]).style('opacity', 0);
  d3.select(labelSelectionText[prevInnerCurveId]).text('');
  d3.select(frequencyPercentText[prevInnerCurveId]).text('');

  let selectionLabel = d3.select(labelSelectionText[i]);
  insertLineBreaks(selectionLabel, d.data.Label, '25');

  let selectionFreq = d3.select(frequencyPercentText[i]);
  let labelPercent = (Math.round((d.data.Frequency / numPaintings) * 10000) / 100).toString() + '%';
  insertLineBreaks(selectionFreq, labelPercent, '20');

  d3.select(labelSelectionCurve[i]).style('opacity', 0.8);

  prevInnerCurveId = i;

  // Reset prevStrokeClickedId
  prevStrokeClickedId = null;

  // Update the default image (of index 0) shown with the label
  showArtDetails(d3.select(outerStroke[0]).data()[0], 0);
}

function updateStrokeData(d, index) {
  if (strokeDonut)
    strokeDonut.remove();
  strokeDonut = svg.selectAll('#stroke-donut')
    .data(strokePie(d[index]))
    .enter()
    .append('g');
  strokeDonut.append("path")
    .attr("d", strokeArc)
    .attr('id', 'outerStroke')
    .style('stroke', '#C0C0C0')
    .style('stroke-width', '2')
  strokeDonut.on('mouseover', handleStrokeMouseOver);
  strokeDonut.on('mouseout', handleStrokeMouseOut);
  strokeDonut.on('click', handleStrokeClick);
}

let insertLineBreaks = function (d, label, dy) {
  if (typeof dy === 'string' && !isNaN(parseFloat(dy))) {
    text = label;
    el = d;
    dy = dy;
  } else {
    text = d.data.Label;
    el = d3.select(this);
    dy = '15';
  }

  let regEx;
  if (text.includes(' ')) {
    regEx = ' ';
  } else if (text.includes('-')) {
    regEx = /(?=-)/g;
  }
  let words = text.split(regEx);
  el.text();
  for (let i = 0; i < words.length; i++) {
    let tspan = el.append('tspan').text(words[i]);
    if (i > 0)
      tspan.attr('x', 0).attr('dy', dy);
  }
};

let transformLabelTexts = function (d, i) {
  /*
    * This is to make the label start at near the outer radius instead of at the centroid
    * 0.7115 is the radius length until the centroid (calculated)
    * 0.83 is the outer radius length (defined above)
    * 0.02 is just a number by eye-balling
    * To make this dynamic: use the radii and 0.02 as percentages
    */
  let centroidDistance = (labelDonutOuterRadius + labelDonutInnerRadius) / 2;
  let offset = 0.02 * labelDonutOuterRadius;
  let outerRadiusPt = labelArc.centroid(d);
  if (d.startAngle >= 0 && d.startAngle <= 3.14) {
    let textWidth = d3.select(labelText[i]).node().getBoundingClientRect().width;
    outerRadiusPt[0] = (outerRadiusPt[0] / centroidDistance) * (labelDonutOuterRadius - textWidth - offset);
    outerRadiusPt[1] = (outerRadiusPt[1] / centroidDistance) * (labelDonutOuterRadius - textWidth - offset);
  } else {
    outerRadiusPt[0] = (outerRadiusPt[0] / centroidDistance) * (labelDonutOuterRadius - offset);
    outerRadiusPt[1] = (outerRadiusPt[1] / centroidDistance) * (labelDonutOuterRadius - offset);
  }

  let rotateAngle = null;
  let halfAngle = (d.startAngle + d.endAngle) / 2;
  if (d.startAngle >= 0 && d.startAngle <= 3.14) {
    rotateAngle = Math.round(((halfAngle * 180) / Math.PI) + 270);
  } else {
    rotateAngle = Math.round(((halfAngle * 180) / Math.PI) + 90);
  }
  return 'translate(' + outerRadiusPt +
    ') rotate(' + rotateAngle + ')';
}

function setDefaults() {
  handleLabelClick(labelDonut.data()[0], 0);
  // showArtDetails(d3.select(outerStroke[0]).data()[0], 0);
}