
const dataFileInput = document.getElementById("dataFileInput");
const loadButton = document.getElementById("dataLoadButton");
loadButton.onclick = compute;

const visualizationWidth = 240;
const visualizationHeight = 180;
const mapWidth = 0; 
const mapHeight = 0;


//https://stackoverflow.com/a/34156339
async function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = await new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

function compute () {
    Mocap.loadDataFromFile(dataFileInput.files[0], (sequences) => {
        let resultJson = {};
        let counter = 0;
        let factory = new Mocap.VisualizationFactory();
        for(let sequence of sequences){
            let visualizationElement = factory.createVisualization(sequence, visualizationWidth,visualizationHeight, mapWidth, mapHeight);
            resultJson[sequence[0].split(' ')[2].trim()] = visualizationElement.getElementsByTagName("img")[0].src;
            counter++;
            console.log("Number of computed images: " + counter);
        }
        download(JSON.stringify(resultJson),'json.txt', 'text/plain');
        console.log("OK")
        return
    },null,20,3000)  
    return
}