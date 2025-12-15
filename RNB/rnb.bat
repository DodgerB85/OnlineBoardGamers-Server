START /B /WAIT cmd /c npm run build

START /B /WAIT cmd /c copy C:\Roger\Programming\MyOG\RNB\static\RNB\RNBvuedist\main.js .


START /B /WAIT cmd /c javascript-obfuscator.cmd main.js


copy main-obfuscated.js ..\static\RNB\RNBvuedist\main.js

START /B /WAIT cmd /c npm run dev



