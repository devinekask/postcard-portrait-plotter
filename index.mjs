#!/usr/bin/env zx

const createSVG = async (source) => {
	const filename = source.split('.').shift();
	await $`python3 ./linedraw-master/linedraw.py -i ./sourcefiles/${source} --output=output/${filename}.svg -nh --contour_simplify=2`;
	return filename;
};

const optimizeSVG = async (name) => {
	await $`vpype read ./output/${name}.svg layout --fit-to-margins 1cm --valign top a6 \
	linemerge --tolerance 0.1mm \
  linesort \
  reloop \
  linesimplify \
	write --page-size a6 --center  ./optimized/${name}.svg`
}

const plotSVG = async (name) => {
	await $`axicli ./optimized/${name}.svg -o outputfile.svg -L2`;
}

const run = async () => {
	try {
		console.log("Lets draw");
		const inputfile = argv?.f || "p1.jpeg"
		const filename = await createSVG(inputfile)
		await optimizeSVG(filename);
		if (argv.p) {
			await plotSVG(filename);
		}

	} catch (err) {
		console.log("ERROR", err)
	}
}

run()
