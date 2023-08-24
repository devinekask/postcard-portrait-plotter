#include "Keyboard.h"

//based on the arduino button debounce example

const int plotPin = 2;  
const int photoPin = 3;

int plotButtonState;          
int lastPlotButtonState = LOW;  

int photoButtonState;  
int lastPhotoButtonState = LOW;

// the following variables are unsigned longs because the time, measured in
// milliseconds, will quickly become a bigger number than can be stored in an int.
unsigned long lastPlotDebounceTime = 0;  // the last time the output pin was toggled
unsigned long lastPhotoDebounceTime = 0;  // the last time the output pin was toggled
unsigned long debounceDelay = 50;    // the debounce time; increase if the output flickers

void setup() {
  pinMode(plotPin, INPUT);
  pinMode(photoPin, INPUT);

  Keyboard.begin();
}

void loop() {
  // read the state of the switch into a local variable:
  int plotReading = digitalRead(plotPin);
  int photoReading = digitalRead(photoPin);

  // If the switch changed, due to noise or pressing:
  if (plotReading != lastPlotButtonState) {
    // reset the debouncing timer
    lastPlotDebounceTime = millis();
  }
    // If the switch changed, due to noise or pressing:
  if (photoReading != lastPhotoButtonState) {
    // reset the debouncing timer
    lastPhotoDebounceTime = millis();
  }

  if ((millis() - lastPlotDebounceTime) > debounceDelay) {
    if (plotReading != plotButtonState) {
      plotButtonState = plotReading;
      if (plotButtonState == HIGH) {
         Keyboard.println('p');
      }
    }
  }

  if ((millis() - lastPhotoDebounceTime) > debounceDelay) {
    if (photoReading != photoButtonState) {
      photoButtonState = photoReading;
      if (photoButtonState == HIGH) {
         Keyboard.println('f');
      }
    }
  }

  // save the reading. Next time through the loop, it'll be the lastButtonState:
  lastPlotButtonState = plotReading;
  lastPhotoButtonState = photoReading;
}
