#!/usr/bin/env zx
import smartCrop from "./smartcrop.mjs";
import applescript from "applescript";
import util from "util";

const sourceDir = "./sourcefiles/";
const cropDir = "./cropped/";
const outputDir = "./output/";
const optimizedDir = "./optimized/";

let currentPlotTask;

const createSVG = (sourceFile, filename) => {
	const input = cropDir + sourceFile;
	const output = outputDir + filename + '.svg';
	return $`python3 ./linedraw-master/linedraw.py -i ${input} --output=${output} -nh --contour_simplify=3`;
};

const optimizeSVG = (filename, landscape) => {
	return $`vpype read ${outputDir}${filename}.svg layout --fit-to-margins 0mm ${landscape ? '--landscape' : ''} 99x148mm \
	linemerge --tolerance 0.1mm \
  	linesort \
  	reloop \
  	linesimplify \
	write --page-size 100x148mm  ${landscape ? '--landscape' : ''}  ${optimizedDir}${filename}.svg`
}

const plotSVG = (filename) => {
	return $`axicli ./optimized/${filename}.svg -o outputfile.svg -L2`;
}

const cropFaces = filename => {
	return smartCrop(`${sourceDir}${filename}`, `${cropDir}${filename}`);
}

const plotFirstInQueue = () => {
	let isCancelled = false;
	let plotSVGPromise = false;
	const task = {
		isDone: false,
		_execute: async () => {
			const firstFile = getQueue()[0];
			if (firstFile) {
				console.log(chalk.blue("Plotting " + firstFile));

				const extension = path.extname(firstFile);
				const filename = path.basename(firstFile, extension);

				const orientation = await cropFaces(firstFile)
				if (isCancelled) return;
				await createSVG(firstFile, filename)
				if (isCancelled) return;
				await optimizeSVG(filename, orientation.landscape);
				if (isCancelled) return;
				plotSVGPromise = plotSVG(filename);
				await plotSVGPromise;
				if (isCancelled) return;
				await removeFromQueue(firstFile);
				console.log(chalk.green("DONE"))
				task.isDone = true;
			} else {
				console.log(chalk.yellow("NO FILE"))
			}
		},
		cancel: async () => {
			isCancelled = true;
			if (plotSVGPromise) {
				await plotSVGPromise.kill('SIGINT')
			}
		}
	};
	task._execute();
	return task;
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
	const filtered = files.filter(file => path.basename(file) !== ".DS_Store");
	filtered.sort(function (a, b) {
		return fs.statSync(sourceDir + a).mtime.getTime() -
			fs.statSync(sourceDir + b).mtime.getTime();
	});
	return filtered;
}

const cancelCurrentPlotTaskIfNeeded = async () => {
	if (currentPlotTask && !currentPlotTask.isDone) {
		await currentPlotTask.cancel();
	}
	currentPlotTask = false;
}

const delay = (ms) => new Promise(resolve => setTimeout(() => resolve(), ms));

const takePicture = async () => {
	const execAppleScript = util.promisify(applescript.execString)
	await execAppleScript(`activate application "Photo Booth"`)
	await delay(1000)
	await execAppleScript(`
	tell application "System Events" to tell process "Photo Booth"
		delay 0.2
		keystroke return using command down
	end tell
	`)
	await delay(5000)
	const home = await $`echo $HOME`;
	await $`cp -p "\`ls -dtr1 "${home}/Pictures/Photo Booth Library/Pictures"/* | tail -1\`" "./sourcefiles"`
	await execAppleScript(`activate application "Visual Studio Code"`)
}

const run = async () => {
	try {
		const choice = await question(`What do you want?
${chalk.inverse('p')} - plot next in queue
${chalk.inverse('f')} - take a picture
${chalk.inverse('l')} - list queue
${chalk.inverse('t')} - toggle pen up/down
${chalk.inverse('d')} - disengage motors
${chalk.inverse('c')} - calibration plot
${chalk.inverse('q')} - quit
`, { choices: ["p", "l", "t", 'd', 'c', 'q'] })

		switch (choice) {
			case "p":
				console.log("get next file");
				await cancelCurrentPlotTaskIfNeeded();
				currentPlotTask = plotFirstInQueue();
				run();
				break;
			case "f":
				console.log("take picture");
				await takePicture();
				run();
				break;
			case "l":
				console.log("list files");
				listQueue();
				run();
				break;
			case "d":
				console.log("disengage motors");
				await cancelCurrentPlotTaskIfNeeded();
				await $`axicli --mode align`;
				run();
				break;
			case "t":
				console.log("Toggle up/down");
				await cancelCurrentPlotTaskIfNeeded();
				await $`axicli --mode toggle`;
				run();
				break;
			case "c":
				console.log("Calibrate");
				await cancelCurrentPlotTaskIfNeeded();
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
