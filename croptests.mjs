import smartCrop from "./smartcrop.mjs";
import fs from "fs";

const files = fs.readdirSync('./croptests/sourcepictures/');

files.forEach(file => {
	console.log(file)
	smartCrop('./croptests/sourcepictures/' + file, './croptests/croppedpictures/' + file);
})
