# Postcard-portrait-plotter

## Flow

### Taking a picture

- A visitor presses the countdown button
- The button is wired to a Arduino, which sends a keyboard shortcut to the mac.
- The shortcut triggers an Automator action, which starts the Photo Booth countdown.
- A picture is taken
- The Automator script waits for a couple of seconds and then copies the picture to a source folder.

### Plotting the picture

- An operator presses the plot button
- The button is wired to a Arduino, which sends a keystroke to the mac.
- On the mac, there is a terminal process running, which waits for a certain keystroke.
- When the the 'plot' command is received, a series of scripts are executed:
  - The oldest picture in the queue gets selected
  - The picture is cropped to a postcard-ratio, taking the position of one ore more faces into account. [smartcrop](https://github.com/jwagner/smartcrop-sharp)
  - A Python script then transforms the cropped picture into a line drawing (SVG) [linedraw](https://github.com/LingDong-/linedraw)
  - The SVG gets simplified and optimized for plotting with [vpype](https://vpype.readthedocs.io/en/latest/)
  - The optimized SVG is then plotted with the [AxiDraw](https://axidraw.com/)
  - Finally, the original pictures gets deleted to clean up the queue.

## Features

The plotter script has a couple of options:

`p` - Plots the oldest picture in the queue.

`l` - Lists all the pictures in the queue with their timestamp.

`t` - Toggles the plotter pen in its up or down position. Useful when mounting the pen.

`d` - Disengages the plotter motors. This way you can move the plotter head freely.

`c` - Draws a "calibration" picture.

`q` - Stops the script.

## Start

- Make sure that all the cables are connected to the computer. Seems obvious, but we've all made that mistake once before, right?
- Open Photo Booth on the extra screen, open this project in VS code on the operator screen.
- Now start the script by running `npm start` in the terminal

## Installation

### linedraw

download and unzip in project directory

[linedraw](https://github.com/LingDong-/linedraw)

### Python Environment

Yeah, good luck with this one...

[Creating a virtual env](https://packaging.python.org/en/latest/guides/installing-using-pip-and-virtual-environments/#creating-a-virtual-environment)

```bash
python3 -m venv env

python -m pip install https://cdn.evilmadscientist.com/dl/ad/public/AxiDraw_API.zip

pip install opencv-python
pip install Pillow
pip install vpype
```

vpype on M1
<https://vpype.readthedocs.io/en/latest/install.html#installing-using-pipx-apple-silicon-m1>

### Google ZX

[Replace Bash with JavaScript](https://github.com/google/zx)

```bash
npm i -g zx
```

### Vpype

[The Swiss-Army-knife command-line tool for plotter vector graphics.](https://github.com/abey79/vpype)
[stable release](https://vpype.readthedocs.io/en/stable/install.html)

## AxiDraw CLI

[https://axidraw.com/doc/cli_api/](https://axidraw.com/doc/cli_api/)

## Troubleshooting

- The terminal running the plotter script, needs to be in focus to receive the keyboard input that the Arduino sends.
- The Automator workflow for the picture taking needs all kind of permissions. Basically every app that can be in focus needs to be allowed.
