START /B /WAIT cmd /c npm run build

START /B /WAIT cmd /c copy C:\Roger\Programming\MyOG\CNS\static\CNS\CNSvuedist\main.js .


START /B /WAIT cmd /c javascript-obfuscator.cmd main.js


copy main-obfuscated.js ..\static\CNS\CNSvuedist\main.js

START /B /WAIT cmd /c npm run dev



