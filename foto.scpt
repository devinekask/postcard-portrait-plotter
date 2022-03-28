activate application "Photo Booth"
tell application "System Events" to tell process "Photo Booth"
	click menu item "Take Photo" of menu 1 of menu bar item "File" of menu bar 1
end tell
activate application "Code"
