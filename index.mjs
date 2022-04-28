#!/usr/bin/env zx
import smartCrop from "./smartcrop.mjs";

const sourceDir = "./sourcefiles/";
const cropDir = "./cropped/";
const outputDir = "./output/";
const optimizedDir = "./optimized/";

const createSVG = async (sourceFile, filename) => {
	const input = cropDir + sourceFile;
	const output = outputDir + filename + '.svg';
	return await $`python3 ./linedraw-master/linedraw.py -i ${input} --output=${output} -nh --contour_simplify=3`;
};

const optimizeSVG = async (filename, landscape) => {
	await $`vpype read ${outputDir}${filename}.svg layout --fit-to-margins 0mm ${landscape ? '--landscape' : ''} 99x148mm \
	linemerge --tolerance 0.1mm \
  	linesort \
  	reloop \
  	linesimplify \
	write --page-size 100x148mm  ${landscape ? '--landscape' : ''}  ${optimizedDir}${filename}.svg`
}

const plotSVG = async (filename) => {

	await $`axicli ./optimized/${filename}.svg -o outputfile.svg -L2`;
}

const cropFaces = async filename => {
	return await smartCrop(`${sourceDir}${filename}`, `${cropDir}${filename}`);
}

const plotFirstInQueue = async () => {
	const firstFile = getQueue()[0];
	if (firstFile) {
		console.log(chalk.blue("Plotting " + firstFile));

		const extension = path.extname(firstFile);
		const filename = path.basename(firstFile, extension);

		const orientation = await cropFaces(firstFile)
		await createSVG(firstFile, filename)
		await optimizeSVG(filename, orientation.landscape);
		await plotSVG(filename);

		await removeFromQueue(firstFile);
		console.log(chalk.green("DONE"))
	} else {
		console.log(chalk.yellow("NO FILE"))
	}

	return
}

const calibrate = async () => {
	fs.copyFileSync('./assets/calibrate/calibrate.svg', './output/calibrate.svg');
	await optimizeSVG('calibrate', false);
	await plotSVG('calibrate');
	console.log(chalk.green("DONE CALIBRATING"));
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
		const choice = await question(`What do you want?
${chalk.inverse('p')} - plot next in queue
${chalk.inverse('l')} - list queue
${chalk.inverse('t')} - toggle pen up/down
${chalk.inverse('d')} - disengage motors
${chalk.inverse('c')} - calibration plot
${chalk.inverse('q')} - quit
`, { choices: ["p", "l", "t", 'd', 'c', 'q'] })

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
			case "c":
				console.log("Calibrate");
				await calibrate();
				run();
				break;
			case "q":
				console.log("quit");
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
