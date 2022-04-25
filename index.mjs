#!/usr/bin/env zx

const tf = require('@tensorflow/tfjs-node');
const { createOpAttr } = require('@tensorflow/tfjs-node/dist/nodejs_kernel_backend');
const faceapi = require('@vladmandic/face-api');
const canvas = require('canvas');

const sharp = require('sharp');

const sourceDir = "./sourcefiles/";
const cropDir = "./cropped/";
const outputDir = "./output/";
const optimizedDir = "./optimized/";

const POSTCARD_RATIO = 1.41;

const { Canvas, Image, ImageData } = canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData })

const createSVG = async (sourceFile, filename) => {
	const input = cropDir + sourceFile;
	const output = outputDir + filename + '.svg';
	return await $`python3 ./linedraw-master/linedraw.py -i ${input} --output=${output} -nh --contour_simplify=3`;
};

const optimizeSVG = async (filename, landscape) => {
	await $`vpype read ${outputDir}${filename}.svg layout --fit-to-margins 0.5cm ${landscape ? '--landscape' : ''} --valign top a6 \
	linemerge --tolerance 0.1mm \
  	linesort \
  	reloop \
  	linesimplify \
	write --page-size a6  ${landscape ? '--landscape' : ''} --center  ${optimizedDir}${filename}.svg`
}

const plotSVG = async (filename) => {
	await $`axicli ./optimized/${filename}.svg -o outputfile.svg -L2`;
}

const cropFaces = async filename => {
	const img = await canvas.loadImage(`${sourceDir}${filename}`)
	const detections = await faceapi.tinyFaceDetector(img, {})

	console.log(`Detected ${detections.length} faces`);
	const crop = { left: 0, top: 0, width: 0, height: 0 }

	if (detections.length === 1) {
		const detection = detections[0]

		const centerX = detection.box.x + detection.box.width / 2;
		let width = detection.imageDims.height / POSTCARD_RATIO;
		let left = centerX - width / 2;
		let height = detection.imageDims.height;
		let top=0;

		//todo: valt de box van de face nog binnen de crop?
		console.log(left,width, left+width, detection.imageDims.width)
		if(left+width>detection.imageDims.width){
			console.log('groter')
			width = detection.imageDims.width-detection.box.x;
			left = detection.box.x
			height = width*POSTCARD_RATIO;
			top = (detection.imageDims.height-height)/2;
		}

		crop.left = parseInt(left, 10);
		crop.width = parseInt(width, 10);
		crop.height = parseInt(height, 10);
		crop.top = parseInt(top, 10);
		console.log(crop, detection.imageDims)
	} else if (detections.length > 1) {
		const groupedDetection = { x: detections[0].imageDims.width, y: detections[0].imageDims.height, x2: 0, y2: 0 }

		detections.forEach(detection => {
			if (detection.box.x < groupedDetection.x) {
				groupedDetection.x = detection.box.x;
			}
			if (detection.box.y < groupedDetection.y) {
				groupedDetection.y = detection.box.y;
			}
			if (detection.box.x + detection.box.width > groupedDetection.x2) {
				groupedDetection.x2 = detection.box.x + detection.box.width
			}
			if (detection.box.y + detection.box.height > groupedDetection.y2) {
				groupedDetection.y2 = detection.box.y + detection.box.height
			}
		})

		let width = groupedDetection.x2 - groupedDetection.x;
		let height = groupedDetection.y2 - groupedDetection.y;
		const centerX = groupedDetection.x + (width / 2);
		const centerY = groupedDetection.y + (height / 2);

		if (height / POSTCARD_RATIO > width) {
			width = height / POSTCARD_RATIO;
		}

		if (width / 1, 41 < height) {
			height = width / POSTCARD_RATIO;
		}
	
	
		crop.left = parseInt(centerX - (width / 2), 10);
		crop.top = parseInt(centerY - (height / 2), 10);
		crop.width = parseInt(width, 10);
		crop.height = parseInt(height, 10);

		if(crop.left<0){
			crop.left=0;
		}
		if(crop.top<0){
			crop.top=0;
		}
		console.log(crop)
	}

	sharp(`${sourceDir}${filename}`)
		.extract(crop)
		.toFile(`${cropDir}${filename}`, function (err) {
			console.log(err);
		});


	return { landscape: crop.width > crop.height }
}

const plotFirstInQueue = async () => {
	const firstFile = getQueue()[0];
	if(firstFile){
		console.log(chalk.blue("Plotting " + firstFile));

		const extension = path.extname(firstFile);
		const filename = path.basename(firstFile, extension);
	
		const orientation = await cropFaces(firstFile)
		await createSVG(firstFile, filename)
		await optimizeSVG(filename, orientation.landscape);
		await plotSVG(filename);
	
		//await removeFromQueue(firstFile);
		console.log(chalk.green("DONE"))
	}else{
		console.log(chalk.yellow("NO FILE"))
	}

	return
}

const removeFromQueue = async (sourceFile) => {
	await fs.remove(`${sourceDir}${sourceFile}`)
	console.log(chalk.red("Removed " + sourceFile));
}

const listQueue = () => {
	const files = getQueue();
	console.table(files.map(f => ({ name: f, timestamp: fs.statSync(sourceDir + f).mtime.toLocaleString() })));
}

const getQueue = () => {
	const files = fs.readdirSync(sourceDir);
	files.sort(function (a, b) {
		return fs.statSync(sourceDir + a).mtime.getTime() -
			fs.statSync(sourceDir + b).mtime.getTime();
	});
	return files;
}

const run = async () => {
	try {
		await faceapi.nets.tinyFaceDetector.loadFromDisk('./assets/models')

		const choice = await question(`What do you want?
${chalk.inverse('p')} - plot next in queue
${chalk.inverse('l')} - list queue
${chalk.inverse('t')} - toggle pen up/down
${chalk.inverse('d')} - disengage motors
${chalk.inverse('q')} - quit
`, { choices: ["p", "l", "t", 'd', 'q', "f"] })

		switch (choice) {
			case "p":
				console.log("get next file");
				await plotFirstInQueue();
				run();
				break;
			case "l":
				console.log("list files");
				listQueue();
				run();
				break;
			case "d":
				console.log("disengage motors");
				await $`axicli --mode align`;
				run();
				break;
			case "t":
				console.log("Toggle up/down");
				await $`axicli --mode toggle`;
				run();
				break;
			case "q":
				console.log("quit");
				break;
			case "f":
				await $`osascript ./foto.scpt`;
				run();
				break;
			default:
				console.log('Invalid choice');
				run();
				break;
		}
	} catch (err) {
		console.log("ERROR", err)
	}
}

run()
