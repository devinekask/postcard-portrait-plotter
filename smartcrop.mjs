import * as fs from 'fs'
import tf from '@tensorflow/tfjs-node';
import faceapi from '@vladmandic/face-api';
import sharp from 'sharp';
import smartcrop from 'smartcrop-sharp';

const POSTCARD_RATIO = 1.414;

const getBoundingBox = (regions, maxW, maxH) => {
	const bb = { x: maxW, x2: 0, y: maxH, y2: 0 };

	regions.forEach(region => {
		if (region.box.x < bb.x) {
			bb.x = region.box.x;
		}
		if (region.box.y < bb.y) {
			bb.y = region.box.y;
		}
		if (region.box.x + region.box.width > bb.x2) {
			bb.x2 = region.box.x + region.box.width
		}
		if (region.box.y + region.box.height > bb.y2) {
			bb.y2 = region.box.y + region.box.height
		}
	})
	return bb;
}


const smartCrop = async (inputfile, outputfile) => {
	await faceapi.nets.tinyFaceDetector.loadFromDisk('./assets/models')

	tf.engine().startScope()
	let detections = []
	try {
		const imgFile = fs.readFileSync(inputfile)
		const img = tf.node.decodeImage(imgFile, 3)
		detections = await faceapi.tinyFaceDetector(img, {})
	} catch (e) {
		console.error(inputfile)
		console.error(e)
	}
	tf.engine().endScope()
	console.log(`Detected ${detections.length} faces`);
	const short = 1000;
	const long = short * POSTCARD_RATIO;
	const dimensions = { width: short, height: long }; //portrait

	if (detections.length > 1) {
		const bb = getBoundingBox(detections, detections[0].imageDims.width, detections[0].imageDims.height)
		if (bb.x2 - bb.x > bb.y2 - bb.y) { //if width is larger than height, landscape
			dimensions.width = long;
			dimensions.height = short;
		}
	}

	const boost = detections.map((detection, index) => ({
		x: parseInt(detection.box.x),
		y: parseInt(detection.box.y),
		width: parseInt(detection.box.width),
		height: parseInt(detection.box.height),
		weight: 1
	}))


	const smartResult = await smartcrop.crop(inputfile, { ...dimensions, minScale: 1, boost })
	const crop = smartResult.topCrop;

	sharp(inputfile)
		.extract({ width: crop.width, height: crop.height, left: crop.x, top: crop.y })
		//.resize(dimensions.width, dimensions.height)
		.toFile(outputfile);

	return { landscape: crop.width > crop.height }
}

export default smartCrop
