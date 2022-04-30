import * as Mocap from '../src/mocap.js';
import * as Model from '../src/mocap.js';

const dataFileInput = document.getElementById("dataFileInput");
const loadButton = document.getElementById("dataLoadButton");
loadButton.onclick = compute;
const factory = new Mocap.VisualizationFactory();

/**
 * Const for setup
 */
factory.model = Model.modelVicon;
const visualizationWidth = 120;
const visualizationHeight = 100;
const numberOfActions = 3000;


//https://stackoverflow.com/a/34156339
async function download(content, fileName, contentType) {
    var a = document.createElement("a");
    var file = await new Blob([content], {type: contentType});
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
}

async function compute () {
    Mocap.loadDataFromFile(dataFileInput.files[0], (sequences) => {
        let resultJson = {};
        let counter = 0;
        for(let sequence of sequences){
            let visualizationElement = factory.createVisualization(sequence, visualizationWidth,visualizationHeight, 0, 0);
            resultJson[sequence[0].split(' ')[2].trim()] = visualizationElement.getElementsByTagName("img")[0].src;
            counter++;
            console.log("Number of computed images: " + counter);
        }
        download(JSON.stringify(resultJson),'json.txt', 'text/plain');
        console.log("OK")
        return
    },undefined,undefined,numberOfActions)  
    return
}