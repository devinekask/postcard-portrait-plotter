#!/usr/bin/env zx

const sourceDir = "./sourcefiles/";
const outputDir = "./output/";
const optimizedDir = "./optimized/";

const createSVG = async (sourceFile, filename) => {
	return await $`python3 ./linedraw-master/linedraw.py -i ${sourceDir}${sourceFile} --output=${outputDir}${filename}.svg -nh --contour_simplify=2`;
};

const optimizeSVG = async (filename) => {
	await $`vpype read ${outputDir}${filename}.svg layout --fit-to-margins 1cm --valign top a6 \
	linemerge --tolerance 0.1mm \
  linesort \
  reloop \
  linesimplify \
	write --page-size a6 --center  ${optimizedDir}${filename}.svg`
}

const plotSVG = async (filename) => {
	await $`axicli ./optimized/${filename}.svg -o outputfile.svg -L2`;
}

const plotFirstInQueue = async () => {
	const firstFile = getQueue()[0];
	console.log(chalk.blue("Plotting " + firstFile));
	const filename = firstFile.split('.').shift();
	await createSVG(firstFile, filename)
	await optimizeSVG(filename);
	//await plotSVG(filename);

	await removeFromQueue(firstFile);
	console.log(chalk.green("DONE"))
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

		const choice = await question(`What do you want?
${chalk.inverse('p')} - plot next in queue
${chalk.inverse('l')} - list queue
${chalk.inverse('t')} - toggle pen up/down
${chalk.inverse('d')} - disengage motors
${chalk.inverse('q')} - quit
`, { choices: ["p", "l", "t", 'd', 'q'] })

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
